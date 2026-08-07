# F.R.I.D.A.Y.

Personal Intelligence System — a cinematic, voice-driven personal AI operating layer.
Not a chatbot: a holographic orb interface, a live global-intelligence dashboard, and
(later) a security-isolated cloud agent for autonomous work.

See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the full build plan
and phasing, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the pieces fit
together, [`docs/SECURITY.md`](docs/SECURITY.md) for the threat model, and
[`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) for what's actually done right now.

## Quickstart

```bash
pnpm install
cp .env.example apps/dashboard/.env.local   # optional — crypto + US weather are live with zero config
pnpm dev
```

Open http://localhost:3000 (or whatever port Next.js picks if 3000 is busy).

- `⌘K` / `Ctrl+K` — command palette
- Command palette → **Run Global Intelligence Brief (Demo)** — exercises every orb
  state and opens Intelligence Mode, standing in for the real voice → orchestration
  flow until Phase 4/5 land.
- Command palette → **Quick Actions** — real local Mac tools (open an app, open a
  URL, send a notification, read system status), each going through a real
  permission/approval flow. See `docs/SECURITY.md`.
- Live data today with **zero setup**: crypto prices (CoinGecko) and US severe
  weather alerts (NWS). News and equities/FX need free API keys — see
  `.env.example` and `docs/PROJECT_STATE.md` for exactly where to get them.

## Monorepo layout

```
apps/
  dashboard/        Next.js app — the whole product today
packages/
  types/             Shared Zod schemas (IntelligenceEvent, OrbState, ToolDefinition, ...)
  config/            Shared ESLint base for non-Next.js packages
```

## Commands (run from repo root, via Turborepo)

```bash
pnpm dev         # apps/dashboard dev server
pnpm build       # production build
pnpm lint        # eslint across the workspace
pnpm typecheck   # tsc --noEmit (regenerates Next.js route types first)
pnpm test        # vitest
```

## Current status

Phase 0 (foundation), Phase 1 (visual shell), a first increment of Phase 3 (real
crypto + US weather live now; news + equities/FX activate once their key is set),
and Phase 6 (local Mac tools with a real permission/approval engine) are done. Voice
and AI orchestration aren't wired up yet. See
[`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) for the up-to-date phase status,
known issues, and what's next.
