# Handoff

Start here if you're picking up F.R.I.D.A.Y. cold, in a new Claude Code
account/session with no memory of prior conversations.

## What this project is

A cinematic, voice-driven personal AI operating layer — not a chatbot. A
holographic 3D orb interface, a live global-intelligence dashboard, real
local Mac tool execution, real voice (OpenAI Realtime), and a real cloud VM
for sandboxed remote task execution over SSH. Single Next.js 16 app
(`apps/dashboard`) in a pnpm/Turborepo monorepo, wrapped in a native macOS
shell via Tauri.

## Read in this order

1. **`CLAUDE.md`** — operating manual, conventions, "NEVER" rules. The
   VM/SSH exec channel rules here are the ones most likely to matter if
   you're about to touch `lib/vm/*` or `lib/tools/*`.
2. **`PROJECT_STATE.md`** — exact current stopping point.
3. **`SECURITY.md`** — the threat model, including the three-layer SSRF
   story for `browse_on_vm` (Mac-side guard, VM-side iptables, and a
   browser-launched forward proxy that also covers redirect-based SSRF —
   read the "Phase 8/9 status" section for why the proxy exists).
4. **`ARCHITECTURE.md`** — how the pieces fit together, especially the
   client/server boundary and the VM task-execution data flow.
5. **`FEATURES.md`** — phase-by-phase status table, what's actually
   verified vs. built-but-unverified.
6. **`TASKS.md`** — what's actively blocked, queued, or needs the user.

Everything else (`FILE_MAP.md`, `DATABASE.md`, `DEPLOYMENT.md`,
`TESTING.md`, `DECISIONS.md`, `ROADMAP.md`, `UI_SYSTEM.md`, `SESSION_LOG.md`,
`CHANGELOG.md`, `README.md`) is reference material — dip into whichever is
relevant to the task at hand.

## Current biggest open items

Phase 9 (`run_on_vm`/`browse_on_vm`) has no more explicitly flagged open
scope as of the most recent session — both task types, multi-step browser
interaction, the Quick Actions UI (including a step-builder and a results
panel), and a three-layer SSRF defense are all built and live-verified via
direct SSH sessions against the real droplet, repeated across sessions. See
`PROJECT_STATE.md`'s `## Next` section for what's actually still open —
mainly `pnpm desktop:build` (a distributable signed bundle, needs a bundled
Node server sidecar) and two items that need the user directly (gesture
feel with a real hand, the autostart toggle click).

## Secrets and credentials

Never write real secret values into any documentation file — placeholders
only. `.env.example` documents every variable this project reads; the real
values live in `apps/dashboard/.env.local` (gitignored) or the user's own
memory/password manager. `~/.friday/vm_agent_key` (the VM's dedicated SSH
key) and `~/.friday/memory.db` (local memory database) both live outside
this repo entirely.

## What to verify before you start changing anything

- `git status` and `git log --oneline -10` — confirm what's committed vs.
  uncommitted, and whether the state described in `PROJECT_STATE.md` still
  matches reality (things move fast in this project, and multiple sessions
  have worked this repo concurrently before — check for surprises).
- `git fetch origin && git log origin/main..HEAD --oneline` — confirm
  whether local commits have been pushed.
- Run `pnpm dev` (from repo root) and confirm the app actually starts
  before assuming any "verified" claim in the docs still holds.

## Prompt for the next Claude Code account

```
I'm picking up the F.R.I.D.A.Y. project at ~/Projects/friday cold, with no
memory of prior sessions. Before doing anything else:

1. Read HANDOFF.md (this file), then CLAUDE.md, PROJECT_STATE.md, and
   SECURITY.md in full — in that order.
2. Run `git status`, `git log --oneline -10`, and `git fetch origin` (if a
   remote is configured) to confirm the actual current state matches what
   the docs describe.
3. If you're about to touch `lib/vm/*` or anything VM-side, note that the
   droplet is real and reachable via SSH (host is in the VM_HOST env var,
   not committed to source — check .env.local or ask the user) — verify
   any claim yourself with a real SSH session and a real task rather than
   trusting prose, same discipline this project has used throughout.
4. Before ending your session: update PROJECT_STATE.md with your actual
   stopping point, TASKS.md with what you did/found/left open, and
   SESSION_LOG.md with a dated entry (real commit hashes, not invented
   ones). Only claim something is "verified" if you personally exercised
   it against real infrastructure.
```
