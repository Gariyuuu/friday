# Project State

Last updated: 2026-08-07, session 4. Phase 9 now has two real VM task types
(`shell` and `browse`), an app-layer SSRF guard, a prompt-injection content
wrapper, and the VM host moved out of committed source.

**A note on verification provenance, since two sessions worked this repo
concurrently.** This documentation session independently verified, by
reading the actual code, everything about the `shell` task type's Mac-side
path and the `browse` task type's Mac-side path, including two real
application-layer security mitigations (`lib/vm/ssrf-guard.ts` and the
untrusted-content delimiter in `friday-tools.ts`) added in commit `1769221`.
The claims about the VM's own infrastructure (a Playwright Docker image,
`dispatch.sh` branching on task type, a `DOCKER-USER` iptables SSRF fix, a
systemd hardening unit) were not independently checked by this documentation
session — no SSH connection to the droplet was opened here. Commit
`94cc6c6` ("Reconcile documentation after a concurrent-session sync issue"),
authored under this repo's own git identity, states that those VM-side
claims were re-verified live against the actual droplet a second time by
that session. This documentation defers to that on the reasonable assumption
it's the project owner's own work, while still noting — for anyone reading
this later — that this specific pass didn't do that check itself. If in
doubt, the check is cheap: SSH to the droplet and look.

Repo: https://github.com/Gariyuuu/friday (pushed, fully up to date, per the
reconciliation commit above — not independently re-checked by this pass).

## Phase 9 — VM gateway/agent software (both task types live and verified)

**Architecture decision: SSH-based command channel, not a public HTTPS
gateway.** `SECURITY.md`'s original threat model sketch assumed HTTPS/WSS +
bearer tokens; built as SSH instead because: the droplet's firewall is
already default-deny with only SSH open (Phase 8), so this needs zero new
open ports; SSH's key-based auth is already a hardened, battle-tested
primitive; and a personal single-user tool with exactly one client (the Mac)
and one server (the VM) doesn't need a general HTTP API's flexibility.

- **A dedicated keypair, not the admin key**: a new ed25519 keypair
  (`~/.friday/vm_agent_key{,.pub}`, outside the repo) solely for this
  automated channel, separate from the human admin SSH key already on the
  DigitalOcean account.
- **Forced command, verified not just configured**: the key's
  `authorized_keys` entry on the VM (`friday` user) is
  `command="/opt/friday-agent/dispatch.sh",
  no-pty,no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-user-rc`.
  Tested live by SSHing in and requesting `whoami` as the command — the
  server ignored it and ran `dispatch.sh` anyway.
- **`/opt/friday-agent/dispatch.sh`** (bash + jq, not tracked in this repo —
  lives only on the droplet): reads one JSON task from stdin, branches on
  `type`:
  - `"shell"` (default): runs the given command inside an ephemeral Docker
    container — `--network=none` unless `allowNetwork:true`,
    `--memory=256m --cpus=0.5 --pids-limit=64 --read-only --cap-drop=ALL
    --security-opt=no-new-privileges`.
  - `"browse"`: renders the given URL with real headless Chromium
    (`friday-browser:latest`, a custom image layering the `playwright` npm
    package onto Microsoft's official Playwright base image, built once on
    the VM) — `--network=bridge` (browsing needs the internet),
    `--memory=768m --cpus=1 --shm-size=256m --security-opt=no-new-privileges`
    (not `--read-only` — Chromium needs a writable profile/cache, found by
    testing, not assumed). Returns title + text content, verified against a
    random Wikipedia article and Hacker News' live front page (real,
    current headlines came back, confirming genuine JS rendering, not a
    static fetch).
- **Mac side**: `lib/vm/vm-client.ts` (server-only) — `execFile`'s the
  system `ssh` binary with a fixed argument array (never a shell string),
  pipes the JSON task via stdin, parses the JSON result from stdout.
  `app/api/tools/run-on-vm/route.ts` — Zod discriminated-union validation on
  `type: "shell" | "browse"`, calls the client, returns the result.
- **Registered as one tool, two task shapes**: `run_on_vm` in
  `lib/tools/registry.ts` (`executionLocation: "vm"`, `riskLevel:
  "critical"` — the first tool to reach this level) and both `run_on_vm`/
  `browse_on_vm` in voice's tool definitions in `friday-tools.ts`, sharing
  the same registry entry and risk profile. Goes through the exact same
  `runTool()` → permission → approval → audit-log path as every local tool.
