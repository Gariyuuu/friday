# Changelog

## 0.24.0 — Three Real Bugs Found From Actually Using the App

User feedback after real hands-on use, not from review: "what's happening in
the world" didn't open the dashboard, gesture zoom did nothing on the orb
screen, and a worry that API usage might be high. All three were real.

- **Voice never opened the intelligence dashboard**: the realtime session
  had zero system `instructions` — nothing told the model that a
  world-news-style question should call `open_intelligence_dashboard` +
  `get_news` (+ `search_video`/`focus_event` for the top story), so with
  `tool_choice: "auto"` and no prompt it usually just answered
  conversationally instead. Added real instructions to `session.update`.
  **Verified with a genuine spoken query** (macOS `say` piped through
  Chromium's fake-audio-capture, with the real WebRTC data channel
  monkey-patched to inspect what was actually sent): the model called
  `open_intelligence_dashboard` and `get_news`, the globe/news/markets
  dashboard genuinely rendered with real headlines and real market data,
  and server logs showed real `search_video` calls for the top story.
- **A real (if narrow) race surfaced by the fix above**: multi-tool-call
  turns take longer, which made it possible for the server to auto-create a
  response for a new VAD-detected user turn at the same moment
  `handleFunctionCalls()` sent its own `response.create()` to continue the
  previous turn — OpenAI correctly rejects the redundant one
  ("Conversation already has an active response in progress"), but the
  client was surfacing that rejection as a scary `voiceStatus: "error"`
  ("Something went wrong") even though the actual in-flight response
  continues fine. Now logged and ignored specifically for that message,
  not treated as fatal.
- **Gestures did nothing on the orb screen**: `gesture-controller.ts` only
  ever drove the globe's `OrbitControls` — on the orb screen (the default,
  most-used screen) `getGlobeCanvas()` returns null and every gesture was a
  silent no-op, which is what "the orb is just not changing its size"
  actually was. Extended the same two-hand-distance-zoom and open-palm-reset
  vocabulary to scale the orb itself (`gesture-store`'s new `orbScale`,
  clamped 0.6–1.8, applied as a CSS transform in `OrbStage.tsx`) when the
  globe isn't mounted. 5 new unit tests cover the orb-scale branch
  (grows/shrinks/clamps/resets); the globe branch's existing tests are
  unchanged.
- **No in-the-moment gesture discoverability**: the only explanation of what
  gestures do lived in Settings, which nobody re-reads mid-session.
  `CameraActiveIndicator` (already the always-visible "camera is on"
  badge) now also shows a compact, mode-aware legend — different text for
  the orb screen vs. the Global Intelligence screen — right where the user
  is actually looking.
- **API usage**: investigated for anything unnecessarily burning cost — no
  hidden polling found (the 1s `setInterval`s in `FreshnessBadge`/
  `StatusBar` are just clock ticks, not API calls; geocoding is
  per-event-id cached). The real, addressable lever was voice session
  duration (Realtime audio is billed per second connected, not per word
  spoken) — added a 3-minute idle auto-disconnect so a session left open
  while stepping away doesn't keep costing money in silence, and tightened
  the new instructions to call `search_video` at most once per turn
  instead of for every notable story.
- Verified live: mode-aware legend confirmed on both screens via Playwright,
  the spoken-query test above, 172 tests / 21 files passing (up from 165),
  typecheck/lint/build clean.

## 0.23.0 — Redirect-Based SSRF Gap Closed, a Forward Proxy Replaces a Broken `page.route()` Approach

- **Closed the last concretely-scoped Phase 9 gap**: `ssrf-guard.ts`
  validates the URL a browse task is given, but not where an HTTP redirect
  on the VM-side headless browser actually lands.
- **A real, tested dead end before the real fix**: tried re-validating each
  navigation via Playwright's `page.route()` first. A controlled local test
  (a redirect server plus a distinct "blocked" target server) proved this
  doesn't work — Chromium in this Playwright version never re-invokes
  `route()` handlers for a server-side redirect on the main navigation
  frame; only the first hop gets checked. Confirmed by watching the
  "blocked" server's own request log receive the request anyway.
