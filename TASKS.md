# Tasks

Tracking for F.R.I.D.A.Y. Verified against `git log`, `git status`, and the
actual source tree/live droplet as of 2026-08-09. See `PROJECT_STATE.md` for
the full narrative version of everything here.

## Queued (not started, no code written)

- [ ] `pnpm desktop:build` — a real distributable, optionally signed
  `.app`/`.dmg`. Needs a bundled Node server sidecar; not attempted. See
  `DEPLOYMENT.md`.
- [ ] Extend the untrusted-content delimiter pattern (currently only
  wrapping `browse_on_vm` output) to `search_web`/`recall` if those ever
  return genuinely untrusted (vs. curated API) content.

## Needs the user directly (not something a future Claude session can close alone)

- [ ] Confirm gesture recognition (Settings → Input) feels accurate with a
  real hand in front of a real camera — no way to fake this in an automated
  test.
- [ ] Click the autostart toggle once inside a real `pnpm desktop:dev`
  window if autostart-at-login is wanted (off by default today; the plugin
  initializes without crashing but the actual enable/disable click has never
  been exercised).
- [ ] Decide whether the VM's public IP (`165.22.184.128`, still stated in
  prose in a few docs even after `config.ts` moved to an env var) should be
  redacted from documentation going forward, given it's already been in
  public git history from prior commits.

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
- [x] Phase 9 — `run_on_vm` (shell) and `browse_on_vm` (browser, incl.
  multi-step interaction), SSH command channel, critical-risk approval flow,
  three-layer SSRF defense (Mac-side guard, VM-side iptables, VM-side
  forward proxy for redirect-following), Quick Actions UI with a
  step-builder and a results panel — all independently verified via direct
  SSH sessions against the real droplet, repeated across sessions
- [x] Phase 10 — Gestures (MediaPipe hand-tracking, opt-in)
- [x] Phase 11 — Native packaging (Tauri: tray icon, global shortcut,
  autostart, `~/Applications/FRIDAY.app` wrapper) — except `desktop:build`
