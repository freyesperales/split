"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { parseAmountToMinor, decimalsFor } from "@/lib/money";
import type { ExpenseData, RoomData } from "./RoomClient";

type Mode = "equal" | "custom";

export function AddExpenseModal({
  room,
  onClose,
  onAdded,
  onMembersChange,
}: {
  room: RoomData;
  onClose: () => void;
  onAdded: (e: ExpenseData) => void;
  onMembersChange: (members: string[]) => void;
}) {
  const [members, setMembers] = useState<string[]>(room.members);
  const [addName, setAddName] = useState("");
  const [paidBy, setPaidBy] = useState<string>(room.members[0] ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(room.members));
  const [mode, setMode] = useState<Mode>("equal");
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const decimals = decimalsFor(room.currency);

  const addMember = () => {
    const name = addName.trim();
    if (!name) return;
    if (members.includes(name)) {
      setAddName("");
      return;
    }
    const next = [...members, name];
    setMembers(next);
    setSelected((s) => new Set([...s, name]));
    if (!paidBy) setPaidBy(name);
    setAddName("");
    onMembersChange(next);
  };

  const toggle = (name: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const submit = async () => {
    setErr(null);
    if (!paidBy) {
      setErr("Pick who paid.");
      return;
    }
    const amountMinor = parseAmountToMinor(amount, room.currency);
    if (amountMinor === null || amountMinor <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    const chosen = Array.from(selected);
    if (chosen.length === 0) {
      setErr("Pick at least one participant.");
      return;
    }

    let participants: ExpenseData["participants"];
    if (mode === "equal") {
      participants = chosen;
    } else {
      const weighted = chosen.map((name) => {
        const raw = (customShares[name] ?? "0").trim();
        const v = Number(raw.replace(",", "."));
        return { name, share: Number.isFinite(v) && v > 0 ? v : 0 };
      });
      const totalShare = weighted.reduce((s, p) => s + p.share, 0);
      if (totalShare <= 0) {
        setErr("Custom amounts must be positive.");
        return;
      }
      participants = weighted.filter((p) => p.share > 0);
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidBy,
          amountMinor,
          participants,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErr(body.error || "Could not add");
        return;
      }
      const { id, createdAt } = await res.json();
      onAdded({
        id,
        paidBy,
        amountMinor,
        participants,
        description: description.trim() || null,
        createdAt,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] slide-up">
        <div className="sticky top-0 bg-[var(--color-bg)] flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold">New expense</h2>
          <button onClick={onClose} aria-label="Close" className="!min-h-0 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {members.length === 0 && (
            <div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-4 text-sm">
              <p className="mb-3 text-[var(--color-muted)]">
                Add at least one person to get started.
              </p>
              <MemberAdder
                value={addName}
                setValue={setAddName}
                onAdd={addMember}
              />
            </div>
          )}

          {members.length > 0 && (
            <>
              <Field label="Description">
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Pizza, taxi, ..."
                  maxLength={140}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 outline-none focus:border-[var(--color-primary)]"
                />
              </Field>

              <Field label="Amount">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder={decimals === 0 ? "12500" : "12.50"}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 outline-none focus:border-[var(--color-primary)] text-lg font-medium"
                />
              </Field>

              <Field label="Paid by">
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 outline-none focus:border-[var(--color-primary)]"
                >
                  {members.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>

              <Field label="Split between">
                <div className="space-y-1.5">
                  {members.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] px-3 py-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(m)}
                        onChange={() => toggle(m)}
                        className="!min-h-0 w-5 h-5 accent-[var(--color-primary)]"
                      />
                      <span className="flex-1">{m}</span>
                      {mode === "custom" && selected.has(m) && (
                        <input
                          value={customShares[m] ?? ""}
                          onChange={(e) =>
                            setCustomShares((s) => ({ ...s, [m]: e.target.value }))
                          }
                          inputMode="decimal"
                          placeholder="0"
                          className="!min-h-0 w-20 text-right rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setMode("equal")}
                    className={`!min-h-0 flex-1 py-2 rounded-lg text-sm ${
                      mode === "equal"
                        ? "bg-[var(--color-primary)] text-white"
                        : "border border-[var(--color-border)]"
                    }`}
                  >
                    Equal split
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("custom")}
                    className={`!min-h-0 flex-1 py-2 rounded-lg text-sm ${
                      mode === "custom"
                        ? "bg-[var(--color-primary)] text-white"
                        : "border border-[var(--color-border)]"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </Field>

              <Field label="Add another person">
                <MemberAdder value={addName} setValue={setAddName} onAdd={addMember} />
              </Field>
            </>
          )}

          {err && <p className="text-sm text-[var(--color-negative)]">{err}</p>}

          <button
            onClick={submit}
            disabled={busy || members.length === 0}
            className="w-full rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-3.5 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function MemberAdder({
  value,
  setValue,
  onAdd,
}: {
  value: string;
  setValue: (s: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder="Name"
        maxLength={40}
        className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 outline-none focus:border-[var(--color-primary)]"
      />
      <button
        type="button"
        onClick={onAdd}
        className="!min-h-0 px-4 rounded-xl bg-[var(--color-primary)] text-white font-medium"
      >
        Add
      </button>
    </div>
  );
}
