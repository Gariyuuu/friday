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
2. **`PROJECT_STATE.md`** — exact current stopping point. Its opening
   paragraph explains a real documentation-collision episode from the most
   recent session; read it before trusting any claim about
   `browse_on_vm`'s VM-side status.
3. **`SECURITY.md`** — the threat model, including which claims are
   independently verified vs. merely asserted. Read the "Phase 8/9 status"
   section fully before doing anything with the VM.
4. **`ARCHITECTURE.md`** — how the pieces fit together, especially the
   client/server boundary and the VM task-execution data flow.
5. **`FEATURES.md`** — phase-by-phase status table, what's actually
   verified vs. built-but-unverified.
6. **`TASKS.md`** — what's actively blocked, queued, or needs the user.

Everything else (`FILE_MAP.md`, `DATABASE.md`, `DEPLOYMENT.md`,
`TESTING.md`, `DECISIONS.md`, `ROADMAP.md`, `UI_SYSTEM.md`, `SESSION_LOG.md`,
`CHANGELOG.md`, `README.md`) is reference material — dip into whichever is
relevant to the task at hand.

## The single most important open item

`browse_on_vm` (headless-browser page loads on the cloud VM) has real,
independently-verified Mac-side code and two real application-layer
security mitigations (an SSRF guard, a prompt-injection content delimiter).
Its VM-side infrastructure (a Playwright Docker image, `dispatch.sh`
branching on task type, a VM-side SSRF fix) is **claimed but not
independently verified from within this repo** — it lives on a remote
droplet, and no session that produced the current documentation has
confirmed it via an actual SSH connection and direct inspection. If you're
about to rely on this feature being fully hardened, verify it yourself
first: `ssh` to the droplet (IP is in `VM_HOST`, now an env var — check
`.env.local` or ask the user, it is deliberately not written in this repo's
source anymore) and check `dispatch.sh`, the Docker image, and the
`DOCKER-USER` iptables rules directly.

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
   SECURITY.md in full — in that order. PROJECT_STATE.md's opening
   paragraph describes a real documentation-collision episode from a
   recent session; take its verification-provenance notes seriously rather
   than assuming everything in the file is uniformly confirmed.
2. Run `git status`, `git log --oneline -10`, and `git fetch origin` (if a
   remote is configured) to confirm the actual current state matches what
   the docs describe. Multiple sessions have worked this repo concurrently
   before, sometimes producing documentation that got ahead of what was
   actually verified — don't take any "verified" or "re-verified" claim at
   face value without either independently checking it yourself or citing
   exactly which prior session/commit backs it.
3. Specifically check the status of `browse_on_vm` (Phase 9's browser-
   automation feature): read SECURITY.md's "Phase 8/9 status" section, and
   if you have the means to SSH to the VM (host is in the VM_HOST env var,
   not committed to source — check .env.local or ask the user), verify the
   VM-side claims (Playwright Docker image, dispatch.sh branching on task
   type, the DOCKER-USER iptables SSRF fix, the systemd hardening unit)
   directly rather than trusting any prose description, including this one.
4. Before ending your session: update PROJECT_STATE.md with your actual
   stopping point, TASKS.md with what you did/found/left open, and
   SESSION_LOG.md with a dated entry (real commit hashes, not invented
   ones). If you touch VM-side security claims, be explicit about what you
   personally verified vs. what you're repeating from elsewhere — this
   project has already had one real episode of that distinction getting
   lost, and it's worth not repeating.
```
