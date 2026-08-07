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

Open http://localhost:3000 (or whatever port Next.js picks if 3000 is busy) — or,
for a real native window instead of a browser tab:

```bash
cd apps/dashboard
pnpm desktop:dev   # first run compiles Rust (~1 min, one-time); opens a real macOS window
```

- `⌥ + Space` — talk to FRIDAY (real OpenAI Realtime voice, needs `OPENAI_API_KEY`).
  Ask it to open an app, check the weather, read the news, or check system status —
  it actually calls those tools and answers with real data, verified end-to-end
  including a cross-checked-against-`pmset` battery reading.
- `⌘K` / `Ctrl+K` — command palette
- Command palette → **Quick Actions** — real local Mac tools (open an app, open a
  URL, send a notification, read system status), each going through a real
  permission/approval flow — the same one voice uses. See `docs/SECURITY.md`.
- **Add to Dock** (Safari → File → Add to Dock) — installs FRIDAY as a standalone
  app window with its own icon, no browser chrome.
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

Phases 0, 1, 3, 4 (voice), 5 (orchestration), 6 (local tools), 7 (memory), and 11
(native app — `pnpm desktop:dev`) are all done and verified live — voice can
actually call FRIDAY's real tools and answer with real data, confirmed against
ground truth, and the native window is a real compiled app, not a mockup. Not
started: Phase 8/9 (cloud VM — asked the user, held off for now), Phase 10
(gestures). See [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) for the
up-to-date phase status, known issues, and what's next.
