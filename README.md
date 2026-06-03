# split

A tiny, no-signup Splitwise alternative. Make a room, share the 6-letter code,
add expenses on phones during dinner. Installable as a PWA.

## Stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind 4
- `better-sqlite3` at `./data/split.db`
- Pure SW (no `next-pwa` dep) + Web App Manifest
- vitest

## Develop

```
npm install
npm run dev      # http://localhost:3000
npm run build
npm run test     # vitest
npm run typecheck
```

The SQLite file lives in `./data/split.db` and is created on first request.

## Routes

- `/` — landing (create or join)
- `/r/[CODE]` — room with three tabs: expenses, balance, settle
- `/api/rooms` `POST` — create
- `/api/rooms/[code]` `GET`/`PATCH` — fetch / update members
- `/api/rooms/[code]/expenses` `POST` — add
- `/api/rooms/[code]/expenses/[id]` `DELETE` — remove

## Debt simplification

`src/lib/settle.ts` runs a greedy max-debtor / max-creditor pairing on integer
minor units. See `src/lib/settle.test.ts` for the worked example from the spec.

## PWA

- `public/manifest.json` + `public/sw.js` (manual, ~50 lines).
- SVG icon at `public/icon.svg`; run `node scripts/gen-icons.mjs` to also produce
  PNG fallbacks if you `npm i -D sharp` first.
- iOS-Safari users get a one-time "Add to Home Screen" hint.

## Limits / cut

- Single-node rate limit (in-memory). Behind a load balancer use Redis.
- No background sync / mutation queue — we noted offline reads only.
- No real-time push; the room page polls every 4s while visible.
- No room deletion endpoint; cron is your friend, or sweep expired rows on read.
