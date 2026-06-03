/**
 * Debt simplification.
 *
 * All values are MINOR units (integer cents). No floats anywhere — we accept
 * floating shares (e.g. 0.5) when computing per-participant amounts, but the
 * result of those splits is rounded to integer minor units, and we attribute
 * any leftover cent to the payer so totals reconcile exactly.
 */

export type Expense = {
  paidBy: string;
  amountMinor: number;
  /** Either a list of names (equal split) or weighted shares (must sum > 0). */
  participants: string[] | Array<{ name: string; share: number }>;
};

export type Balance = { name: string; netMinor: number };
export type Transfer = { from: string; to: string; amountMinor: number };

/**
 * Compute net balance per person from a list of expenses.
 * Positive net = creditor (owed money). Negative = debtor.
 * Sum of nets is always exactly zero (we route rounding remainder to payer).
 */
export function computeBalances(expenses: Expense[]): Balance[] {
  const net = new Map<string, number>();
  const bump = (name: string, delta: number) => {
    net.set(name, (net.get(name) ?? 0) + delta);
  };

  for (const exp of expenses) {
    if (exp.amountMinor <= 0) continue;
    bump(exp.paidBy, exp.amountMinor);

    const weighted = normalizeParticipants(exp.participants);
    if (weighted.length === 0) {
      // No participants → payer effectively absorbs (acts as a no-op for net).
      bump(exp.paidBy, -exp.amountMinor);
      continue;
    }

    const totalWeight = weighted.reduce((s, p) => s + p.share, 0);
    let assigned = 0;
    for (let i = 0; i < weighted.length; i++) {
      const p = weighted[i];
      let owe: number;
      if (i === weighted.length - 1) {
        // Last participant gets remainder so the sum equals amountMinor exactly.
        owe = exp.amountMinor - assigned;
      } else {
        owe = Math.round((exp.amountMinor * p.share) / totalWeight);
        assigned += owe;
      }
      bump(p.name, -owe);
    }
  }

  return Array.from(net.entries())
    .map(([name, netMinor]) => ({ name, netMinor }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeParticipants(
  participants: Expense["participants"],
): Array<{ name: string; share: number }> {
  if (participants.length === 0) return [];
  if (typeof participants[0] === "string") {
    return (participants as string[]).map((name) => ({ name, share: 1 }));
  }
  return (participants as Array<{ name: string; share: number }>).filter(
    (p) => p.share > 0,
  );
}

/**
 * Greedy debt simplification.
 *
 * Algorithm:
 *   1. Split balances into creditors (>0) and debtors (<0).
 *   2. Sort creditors descending, debtors ascending (most-negative first).
 *   3. Repeatedly pair the largest creditor with the most-negative debtor;
 *      transfer min(|debtor|, creditor). Zero-out and continue.
 *
 * This is near-optimal for typical group cases and produces at most N-1
 * transactions for N people with nonzero balances.
 *
 * Tie-breaking: when amounts are equal, names break ties so output is
 * deterministic across runs.
 */
export function simplifyDebts(balances: Balance[]): Transfer[] {
  // Defensive copy + filter zeros.
  const creditors = balances
    .filter((b) => b.netMinor > 0)
    .map((b) => ({ ...b }));
  const debtors = balances
    .filter((b) => b.netMinor < 0)
    .map((b) => ({ ...b }));

  creditors.sort((a, b) => b.netMinor - a.netMinor || a.name.localeCompare(b.name));
  debtors.sort((a, b) => a.netMinor - b.netMinor || a.name.localeCompare(b.name));

  const transfers: Transfer[] = [];

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const transfer = Math.min(c.netMinor, -d.netMinor);
    if (transfer > 0) {
      transfers.push({ from: d.name, to: c.name, amountMinor: transfer });
      c.netMinor -= transfer;
      d.netMinor += transfer;
    }
    if (c.netMinor === 0) ci++;
    if (d.netMinor === 0) di++;
  }

  return transfers;
}

/** Convenience: compute balances then simplify in one shot. */
export function settle(expenses: Expense[]): {
  balances: Balance[];
  transfers: Transfer[];
} {
  const balances = computeBalances(expenses);
  const transfers = simplifyDebts(balances);
  return { balances, transfers };
}
