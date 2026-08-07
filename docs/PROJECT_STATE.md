# Project State

Last updated: 2026-08-06 (session 2 — Phase 3 first increment + Phase 6).

Repo: https://github.com/Gariyuuu/friday (pushed).

## Completed

**Phase 0 — Foundation**
- pnpm + Turborepo monorepo (`apps/dashboard`, `packages/types`, `packages/config`)
- Next.js 16 / React 19 / TypeScript strict, Tailwind v4
- Shared Zod schemas in `@friday/types`: `IntelligenceEvent`, `MarketQuote`,
  `WeatherAlert`, `DataFreshness`, `OrbState`, `VoiceStatus`, `ToolDefinition`,
  `ToolRunRecord`, `ToolPermissionMode`
- Structured logger with category tagging + secret redaction (`lib/logger.ts`)
- Vitest configured, one real test suite (logger)
- `.env.example` covering every phase's future credentials

**Phase 1 — Visual FRIDAY**
- Cinematic dark theme, holographic orb (Three.js/R3F, all 8 states, bloom, graphics
  quality setting), interactive 3D globe with clickable event markers, intelligence
  dashboard grid (news/markets/signals/media/detail panels), command palette,
  settings page. See prior session notes below for detail — unchanged this session.

**Phase 3 — Real Data (first increment)**
- Data fetching moved server-side: `app/api/intelligence/{events,markets,weather}`
  route handlers call `getIntelligenceProvider()` (now `server-only`, was
  client-callable in Phase 1 — a real bug caught this session, see Known issues).
  The client hook (`use-intelligence-data.ts`) fetches these routes instead of
  importing the provider directly.
- **Weather**: live via api.weather.gov (NWS) — no key needed, works today. US
  coverage only. `src/lib/intelligence/sources/weather.ts`
- **Markets — crypto**: live via CoinGecko — no key needed, works today (BTC, ETH
  with real sparklines). `src/lib/intelligence/sources/markets.ts`
- **Markets — equities/FX**: live via Twelve Data once `TWELVE_DATA_API_KEY` is set;
  omitted (not faked) otherwise — the panel just shows crypto-only until then.
- **News**: live via NewsAPI.org once `NEWS_API_KEY` is set (3 category calls:
  technology/business/science); demo data otherwise. `sources/events.ts`. Note:
  NewsAPI's free tier is restricted by their terms to local/dev use, which fits
  FRIDAY running on your own machine.
- Every source falls back to demo data (marked `isMock: true`, status `stale`) on
  fetch failure rather than crashing the panel — spec §47.
- `GET /api/config` reports which integrations are configured (booleans only, never
  secret values) — the Settings → AI/Intelligence sections now show real status
  instead of a hardcoded guess.
- Verified live: real BTC/ETH prices and real active NWS severe-weather alerts
  confirmed via curl and in-browser (Playwright).

**Phase 6 — Local Mac Tools**
- 5 tools implemented end-to-end, all executed via `execFile` with argument arrays
  (never shell string interpolation) and strict Zod-validated input:
  `open_application` (allowlist of 9 apps — `lib/tools/registry.ts`), `open_url`
  (http/https only), `set_volume`/read (AppleScript, integer 0-100), `show_notification`
  (AppleScript with proper quote-escaping), `system_status` (real CPU load, memory,
  battery via `os` module + `pmset`).
- Permission engine (`stores/tool-store.ts`, persisted to localStorage):
  disabled/ask/allow per tool. Low-risk no-confirmation tools default to allow;
  `open_application`/`open_url` default to ask.
- Approval modal (`components/tools/ToolApprovalModal.tsx`) matches spec §23 exactly:
  Allow Once / Always Allow This Tool / Deny.
- Audit log (`ToolRunRecord[]`, capped at 50, in the same persisted store) — visible
  in Settings → Tools → Recent Activity.
- Command palette → Quick Actions: Open VS Code, Open Safari, Open FRIDAY on GitHub,
  Send Test Notification, System Status. All go through the real approval +
  execution path — none are placeholders.
