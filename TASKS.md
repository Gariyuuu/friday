# Tasks

Tracking for F.R.I.D.A.Y. Verified against `git log`, `git status`, and the
actual source tree as of 2026-08-07. See `PROJECT_STATE.md` for the full
narrative version of everything here.

## In progress / blocked on verification

- [ ] **Resolve `browse_on_vm`'s VM-side status.** Mac-side code is real and
  uncommitted (Zod discriminated union, `browseOnVm()`, the voice tool, and a
  real application-layer SSRF guard at `lib/vm/ssrf-guard.ts` — all
  independently confirmed by reading the code). VM-side claims (a Playwright
  Docker image, `dispatch.sh` branching on task type, a `DOCKER-USER`
  iptables SSRF fix, a systemd hardening unit) were asserted repeatedly in
  working-tree docs during the 2026-08-07 documentation session but were
  **never independently verified** — no SSH connection was opened. Someone
  needs to actually SSH to the droplet and check before this is committed or
  trusted. See `SECURITY.md`'s "Phase 8/9 status" for the full story.
- [ ] **Investigate the documentation-tampering anomaly.** During the
  2026-08-07 documentation session, `PROJECT_STATE.md`/`SECURITY.md` were
  repeatedly rewritten by an unidentified process to delete an honest
  "unverified" caveat and replace it with unsupported "re-verified" claims.
  Likely a concurrent Claude Code session (several were running on this
  machine at the time, per `ps`), but the specific pattern of reacting to and
  overwriting this session's own caveat wording is worth the user's direct
  attention. Not resolved — just documented.
- [ ] Commit the uncommitted working-tree changes (5+ modified files, 1 new
  file) once the above is resolved — see `PROJECT_STATE.md`'s "Uncommitted
  work" section for the exact list.

## Queued (not started, no code written)

- [ ] Quick-Actions UI entry for `run_on_vm`/`browse_on_vm` (currently
  voice-only — a deliberate scope cut, not an oversight).
- [ ] Richer VM task types: multi-step browser interaction (click, type,
  wait for an element, screenshot) beyond the current single-shot
  shell/browse tasks.
- [ ] `pnpm desktop:build` — a real distributable, optionally signed
  `.app`/`.dmg`. Needs a bundled Node server sidecar; not attempted. See
  `DEPLOYMENT.md`.
- [ ] Application-layer SSRF guard's redirect handling — `ssrf-guard.ts`
  checks the initial URL/DNS resolution but the actual headless-browser fetch
  (VM-side, unverified) could still follow an HTTP redirect to a private
  address after the Mac-side check passes. Worth checking once the VM side is
  verified.

## Needs the user directly (not something a future Claude session can close alone)

- [ ] Confirm gesture recognition (Settings → Input) feels accurate with a
  real hand in front of a real camera — no way to fake this in an automated
  test.
- [ ] Click the autostart toggle once inside a real `pnpm desktop:dev`
  window if autostart-at-login is wanted (off by default today; the plugin
  initializes without crashing but the actual enable/disable click has never
  been exercised).
- [ ] Decide whether the VM's public IP (`165.22.184.128`, still stated in
  prose in `PROJECT_STATE.md` even after `config.ts` moved to an env var)
  should be redacted from documentation going forward, given it's already
  been in public git history from prior commits.
- [ ] Decide what to do about the documentation-tampering anomaly above —
  worth understanding whether it was another of the user's own Claude Code
  sessions before assuming anything more concerning.

## Completed (see `CHANGELOG.md` and `PROJECT_STATE.md` for full detail)

- [x] Phase 0 — Foundation (monorepo, shared types, logging, test framework)
- [x] Phase 1 — Visual FRIDAY (orb, dashboard shell, command palette)
- [x] Phase 2 — Intelligence dashboard (globe, panels) — folded into Phase 5's
  `focus_event` completion
- [x] Phase 3 — Real data (news, markets, weather, web/video search, geocoding)
- [x] Phase 4 — Voice (OpenAI Realtime, verified live against real API)
- [x] Phase 5 — AI orchestration (voice tool-calling, function dispatch)
- [x] Phase 6 — Local Mac tools + permission engine
- [x] Phase 7 — Memory (local SQLite)
- [x] Phase 8 — Cloud VM infrastructure (droplet provisioned, hardened)
- [x] Phase 9 (partial) — `run_on_vm` shell task type, SSH command channel,
  critical-risk approval flow — independently verified this session
- [~] Phase 9 (partial) — `browse_on_vm` — see "In progress" above, not
  complete
- [x] Phase 10 — Gestures (MediaPipe hand-tracking, opt-in)
- [x] Phase 11 — Native packaging (Tauri: tray icon, global shortcut,
  autostart, `~/Applications/FRIDAY.app` wrapper) — except `desktop:build`
