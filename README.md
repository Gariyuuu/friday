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
cp .env.example apps/dashboard/.env.local   # optional at this stage — everything runs on mock data without it
pnpm dev
```

Open http://localhost:3000 (or whatever port Next.js picks if 3000 is busy).

- `⌘K` / `Ctrl+K` — command palette
- Command palette → **Run Global Intelligence Brief (Demo)** — exercises every orb
  state and opens Intelligence Mode with the mock data pipeline, standing in for the
  real voice → orchestration flow until Phase 4/5 land.

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

Phase 0 (foundation) and Phase 1 (visual shell: orb, dashboard grid, command palette,
settings, mock intelligence data) are done. No real news/market/weather/voice/AI
providers are wired up yet — everything you see is clearly labeled `DEMO DATA`. See
[`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) for the up-to-date phase status and
what's next.