- Verified end-to-end in-browser: approval modal appears for medium-risk tools, Deny
  is recorded in the audit log, no-confirmation tools execute directly and show a
  toast with real data (confirmed actual battery %, memory, CPU load from the machine
  running the dev server).

## Current

Nothing in progress — both increments verified (lint/typecheck/test/build clean,
visually confirmed in-browser) and ready to hand off.

## Next

- **Phase 3 completion**: web search tool (`search_web()`, spec §20) and video
  search (YouTube Data API) are still unbuilt — lower priority since nothing in the
  UI surfaces them yet (they matter more once Phase 5 orchestration exists to call
  them). Geocoding for real news events (so live headlines get globe markers, not
  just crypto/weather) is also open — no geocoding provider chosen yet.
- **Phase 4 (voice)**: needs the user to choose OpenAI Realtime vs. LiveKit and
  supply credentials — see the checklist delivered alongside this update.
- **Phase 5 (orchestration)**: intent routing (fast path vs. agent path) — natural
  next step once voice exists, since right now nothing produces `voiceStatus`
  changes except the demo sequence.
- **Phase 2 finishing touches** (unchanged from last session): auto-focus globe on
  narrated event (depends on Phase 4/5), mobile viewport audit.

## Known issues

- **Fixed this session (real bug, not cosmetic)**: Phase 1's intelligence data hook
  called `getIntelligenceProvider()` directly from a client component. That was safe
  only because Phase 1 was 100% mock data with no secrets involved — the moment
  Phase 3 needed `NEWS_API_KEY`/`TWELVE_DATA_API_KEY`, that pattern would have shipped
  secrets to the browser bundle (a hard "never" per spec §15/CLAUDE.md). Fixed by
  moving all provider calls behind `server-only`-guarded modules called only from
  route handlers, with the client fetching JSON over `/api/intelligence/*` instead.
  Worth knowing for any future data source: never import `lib/intelligence` (or
  `lib/tools/registry`'s execution paths) from a client component.
- `config.ai.anthropic` may show "Connected" in Settings even though nothing in
  FRIDAY set that key — if `ANTHROPIC_API_KEY` happens to be present in the ambient
  shell environment the dev server was started from (e.g. from an unrelated tool),
  `/api/config` will honestly report it as configured even though the user never
  configured it *for FRIDAY*. Not a bug (the code correctly reads
  `process.env.ANTHROPIC_API_KEY`), just a heads-up that this signal isn't proof the
  user deliberately set it up — matters once Phase 5 actually starts using it.
- Twelve Data's field mapping in `sources/markets.ts` (`close`, `change`,
  `percent_change`, `is_market_open`) is written from their documented API shape but
  not tested against a real key (their `demo` key rejects requests) — the equities
  panel gracefully falls back to demo data on any fetch/parse error, so a field-name
  mismatch would degrade to demo data rather than crash, but worth a real smoke test
  once a key is available.
- Carried over: Vitest ESM/CJS config warning (harmless), `next typegen` must run
  before standalone `tsc --noEmit` (already wired into the `typecheck` script).

## Architecture changes since IMPLEMENTATION_PLAN.md

- `lib/intelligence` is now split into client-safe types (`provider.ts`) and
  `server-only` implementation (`index.ts`, `sources/*`) — see Known issues above.
  This wasn't anticipated in the original plan, which assumed the adapter swap would
  be a drop-in replacement; it mostly was, except for the client/server boundary.
- Added `lib/tools/` (registry, approval, run-tool, client) and `stores/tool-store.ts`
  — not explicitly named in `IMPLEMENTATION_PLAN.md`'s Phase 0 layout but exactly
  matches spec §21-23's design.

## Environment variables added

`NEWS_API_KEY`, `TWELVE_DATA_API_KEY` (renamed from the placeholder
`MARKET_DATA_API_KEY`) are now actually consumed. `WEATHER_API_KEY` was removed from
`.env.example` — NWS needs no key. See the checklist delivered alongside this update
for exactly what to do with each one.

## Migration notes

None.
