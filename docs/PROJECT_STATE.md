# Project State

Last updated: 2026-08-06 (initial build session).

## Completed

**Phase 0 — Foundation**
- pnpm + Turborepo monorepo (`apps/dashboard`, `packages/types`, `packages/config`)
- Next.js 16 / React 19 / TypeScript strict, Tailwind v4
- Shared Zod schemas in `@friday/types`: `IntelligenceEvent`, `MarketQuote`,
  `WeatherAlert`, `DataFreshness`, `OrbState`, `VoiceStatus`, `ToolDefinition`,
  `ToolRunRecord`
- Structured logger with category tagging + secret redaction (`lib/logger.ts`)
- Vitest configured, one real test suite (logger)
- `.env.example` covering every phase's future credentials

**Phase 1 — Visual FRIDAY**
- Cinematic dark theme (near-black void, glass panels, restrained ice-cyan accent)
- Holographic orb (Three.js / R3F): core + dual wireframe shells + 3 orbital rings +
  particle field, all 8 states (idle/listening/thinking/searching/executing/
  speaking/error/success), bloom post-processing, graphics quality setting
  (low/balanced/cinematic), respects `prefers-reduced-motion`
- Interactive 3D globe: wireframe lat/long sphere, category-colored event markers,
  rotate + zoom via OrbitControls, click-to-focus
- Intelligence dashboard grid: news, markets (with sparklines), global signals
  (weather alerts + category tally), media (honest "not configured" state), event
  detail panel with sources
- Mock intelligence data adapter behind a swappable `IntelligenceProvider` interface,
  every panel shows `DataFreshness` (live/loading/stale/unavailable + `DEMO DATA` tag)
- Command palette (⌘K/Ctrl+K via `cmdk`) with navigation + a demo action that
  exercises the full orb state sequence and opens Intelligence Mode
- Settings page with 9 sections per spec §45; every unconfigured integration says so
  honestly instead of showing a non-functional control
- Verified: lint, typecheck, vitest, and `next build` all pass clean; visually
  checked in a real browser (Playwright + Chromium) — see "Known issues" for the one
  bug found and fixed during that check

## Current

Nothing in progress — Phase 1 is in a clean, verified state, ready to hand off.

## Next (Phase 2 — Intelligence Dashboard, per `docs/IMPLEMENTATION_PLAN.md`)

Most of what Phase 2 asks for (globe, markers, news/market/media panels, contextual
layout, event focus) already exists from Phase 1 being built slightly ahead of plan.
What's still open before calling Phase 2 done:
- Auto-focus the globe on the event currently being narrated (depends on Phase 4/5
  voice+orchestration existing to know what's being narrated — likely gets finished
  alongside those phases rather than standalone)
- Broader mobile/narrow-viewport layout pass (current grid has sane breakpoints but
  hasn't been audited on a real small screen)
- Decide whether Phase 3 (real data) or the rest of Phase 2 goes first — recommend
  Phase 3, since the dashboard shell is already solid and real data will surface UI
  gaps mock data can't.

## Known issues

- **Fixed during this session**: Bloom post-processing (`@react-three/postprocessing`)
  at a low `luminanceThreshold` bloomed the orb's entire wireframe/particle field
  uniformly, reading as a hard-edged glowing box instead of a restrained core glow.
  Root cause: unlit `MeshBasicMaterial`/`PointsMaterial` render at full brightness
  regardless of opacity, so nearly everything exceeded a low threshold. Fixed by
  raising `luminanceThreshold` to 0.6 and lowering `luminanceSmoothing`/`radius` so
  only the emissive core blooms. See `src/components/orb/Orb.tsx`.
- Vitest prints a harmless warning about `vitest.config.ts` being ESM-in-CJS
  (`configLoader: 'native'` future default) — not fixed, low priority, doesn't affect
  test correctness.
- `next typegen` must run before `tsc --noEmit` works standalone (route types like
  `LayoutProps<"/">` are generated, not shipped) — already wired into the
  `typecheck` script, just noting it so a future session doesn't "fix" it by removing
  the type usage.

## Architecture changes since IMPLEMENTATION_PLAN.md

None — built as planned. `packages/ui`/`protocol`/`tools`/`security` and all
`services/*` remain deliberately not created yet (see `docs/ARCHITECTURE.md`'s
"Why no packages/ui..." section).

## Environment variables added

All documented in `.env.example`; none are consumed by code yet (Phase 1 is 100%
mock data, gated by nothing — there's no real/mock branch to gate until Phase 3 adds
a real provider to branch against).

## Migration notes

None yet.
