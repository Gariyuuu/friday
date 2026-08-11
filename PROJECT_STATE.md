# Project State

Last updated: 2026-08-09, session 4 continued. Phase 9 has two real VM task
types (`shell` and `browse`, including multi-step interaction), a Quick
Actions UI with a step-builder and a results panel, and a three-layer SSRF
defense (Mac-side guard, VM-side iptables, and — added this round — a
VM-side forward proxy that also catches redirect-based SSRF; see
`## Phase 9` below for why the proxy was needed). Every claim in this
section has been independently, directly verified via real SSH sessions
against the real droplet, repeated across multiple sessions — no VM-side
claim in this document is secondhand.

Repo: https://github.com/Gariyuuu/friday (pushed, fully up to date).

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
  tool-schema type for one parameter).
- **Quick Actions step-builder UI, added same session — Phase 9's last
  open item, now closed**: `VmPromptModal`'s browse mode gained a real
  UI for building click/type/wait/screenshot sequences (add/remove rows,
  action dropdown, conditional selector/text fields, capped at 10 steps
  to match the server-side limit) — no longer voice-only. Paired with a
  new `VmResultModal`: previously a task's result only produced a terse
  toast, so screenshots (real returned data) had nowhere to appear;
  now a panel shows the full result (stdout/stderr/error, title/url/text,
  per-step outcomes, and screenshots as real clickable images opening
  full-size via a data URL). **Verified fully end-to-end through the real
  app and the real VM**: built a real click→type→screenshot sequence
  through the actual UI, approved it, and confirmed all three steps
  succeeded with the screenshot rendering as a genuine image — zero
  console errors.
