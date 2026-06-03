# split

> A no-signup Splitwise alternative for one-off groups. Make a room, share a 6-letter code, settle up in two taps.

You're at dinner with friends. Someone always covers the bill. Splitwise wants an
account, a phone number, an invite link, and a notification opt-in. `split` wants
a room name. Everyone joins by typing a 6-letter code, expenses go in as you eat,
and the "who owes whom" math is done before the check arrives.

[![Status](https://img.shields.io/badge/status-alpha-yellow)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-14%20passing-brightgreen)](#)

## Demo

> _Screenshots / GIF go here. Until then:_

1. Open `/`, name the room, pick a currency, hit **Create**.
2. Share the 6-letter code (e.g. `XK4Q7P`) with the table.
3. Each person opens `/r/XK4Q7P` on their phone, types their name, and starts adding expenses.
4. Tab to **Balance** to see net positions. Tab to **Settle** for the minimum-transfer plan.

## Features

- Zero signup, zero email, zero password — rooms are addressed by short codes
- Equal split or weighted shares per participant
- Live balance view (creditors green, debtors red, sum exactly zero)
- Debt simplification: a greedy max-debtor / max-creditor pairing minimises transfers
- All money math in **integer minor units** — no float drift, leftover cents go to the payer
- Installable PWA (manual service worker, no extra deps)
- iOS Safari "Add to Home Screen" one-time hint
- Polling-based live updates every 4 seconds while the tab is visible
- Rooms auto-expire so the database doesn't grow forever

## Quickstart

```bash
git clone https://github.com/freyesperales/split
cd split
npm install
npm run dev    # opens at http://localhost:3000
```

Visit `http://localhost:3000`, click **Create room**, give it a name and currency,
and share the 6-letter code that appears in the URL. On another device (or another
browser tab) open the landing page, paste the code into **Join room**, and add
yourself as a member. You're ready.

The SQLite file is created automatically at `./data/split.db` on the first
request — no migration step.

## How it works

The data model is two tables: `rooms` (code, name, currency, members JSON, expiry)
and `expenses` (paid_by, amount in minor units, participants JSON, description).
See [`src/lib/db.ts`](src/lib/db.ts) — opens a single `better-sqlite3` connection
with WAL journaling and pins it on `globalThis` so dev-mode HMR doesn't leak
connections.

The interesting math lives in [`src/lib/settle.ts`](src/lib/settle.ts):
`computeBalances()` sums net per person (positive = owed, negative = owes),
attributing rounding remainder to the payer so totals always reconcile to zero.
`simplifyDebts()` then walks the sorted debtors and creditors greedily, pairing
the largest of each until both lists empty. That gives an N-person settlement in
at most N-1 transfers, which is optimal for the common case where balances don't
need to be perfectly netted across cycles.

The route layer ([`src/app/api/rooms/[code]/...`](src/app/api/rooms)) is plain
App Router route handlers. A small in-memory rate limiter
([`src/lib/rate-limit.ts`](src/lib/rate-limit.ts)) keeps drive-by writes in check;
behind a load balancer swap it for Redis. The client
([`src/components/RoomClient.tsx`](src/components/RoomClient.tsx)) polls the room
endpoint every 4 seconds while the page is visible, so phones at the table see
each other's expenses near-instantly.

## Deploy

### Self-host (Node + Caddy/nginx) — recommended

`split` needs a persistent disk for SQLite. Any tiny VPS works:

```bash
npm install --production
npm run build
node --enable-source-maps node_modules/next/dist/bin/next start -p 3000
```

Put Caddy or nginx in front with TLS termination, point it at `http://localhost:3000`,
and back up `./data/split.db` somewhere. That's the whole setup.

### Vercel

Works out of the box — but **SQLite writes are ephemeral** on serverless. Every
cold start gets a fresh filesystem, so rooms vanish unpredictably. Vercel is fine
for demos, not for actual use. Use Fly.io, Railway, a $5 VPS, or anywhere with
a persistent volume mounted at `./data`.

### Docker (sketch)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
VOLUME /app/data
EXPOSE 3000
CMD ["npm","start"]
```

Mount a host volume at `/app/data` and you're done.

## Configuration

| Var               | Required | Default          | Description                                  |
| ----------------- | -------- | ---------------- | -------------------------------------------- |
| `PORT`            | no       | `3000`           | Port for `next start`                        |
| `DATA_DIR`        | no       | `./data`         | Where `split.db` is created (read by db.ts)  |
| `ROOM_TTL_DAYS`   | no       | `30`             | Lifetime before a room is considered expired |

(The current code hardcodes the data directory; the env override is a planned
refactor — see roadmap.)

## Development

```bash
npm run dev          # dev server with hot reload
npm run build        # production build
npm test             # vitest, 14 tests
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

### Project layout

```
src/
├── app/
│   ├── api/rooms/[code]/...   route handlers (GET/POST/PATCH/DELETE)
│   ├── r/[CODE]/page.tsx      room page (expenses/balance/settle tabs)
│   └── page.tsx               landing: create or join
├── components/                React UI (mostly client components)
└── lib/
    ├── db.ts                  better-sqlite3 connection + schema
    ├── settle.ts              debt simplification (pure)
    ├── money.ts               minor-unit helpers
    ├── code.ts                6-letter room code generator (nanoid alphabet)
    └── rate-limit.ts          in-memory token bucket per IP
scripts/
└── gen-icons.mjs              optional PNG icon generation (needs sharp)
```

`lib/` is the pure-logic core — no React, no Next, easy to unit test. The two
test files (`settle.test.ts`, `money.test.ts`) exercise the integer-rounding
edge cases that bit me in the spec.

## Roadmap

- [ ] v0.2: room deletion endpoint + expiry sweep on read
- [ ] v0.2: env-var driven `DATA_DIR` (currently hardcoded)
- [ ] v0.2: server-sent events instead of 4s polling
- [ ] v0.3: optional E2E encryption of expense descriptions
- [ ] v0.3: CSV export per room
- [ ] would-be-nice: a Cloudflare D1 storage adapter for edge deploy

## Contributing

PRs welcome. Quick checklist:

1. Open an issue first if it's a feature so we can align on scope.
2. Run `npm test` and `npm run typecheck` — both green before pushing.
3. Money math goes through `lib/money.ts`. No `Number` arithmetic on currency anywhere else.
4. Keep functions small. No `any`. Comments explain *why*, not what.

## License

[MIT](./LICENSE) © Francisco Reyes