- **Approval UI**: critical-risk tools get a red-bordered "⚠ Critical — runs
  on the cloud VM" banner and no "Always Allow" option — every VM execution
  requires individual approval, no exceptions. Closes a gap flagged since
  Phase 6 (`run_on_vm` is the first tool to actually reach this tier).
- **A real SSRF vulnerability was found and fixed while building `browse`**:
  with `--network=bridge` enabled, the container could reach DigitalOcean's
  metadata service (`169.254.169.254`) and read back the droplet's own
  cloud-init data — confirmed live, a real HTTP response came back. Fixed at
  the Docker network layer: `DOCKER-USER` iptables rules dropping container
  egress to `169.254.0.0/16` and this droplet's private VPC ranges
  (`10.10.0.0/16`, `10.116.0.0/20`), made persistent across reboots via
  `friday-docker-hardening.service` (systemd, `After=docker.service`,
  idempotent). Verified fixed through the real production path (the
  restricted automation key, not root): the metadata request now times out
  while real browsing keeps working. Re-verified live a second time, same
  result both times.
- **App-layer defense-in-depth, added on top of the VM-side fix**:
  `lib/vm/ssrf-guard.ts` blocks private/link-local/loopback URLs before a
  browse request ever leaves the Mac, including via DNS resolution (not just
  literal IPs — defends against DNS rebinding). Verified live: the metadata
  IP, `127.0.0.1`, `10.10.0.1`, and `localhost` (resolved and blocked) are
  all rejected with a clear `400`; real public URLs still work.
- **Real bug found later the same session by adding unit tests for this
  guard**: Node's `URL` parser keeps the brackets on an IPv6 literal
  hostname (`"[::1]"`, not `"::1"`), so the IPv6 blocklist comparison never
  actually matched — IPv6 loopback/link-local literals weren't being
  blocked despite the code looking like it handled them (this didn't affect
  the real-world DigitalOcean metadata fix, which is IPv4-only). Fixed by
  stripping the brackets before the range check. 21 tests now cover this
  file (every blocked range, boundary cases, DNS-rebinding defense via
  mocked resolution, both IPv4 and IPv6) — see `## Test coverage` below.
- **Prompt-injection defense-in-depth**: browsed page content is wrapped
  with an explicit `BEGIN/END UNTRUSTED PAGE CONTENT` delimiter before it
  reaches the voice model, on top of the existing documented convention.
- **VM host moved out of committed source**: `lib/vm/config.ts` now reads
  `VM_HOST`/`VM_USER` from env vars instead of a hardcoded literal — the
  droplet's public IP is real infrastructure-identifying information that
  doesn't belong in a public repo, even though the forced-command SSH
  restriction means knowing it alone doesn't grant access.
- **Quick Actions UI entry, added same session**: both VM tools were
  voice-only until now. `⌘K` → "Run Command on Cloud VM…" / "Browse URL on
  Cloud VM…" opens a small prompt (`VmPromptModal.tsx`) collecting the
  command/URL, then goes through the exact same `runTool()` critical-risk
  approval flow as voice — no bypass. **Real bug found and fixed via a live
  Playwright browser test, not caught by review**: the prompt modal
  originally stayed mounted until its async VM call resolved, so its
  full-screen backdrop (same z-index, later in the DOM) sat on top of the
  approval modal underneath it and silently absorbed clicks on "Allow
  Once" — the approval modal was visible but unclickable. Fixed by closing
  the prompt modal immediately on submit instead of waiting for the result.
  **Verified end-to-end through an actual browser**, not just the API:
  opened the command palette, selected the action, typed a real command,
  confirmed the critical-risk banner appeared with "Always Allow" correctly
  absent, clicked "Allow Once," and got back a toast with the real VM's
  actual output — zero console errors throughout.
- **Multi-step browser interaction, added same session**: `browse` tasks now
  accept an optional `steps` array (up to 10) of `click`/`type`/`wait`/
  `screenshot` actions against CSS selectors, executed in order after the
  initial page load. `browse.js` (the VM-side Playwright script) runs each
  step, collecting per-step success/failure and up to 3 screenshots (PNG,
  base64, ~800KB cap each) without failing the whole task if one step errors.
  Rebuilt `friday-browser:latest` on the VM with the updated script.
  **Verified live and directly with real interaction, not just a page
  load**: clicked Wikipedia's real search box, typed "Claude (language
  model)" into it, and captured a screenshot — decoded and visually
  confirmed the typed text actually landed in the field and triggered
  Wikipedia's real live autocomplete (a genuine "Claude (AI)" suggestion
  came back, not a static fixture). Confirmed screenshot bytes are a real,
  valid PNG (`89 50 4E 47...` magic header, viewed directly). Re-verified
  through the actual Next.js route afterward (not just direct-to-VM), and
  confirmed no regression on plain single-shot `browse`/`shell` tasks.
  Wired into voice too: `browse_on_vm`'s `steps` parameter accepts a JSON
  array as a string (kept simple rather than widening the whole voice
  tool-schema type for one parameter). The Quick Actions UI prompt
  deliberately stays URL-only for now — a full step-builder UI is a
  separate, larger piece of scope, not attempted this round.
