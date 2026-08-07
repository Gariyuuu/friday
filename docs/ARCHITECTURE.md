# Architecture

## Today (Phase 0/1)

Everything lives in `apps/dashboard`, a single Next.js 16 App Router application.
There is no backend service yet — no VM, no voice provider, no live data provider.
The app is fully client-rendered for the interactive parts (orb, globe, panels) with
a thin server shell (layout, static settings route) from Next.js.

```
apps/dashboard/src/
  app/                    Routes: "/" (orb + intelligence mode), "/settings"
  components/
    orb/                  The holographic AI core (Three.js / React Three Fiber)
    globe/                The interactive globe + event markers
    intelligence/          Dashboard panels (news, markets, signals, media, detail)
    shell/                 Status bar, command palette, orb stage wrapper
  stores/                  Zustand: orb-store (voice/orb state machine), ui-store (mode, focus, graphics)
  lib/
    intelligence/           Provider interface + mock implementation + data hook
    logger.ts               Structured, redacting logger (spec §49)
    demo.ts                  Demo-only sequence that exercises every orb state
    geo.ts                   lat/lon → 3D position for the globe

packages/types/            Shared Zod schemas — the contract every future backend
                             (news, markets, weather, voice, tools) will conform to.
```

### State machine

`voiceStatus` (offline/connecting/ready/listening/thinking/speaking/executing/error)
is the single source of truth for orb visuals — `voiceStatusToOrbState` in
`@friday/types` maps it to the 8 `OrbState` values from spec §8. Nothing currently
drives `voiceStatus` except the demo sequence (`lib/demo.ts`); Phase 4 wires it to a
real realtime voice provider.

### Data flow (intelligence)

`IntelligenceMode` → `useIntelligenceData()` → `getIntelligenceProvider()` →
`MockIntelligenceProvider`. Every panel receives a `DataFreshness` object alongside
its data and renders it through `FreshnessBadge`, so "is this real, is this fresh"
is never silently lost — see spec §38 and §67 (no fake features). When Phase 3 adds
real providers, `getIntelligenceProvider()` is the only place that changes; no
component needs to know the data source.

## Where things go next (see `docs/IMPLEMENTATION_PLAN.md` for full phasing)

- **Phase 3 (real data)**: new `IntelligenceProvider` implementations behind
  `getIntelligenceProvider()`, gated by whether their API keys are configured.
- **Phase 4 (voice)**: a `services/voice` package or an `apps/dashboard` API route
  bridging to OpenAI Realtime / LiveKit, driving `useOrbStore().setVoiceStatus`.
- **Phase 5 (orchestration)**: an intent router deciding fast-path (direct tool/API
  call) vs. agent-path (VM job) — see spec §29.
- **Phase 6 (local Mac tools)**: a `services/local-tools` process the dashboard talks
  to over a local-only channel, never over the public internet.
- **Phase 8 (cloud VM)**: `services/vm-agent` + `infra/docker` — not started. Per
  spec §24-27 and `docs/SECURITY.md`, this needs its threat model reviewed before any
  code is written, and the VM must never receive credentials that grant it control
  back over the Mac.

## Why no `packages/ui` / `packages/protocol` / `packages/tools` yet

The spec's suggested tree (§5) includes these from day one. They're deliberately
deferred: with a single Next.js app, there's nothing to share into a `ui` package yet,
and `protocol`/`tools` only have a real shape once there's a second process (VM
gateway, local-tools service) to define a contract with. Creating them empty now would
violate the "no fake placeholders" rule (§67) more than it would establish structure.
