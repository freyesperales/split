import { describe, it, expect } from "vitest";
import { computeBalances, simplifyDebts, settle, type Expense } from "./settle";

describe("computeBalances", () => {
  it("two people, single expense — exact split", () => {
    const expenses: Expense[] = [
      { paidBy: "alice", amountMinor: 2000, participants: ["alice", "bob"] },
    ];
    const balances = computeBalances(expenses);
    expect(balances).toEqual([
      { name: "alice", netMinor: 1000 },
      { name: "bob", netMinor: -1000 },
    ]);
    expect(balances.reduce((s, b) => s + b.netMinor, 0)).toBe(0);
  });

  it("handles uneven cents — last participant absorbs remainder", () => {
    // 1000 cents / 3 people = 333.33... → cents [333, 333, 334]
    const expenses: Expense[] = [
      {
        paidBy: "alice",
        amountMinor: 1000,
        participants: ["alice", "bob", "carol"],
      },
    ];
    const balances = computeBalances(expenses);
    expect(balances.reduce((s, b) => s + b.netMinor, 0)).toBe(0);
    const alice = balances.find((b) => b.name === "alice")!;
    expect(alice.netMinor).toBe(1000 - 333);
  });

  it("weighted shares produce correct nets", () => {
    const expenses: Expense[] = [
      {
        paidBy: "alice",
        amountMinor: 1000,
        participants: [
          { name: "alice", share: 0.5 },
          { name: "bob", share: 0.5 },
        ],
      },
    ];
    const balances = computeBalances(expenses);
    expect(balances.find((b) => b.name === "alice")!.netMinor).toBe(500);
    expect(balances.find((b) => b.name === "bob")!.netMinor).toBe(-500);
  });
});

describe("simplifyDebts", () => {
  it("two-person case → single transfer", () => {
    const transfers = simplifyDebts([
      { name: "alice", netMinor: 1000 },
      { name: "bob", netMinor: -1000 },
    ]);
    expect(transfers).toEqual([
      { from: "bob", to: "alice", amountMinor: 1000 },
    ]);
  });

  it("three-person circular debt collapses to 2 transactions", () => {
    // A owes B 100, B owes C 100, C owes A 50  →  net: A=-50, B=0, C=50
    // After collapsing the cycle: just A → C 50.
    const transfers = simplifyDebts([
      { name: "alice", netMinor: -50 },
      { name: "bob", netMinor: 0 },
      { name: "carol", netMinor: 50 },
    ]);
    expect(transfers).toEqual([
      { from: "alice", to: "carol", amountMinor: 50 },
    ]);
  });

  it("five people with exact pairs uses N-1 or fewer transactions", () => {
    const transfers = simplifyDebts([
      { name: "a", netMinor: 100 },
      { name: "b", netMinor: -100 },
      { name: "c", netMinor: 50 },
      { name: "d", netMinor: -50 },
      { name: "e", netMinor: 0 },
    ]);
    expect(transfers.length).toBe(2);
    const sumIn = transfers.reduce((s, t) => s + t.amountMinor, 0);
    expect(sumIn).toBe(150);
  });

  it("deterministic tie-breaking by name", () => {
    // Two creditors with equal balance — name order should decide.
    const t1 = simplifyDebts([
      { name: "zoe", netMinor: 100 },
      { name: "ann", netMinor: 100 },
      { name: "bob", netMinor: -200 },
    ]);
    // Repeat — same input, same output.
    const t2 = simplifyDebts([
      { name: "zoe", netMinor: 100 },
      { name: "ann", netMinor: 100 },
      { name: "bob", netMinor: -200 },
    ]);
    expect(t1).toEqual(t2);
    // First transfer should go to "ann" alphabetically.
    expect(t1[0].to).toBe("ann");
  });

  it("empty / all-zero balances produces no transfers", () => {
    expect(simplifyDebts([])).toEqual([]);
    expect(
      simplifyDebts([
        { name: "a", netMinor: 0 },
        { name: "b", netMinor: 0 },
      ]),
    ).toEqual([]);
  });
});

describe("settle (integration)", () => {
  it("the README example — alice 30/3, bob 60/4, carol 10/2", () => {
    // Using minor units: $30 = 3000, $60 = 6000, $10 = 1000.
    // Alice paid $30 for 3 people (a, b, c) → each owes 1000.
    // Bob paid $60 for 4 people (a, b, c, d) → each owes 1500.
    // Carol paid $10 for 2 people (a, c) → each owes 500.
    //
    // Per-person owed: a: 1000+1500+500=3000, b: 1000+1500=2500,
    //                  c: 1000+1500+500=3000, d: 1500.
    // Paid: alice 3000, bob 6000, carol 1000, dan 0.
    // Net: alice = 3000-3000 = 0, bob = 6000-2500 = +3500,
    //      carol = 1000-3000 = -2000, dan = 0-1500 = -1500.
    // Simplified: carol → bob 2000, dan → bob 1500. Exactly 2 transfers.
    const expenses: Expense[] = [
      {
        paidBy: "alice",
        amountMinor: 3000,
        participants: ["alice", "bob", "carol"],
      },
      {
        paidBy: "bob",
        amountMinor: 6000,
        participants: ["alice", "bob", "carol", "dan"],
      },
      { paidBy: "carol", amountMinor: 1000, participants: ["alice", "carol"] },
    ];
    const { balances, transfers } = settle(expenses);
    const byName = Object.fromEntries(balances.map((b) => [b.name, b.netMinor]));
    expect(byName.alice).toBe(0);
    expect(byName.bob).toBe(3500);
    expect(byName.carol).toBe(-2000);
    expect(byName.dan).toBe(-1500);
    expect(transfers).toEqual([
      { from: "carol", to: "bob", amountMinor: 2000 },
      { from: "dan", to: "bob", amountMinor: 1500 },
    ]);
  });

  it("floating-point CLP pesos (no decimals) — totals reconcile", () => {
    // CLP has 0 decimals so minor === major. Mostly we want to verify
    // no float drift on a longer expense list.
    const expenses: Expense[] = [
      { paidBy: "ana", amountMinor: 13750, participants: ["ana", "ben", "cat"] },
      { paidBy: "ben", amountMinor: 8900, participants: ["ana", "ben", "cat"] },
      { paidBy: "cat", amountMinor: 4250, participants: ["ana", "ben"] },
    ];
    const { balances, transfers } = settle(expenses);
    expect(balances.reduce((s, b) => s + b.netMinor, 0)).toBe(0);
    const owed = transfers.reduce((s, t) => s + t.amountMinor, 0);
    const totalDebt = balances
      .filter((b) => b.netMinor > 0)
      .reduce((s, b) => s + b.netMinor, 0);
    expect(owed).toBe(totalDebt);
  });
});
