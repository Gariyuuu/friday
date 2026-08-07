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
  In `desktop:dev` this is a real system-wide shortcut (works even when FRIDAY
  isn't focused); in a browser tab it only works while the tab has focus. Ask it
  to open an app, check the weather, read the news, search the web, or check
  system status — it actually calls those tools and answers with real data,
  verified end-to-end including a cross-checked-against-`pmset` battery reading.
- `⌘K` / `Ctrl+K` — command palette
- Command palette → **Quick Actions** — real local Mac tools (open an app, open a
  URL, send a notification, read system status), each going through a real
  permission/approval flow — the same one voice uses. See `docs/SECURITY.md`.
- Settings → **Input** — opt-in webcam hand-gesture control of the globe (pinch to
  rotate, two-hand pinch to zoom, open palm to reset view). Off by default; the
  camera is never touched until you turn it on.
- Settings → **General** (native app only) — auto-launch FRIDAY at login.
- `pnpm desktop:dev` also adds a menu bar tray icon (Show/Quit).
- **Add to Dock** (Safari → File → Add to Dock) — installs FRIDAY as a standalone
  app window with its own icon, no browser chrome. (Or use `pnpm desktop:dev` for
  a real native app with the extras above.)
- Live data today with **zero setup**: crypto prices (CoinGecko) and US severe
  weather alerts (NWS). News, equities/FX, web search, and video search need free
  API keys — see `.env.example` and `docs/PROJECT_STATE.md` for exactly where to
  get them.

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

Every phase except 8/9 (cloud VM — asked the user, held off for now) is done and
either verified live or verified as thoroughly as this environment allows: voice
can actually call FRIDAY's real tools (including web/video search and focusing a
specific news event) and answer with real data, confirmed against ground truth;
the native app has a real menu bar icon, system-wide global shortcut, and
auto-launch; and opt-in webcam gesture control drives the globe with zero errors
in every part of the pipeline that doesn't require an actual human hand to verify.
See [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) for the up-to-date phase
status, known issues, and what's next (a short list of things that need the
user — API keys for search/video, one manual autostart click, gesture feel).
