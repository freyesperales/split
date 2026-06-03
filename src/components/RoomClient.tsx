"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Plus, Trash2, ArrowLeft } from "lucide-react";
import { formatMinor } from "@/lib/money";
import { settle, type Expense as SettleExpense } from "@/lib/settle";
import { AddExpenseModal } from "./AddExpenseModal";

export type RoomData = {
  code: string;
  name: string;
  currency: string;
  members: string[];
  createdAt: number;
  expiresAt: number;
};

export type ExpenseData = {
  id: string;
  paidBy: string;
  amountMinor: number;
  participants: string[] | Array<{ name: string; share: number }>;
  description: string | null;
  createdAt: number;
};

type Tab = "expenses" | "balance" | "settle";

export function RoomClient({
  initialRoom,
  initialExpenses,
}: {
  initialRoom: RoomData;
  initialExpenses: ExpenseData[];
}) {
  const [room, setRoom] = useState(initialRoom);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [tab, setTab] = useState<Tab>("expenses");
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${room.code}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRoom(data.room);
      setExpenses(data.expenses);
    } catch {
      // offline — fine
    }
  }, [room.code]);

  // Poll while visible.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(refresh, 4000);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    if (!document.hidden) start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const copyCode = () => {
    navigator.clipboard?.writeText(room.code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => {},
    );
  };

  const onAdded = (e: ExpenseData) => {
    setExpenses((prev) => [e, ...prev]);
    setShowAdd(false);
    refresh();
  };

  const onDelete = async (id: string) => {
    const ok = confirm("Delete this expense?");
    if (!ok) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/rooms/${room.code}/expenses/${id}`, { method: "DELETE" });
    refresh();
  };

  const updateMembers = async (members: string[]) => {
    setRoom((r) => ({ ...r, members }));
    await fetch(`/api/rooms/${room.code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members }),
    });
  };

  return (
    <main className="mx-auto max-w-md px-5 pt-6 pb-32">
      <div className="mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft size={14} /> Home
        </Link>
      </div>

      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <span>{room.currency}</span>
          <span>•</span>
          <button
            onClick={copyCode}
            className="!min-h-0 inline-flex items-center gap-1.5 font-mono uppercase tracking-widest text-[var(--color-fg)] hover:text-[var(--color-primary)] py-1"
            aria-label="Copy code"
          >
            {room.code}
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </header>

      <nav className="mb-6 flex rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-1">
        {(["expenses", "balance", "settle"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 !min-h-0 py-2.5 rounded-lg text-sm font-medium capitalize transition ${
              tab === t
                ? "bg-[var(--color-bg)] text-[var(--color-fg)] shadow-sm"
                : "text-[var(--color-muted)]"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "expenses" && (
        <ExpensesTab
          expenses={expenses}
          currency={room.currency}
          onDelete={onDelete}
        />
      )}
      {tab === "balance" && <BalanceTab expenses={expenses} currency={room.currency} />}
      {tab === "settle" && <SettleTab expenses={expenses} currency={room.currency} />}

      <button
        onClick={() => setShowAdd(true)}
        aria-label="Add expense"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-xl grid place-items-center transition"
      >
        <Plus size={26} />
      </button>

      {showAdd && (
        <AddExpenseModal
          room={room}
          onClose={() => setShowAdd(false)}
          onAdded={onAdded}
          onMembersChange={updateMembers}
        />
      )}
    </main>
  );
}

function ExpensesTab({
  expenses,
  currency,
  onDelete,
}: {
  expenses: ExpenseData[];
  currency: string;
  onDelete: (id: string) => void;
}) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--color-muted)]">
        <p className="mb-1">No expenses yet.</p>
        <p className="text-sm">Tap the + button to add the first one.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {expenses.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-3"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {e.description || "Expense"}
            </div>
            <div className="text-xs text-[var(--color-muted)] mt-0.5">
              <strong className="text-[var(--color-fg)] font-medium">{e.paidBy}</strong>{" "}
              paid for{" "}
              {Array.isArray(e.participants) && e.participants.length > 0
                ? `${e.participants.length} ${e.participants.length === 1 ? "person" : "people"}`
                : "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">{formatMinor(e.amountMinor, currency)}</div>
          </div>
          <button
            onClick={() => onDelete(e.id)}
            aria-label="Delete expense"
            className="!min-h-0 p-2 text-[var(--color-muted)] hover:text-[var(--color-negative)]"
          >
            <Trash2 size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function toSettleExpense(e: ExpenseData): SettleExpense {
  return {
    paidBy: e.paidBy,
    amountMinor: e.amountMinor,
    participants: e.participants,
  };
}

function BalanceTab({
  expenses,
  currency,
}: {
  expenses: ExpenseData[];
  currency: string;
}) {
  const balances = useMemo(() => settle(expenses.map(toSettleExpense)).balances, [expenses]);
  if (balances.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--color-muted)]">
        Add expenses to see balances.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {balances.map((b) => {
        const positive = b.netMinor > 0;
        const zero = b.netMinor === 0;
        return (
          <li
            key={b.name}
            className="flex items-center justify-between rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4"
          >
            <span className="font-medium">{b.name}</span>
            <span
              className={
                zero
                  ? "text-[var(--color-muted)]"
                  : positive
                    ? "text-[var(--color-positive)] font-semibold"
                    : "text-[var(--color-negative)] font-semibold"
              }
            >
              {zero
                ? formatMinor(0, currency)
                : `${positive ? "+" : "−"}${formatMinor(Math.abs(b.netMinor), currency)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SettleTab({
  expenses,
  currency,
}: {
  expenses: ExpenseData[];
  currency: string;
}) {
  const { transfers } = useMemo(
    () => settle(expenses.map(toSettleExpense)),
    [expenses],
  );
  if (transfers.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--color-muted)]">
        All settled up.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {transfers.map((t, i) => (
        <li
          key={i}
          className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4"
        >
          <span className="text-[var(--color-muted)]">
            <strong className="text-[var(--color-fg)]">{t.from}</strong> pays{" "}
            <strong className="text-[var(--color-primary)]">
              {formatMinor(t.amountMinor, currency)}
            </strong>{" "}
            to <strong className="text-[var(--color-fg)]">{t.to}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}
