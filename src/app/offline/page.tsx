export const dynamic = "force-static";

export default function Offline() {
  return (
    <main className="mx-auto max-w-md px-5 pt-20 text-center">
      <h1 className="text-2xl font-semibold mb-2">You're offline</h1>
      <p className="text-[var(--color-muted)]">
        split needs a connection to sync. Your last view of any room you've opened
        is still available.
      </p>
    </main>
  );
}
