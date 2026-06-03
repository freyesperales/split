"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidRoomCode } from "@/lib/code";

export function JoinForm() {
  const [code, setCode] = useState("");
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!isValidRoomCode(clean)) {
      setErr("Invalid code");
      return;
    }
    router.push(`/r/${clean}`);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
          Room code
        </label>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setErr(null);
          }}
          placeholder="ABC234"
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 outline-none focus:border-[var(--color-primary)] font-mono tracking-widest uppercase"
        />
      </div>
      {err && <p className="text-sm text-[var(--color-negative)]">{err}</p>}
      <button
        type="submit"
        className="w-full rounded-xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-medium py-3.5 hover:bg-[var(--color-primary)]/5 transition-colors"
      >
        Join with code
      </button>
    </form>
  );
}