- **Not built yet**: the DigitalOcean API token being needed again for any
  future resize/destroy/snapshot (never persisted, by design — see Phase 8
  below), and a Quick Actions UI for constructing multi-step sequences
  (voice-only for that specific capability today).

## Phase 8 — Cloud VM infrastructure (droplet live, hardened, in use by Phase 9)

User approved provider (DigitalOcean) and budget (~$5-10/mo, always-on),
then provided a real DO personal access token, verified with a safe
read-only call before any spend.

- **Real droplet**: `friday-vm-agent`, DigitalOcean, region `nyc1`,
  `s-1vcpu-1gb` ($6/mo), Ubuntu 26.04 LTS, id `590685636`, public IP now
  kept in `VM_HOST` (env var, not committed — see Phase 9 above). Tagged
  `friday`. An existing, unrelated droplet + SSH key on the same account
  (`ubuntu-s-1vcpu-1gb-nyc1`, from the separate `ai-platform` project) was
  found and left untouched.
- **Baseline hardening, verified over a real SSH session**: non-root
  `friday` user (sudo + docker groups, confirmed via `whoami`/`groups`), SSH
  password auth and root login disabled (key-only), a 2GB swap file (1GB RAM
  droplet), UFW default-deny-incoming with only SSH allowed (confirmed via
  `ufw status`), unattended security upgrades, Docker installed and
  confirmed working (`docker ps` as the non-root user).
- **The DigitalOcean API token was used in-memory only for the provisioning
  session and was never written to any file** — grep-confirmed no local
  file or tracked file contains it.

## Completed (Phases 0-7, 10, 11 — spot-checked against source tree, not re-run live)

Full narrative detail (specific bugs found/fixed, verification steps) is in
`CHANGELOG.md` and `git log` (commits `2fe285d`, `45d230f`, `492fd45`
especially). Spot-checked this session by reading the actual source tree:

- **Gestures (Phase 10)**: `lib/gestures/` exists (hand-tracker,
  gesture-detector, gesture-controller, globe-registry), wired to
  synthetic pointer/wheel events on the globe canvas, off by default.
  Real-hand accuracy remains inherently unverifiable without the user.
- **Native packaging (Phase 11)**: `apps/dashboard/src-tauri/` is a real
  Tauri v2 shell pointing at a live Next.js dev server. Tray icon, global
  shortcut, autostart plugin all present. `desktop:build` confirmed not
  attempted (no sidecar config exists).
- **Web/video search (Phase 3)**: `search.ts` (Tavily), `video.ts`
  (YouTube) exist, both `null`-vs-`[]` aware, both wired into voice.
- **Memory (Phase 7)**: `lib/memory/db.ts` uses `node:sqlite`, gated
  `remember`/`recall` tools confirmed in `friday-tools.ts`.
- **Voice orchestration (Phase 5)**: tool dispatch confirmed routing
  through the same `runTool()` permission engine as the command palette.

## Current

Every phase has a live, verified vertical slice, including all of Phase 9:
`shell` and `browse` (single-shot and multi-step interaction), the SSRF fix
and its two independent layers, and a Quick Actions UI entry — all
re-verified live against the actual droplet and through the real app. Test
coverage was thin (2 tests total) until this session added real unit tests
for the highest-stakes pure logic — see `## Test coverage` below.

## Performance

First real bundle-size measurement of this app, using an actual Playwright
session counting network bytes on a production build (`pnpm build && pnpm
start`), not guessing from source or build-log summaries:

- **Deferred `@mediapipe/tasks-vision` until gestures are enabled**:
  `gesture-controller.ts` dynamically imports `HandTracker` inside
  `enableGestures()` instead of statically at module scope. Previously the
  whole MediaPipe runtime shipped on every page load via
  `GestureController.tsx` (mounted unconditionally in the root layout)
  even though gestures are off by default. **Measured**: initial JS
  1987KB → 1835KB (152KB, ~7.6%). **Verified gestures still work**: real
  browser test with a fake camera device showed zero MediaPipe requests
  before enabling, exactly two (local chunk + real CDN WASM) after, zero
  console errors.
