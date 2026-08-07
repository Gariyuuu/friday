# Architecture

## Today (Phase 0/1/3-first-increment/6)

Everything lives in `apps/dashboard`, a single Next.js 16 App Router application —
still no separate VM or voice service. What's changed since the initial build: real
data now flows through server-side route handlers (not client components), and local
Mac tools are real, executed by the same Next.js server process.

```
apps/dashboard/src/
  app/
    "/"                     Orb + Intelligence Mode (client)
    "/settings"              Settings (client)
    api/intelligence/*/       Route handlers: events, markets, weather (server)
    api/tools/*/               Route handlers: open-application, open-url, volume,
                                notification, system-status (server)
    api/config/                Reports which integrations are configured (booleans only)
  components/
    orb/                      The holographic AI core (Three.js / React Three Fiber)
    globe/                    The interactive globe + event markers
    intelligence/              Dashboard panels (news, markets, signals, media, detail)
    shell/                     Status bar, command palette, orb stage wrapper, toast
    tools/                     Tool approval modal
  stores/                      Zustand: orb-store, ui-store, tool-store (persisted), toast-store
  lib/
    intelligence/
      provider.ts               Shared types (client-safe, no secrets)
      index.ts                  server-only: AutoIntelligenceProvider, picks live vs mock per feed
      sources/                  server-only: weather.ts (NWS), markets.ts (CoinGecko+Twelve Data),
                                  events.ts (NewsAPI), mock-data.ts (shared demo data)
      use-intelligence-data.ts  client hook — fetches /api/intelligence/*, never imports a provider
    tools/
      registry.ts                Tool definitions + app allowlist + default permissions
      approval.ts                Promise-based bridge between "ask" mode and the approval modal
      run-tool.ts                The one path every tool call goes through (permission → approval → audit log → execute)
      client.ts                  Typed wrappers calling /api/tools/* through run-tool
    logger.ts                    Structured, redacting logger
    demo.ts                      Demo-only sequence exercising every orb state

packages/types/                Shared Zod schemas — the contract every backend conforms to
```

### The client/server boundary (read this before adding a new data source or tool)

`lib/intelligence/{index.ts,sources/*}` and the execution side of `lib/tools/*` start
with `import "server-only"`. That's not decoration — Next.js will throw a build error
if anything under those imports ends up in a client bundle, which is the guardrail
against accidentally shipping `NEWS_API_KEY` or `TWELVE_DATA_API_KEY` to the browser.
**Never import these from a component.** Client code talks to `/api/intelligence/*`
and `/api/tools/*` over `fetch`, always. `lib/intelligence/provider.ts` (just types)
and `lib/tools/registry.ts` (just definitions + the allowlist, no execution) are the
exception — they're safe for either side because they hold no secrets and do nothing.

This split didn't exist in the very first build (Phase 1 called the provider directly
from a client hook) because Phase 1 had no secrets to leak. It became a real
requirement the moment Phase 3 added `NEWS_API_KEY` — see `docs/PROJECT_STATE.md`'s
Known Issues for the full story.

### State machine

`voiceStatus` (offline/connecting/ready/listening/thinking/speaking/executing/error)
is the single source of truth for orb visuals — `voiceStatusToOrbState` in
`@friday/types` maps it to the 8 `OrbState` values from spec §8. Nothing currently
drives `voiceStatus` except the demo sequence (`lib/demo.ts`); Phase 4 wires it to a
real realtime voice provider.

### Data flow (intelligence)

`IntelligenceMode` → `useIntelligenceData()` → `fetch("/api/intelligence/*")` → route
handler → `getIntelligenceProvider()` → per-feed source (live-if-configured-else-mock,
with graceful fallback on fetch failure). Every panel receives a `DataFreshness`
object alongside its data — `isMock` and `status` are never faked, so "is this real,
is this fresh" is always visible (spec §38, §67).

### Data flow (tools)

Command palette / any future caller → `lib/tools/client.ts` wrapper → `runTool()` →
permission check (`tool-store`) → approval modal if "ask" → `fetch("/api/tools/*")` →
route handler validates with Zod → `execFile` (never a shell string) → result →
audit log entry in `tool-store`, visible in Settings → Tools.

## Where things go next (see `docs/IMPLEMENTATION_PLAN.md` for full phasing)

- **Phase 3 completion**: web search tool, video search, geocoding for live news
  events (so real headlines get a globe marker, not just crypto/weather).
- **Phase 4 (voice)**: a realtime provider bridge (OpenAI Realtime or LiveKit)
  driving `useOrbStore().setVoiceStatus` — needs the user's provider choice + keys.
- **Phase 5 (orchestration)**: an intent router deciding fast-path (direct tool/API
  call) vs. agent-path (VM job) — see spec §29. This is what will actually start
  using the AI provider keys the Settings page already reports on.
- **Phase 8 (cloud VM)**: `services/vm-agent` + `infra/docker` — not started. Per
  spec §24-27 and `docs/SECURITY.md`, this needs its threat model reviewed before any
  code is written, and the VM must never receive credentials that grant it control
  back over the Mac.

## Why no `packages/ui` / `packages/protocol` / `packages/security` yet

The spec's suggested tree (§5) includes these from day one. `packages/tools` doesn't
exist either, but its equivalent (`apps/dashboard/src/lib/tools`) is real now — it
just didn't need to be a separate workspace package since nothing outside
`apps/dashboard` calls it yet. `ui`/`protocol`/`security` stay deferred: with one
Next.js app there's nothing to share into a `ui` package, and `protocol`/`security`
only have real shape once there's a second process (the VM) to define a contract
with. Creating them empty now would violate the "no fake placeholders" rule (§67)
more than it would establish structure.
