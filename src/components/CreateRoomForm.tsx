"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

export function CreateRoomForm() {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("CLP");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    start(async () => {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "Untitled bill", currency }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Could not create" }));
        setErr(body.error || "Could not create");
        return;
      }
      const { code } = await res.json();
      router.push(`/r/${code}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
          What's this for?
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Saturday dinner"
          maxLength={60}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 outline-none focus:border-[var(--color-primary)]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
          Currency
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 outline-none focus:border-[var(--color-primary)]"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      {err && <p className="text-sm text-[var(--color-negative)]">{err}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-3.5 transition-colors disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create new bill"}
      </button>
    </form>
  );
}
