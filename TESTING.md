# Testing

## What actually exists

- **Vitest** (`apps/dashboard/vitest.config.ts`, jsdom environment,
  `@testing-library/react` + `@testing-library/jest-dom` available).
  `pnpm test` runs `vitest run` from `apps/dashboard`.
- **One test file exists**: `apps/dashboard/src/lib/__tests__/logger.test.ts`
  — tests the structured logger's secret-redaction behavior (confirmed by
  reading it this session; includes an intentional fake secret string,
  `"sk-super-secret"`, used only to verify the logger scrubs it — not a real
  credential, flagged separately in `SECURITY.md`'s findings so it isn't
  mistaken for one).
- That is the **entire automated test suite** as of this session — confirmed
  via `find apps/dashboard/src -iname "*.test.*"`, one result. There is no
  test coverage for the VM/SSH code path, the tool permission engine, the
  intelligence providers, or any UI component.

## How this project actually gets tested (per `CHANGELOG.md`/`PROJECT_STATE.md`)

Not by an automated suite — by hand, against real systems, documented
narratively as it happens. This is a deliberate, repeatedly-stated project
convention (see `CLAUDE.md`'s "Never report a feature as done/verified"
rule): every phase's "verified" claim in this project's history means
someone actually exercised it against a real API/real hardware/a real
launch and described exactly what they observed, not that a test suite
passed. Examples independently corroborated by this session's own reading
of the code (not just trusting the prose):

- Voice (Phase 4): tested via Playwright driving Chromium with fake-device
  flags, synthesized speech via macOS `say`, and cross-checking a spoken
  answer against `pmset -g batt` run independently.
- Gestures (Phase 10): Playwright + Chromium fake-device flags verify the
  pipeline (permission flow, WASM load, no-crash `detectForVideo`) but
  cannot fake a real hand — that gap is stated explicitly rather than
  glossed over.
- Native app (Phase 11): verified via real `pnpm desktop:dev` launches,
  reading build logs and using `osascript`/System Events to confirm a real
  foreground process, not just "it compiled."
- VM/SSH channel (Phase 9, `shell` type): verified via a real SSH session
  testing the forced-command restriction and network isolation directly,
  and via a real `POST /api/tools/run-on-vm` call checked against the dev
  server log.

## What this documentation session could and couldn't verify

- **Could and did**: read every file referenced above and confirm the
  described code exists and does what's claimed structurally (e.g.
  `ssrf-guard.ts`'s logic is correct by inspection).
- **Could not**: re-run any of the manual verification steps above (no
  running dev server, no SSH access exercised, no real voice/gesture
  hardware in this environment). Everything under "How this project
  actually gets tested" is accepted from prior session narrative + code
  consistency, not re-executed by this pass.

## Gaps worth flagging

- **No automated test exists for the SSH/VM exec channel** — the single
  highest-risk code path in this project (a real remote command-execution
  capability) has zero unit/integration test coverage. A test that mocks
  `execFile` and asserts the exact argument array passed to `ssh` (never a
  shell string, always the fixed flags) would catch a real regression that
  manual testing might miss on a quiet day.
- **No automated test exists for `ssrf-guard.ts`** despite it being a real
  security control — a table-driven test asserting each blocked/allowed
  range (loopback, link-local, RFC1918, a real public IP) would be cheap to
  write and would catch a future regression (e.g. someone "simplifying" the
  range list) that a live click-through wouldn't necessarily surface.
- **No automated test exists for the tool permission engine**
  (`run-tool.ts`) — the mechanism every single tool call in this app
  depends on for its safety guarantees.
- If test coverage is ever added for this project, `lib/vm/*` and
  `lib/tools/run-tool.ts` are the highest-value places to start, given
  they're both the least tested and the most safety-critical code in the
  repo.