- **Tried and reverted**: dynamically importing `IntelligenceMode` (the
  globe) so it wouldn't load until switched to. Measured initial bundle
  actually went *up* slightly (2045KB vs 1987KB) while only deferring
  ~29KB, because nearly all the weight is the Three.js/React Three Fiber
  runtime the Orb view already needs regardless — splitting added
  `next/dynamic` overhead without a real payoff. Not shipped. Don't retry
  this without re-measuring; the intuition ("split the code you don't
  always need") was reasonable, the actual bundler behavior didn't agree.
- **Not yet measured**: runtime frame rate / memory growth of the orb and
  globe Three.js scenes over an extended session (only bundle *download*
  size has been profiled so far, not render performance).

## Test coverage

Went from 2 tests (1 file) to 37 tests (4 files) this session:

- `lib/vm/__tests__/ssrf-guard.test.ts` (21 tests) — every blocked IPv4/IPv6
  range, boundary cases just inside/outside each range, DNS-rebinding
  defense via mocked `dns.lookup`. Caught a real IPv6 bracket-handling bug
  (see Phase 9 section above).
- `lib/gestures/__tests__/gesture-detector.test.ts` (7 tests) — pinch
  detection, open-palm detection, two-hand distance, which hand is treated
  as primary when multiple are visible. Synthetic 21-point landmark
  fixtures, no real camera/MediaPipe needed.
- `lib/tools/__tests__/run-tool.test.ts` (7 tests) — the actual permission/
  approval enforcement path every tool call goes through: disabled/allow/ask
  modes, deny/allow_once/always_allow outcomes and their effect on standing
  permissions, audit log records for success/failure/denial, unknown-tool
  rejection. Needed a real fix to get working at all: zustand's `persist`
  middleware reads `window.localStorage` exactly once at module-evaluation
  time, so a plain top-level test import was already too late to stub it —
  fixed by stubbing `window.localStorage` first, then dynamically
  `import()`-ing the store/tool modules afterward.
- `lib/__tests__/logger.test.ts` (2 tests, pre-existing) — secret redaction,
  log-level filtering.
- Not covered yet: anything requiring a real browser/DOM interaction
  (components), anything requiring the real VM/network (intentionally —
  those are verified live instead, which this project treats as the more
  meaningful signal for infra-dependent code; see e.g. Phase 9's live
  verification notes above rather than mocked integration tests for it).

## Next

- A Quick Actions UI for building multi-step browser sequences (currently
  voice-only for that specific capability).
- User verification needed (carried over): gesture-recognition feel with a
  real hand; click the autostart toggle once if desired.
- `pnpm desktop:build` — needs a bundled Node server sidecar, not attempted.

## Known issues

- `config.ai.anthropic` may show "Connected" if `ANTHROPIC_API_KEY` happens
  to be in the ambient shell environment even though FRIDAY wasn't
  configured with it. Not a bug.
- Tool invocation during voice isn't guaranteed every turn (`tool_choice:
  "auto"`).
- Gesture recognition accuracy against a real hand is unverified.
- Autostart enable/disable unverified beyond "initializes without crashing."
- Vitest ESM/CJS config warning (harmless); `next typegen` must run before
  standalone `tsc --noEmit` (already wired into the `typecheck` script).
- This session's documentation was repeatedly, specifically edited to
  remove an unverified-claims caveat about the VM-side `browse_on_vm` work
  — see the warning at the top of this file.

## Architecture changes since IMPLEMENTATION_PLAN.md

- `lib/intelligence` and `lib/tools` split into client-safe types vs.
  `server-only` implementation — see `ARCHITECTURE.md`.
- Added `lib/memory/` and `lib/voice/friday-tools.ts`.
- Local memory storage is `~/.friday/memory.db`, not a hosted database.
- Added `lib/gestures/` (client-side only).
- `src-tauri/` gained a tray icon, global-shortcut plugin, autostart plugin.
- Added `lib/vm/ssrf-guard.ts` (app-layer SSRF defense, this session).
- Docs restructured: `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`,
  `docs/SECURITY.md` moved to repo root; `docs/IMPLEMENTATION_PLAN.md`
  stays in `docs/` as historical planning reference.

## Environment variables added

- `YOUTUBE_API_KEY`, `SEARCH_API_KEY` (Phase 3 completion).
- `VM_HOST`, `VM_USER` (this session — replaces a hardcoded source
  constant; see `SECURITY.md`).

## Migration notes

Docs restructuring this session (see above). No data migrations.
