# Session Log

Reconstructed from `git log` and `CHANGELOG.md` where sessions weren't
explicitly logged as such before this file existed. Entries before this
file's creation are inferred from commit messages/dates, not first-hand.

## 2026-08-06 — Session 1: Foundation, real data, voice built

- `ba7c3ea` Foundation + Visual FRIDAY: monorepo, orb, intelligence dashboard
- `0dd360f` Real data (Phase 3 first increment) + local Mac tools (Phase 6)
- `f517fd5` Real keys applied; voice (Phase 4) built with OpenAI Realtime
- `3e491ce` Switch default realtime voice model to the mini variant for cost
- `7a08fc2` Fix two real mobile/narrow-viewport bugs
- `5ad4fba` Voice (Phase 4) verified live against the real OpenAI API

## 2026-08-07 — Session 2 (or continued session): orchestration through native packaging

- `ecd918a` Real app icon + web manifest for Add to Dock install on macOS
- `492fd45` Phase 5 (orchestration) and Phase 7 (memory), verified live
- `45d230f` Phase 11 (native macOS app via Tauri), verified with a real launch
- `2fe285d` Gestures, native app completion, and web/video search
- `a86c1b5` Phase 3 finishing touch: geocode real news events for globe markers

## 2026-08-07 — Session 3 (or continued): cloud VM, first exec channel

- `ff544f3` Phase 8: provision and harden the real cloud VM infrastructure
- `dc0fbdf` Change voice activation shortcut from Alt+Space to Alt+V
- `854b618` Phase 9: real SSH-based VM execution channel, first critical-risk tool

## 2026-08-07 — Session 4: browser automation + this documentation pass (concurrent)

Two sessions were active in this repo during overlapping windows this day:

**Development session** (commits under the repo's own git identity):

- `1769221` Phase 9: browser automation, real SSRF fix, and defense-in-depth
  hardening — `browse_on_vm` (headless-browser page loads via a custom
  Playwright image on the VM, per commit message — VM-side specifics not
  independently re-verified by the documentation session, see
  `SECURITY.md`), a VM-side SSRF fix, an application-layer SSRF guard
  (`lib/vm/ssrf-guard.ts`, independently verified by this documentation
  session), a prompt-injection content delimiter (`friday-tools.ts`,
  independently verified), and `VM_HOST`/`VM_USER` moved to env vars.
  Bundled the docs/ → repo-root reorganization that was in progress in the
  working tree at the time.
- `94cc6c6` Reconcile documentation after a concurrent-session sync issue —
  per its own message, re-verified the VM-side claims live against the
  droplet a second time and restored confident documentation after the
  documentation session's hedged caveats. Not independently re-checked by
  this documentation session (no SSH connection opened here) — see
  `PROJECT_STATE.md`'s verification-provenance note.

**Documentation session** (this pass, not a code-authoring session):

- Read the full codebase, `git log`, and existing `docs/*.md` to establish
  ground truth for a 17-file canonical documentation set (previously 3/17:
  `CLAUDE.md`, `README.md`, `CHANGELOG.md`).
- Moved `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/SECURITY.md`
  to the repo root; created `TASKS.md`, `HANDOFF.md`, `SESSION_LOG.md` (this
  file), `FEATURES.md`, `DATABASE.md`, `DEPLOYMENT.md`, `TESTING.md`,
  `DECISIONS.md`, `FILE_MAP.md`, `ROADMAP.md`, `UI_SYSTEM.md`.
- Independently verified (by reading code, not trusting prose) the `shell`
  VM task type end-to-end, the `browse` task type's Mac-side code, and two
  real application-layer security mitigations added during this same
  window (SSRF guard, prompt-injection delimiter).
- Explicitly could not verify — and documented as such — the VM-side
  infrastructure claims for `browse_on_vm` (no SSH connection opened this
  session).
- Navigated a real documentation-collision episode with the concurrent
  development session: working-tree copies of `PROJECT_STATE.md`/
  `SECURITY.md` were repeatedly rewritten mid-session with unverifiable
  "re-verified" claims, including deletions of caveats this session had
  just added. Resolved (per commit `94cc6c6`'s account) once the two
  sessions' work reconciled; documented plainly in `SECURITY.md`'s findings
  and `PROJECT_STATE.md`'s top-of-file note for future readers.
- Committed the canonical documentation set in scoped commits (see `git
  log` for exact commit messages/hashes — this file doesn't repeat them to
  avoid a second, potentially-stale copy of that list).

## 2026-08-07/08 — Session 4 continued: multi-step browsing, test coverage, perf, Quick Actions UI

The documentation-collision episode from the entry above settled once the
user confirmed directly that the concurrent session wasn't competing
development work. From that point on, single-session, no further
collisions:

- `712353b` VM tools added to the Command Palette (Quick Actions, not just
  voice) — first UI entry point beyond voice for `run_on_vm`/`browse_on_vm`.
- `8e470c3` Phase 9: multi-step browser interaction (click/type/wait/
  screenshot, up to 10 steps) — verified with genuine interaction against
  real sites, not just navigation.
- `675983f`, `7231961`, `e6e5386`, `7a172df`, `eb6a5fc`, `c19e73d` — a test
  coverage arc from 2 to 150 tests across 20 files: SSRF guard (found+fixed
  a real IPv6 bracket-handling bug), gesture detection, the permission
  engine, intelligence providers, every component including the largest
  (`CommandPalette`) and all intelligence dashboard panels.
- `0b55d3b` First runtime bundle-size measurement; deferred MediaPipe's
  load until gestures are actually enabled (1987KB → 1835KB initial JS,
  measured before/after on a real production build).
- `c7f4a94` Multi-step Quick Actions UI: a step-builder for `browse_on_vm`
  sequences in the command palette, plus a new results panel rendering
  returned screenshots as real clickable images. Verified end-to-end with
  a real Playwright session against the real droplet (real 3-step Wikipedia
  interaction, all steps succeeded, 1 screenshot rendered).

## 2026-08-09 — Session 4 continued: redirect-based SSRF gap closed, docs reconciled

- Closed the one concretely-scoped item this doc set had flagged as still
  open (`ssrf-guard.ts` doesn't see where an HTTP redirect on the VM-side
  browser actually lands). First attempt used Playwright's `page.route()`
  to re-validate each navigation; a controlled local test (a redirect
  server + a "blocked" target server, run against the actual VM-side
  `browse.js`) proved that approach doesn't work — Chromium in this
  Playwright version doesn't re-invoke route handlers for a server-side
  redirect on the main navigation frame, confirmed by the blocked target
  actually receiving the request. Replaced with a local forward proxy the
  browser is launched pointed at, which does cover every hop (HTTP via a
  marked 403, HTTPS via CONNECT refusal); re-ran the same controlled test
  and confirmed the blocked target's request log stayed empty. Deployed to
  the real droplet, rebuilt `friday-browser:latest`, and re-verified both
  a direct block (`169.254.169.254`) and normal browsing/multi-step
  interaction (Wikipedia) still work correctly against the real
  infrastructure.
- Reconciled this file, `SECURITY.md`, `HANDOFF.md`, `TASKS.md`,
  `ROADMAP.md`, and `FEATURES.md` — all had drifted out of date relative to
  `PROJECT_STATE.md` (which was kept current every round) since they were
  written once during the 2026-08-07 documentation pass and never updated
  as Phase 9 work continued past that point. Brought them in line with
  what's actually true now: both VM task types, multi-step interaction, and
  the Quick Actions UI are live-verified, not "claimed but unverified."

## How to keep this file current

Add an entry each session: date, one-line summary, and either the real
commit hashes (`git log --oneline -N` right after committing) or an honest
"not committed this session" note. Don't backfill entries for sessions you
can't actually reconstruct from git history — mark unknown gaps as
"Unknown" rather than inventing a plausible-sounding narrative, per this
project's own documentation discipline.
