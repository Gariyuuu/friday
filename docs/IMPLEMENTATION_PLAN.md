# F.R.I.D.A.Y. — Implementation Plan

Personal Intelligence System. Codename `project-friday`, repo dir `friday`.

## Environment (checked 2026-08-06)

- macOS, Apple Silicon (arm64)
- Node v26.3.0, npm 11.16, pnpm 11.20 — good, no upgrade needed
- Python 3.9.6 (system) + uv 0.12.1 available — uv will manage any Python worker envs later, system 3.9 is not otherwise relied on
- git 2.39.5
- Docker: not installed — irrelevant until Phase 8 (VM), not blocking now
- No existing project at `~/Projects/friday`

## Stack decisions

| Concern | Choice | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | lightweight, matches Node tooling already on machine |
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript strict | matches spec §6, fast iteration, good Tauri/Electron packaging path later |
| Styling | Tailwind CSS v4 | utility velocity, easy to keep the restrained cinematic palette consistent |
| 3D orb / globe | Three.js + React Three Fiber + drei + postprocessing | spec §6/§8/§14 explicitly call for these |
| Motion | Framer Motion (`motion`) | panel/transition choreography |
| State | Zustand | small, no boilerplate, fine for orb/voice/UI state machines |
| Command palette | `cmdk` | spec §35 |
| Validation | Zod | shared schemas for intelligence events + later FRIDAY protocol (§55) |
| Testing | Vitest + Testing Library; Playwright deferred to when there's real UI flow worth E2E-testing | spec §51 |
| Desktop packaging | Deferred decision (Tauri preferred per §6) — revisited at Phase 11 | not needed until the web app is proven |

Deliberate omission for now: `packages/ui`, `packages/protocol`, `packages/tools`, `packages/security`, and all of `services/*` from the spec's suggested tree (§5). Creating them empty today would violate rule §67 (no fake placeholders) and §18/19 (no premature abstraction) — a single Next.js app doesn't need a UI package to import from yet. They get created when the phase that needs them starts (tools → Phase 6, voice → Phase 4, VM/protocol → Phase 8).

## Monorepo layout (what's actually being created now)

```
friday/
  apps/
    dashboard/          # Next.js app — the whole product for now
  packages/
    types/               # IntelligenceEvent and other shared schemas (Zod)
    config/              # shared tsconfig base
  docs/
    IMPLEMENTATION_PLAN.md
    ARCHITECTURE.md
    SECURITY.md
    PROJECT_STATE.md
  CLAUDE.md
  CHANGELOG.md
  README.md
  turbo.json
  pnpm-workspace.yaml
  package.json
```

## Phasing (per master spec §71)

Executing in this order, verifying (build/lint/typecheck) after each:

- **Phase 0 — Foundation**: monorepo, TS, lint/format, shared types, env system, logging, test framework. *(this session)*
- **Phase 1 — Visual FRIDAY**: app shell, orb + all 8 states, dashboard shell, command palette, basic settings, mock intelligence data behind an adapter, animation system. *(this session, as far as time allows)*
- **Phase 2 — Intelligence dashboard**: globe, event markers, news/market/media panels, contextual layout. *(next session)*
- **Phase 3 — Real data**: live news/search/market/weather providers replacing mocks. *(needs API keys — stops for user input)*
- **Phase 4 — Voice**: realtime provider integration. *(needs API keys/provider choice — stops for user input)*
- **Phase 5 — AI orchestration**: intent routing, tool calling, global brief flow.
- **Phase 6 — Local Mac tools + permission engine**.
- **Phase 7 — Memory**.
- **Phase 8 — Cloud VM**: gateway, Docker stack, isolation. *(needs a rented VM — stops for user input, documented threat model required first per §77-80)*
- **Phase 9 — VM tools** (Playwright/Python workers).
- **Phase 10 — Gestures** (MediaPipe, opt-in webcam).
- **Phase 11 — Desktop packaging** (Tauri/Electron decision finalized here).
- **Phase 12 — Polish**.

## What stops for explicit user input (per master prompt §88)

- Any paid service provisioning (VM rental, market/news API subscriptions)
- Any credential/API key entry
- macOS permission prompts (mic, webcam, notifications) — user must click through
- GitHub remote creation / push (repo will exist locally first; matches this user's existing workflow of pushing `~/Projects` subfolders as separate repos)

## Risks

- Realtime voice latency/cost is the highest-uncertainty piece — deferred until dashboard UX is proven per spec §87 priority order.
- Three.js perf on integrated rendering — mitigated with the Balanced/Cinematic graphics setting from spec §39, adaptive effects, and pausing render loop when tab hidden.
- Scope is enormous (91-section spec). This plan explicitly sequences it so each session ends with something real and running, not partial scaffolding across many phases.

Proceeding to Phase 0 now, no further confirmation needed unless one of the stop conditions above is hit.
