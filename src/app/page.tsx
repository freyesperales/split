import Link from "next/link";
import { Plus, KeyRound, Receipt } from "lucide-react";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import { JoinForm } from "@/components/JoinForm";

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-5 pt-10 pb-24">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] grid place-items-center">
            <Receipt size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">split</h1>
        </div>
        <p className="text-[var(--color-muted)] mt-3 leading-relaxed">
          Share a dinner bill without anyone signing up. Create a room, share the
          6-letter code, everyone adds expenses.
        </p>
      </header>

      <section className="space-y-3 mb-10">
        <CreateRoomForm />
        <div className="relative py-2">
          <div className="border-t border-[var(--color-border)]" />
          <span className="absolute inset-x-0 -top-2 text-center">
            <span className="bg-[var(--color-bg)] px-3 text-xs text-[var(--color-muted)]">
              or
            </span>
          </span>
        </div>
        <JoinForm />
      </section>

      <section className="space-y-4 text-sm text-[var(--color-muted)]">
        <Bullet icon={<Plus size={16} />} title="No signup">
          Every room is a shareable code. No email, no password.
        </Bullet>
        <Bullet icon={<KeyRound size={16} />} title="Code = access">
          Whoever has the code can add expenses. Don't share it publicly.
        </Bullet>
        <Bullet icon={<Receipt size={16} />} title="Auto-expires in 30 days">
          Rooms are deleted after a month of inactivity.
        </Bullet>
      </section>

      <footer className="mt-12 text-center text-xs text-[var(--color-muted)]">
        <Link href="/" className="underline">split</Link> — open source ·
        works offline once installed
      </footer>
    </main>
  );
}

function Bullet({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-[var(--color-primary)]">{icon}</div>
      <div>
        <div className="text-[var(--color-fg)] font-medium">{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}