- **The actual fix**: launch the VM-side headless browser pointed at a
  small local forward proxy (`browse.js`, using Node's own `http`/`net`
  modules, no new dependency) that re-checks every request — including
  every redirect hop and every subresource — against the same IPv4/IPv6
  private-range blocklist as the Mac-side guard. HTTP requests to a
  blocked host get a marked 403 (detected explicitly in `browse.js` so the
  task correctly reports `ok:false`, not a misleadingly "successful" result
  containing the block page's own content); HTTPS `CONNECT` tunnels to a
  blocked host are refused outright, which surfaces as a real
  `page.goto()` failure through Playwright's normal error path.
- **Re-verified with the same controlled test methodology**: with the
  proxy in place, the "blocked" target's request log stayed completely
  empty — the connection genuinely never happens, not just a different
  HTTP response. Deployed to the real droplet, rebuilt
  `friday-browser:latest`, and confirmed against real infrastructure: a
  direct request to `169.254.169.254` is blocked, normal browsing
  (Wikipedia) and the existing multi-step click/type/screenshot flow both
  still work with zero regressions.
- **Documentation sync**: `SECURITY.md`, `HANDOFF.md`, `TASKS.md`,
  `ROADMAP.md`, `FEATURES.md`, and `SESSION_LOG.md` had drifted out of date
  relative to `PROJECT_STATE.md` — written once during an earlier
  documentation pass and never updated as Phase 9 work continued past that
  point, so they still described the VM-side as "claimed but not
  independently verified" long after it had been directly, repeatedly
  verified via real SSH sessions. Brought back in line with reality.

## 0.22.0 — Multi-Step Quick Actions UI + a Results Panel for Screenshots

- **Phase 9's last open item**: `browse_on_vm`'s `steps` (click/type/wait/
  screenshot sequences) were voice-only until now. `VmPromptModal`'s
  browse mode gained a real step-builder — add/remove rows, an action
  dropdown, a CSS selector field (hidden for `screenshot`), a text field
  (shown only for `type`), capped at 10 steps to match the server-side
  limit.
- **New: `VmResultModal`.** Previously a VM task's result only produced a
  terse toast — screenshots (real returned data) had nowhere to appear at
  all. Now, once a task resolves, a panel shows the full result: stdout/
  stderr/error, browsed page title+url+text, per-step outcomes, and any
  screenshots rendered as real, clickable images (opens full-size via a
  data URL, no extra request needed).
- **Verified fully end-to-end through the real app and the real VM, not
  just component tests**: built a real click→type→screenshot sequence
  through the actual UI, approved it, and confirmed all three steps
  succeeded and the screenshot rendered as a real image in the results
  panel — zero console errors.
- 165 tests across 21 files now (up from 150): 18 for the expanded
  `VmPromptModal` (step add/remove, the type-only text field, the 10-step
  cap, submitting the built sequence with blank selectors trimmed out,
  resetting after submit) and 8 for `VmResultModal` (success/failure
  headers, title/url, stdout/stderr, step results, screenshot rendering,
  close via button and backdrop).

## 0.21.0 — All Intelligence Panels Tested

- 150 tests across 20 files now (up from 123). Added `NewsPanel` (5 —
  importance ranking, loading/unavailable states, click-to-select,
  focused highlighting), `MarketPanel` (5 — positive/negative change
  styling and sign, the `>= 0` boundary treating exactly 0% as positive,
  locale-formatted price), `SignalsPanel` (3 — empty-alerts state, alert
  fields, category tally correctness), `MediaPanel` (3 — not-configured
  vs. ready states from a mocked `/api/config`, graceful fallback if that
  fetch itself fails), and `EventDetailPanel` (11 — conditional Region/
  Confidence fields, source links, and its `RelatedVideos` sub-component's
  full lifecycle: searching → results / no-results / hidden-when-
  unconfigured(501), plus confirming a newly selected event's videos
  don't leak the previous event's stale results).
- Every intelligence dashboard panel now has real test coverage; only the
  WebGL-dependent `Orb`/`Globe` components remain (by design — verified
  live instead, jsdom has no WebGL).

## 0.20.0 — CommandPalette Tests (the biggest component, fully covered)

- 123 tests across 15 files now (up from 107). `CommandPalette` (16 tests)
  covers every action: navigation (Orb/Intelligence/Settings), voice
  connect/disconnect with the correct label, all five Quick Actions
  (open app, open URL, notification, system status with real result-shape
  formatting, both VM prompts), the demo action, and the global Cmd+K/
  Escape keyboard shortcuts.
- Two real jsdom gaps found and fixed in `vitest.setup.ts` (shared by every
  future test, not just this one): `ResizeObserver` and
  `Element.prototype.scrollIntoView` aren't implemented in jsdom, and
  `cmdk` (the command palette library) uses both internally — stubbed as
  no-ops.
- Caught a real "two sources of truth" nuance while writing the voice
  tests: the palette's displayed label ("Talk to FRIDAY" vs. "End Voice
  Session") is driven by `orb-store`'s `voiceStatus`, but the click
  handler's actual connect/disconnect branch checks `isVoiceConnected()`
  (the real WebRTC connection state) separately — they stay in sync in
  the live app because `voice-controller.ts` updates the store as the
  connection changes, but nothing links them automatically, so the test
  needed to set both mocks to match. Not a bug, just documented for
  whoever touches this next.

## 0.19.0 — More Component Tests (Sparkline, FreshnessBadge, CameraActiveIndicator, VmPromptModal)

- 107 tests across 14 files now (up from 83). Added `Sparkline` (4 tests —
  renders nothing under 2 points, correct plotting, color by direction, no
  div-by-zero on a flat line), `FreshnessBadge` (7 tests — all four status
  labels, the DEMO DATA badge, "updated Ns ago" shown only for
  live+timestamped data, never a negative age from clock skew),
  `CameraActiveIndicator` (2 tests), and `VmPromptModal` (11 tests — mode-
  specific copy, Run disabled until non-whitespace input, Cancel doesn't
  call either VM function, Run calls the right one with trimmed input and
  closes immediately, Enter submits/Escape cancels, success/failure/
  rejected-promise toasts).
- Fixed a real testing-hygiene issue found while adding these: `vi.waitFor`
  (vitest's own) isn't act()-aware, so awaiting it around a state update
  triggered a "not wrapped in act()" warning; switched to
  `@testing-library/react`'s `waitFor`, which is.

## 0.18.0 — First Runtime Performance Measurement + Component Tests

- **First-ever runtime performance profile of the orb/globe Three.js
  scenes** (previously only bundle *download* size had been measured).
  Used a real Playwright session against a production build with a
  Chrome DevTools Protocol session for heap metrics and an injected
  requestAnimationFrame counter for FPS:
  - Orb view: 110-120 FPS, ~0.9MB heap growth over 8s (normal churn, not
    a leak).
  - Globe view: 53-64 FPS, ~1.9MB heap growth over 8s. Notably lower than
    Orb in this same environment — investigated for an obvious cause
    (excessive re-renders, a missing memoization) and didn't find one;
    the most likely explanation is real 3D rendering cost (antialiasing +
    marker count) combined with this test environment's software
    rendering (no real GPU), which is expected to be lower than the
    user's actual hardware. Still comfortably smooth; not treated as a
    confirmed problem without more evidence.
  - **Good news, genuinely tested for**: 10 repeated orb↔globe mode
    switches (mount/unmount of the Three.js scenes) showed *zero* net
    heap growth after forcing GC — no memory leak from repeated
    switching. Zero console errors throughout the whole run.
- **First component-level tests** (previously only `lib/` logic had
  coverage, nothing in `components/`): added `vitest.setup.ts` (jest-dom
  matchers + RTL auto-cleanup) and wrote tests for `ToolApprovalModal`
  (the critical-risk banner, "Always Allow" correctly hidden only for
  critical tools, each button resolving the right decision) and `Toast`
  (rendering, tone-based styling, the real 3500ms auto-dismiss timer, and
  a newer toast correctly surviving an older one's stale dismiss timer).
  83 tests across 10 files now.

## 0.17.0 — More Test Coverage: Intelligence Providers, Gesture Dispatch

- 72 tests across 8 files now (up from 37 last round): added coverage for
  `searchWeb`/`searchVideo` (Tavily/YouTube — request shape, response
  mapping, honest-null-on-missing-key, graceful failure on non-ok/network
  error), `geocode.ts`'s background pipeline (extraction → geocode →
  cache, NONE/no-results/API-error paths, in-flight and already-cached
  dedup — required per-test module reinstantiation plus fake timers to
  isolate the module's real internal rate-limiter state between tests
  without real multi-second delays), and `gesture-controller.ts`'s
  synthetic pointer/wheel event dispatch (coordinate math including the
  horizontal mirror, pinch start/move/end → pointerdown/move/up, two-hand
  distance delta → wheel with a sub-threshold no-op case, open-palm reset
  debounce).
- Exported `dispatchPointer`/`dispatchWheel`/`handleFrame` from
  `gesture-controller.ts` (previously module-private) specifically to make
  this coordinate/event-translation logic directly testable, rather than
  only exercisable end-to-end with a real camera.

## 0.16.0 — Bundle Size: Defer MediaPipe Until Gestures Are Enabled

- `lib/gestures/gesture-controller.ts` no longer statically imports
  `@mediapipe/tasks-vision` (via `HandTracker`) — that import is now
  dynamic, loaded only inside `enableGestures()`. Previously the whole
  MediaPipe runtime shipped in the initial bundle on every page load,
  because `GestureController.tsx` (which pulls this module in) is mounted
  unconditionally in the root layout, even though gestures are off by
  default and most sessions never touch them.
- **Measured, not assumed**: initial JS dropped from 1987KB to 1835KB
  (152KB, ~7.6%) across matched production builds, verified via a real
  Playwright session counting actual network bytes. Confirmed gestures
  still work correctly when enabled: a real browser test (fake camera
  device) showed zero MediaPipe requests before enabling, and exactly the
  expected two requests (the local chunk + the real CDN WASM file) after
  enabling, with zero console errors.
- **A different optimization attempt was tried and reverted after
  measuring it made things worse**: dynamically importing `IntelligenceMode`
  (the globe) so it wouldn't load until the user switches to it seemed like
  an obvious win, but measured initial bundle size actually went *up*
  slightly (2045KB vs 1987KB baseline) while only deferring ~29KB — because
  nearly all the weight there is the Three.js/React Three Fiber runtime the
  Orb view already needs regardless, so splitting added `next/dynamic`
  overhead without meaningfully reducing what ships upfront. Not shipped —
  worth noting so it isn't retried without re-measuring.

## 0.15.0 — Real Test Coverage for Security-Critical Logic

- Test suite went from 2 tests (1 file) to 37 tests (4 files) by adding
  coverage for the pure, high-stakes logic that had none: the SSRF guard
  (21 tests — every blocked range, boundary cases just inside/outside each
  range, DNS-rebinding defense via mocked resolution, IPv4 and IPv6), the
  gesture detector (7 tests — pinch, open palm, two-hand distance, multi-hand
  primary-hand selection), and the tool permission/approval engine (7 tests
  — disabled/allow/ask modes, deny/allow_once/always_allow outcomes, audit
  log records, unknown-tool rejection).
- **Found and fixed a real bug while writing the SSRF guard tests**: Node's
  `URL` parser keeps the brackets on an IPv6 literal hostname (`"[::1]"`, not
  `"::1"`), so the IPv6 blocklist check was comparing against the wrong
  string and never actually matched — meaning IPv6 loopback/link-local
  literals weren't being blocked despite the code appearing to handle them.
  Fixed by stripping the brackets before the range check; re-verified live
  through the real app that `http://[::1]/` and other IPv6 cases are now
  genuinely rejected, with no regression on the already-working IPv4 path.

## 0.14.0 — Multi-Step Browser Interaction on the VM

- `browse_on_vm` now accepts an optional `steps` array (up to 10):
  `click`/`type`/`wait`/`screenshot` against CSS selectors, run in order
  after the page loads. Each step reports its own success/failure; one
  failing step doesn't abort the rest. Screenshots come back as base64 PNGs
  (~800KB cap each, up to 3 per task).
- Rebuilt the VM's `friday-browser:latest` image with the updated script.
- **Verified with real interaction, not just a page load**: clicked
  Wikipedia's actual search box, typed real text into it, and confirmed via
  a decoded, visually-inspected screenshot that it landed correctly and
  triggered Wikipedia's genuine live autocomplete. Confirmed screenshot
  bytes are valid PNG data. Re-verified through the real Next.js route with
  no regression on existing single-shot `browse`/`shell` tasks.
- Voice's `browse_on_vm` tool gained a `steps` parameter (a JSON array
  passed as a string). The Quick Actions UI prompt stays URL-only for
  now — a full step-builder is separate, larger scope.

## 0.13.0 — VM Tools in the Command Palette (Quick Actions, not just voice)

- `⌘K` → "Run Command on Cloud VM…" / "Browse URL on Cloud VM…" — the same
  `run_on_vm`/`browse_on_vm` tools voice already had, now reachable without
  talking to FRIDAY. Goes through the identical critical-risk `runTool()`
  approval flow, no bypass.
- **Real bug found via a live Playwright browser test, not caught by
  review**: the new prompt modal stayed mounted until its VM call resolved,
  so its backdrop sat on top of the approval modal underneath and silently
  ate clicks on "Allow Once." Fixed by closing the prompt immediately on
  submit. Re-verified end-to-end through an actual browser afterward: typed
  a real command, approved it, got back a toast with the real VM's actual
  output, zero console errors.

## 0.12.0 — App-Layer SSRF Guard, Prompt-Injection Wrapper, VM Host to Env Var

- Added `lib/vm/ssrf-guard.ts`: a second, independent layer of SSRF protection
  for `browse_on_vm`, on top of the VM-side Docker network block from 0.11.0.
  Blocks private/link-local/loopback destinations before a request ever
  leaves the Mac — including via DNS resolution (not just literal IPs), which
  defends against DNS rebinding. Verified live: metadata IP, `127.0.0.1`,
  `10.10.0.1`, and even `localhost` (resolved and blocked) are all rejected
  with a clear `400`, while real public URLs still work normally.
- Browsed page content is now wrapped with an explicit "untrusted content"
  delimiter before it re-enters the voice model's context — defense-in-depth
  for prompt injection alongside the existing documented convention.
- Moved the VM's IP/username out of a committed source constant
  (`lib/vm/config.ts`) into `VM_HOST`/`VM_USER` env vars — real public
  infrastructure-identifying information doesn't belong hardcoded in a public
  repo, even though the forced-command SSH restriction means knowing the IP
  alone doesn't grant access.
- Repo docs reorganized from `docs/*.md` to the repo root; all cross-references
  updated to match.

## 0.11.0 — Real Browser Automation on the VM, Fixed a Real SSRF Bug

- Phase 9 gained a second task type: `browse_on_vm` renders a real URL with
  headless Chromium (Playwright) on the cloud VM and returns its title and
  text content — actual JS-rendered content, verified against a random
  Wikipedia article and Hacker News' live front page. Runs in a custom image
  (`friday-browser:latest`, built once on the VM, not per-task) with real
  resource limits that were confirmed to fit comfortably in the droplet's 1GB
  RAM. Registered under the same `run_on_vm` critical-risk tool/approval
  profile as shell tasks — one execution surface, two task shapes.
- **Found and fixed a real SSRF vulnerability while building this**, not a
  hypothetical: with the browse task's networking enabled, the container
  could reach DigitalOcean's metadata service and successfully read back the
  droplet's own cloud-init data — confirmed live. Fixed by blocking container
  egress to the metadata service and this droplet's private VPC ranges at the
  Docker `DOCKER-USER` iptables layer, made persistent across reboots via a
  new systemd unit, and re-verified through the actual production SSH path
  (not just as root) that the block holds while real browsing still works.

## 0.10.0 — Voice shortcut changed to ⌥+V, launchable app

- Voice activation shortcut changed from ⌥+Space to ⌥+V (in-app listener, Tauri
  global shortcut, and all UI copy/docs updated together).
- Added `~/Applications/FRIDAY.app`, a thin wrapper bundle (real icon, real
  Info.plist) that launches `pnpm desktop:dev` via a login shell so it picks up
  the normal PATH — a real double-clickable, Spotlight-searchable app today,
  short of the full standalone Tauri bundle (`desktop:build`, still not
  attempted — needs a bundled Node server sidecar). Verified via `open` (the
  real LaunchServices path), not just running the script directly.

## 0.9.0 — Phase 8/9: Real Cloud VM, First Sandboxed Execution Channel

- **Phase 8**: provisioned and hardened a real DigitalOcean droplet
  (`friday-vm-agent`, $6/mo, Ubuntu 26.04 LTS) after the user approved provider
  and budget. Non-root user, key-only SSH, default-deny firewall, unattended
  security updates, Docker. Found and left alone an unrelated pre-existing
  droplet on the same account from a different project.
- **Phase 9 first vertical slice**: an SSH-based command channel (not a public
  HTTPS gateway — no new open port needed, reuses SSH's hardened auth) lets the
  Mac send a task to the VM and get a real result back. A dedicated key
  (separate from the human admin key) is forced via `authorized_keys` to only
  run `/opt/friday-agent/dispatch.sh`, which executes the task inside an
  ephemeral, network-isolated-by-default, resource-limited Docker container.
  **Verified the forced-command restriction actually holds** (tried to run a
  different command over the same key, server ignored it) **and that network
  isolation is real** (DNS resolution itself fails inside the container without
  explicit opt-in).
- Registered as `run_on_vm`, the first tool to reach `riskLevel: "critical"` —
  goes through the same permission/approval/audit-log path as every other tool,
  with one addition: the approval modal now shows a distinct warning banner and
  omits "Always Allow" for critical-risk tools, so every VM execution needs
  individual approval, no exceptions. Closes a gap flagged (but not built) in
  `SECURITY.md` since Phase 6.
- Verified end-to-end through the actual Next.js route (not just a raw SSH
  test): real 200 response, real VM output, zero errors in the server log.
- Not built yet: browser automation, richer task types beyond a single shell
  command.

## 0.8.0 — Geocoded News Events

- Real headlines now get real globe markers. `lib/intelligence/sources/geocode.ts`
  extracts a place name per headline via OpenAI's Responses API (`gpt-5-nano`, the
  cheapest current text model, verified live pricing) and resolves it to
  coordinates via Nominatim (OpenStreetMap, no key needed). Runs as background,
  fire-and-forget work so it never blocks a request — a marker appears on a later
  poll once resolved, and a headline with no clear single place (product launches,
  layoffs, broad market moves) correctly gets no marker at all rather than a
  fabricated one.
- **Real bug found via live testing**: `gpt-5-nano` is a reasoning model — a naive
  small `max_output_tokens` budget got entirely consumed by reasoning tokens,
  returning zero actual text. Fixed with `reasoning: { effort: "minimal" }` +
  a larger token budget, confirmed reliable.
- **Verified against the real, already-configured API keys**: of 13 real live
  headlines, 5 correctly resolved to sensible real coordinates (a South Korea
  market story → Seoul-area coordinates, a US FDA story → US-center coordinates, a
  solar-observation story → Hawaii, matching the real telescope's location) and 8
  correctly got no marker — zero errors.

## 0.7.0 — Gestures, Menu Bar App, Web/Video Search

- **Phase 10 (gestures)**: opt-in webcam hand-tracking (`@mediapipe/tasks-vision`)
  drives the globe — pinch+drag to rotate, two-hand pinch distance to zoom, open
  palm to reset view — by dispatching synthetic pointer/wheel events at the
  existing OrbitControls rather than reimplementing camera math. Off by default;
  the camera is never touched until enabled in Settings → Input. Verified the
  full pipeline (permission flow, WASM+model load, no-crash `detectForVideo`,
  camera-active indicator, clean teardown) with zero errors; actual gesture-
  recognition accuracy against a real hand needs the user.
- **Phase 11 completion**: added a real menu bar tray icon (Show/Quit), a
  system-wide global shortcut (`@tauri-apps/plugin-global-shortcut`, works even
  when FRIDAY isn't focused, shares the same `toggleVoice()` as the in-app
  listener), and auto-launch at login (`@tauri-apps/plugin-autostart`) with a
  real toggle in Settings → General. **Found and fixed a real bug**: the
  scaffolded `global-shortcut:default` capability didn't include the `register`
  command — first launch failed with a permission error; fixed by adding the
  specific `global-shortcut:allow-register`/`allow-unregister`/
  `allow-is-registered` permissions to `capabilities/desktop.json`, verified by
  relaunching clean.
- **Phase 3 completion**: real web search (Tavily) and video search (YouTube
  Data API) — both `null`-vs-empty-array aware so "not configured" is never
  confused with "no results," both honestly return `501` when their key is
  unset. Wired into voice as `search_web`/`search_video` tools and into
  `EventDetailPanel`'s related-videos section.
- **Phase 2/5**: added a `focus_event` voice tool so FRIDAY can point at the
  specific globe marker/detail panel for a story it's discussing, not just talk
  about news in the abstract.

## 0.6.0 — Real Native macOS App (Tauri)

- Installed Rust + Tauri CLI; scaffolded `apps/dashboard/src-tauri/` pointed at a
  live Next.js server (not a static export — the app has ~10 API routes a static
  export can't include; this was the deliberate, correct architecture choice, not
  the simpler default)
- Real app icon generated from the existing manifest-icon route, mic/camera usage
  descriptions in a merged Info.plist, window sized for the actual dashboard
  (1280×800, not Tauri's 800×600 default)
- Verified with a real launch on the user's actual Mac, not just "it compiled":
  confirmed via logs that real page navigation, a real API call
  (`GET /api/config 200`), and the manifest/orb all worked inside the native
  window; confirmed via `osascript`/System Events that the compiled binary is a
  real foreground macOS process
- `desktop:build` (distributable bundle) intentionally not attempted yet — needs a
  bundled Node server sidecar, a different problem than `desktop:dev`
- Excluded `src-tauri` from ESLint's scan (was picking up Rust build artifacts)

## 0.5.0 — Orchestration, Memory, and an Installable App

- **Phase 5 (orchestration)**: voice now has real function-calling access to
  FRIDAY's capabilities — local Mac tools (through the same permission/approval
  engine as the command palette), live intelligence data, dashboard control, and
  memory. Found and fixed two real bugs via live testing: (1) `connect()` resolved
  before the WebRTC data channel was actually open, silently dropping the tool
  registration with no error anywhere; (2) after fixing that, `session.update`
  turned out to require a `type` field the docs example didn't show. Verified
  end-to-end: asked FRIDAY for battery percentage via synthesized speech, watched
  it call `get_system_status` for real, and got back "21 percent, charging" —
  cross-checked against `pmset -g batt` and confirmed exact.
- **Phase 7 (memory)**: local SQLite via Node's built-in `node:sqlite` (no external
  dependency) at `~/.friday/memory.db`. `remember`/`recall` tools let FRIDAY save
  and search memory during a voice conversation. Settings → Memory is a real UI —
  enable/disable toggle, search, delete, clear all.
- App icon + web manifest: replaced the leftover create-next-app defaults with a
  real generated icon and an installable manifest so Safari's "Add to Dock" gives a
  genuine standalone app window on macOS.
- Bumped `@types/node` to match the actual Node runtime (was `^20`, predates
  `node:sqlite`'s types which arrived in Node 22+).

## 0.4.0 — Voice Verified Live

- Applied user's real `OPENAI_API_KEY`, moved default voice model to
  `gpt-realtime-2.1-mini` after confirming current pricing (~1/3 the cost of the
  full model), matching the user's cost preference
- Investigated switching to Gemini Live API (cheaper, has a free tier) — user chose
  to keep the already-built OpenAI integration; documented for later reconsideration
- Found and fixed a real bug on first live test: `turn_detection` was sent as a
  top-level `session` field; OpenAI rejected it (`400 Unknown parameter`) — it
  belongs nested under `session.audio.input`. Also improved the route to surface
  OpenAI's actual error message to the client instead of a generic one.
- Verified end-to-end against the real API: ephemeral token minting (curl), full
  browser WebRTC handshake (`CONNECTING → READY`, Playwright + Chromium fake-device
  flags), and real speech detection (fed synthesized speech via macOS `say`,
  confirmed OpenAI's semantic VAD fired `input_audio_buffer.speech_started` and the
  UI correctly reflected `LISTENING` in real time)
- Not yet tested: a full natural conversational turn (needs a real human, not a
  looping fake-audio file) — documented as the one remaining open item

## 0.3.0 — Real Keys Applied & Voice (Phase 4)

- Applied user's real `NEWS_API_KEY` and `TWELVE_DATA_API_KEY` — news and markets
  confirmed fully live (14 real headlines, 5 real market quotes via curl)
- Fixed Twelve Data equity symbols: `SPX`/`IXIC` aren't on the free plan (403/404) —
  swapped for `SPY`/`QQQ` ETF proxies, confirmed working
- Voice provider decision: OpenAI Realtime API over LiveKit — no separate
  infrastructure to run, cheaper for personal/low-volume use
- Verified OpenAI's Realtime API surface against live docs (WebFetch) rather than
  training data — it has renamed endpoints before (`sessions` → `client_secrets`)
- Built Phase 4 end-to-end: ephemeral-token server route (`/api/voice/session`,
  `OPENAI_API_KEY` never reaches the browser), browser WebRTC session with real mic
  capture and a real `AnalyserNode` on the assistant's audio driving the orb's
  speaking state (no simulated waveform), event handling for transcripts/turn state,
  `⌥ + Space` activation, live transcript UI, mute/end controls
- Honest status: voice is code-complete but **not yet verified** against a real
  `OPENAI_API_KEY` — reported as built-not-verified per this project's own rules

## 0.2.0 — Real Data & Local Tools

- Moved intelligence data fetching server-side (`/api/intelligence/*` route
  handlers) so API keys are never exposed to the browser — Phase 1's client-side
  provider call was a real gap once secrets entered the picture
- Live weather via NWS (no key) and live crypto markets via CoinGecko (no key) —
  real data with zero setup
- Gated live news (NewsAPI) and equities/FX (Twelve Data), activating automatically
  once their key is set; honest demo-data fallback otherwise or on fetch failure
- `/api/config` reports real configured/not-configured status; Settings → AI/
  Intelligence now shows it instead of a hardcoded guess
- Local Mac tools, fully implemented: open_application (allowlisted), open_url,
  volume, notification, system_status — all via `execFile`, never a shell string
- Tool permission engine (disabled/ask/allow, persisted) + approval modal (Allow
  Once / Always Allow / Deny) + audit log, all per spec §21-23/§50
- Command palette Quick Actions wired to real tools through the real approval flow
- Repo pushed to GitHub: https://github.com/Gariyuuu/friday

## 0.1.0 — Foundation & Visual FRIDAY

- Monorepo scaffold: pnpm workspaces + Turborepo, `apps/dashboard`, `packages/types`,
  `packages/config`
- Shared Zod schemas for intelligence events, market quotes, weather alerts, orb/voice
  state, and tool definitions
- Structured, secret-redacting logger
- Cinematic dark theme; holographic orb (Three.js/R3F) with all 8 states, bloom, and a
  graphics quality setting
- Interactive 3D globe with category-colored, clickable event markers
- Intelligence dashboard: news, markets, global signals, media, and event-detail
  panels, all backed by a swappable mock data provider with freshness indicators
- Command palette (⌘K) with a demo action exercising the full orb/dashboard flow
- Settings page with honest not-configured states for every unbuilt integration