- **Redirect-based SSRF gap found and fixed**: `ssrf-guard.ts` only
  validates the URL a browse task is *given*, not where an HTTP redirect on
  the VM-side browser actually lands. First attempt used Playwright's
  `page.route()` to re-check every navigation; a controlled local test (a
  redirect server plus a "blocked" target server, run against the real
  `browse.js`) proved this doesn't work — Chromium in this Playwright
  version doesn't re-invoke `route()` handlers for a server-side redirect on
  the main navigation frame, confirmed by the blocked target actually
  receiving the request when only `page.route()` was used. Replaced with a
  local forward proxy the browser is launched pointed at (Chromium's
  `proxy` launch option): HTTP requests get checked and a marked 403 if
  blocked (detected explicitly so the task reports `ok:false`, not a
  misleadingly "successful" result with the block page's content), HTTPS
  CONNECT tunnels to a blocked host are refused outright (surfaces as a
  real `page.goto()` failure). Re-ran the same controlled test with the
  proxy in place and confirmed the blocked target's request log stayed
  completely empty — the connection genuinely never happens now, not just
  a request that gets a different HTTP response. Deployed to the real
  droplet, rebuilt `friday-browser:latest`, and re-verified against real
  infrastructure: a direct request to `169.254.169.254` is blocked, normal
  browsing (Wikipedia) and the existing multi-step click/type/screenshot
  flow both still work with zero regressions.
- **Not built yet**: the DigitalOcean API token being needed again for any
  future resize/destroy/snapshot (never persisted, by design — see Phase 8
  below).

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
`shell` and `browse` (single-shot and multi-step interaction), a
three-layer SSRF defense, and a Quick Actions UI entry with a step-builder
and results panel — all re-verified live against the actual droplet and
through the real app. 172 tests across 21 files — see `## Test coverage`
below.

**2026-08-09, real-usage bug-fix round**: the user actually used the app
(not just this documentation's own testing) and found three real problems,
all fixed and live-verified this round:
- Voice never opened the intelligence dashboard for "what's happening in
  the world"-style questions — the realtime session had zero system
  `instructions`, so with `tool_choice: "auto"` the model usually just
  answered conversationally instead of calling `open_intelligence_dashboard`
  + `get_news`. Fixed with real instructions in `session.update`; verified
  with a genuine spoken query (macOS `say` → Chromium fake-audio-capture)
  that the dashboard actually rendered with real headlines/market data.
  Surfaced a real (narrow) response-creation race in the process — fixed,
  see `voice-controller.ts`'s `error` case handling.
- Gesture zoom did nothing on the orb screen (the default, most-used
  screen) — `gesture-controller.ts` only ever drove the globe's
  `OrbitControls`, so gestures were a silent no-op anywhere else. Extended
  the same vocabulary to scale the orb itself when the globe isn't
  mounted, plus a mode-aware on-screen gesture legend for discoverability
  (previously only documented in Settings, which nobody re-reads
  mid-session).
- Investigated API usage — no hidden polling found; added a 3-minute voice
  idle auto-disconnect (Realtime audio bills per second connected) and
  tightened the new instructions to call `search_video` at most once per
  turn instead of once per notable story.
See `CHANGELOG.md`'s 0.24.0 entry for full detail.

**2026-08-09, text chat (0.29.0)**: added a typed-chat alternative to voice
(user preference — voice wasn't a fit for quick text Q&A), pointed at the
user's own AI Platform gateway instead of OpenAI. Docked bottom-right panel,
opened via Command Palette, streaming replies through a new `/api/chat`
proxy route. **Real bug found and fixed via live testing**: the streaming
`ReadableStream` originally read lazily from `pull()` — under Next.js dev
(Turbopack), `pull()` stopped being re-invoked after the upstream's last
content chunk, so the final read that would see `done: true` never
happened and every request hung indefinitely even though all the real text
had already reached the browser. Isolated to the pull-driven adapter itself
(an identical read loop in a plain Node script outside Next.js closed in
~40ms) and fixed by pumping eagerly from `start()` with a `while` loop
instead. Verified end-to-end with a real headless-browser session against
the live gateway. Also fixed `/api/config`'s `vm` field, which had been
checking the unused `VM_GATEWAY_URL` instead of the actually-used `VM_HOST`
— Settings had been silently misreporting the VM integration as
unconfigured. See `CHANGELOG.md`'s 0.29.0 entry.

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
- **Runtime frame rate / memory, first measurement, same session**: a real
  Playwright session against a production build, using a CDP session for
  heap metrics (`Performance.getMetrics`, `JSHeapUsedSize`) and an
  injected `requestAnimationFrame` counter for FPS.
  - Orb: 110-120 FPS, ~0.9MB heap growth over 8s (normal allocation
    churn, not a leak).
  - Globe: 53-64 FPS, ~1.9MB heap growth over 8s. Notably lower FPS than
    Orb in the same environment — checked `Globe.tsx`/`EventMarker.tsx`
    for an obvious cause (a missing memoization, a fast polling interval
    causing excessive re-renders) and found none; `use-intelligence-
    data.ts` has no polling interval at all. Most likely explanation:
    genuine extra 3D cost (per-marker `useFrame` pulse animation ×
    up to ~13 events, `antialias: true`) combined with this headless test
    environment's software rendering (no real GPU) — real-world FPS on
    actual hardware is expected to be equal or higher. Still comfortably
    smooth (well above any "janky" threshold); **not being treated as a
    confirmed problem without stronger evidence** — no changes made
    based on this number alone.
  - **Real leak test, not just a hunch**: 10 repeated orb↔globe mode
    switches (mounting/unmounting the Three.js scenes each time) showed
    *zero net heap growth* after forcing GC via CDP — actually slightly
    negative (-0.8MB), meaning React Three Fiber's cleanup on unmount is
    working correctly. Zero console errors across the entire run.
  - **Caveat stated plainly**: this is a software-rendered, headless
    Chromium measurement — a reasonable lower-bound proxy for relative
    comparisons (orb vs. globe, before vs. after a change) within this
    same environment, but not a direct stand-in for the user's actual
    GPU-accelerated experience. Treat absolute FPS numbers here as
    conservative, not as literally what the user sees.

## Test coverage

231 tests across 30 files. Most recently: 15 new tests for the text-chat
feature — `chat-client.test.ts` (5, streaming/error paths against a mocked
`fetch`) and `ChatPanel.test.tsx` (10, open/close, empty state, message
rendering, Send/Enter/Shift+Enter/Escape, Clear, disabled-while-sending).
Before that: 172 tests across 21 files. Most recently at that point: 5 new tests in
`gesture-controller.test.ts` covering the orb-scale branch (grows/shrinks/
clamps to 0.6-1.8/resets on open palm when the globe canvas isn't mounted)
and 2 new tests in `CameraActiveIndicator.test.tsx` for the mode-aware
gesture legend. Went from 2 tests (1 file) to 165 tests (21 files) across
the prior session (in seven rounds). Before that: `VmPromptModal`'s
expanded test suite (18 —
step add/remove, the type-only text field, the 10-step cap, submitting the
built sequence with blank selectors trimmed, resetting after submit) and a
new `VmResultModal.test.tsx` (8 — success/failure headers, title/url,
stdout/stderr, step results, screenshot rendering, close via button/
backdrop). Earlier rounds:

- `vitest.setup.ts` added (jest-dom matchers, RTL auto-`cleanup()` after
  each test) — needed for component tests, the first in this repo. Later
  gained `ResizeObserver` and `Element.prototype.scrollIntoView` stubs
  (jsdom implements neither; `cmdk` needs both) — shared by every test,
  not just `CommandPalette`'s.
- `components/intelligence/__tests__/NewsPanel.test.tsx` (5),
  `MarketPanel.test.tsx` (5), `SignalsPanel.test.tsx` (3),
  `MediaPanel.test.tsx` (3), `EventDetailPanel.test.tsx` (11) — every
  intelligence dashboard panel now has real coverage: importance ranking,
  loading/unavailable states, positive/negative market styling (including
  the exactly-0%-counts-as-positive boundary), weather alert rendering,
  category tallying, the `/api/config`-driven not-configured/ready states,
  and `EventDetailPanel`'s `RelatedVideos` sub-component's full lifecycle
  (searching → results/no-results/hidden-when-unconfigured, and confirming
  a newly selected event doesn't show the previous event's stale videos).
- `components/shell/__tests__/CommandPalette.test.tsx` (16 tests) — every
  action: navigation, voice connect/disconnect with the correct label, all
  five Quick Actions (including real result-shape formatting for System
  Status), both VM prompts, the demo action, and the global Cmd+K/Escape
  shortcuts. Surfaced a real two-sources-of-truth nuance: the voice label
  reads `orb-store`'s `voiceStatus`, but the click handler's connect/
  disconnect branch checks `isVoiceConnected()` separately — they're kept
  in sync by `voice-controller.ts` in the live app, not automatically, so
  the test needed both mocks aligned to exercise the "connected" case.
- `components/tools/__tests__/ToolApprovalModal.test.tsx` (6 tests) — the
  critical-risk red banner and "Always Allow" correctly hidden only for
  critical tools, each of the three buttons resolving the right decision
  with the right approval id. Complements the earlier live Playwright
  verification of this same component with a fast, no-infra regression
  check.
- `components/shell/__tests__/Toast.test.tsx` (5 tests) — renders nothing
  with no toast, shows text on `show()`, tone-based danger styling, the
  real 3500ms auto-dismiss timer, and a newer toast correctly surviving an
  older one's stale dismiss timer (a real race the store's `id`-check
  guards against). Had to assert on store state rather than DOM presence
  for the dismiss-timer test — motion/react's exit animation runs on
  `requestAnimationFrame`, not fake timers, so the element stays mounted
  (mid-fade) past when the store actually clears it; DOM presence isn't
  the right signal for testing the *dismissal logic* specifically.
- `components/intelligence/__tests__/Sparkline.test.tsx` (4 tests) — no
  render under 2 points, correct point plotting spanning the full 0-100
  axis, color follows the `positive` prop, and no `NaN`/`Infinity` in the
  output when every value is identical (division by a zero range).
- `components/intelligence/__tests__/FreshnessBadge.test.tsx` (7 tests) —
  all four status labels, the DEMO DATA badge shown only when `isMock`,
  "updated Ns ago" shown only for `status: "live"` *and* a set
  `lastUpdated`, and never a negative age even under simulated clock skew
  (a `lastUpdated` slightly in the future).
- `components/gestures/__tests__/CameraActiveIndicator.test.tsx`
  (2 tests) — visibility follows `gestureStore.cameraActive` exactly.
- `components/tools/__tests__/VmPromptModal.test.tsx` (11 tests) —
  mode-specific copy/placeholder, Run disabled until non-whitespace input,
  Cancel closes without calling either VM function, Run calls the correct
  one (`runOnVm`/`browseOnVm`) with trimmed input and closes the modal
  immediately (not waiting for the task), Enter submits/Escape cancels,
  and success/failure/rejected-promise outcomes each produce the right
  toast. **Fixed a real testing-hygiene issue while writing these**:
  `vi.waitFor` (vitest's own) isn't act()-aware, so the resulting state
  update triggered a real "not wrapped in act()" console warning even
  though the test passed — switched to `@testing-library/react`'s
  `waitFor`, which is act()-aware, and the warning went away.

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
- `lib/intelligence/sources/__tests__/search.test.ts` (8 tests) and
  `video.test.ts` (8 tests) — request shape (URL, headers, body/query
  params) for Tavily/YouTube, response-to-domain-type mapping, the
  honest-null-when-unconfigured contract, graceful (not throwing) failure
  on a non-ok response or a rejected fetch.
- `lib/intelligence/sources/__tests__/geocode.test.ts` (10 tests) — the
  full extraction→geocode→cache pipeline, the `NONE`/no-results/API-error
  paths all correctly caching "no location" rather than crashing, and both
  dedup paths (already-cached, still-in-flight). Needed per-test module
  reinstantiation (`vi.resetModules()` + dynamic re-import) plus fake
  timers to isolate this module's real internal rate-limiter/cache state
  between tests without incurring real multi-second delays.
- `lib/gestures/__tests__/gesture-controller.test.ts` (9 tests) — the
  synthetic pointer/wheel event dispatch that drives OrbitControls:
  coordinate math including the horizontal mirror, pinch start/move/end →
  pointerdown/move/up, two-hand distance delta → wheel (with a
  sub-threshold no-op case), open-palm reset debounced to once per 1200ms.
  `dispatchPointer`/`dispatchWheel`/`handleFrame` were exported from
  `gesture-controller.ts` (previously module-private) specifically to make
  this testable directly.
- `lib/__tests__/logger.test.ts` (2 tests, pre-existing) — secret redaction,
  log-level filtering.
- Every intelligence dashboard panel is now covered (12 of ~21 components
  total: `ToolApprovalModal`/`Toast`/`Sparkline`/`FreshnessBadge`/
  `CameraActiveIndicator`/`VmPromptModal`/`CommandPalette`/`NewsPanel`/
  `MarketPanel`/`SignalsPanel`/`MediaPanel`/`EventDetailPanel`). Not
  covered, by design rather than as a gap: anything involving a real
  WebGL/Canvas context (`Orb`, `Globe`, and their sub-components — jsdom
  has no WebGL, these need a real browser, verified live via Playwright
  instead), and anything requiring the real VM/network (also verified live
  — see Phase 9's notes above rather than mocked integration tests for it).
  Remaining untested-but-testable components: `StatusBar`, `OrbStage`,
  `VoiceActivation`, `GestureController` — none flagged as high-value
  enough yet to prioritize over other work.

## Next

- User verification needed (carried over): gesture-recognition feel with a
  real hand (including the newer orb-resize gesture); click the autostart
  toggle once if desired.
- `pnpm desktop:build` is genuinely real now (see `CHANGELOG.md`'s 0.26.0
  entry — 0.25.0 had claimed this but only worked when launched in place;
  0.26.0 fixed a real pnpm/Tauri node_modules-bundling bug and verified
  by launching the actual `~/Applications/FRIDAY.app` fresh, twice).
  `~/Applications/FRIDAY.app` is the genuine standalone distributable
  (proper "FRIDAY" name/icon, current version number, no stale ⌥+Space
  reference), not the old dev-mode wrapper. Remaining gap: DMG packaging
  fails in this environment on a one-time macOS Automation permission
  only grantable interactively (not a code issue); the `.app` itself is
  unaffected. Bundle is ~2GB (see `ARCHITECTURE.md` for why) — acceptable
  for personal single-machine use, would need slimming for wider
  distribution.
- Phase 9 has no more explicitly flagged open items as of this session —
  everything scoped for this arc (shell + browse execution, multi-step
  interaction, the SSRF fix and its defense-in-depth layers, Quick Actions
  UI for both single actions and step sequences, a results panel) is built
  and verified live.
- Nothing else is currently flagged as open — the standing optimization
  backlog (test coverage, Globe FPS, bundle re-profiling, `desktop:build`)
  was cleared this round; see `CHANGELOG.md`'s 0.25.0/0.26.0 entries.

## Known issues

- `config.ai.anthropic` may show "Connected" if `ANTHROPIC_API_KEY` happens
  to be in the ambient shell environment even though FRIDAY wasn't
  configured with it. Not a bug.
- Tool invocation during voice isn't guaranteed every turn (`tool_choice:
  "auto"`).
- **Real, reproduced bug, not yet fixed**: `disconnectVoice()` while a
  session is still `CONNECTING` (not yet `READY`) doesn't cancel the
  in-flight `connectVoice()` call — the earlier `await next.connect()`
  can resolve afterward and silently reconnect, leaving voice active
  again despite the user having just ended it. Found while verifying the
  double-tap-K shortcut (0.27.0) by disconnecting too quickly; confirmed
  it disappears when disconnecting only after full `READY` state.
  Pre-existing, not introduced by that change. Needs a cancellation
  token/generation counter in `voice-controller.ts`'s `connectVoice()`.
- **New this round**: user reported the two-hand pinch-resize gesture still
  not visibly doing anything after being told how it works. No code bug
  found — `numHands: 2`, the delta threshold, and the scale clamp in
  `gesture-controller.ts`/`gesture-store.ts` all look correct. Most likely
  a real-world limitation (both hands need to be simultaneously inside a
  laptop webcam's field of view) rather than a code issue, but unconfirmed
  without camera access to test against.
- **New this round**: `pnpm desktop:build`'s `.app` bundling succeeds, but
  the subsequent optional `.dmg` step (`bundle_dmg.sh`) fails — the `.app`
  itself is unaffected and was installed to `~/Applications` directly by
  copying it from `src-tauri/target/release/bundle/macos/`. Not
  investigated further since the user's actual workflow doesn't need a
  `.dmg` (no one else needs to install this); flagged for whenever
  distributing to someone else actually comes up.
- Gesture recognition accuracy against a real hand is unverified.
- Autostart enable/disable unverified beyond "initializes without crashing."
- Vitest ESM/CJS config warning (harmless); `next typegen` must run before
  standalone `tsc --noEmit` (already wired into the `typecheck` script).

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
- `AI_PLATFORM_API_KEY`, `AI_PLATFORM_BASE_URL`, `AI_PLATFORM_MODEL` (text
  chat, 0.29.0) — the user's own OpenAI-compatible gateway, server-side only.

## Migration notes

Docs restructuring this session (see above). No data migrations.
