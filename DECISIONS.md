# Decisions (ADR-style log)

Dated architectural decisions. Entries marked **(inferred)** were
reconstructed from code/docs/git history, not found as an explicit
first-person decision record — flagged as such rather than presented as
certain.

## 2026-08-06 — Monorepo: pnpm workspaces + Turborepo

Chosen over a single-package app for future multi-app growth
(`apps/dashboard`, `packages/types`, `packages/config`) while staying
lightweight — matches the Node tooling already on the machine. Source:
`docs/IMPLEMENTATION_PLAN.md`.

## 2026-08-06 — Next.js App Router + React 19 + TypeScript strict

Chosen for fast iteration and a clear path to native packaging (Tauri) later.
Source: `docs/IMPLEMENTATION_PLAN.md`'s stack table.

## 2026-08-06 — Voice provider: OpenAI Realtime API over LiveKit

Chosen because it needs no separate server/infrastructure to run and is
cheaper for personal, low-volume use. LiveKit and Gemini Live were both
considered and explicitly revisited later (Gemini Live investigated after
initial build; user chose to keep the OpenAI integration already built).
Source: `.env.example`, `CHANGELOG.md` 0.4.0.

## 2026-08-06 — Client/server split for `lib/intelligence` and `lib/tools`

Not present in the very first build (Phase 1 called the provider directly
from a client hook) — became a real requirement the moment Phase 3 added
`NEWS_API_KEY`, since a client-side call would have shipped the key to the
browser. Source: `ARCHITECTURE.md`'s "client/server boundary" section.

## 2026-08-06 — Tauri points at a live Next.js server, not a static export

The app has ~10 API routes that a static `next export` cannot include —
bundling static files (Tauri's simpler default) would have silently broken
nearly everything already built. Source: `ARCHITECTURE.md`.

## 2026-08-07 — Local SQLite (`node:sqlite`) for memory, not a hosted DB

A personal, single-user app doesn't need hosted-database infrastructure yet.
Deliberate scope-down from the original spec's eventual Postgres/pgvector
target; revisit if/when multi-device sync or semantic search over memories
matters. Source: `PROJECT_STATE.md` Phase 7 notes.

## 2026-08-07 — Cloud VM: DigitalOcean, provisioned only after explicit user approval

Per `CLAUDE.md`'s "never provision paid infrastructure without explicit
go-ahead" rule — the user was asked (via AskUserQuestion, per session notes)
to pick a provider and budget, then separately supplied a real DO token
in-memory only. Source: `PROJECT_STATE.md` Phase 8 notes, `CLAUDE.md`.

## 2026-08-07 — VM task channel: SSH, not a public HTTPS gateway

The original spec sketch assumed HTTPS/WSS + bearer tokens. Built as SSH
instead: the droplet's firewall is already default-deny with only SSH open,
so this needs zero new open ports; SSH's key-based auth is already
hardened; and a personal single-client/single-server tool doesn't need a
general HTTP API's flexibility. Documented as a deliberate deviation from
the original design per this project's own "never silently replace an
architectural decision" rule. Source: `PROJECT_STATE.md`/`SECURITY.md`
Phase 9 sections.

## 2026-08-07 — `run_on_vm` gets a `critical` risk tier, no "Always Allow"

Closes a gap the security doc had flagged since Phase 6 ("no tool currently
reaches high/critical risk; if one is added, it should not be settable to
allow without a distinct warning"). Every VM execution requires individual
approval with no way to pre-authorize future calls, unlike lower-risk
tools. Source: `SECURITY.md`'s "Tool risk model."

## 2026-08-07 — Browser automation shares `run_on_vm`'s registry entry, not a separate tool **(inferred, but explicit in commit `1769221`'s message)**

`browse_on_vm` uses the same critical-risk registry entry and approval
profile as the shell task type, since it's the same execution surface and
risk level, just a different task shape — a deliberate choice to avoid
registry sprawl for what's conceptually one capability.

## 2026-08-07 — VM host/user moved from a hardcoded constant to env vars

`lib/vm/config.ts` originally hardcoded the droplet's public IP and SSH
username directly in source, committed to a public GitHub repo. Changed
(commit `1769221`) to read `VM_HOST`/`VM_USER` from the environment instead
— real infrastructure-identifying information shouldn't be a source
constant, even though the forced-command SSH restriction means knowing the
IP alone doesn't grant access. The IP remains visible in this repo's git
history from before the change — not addressed (rewriting history was
judged out of scope and destructive).

## 2026-08-07 — Docs restructured from `docs/*.md` to canonical root-level files **(this documentation session's own decision)**

Moved `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/SECURITY.md` to
the repo root and created the remaining canonical documentation files
(`TASKS.md`, `HANDOFF.md`, `SESSION_LOG.md`, `FEATURES.md`, `DATABASE.md`,
`DEPLOYMENT.md`, `TESTING.md`, `DECISIONS.md`, `FILE_MAP.md`, `ROADMAP.md`,
`UI_SYSTEM.md`) at the root, matching this user's standard 17-file
documentation convention across their other projects. `docs/
IMPLEMENTATION_PLAN.md` was deliberately left in `docs/` as a historical
planning artifact rather than moved, since it isn't one of the 17 canonical
files and reads as a point-in-time spec rather than a living doc.

## 2026-08-07 — Application-layer SSRF guard added as defense-in-depth, not a replacement for the VM-side mitigation **(inferred from code + commit message)**

`lib/vm/ssrf-guard.ts` was added even though a VM-side Docker-network-layer
mitigation was already claimed to exist, on the reasoning that a second,
independent layer (checked from the Mac, before a request ever reaches the
VM) still has value if the VM-side layer is ever lost to a rebuild,
migration, or Docker restart wiping the iptables chain.
