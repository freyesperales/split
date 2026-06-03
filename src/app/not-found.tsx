import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-5 pt-20 text-center">
      <h1 className="text-2xl font-semibold mb-2">Room not found</h1>
      <p className="text-[var(--color-muted)] mb-6">
        That code doesn't match a room. Maybe it expired.
      </p>
      <Link
        href="/"
        className="inline-block rounded-xl bg-[var(--color-primary)] text-white font-medium px-6 py-3"
      >
        Go home
      </Link>
    </main>
  );
}
