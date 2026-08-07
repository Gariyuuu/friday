# Project State

Last updated: 2026-08-07 (session 4, part 6 — Phase 9's first real vertical slice
is live: the Mac can send a command to the cloud VM over an SSH-based channel and
get a genuine sandboxed-execution result back, verified end-to-end through the
actual app, not just a raw SSH test. Browser automation and richer task types are
still open — see Phase 9 section below).

Repo: https://github.com/Gariyuuu/friday (pushed, fully up to date).

## Phase 9 — VM gateway/agent software (first vertical slice live)

**Architecture decision: SSH-based command channel, not a public HTTPS
gateway.** `docs/SECURITY.md`'s original threat model sketch assumed
HTTPS/WSS + bearer tokens; built it as SSH instead because: the droplet's
firewall is already default-deny with only SSH open (Phase 8), so this needs
zero new open ports and zero new attack surface; SSH's key-based auth is
already a hardened, battle-tested primitive, cheaper to lean on correctly than
to hand-roll a token/TLS scheme from scratch; and a personal single-user tool
with exactly one client (the Mac) and one server (the VM) doesn't need the
flexibility a general HTTP API buys. Documented here as a deliberate deviation
from the original sketch, per this project's own rule about not silently
replacing an architectural decision.

- **A dedicated keypair, not the admin key**: generated a new ed25519 keypair
  (`~/.friday/vm_agent_key{,.pub}`, outside the repo, same pattern as the local
  memory DB) solely for this automated channel — kept separate from the human
  admin SSH key already on the account, so a leak of one doesn't imply the other.
- **Forced command, verified not just assumed**: the new key's `authorized_keys`
  entry on the VM (`friday` user) is `command="/opt/friday-agent/dispatch.sh",
  no-pty,no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-user-rc`.
  **Actually tested the restriction holds**: SSH'd in requesting `whoami` as the
  command and confirmed the server ignored it and ran `dispatch.sh` anyway (it
  correctly replied `{"ok":false,"error":"command is required"}` since no JSON
  was piped in) — proof this is enforced server-side, not just documented intent.
- **`/opt/friday-agent/dispatch.sh`** (bash + jq, no VM-side Node needed): reads
  one JSON task from stdin (`{command, timeoutSeconds?, allowNetwork?, image?}`),
  runs it inside an ephemeral Docker container — `--network=none` unless
  `allowNetwork:true`, `--memory=256m --cpus=0.5 --pids-limit=64 --read-only
  --cap-drop=ALL --security-opt=no-new-privileges` — captures stdout/stderr/exit
  code, writes one JSON result to stdout. Never runs anything on the host itself.
- **Verified network isolation is real, not assumed**: ran `wget` inside a task
  with default settings and got `wget: bad address 'api.ipify.org'` — DNS
  resolution itself fails under `--network=none`, confirmed live, not inferred
  from the flag's documentation.
- **Mac side**: `lib/vm/vm-client.ts` (server-only) — `execFile`'s the system
  `ssh` binary with a fixed argument array (never a shell string), pipes the
  JSON task via stdin, parses the JSON result from stdout, with a hard timeout
  backstop above the VM-side one. `app/api/tools/run-on-vm/route.ts` — Zod
  validates the request, calls the client, returns the result.
- **Registered as a real tool, not a side channel**: `run_on_vm` added to
  `lib/tools/registry.ts` (`executionLocation: "vm"`, `riskLevel: "critical"` —
  the first tool to actually reach this level) and to voice's tool definitions
  in `friday-tools.ts`. Goes through the exact same `runTool()` → permission →
  approval → audit-log path as every local tool — no separate, less-restricted
  path for VM execution, same invariant maintained since Phase 5.
- **Closed a previously-flagged gap**: `docs/SECURITY.md`'s tool risk model
  section had noted "no tool currently reaches high or critical risk; if one is
  added later it should not be settable to allow without a distinct warning —
  not yet built." Since `run_on_vm` is exactly that tool, built it now:
  `ToolApprovalModal` shows a red-bordered "⚠ Critical — runs on the cloud VM"
  banner for critical-risk approvals and **hides the "Always Allow" button
  entirely** for them — every single VM execution requires an individual,
  explicit approval, no exceptions, unlike lower-risk tools.
- **Verified end-to-end through the real app, not just a direct SSH test**:
  `POST /api/tools/run-on-vm` with `{"command": "echo ... && date"}` returned a
  real 200 with the VM's actual real-time output, confirmed against the dev
  server log (`ran vm task` → real `date` output → zero errors).
- **Not built yet**: browser automation (headless Chromium in a container —
  meaningfully more setup than a generic command runner), richer task types
  beyond a single shell command, a Quick-Actions UI entry (currently only
  reachable via voice — a deliberate scope cut this round, not an oversight),
  and the DigitalOcean API token being needed again for any future resize/
  destroy/snapshot (it was never persisted, by design — see Phase 8 below).

## Phase 8 — Cloud VM infrastructure (droplet live, hardened, in use by Phase 9)

User approved provider (DigitalOcean) and budget (~$5-10/mo, always-on) this
session, then provided a real DO personal access token. What's actually done:

- **Real droplet provisioned**: `friday-vm-agent`, DigitalOcean, region `nyc1`,
  `s-1vcpu-1gb` ($6/mo), Ubuntu 26.04 LTS, id `590685636`, public IP
  `165.22.184.128`. Tagged `friday`. **Found and reused an existing, unrelated
  droplet + SSH key already on this account** (`ubuntu-s-1vcpu-1gb-nyc1`, from
  the separate `ai-platform` project's vLLM box) — confirmed by fingerprint match
  that this Mac's `~/.ssh/id_ed25519.pub` was already registered there, so no new
  key was added; the existing unrelated droplet was left untouched.
- **Baseline hardening applied and verified over a real SSH session** (not just
  "the script exited 0"): non-root `friday` user created (sudo + docker groups,
  confirmed via `whoami`/`groups` over SSH), SSH password authentication and root
  login disabled (`sshd_config`, key-only from here on), a 2GB swap file added
  (this droplet only has 1GB RAM — needed headroom for Docker + future browser
  automation), UFW firewall enabled default-deny-incoming with only SSH allowed
  (confirmed via `ufw status` showing just OpenSSH), unattended security upgrades
  configured, Docker installed and confirmed working (`docker ps` succeeded as
  the non-root `friday` user).
- **The DigitalOcean API token was used in-memory for this session only and was
  never written to any file** (not `.env.local`, not the repo, not a scratch
  file) — grep-confirmed no local file contains it. If more provisioning is
  needed later (resize, destroy, snapshot), it'll need to be provided again or a
  scoped-down token created for that purpose specifically.
- **What runs on it now**: see the Phase 9 section above — `/opt/friday-agent/
  dispatch.sh`, real Docker task execution, the SSH-based command channel. No
  longer inert.

## Completed

**Phase 10 — Gestures (MediaPipe hand-tracking, opt-in)**

- `lib/gestures/hand-tracker.ts`: wraps `@mediapipe/tasks-vision`'s HandLandmarker.
  Model/CDN URLs verified against Google's live docs (2026-08-07), not recalled —
  this ecosystem also renames things (`@mediapipe/tasks-vision`'s own `latest` dist
  tag briefly pointed at a 2023 build mid-session before an active nightly channel
  got promoted).
- `lib/gestures/gesture-detector.ts`: converts raw 21-point hand landmarks into
  pinch/open-palm/two-hand-distance — spec §9's gesture set.
- `lib/gestures/gesture-controller.ts`: drives the Globe by dispatching *synthetic
  pointer/wheel events* at its canvas rather than reimplementing camera math — a
  pinch+drag becomes pointerdown/move/up, a changing two-hand distance becomes a
  wheel event, reusing OrbitControls' own well-tested drag/zoom handling. Open palm
  calls `resetGlobeView()` (a module-level registry `Globe.tsx` populates with its
  live OrbitControls ref, exposing just `.reset()` — avoids depending on
  `three-stdlib`'s types directly, which isn't a direct dependency of this app).
- `stores/gesture-store.ts` (persisted `enabled` toggle, transient `cameraActive`),
  `components/gestures/CameraActiveIndicator.tsx` (always visible whenever the
  webcam is actually in use, per spec §9), `components/gestures/GestureController.tsx`
  (lifecycle — never opens the camera just because `enabled` was true on a past
  visit; only reacts to the toggle changing). Settings → Input has the real toggle.
- Off by default. Nothing touches the camera until the user turns it on.
- **Honest testing limitation, stated upfront rather than discovered late**: unlike
  voice (where Chromium's fake-audio-capture + synthesized speech gave genuine
  end-to-end verification), there's no equivalent way to fake a convincing hand in
  front of a fake camera. What *was* verified via Playwright + Chromium's
  fake-device flags: the full pipeline initializes with zero errors (confirmed
  MediaPipe's WASM+model load from CDN, real `getUserMedia` permission flow, real
  `detectForVideo` calls on synthetic video frames with no crashes), the
  camera-active indicator appears/disappears correctly, and toggling off cleanly
  stops the camera (confirmed the indicator element is removed from the DOM and
  status flips to "off"). What is **not** verified: actual gesture recognition
  accuracy against a real hand — that needs the user.

**Phase 11 — Native Packaging (Tauri), completion**

- Installed Rust (via rustup) and `@tauri-apps/cli`/`@tauri-apps/api` — none of this
  was present before this session.
- `apps/dashboard/src-tauri/`: a real Tauri v2 shell. **Key architecture decision**:
  Tauri's webview points at a running Next.js server (`beforeDevCommand: "pnpm exec
  next dev -p 1420"`, fixed port to avoid this machine's multi-project port
  contention), not a static export — the app has ~10 API routes (intelligence,
  tools, voice, memory) that a static `next export` cannot include. This is the
  correct pattern for a full-stack Next.js app in Tauri; it was not the simpler
  "just bundle static files" approach because that approach would have silently
  broken nearly everything already built.
- `identifier: "com.gariyuu.friday"`, window sized 1280×800 (min 900×600) instead
  of Tauri's 800×600 default — too small for this dashboard.
- `src-tauri/Info.plist` merged in via `bundle.macOS.infoPlist` — adds
  `NSMicrophoneUsageDescription` (voice) and `NSCameraUsageDescription` (future
  Phase 10 gestures) so macOS's permission prompts show a real explanation instead
  of a blank/default one or a silent failure.
- Real app icon: reused the existing `manifest-icon` route (built for the PWA
  manifest) to generate a 1024px source image, then `tauri icon` generated all
  platform sizes from it — replaced Tauri's generic default icon. Removed the
  iOS/Android/Windows-Store icon variants `tauri icon` also generates by default,
  since only macOS desktop is targeted.
- `pnpm desktop:dev` / `pnpm desktop:build` scripts added.
- **Verified with a real launch, not just "it compiled"**: `pnpm desktop:dev`
  compiled ~348 Rust crates (~56s, one-time cost — cached after) and launched.
  Confirmed via the build log: real page navigation happened inside the native
  window (`GET /` → `GET /settings` → back to `GET /`), the manifest was
  auto-fetched by the webview, a real API route responded
  (`GET /api/config 200`), and the Three.js orb mounted (`THREE.Clock` warning
  appearing on each navigation back to `/`). Separately confirmed via
  `osascript`/System Events that the compiled binary appears as a real
  foreground-capable macOS process. **Important**: this ran on the user's actual
  MacBook desktop, not an isolated sandbox — a real window opened (likely on a
  different Space, since a full-screen capture from this session showed the
  user's own browser instead). Killed the test process afterward rather than
  leave a stray window.
- **System-wide global shortcut, added this round**: `@tauri-apps/plugin-global-shortcut`
  registers real OS-level ⌥+V (works even when FRIDAY isn't focused), sharing
  the exact same `toggleVoice()` logic as the in-browser `keydown` listener —
  `lib/desktop/global-shortcut.ts` no-ops outside Tauri (`"__TAURI_INTERNALS__" in
  window` check) so a plain web deployment never touches Tauri-only code.
  **Real bug caught by live testing**: `tauri add global-shortcut`'s scaffolded
  `global-shortcut:default` capability does NOT include the `register` command —
  first launch failed with `global-shortcut.register not allowed. Permissions
  associated with this command: global-shortcut:allow-register`. Fixed by adding
  `global-shortcut:allow-register`/`allow-unregister`/`allow-is-registered`
  explicitly to `capabilities/desktop.json`. Relaunched, confirmed clean (no error,
  real requests continued flowing).
- **Menu bar presence, added this round**: a real tray icon (`TrayIconBuilder` in
  `src-tauri/src/lib.rs`) with Show FRIDAY / Quit menu items, left-click
  shows+focuses the window. Required adding the `tray-icon` feature to the `tauri`
  Cargo dependency. Uses `app.default_window_icon().unwrap()` — verified this
  doesn't panic (the app kept running and served real requests after `setup()`
  completed, which requires the whole builder chain including this line to have
  succeeded; a panic there would have crashed the process before ever serving a
  request). Didn't chase a screenshot of the actual tray icon pixel — attempted a
  targeted menu-bar-corner screencapture, got a black/empty crop from a wrong
  coordinate guess, and judged the log-based proof (no crash, kept serving
  requests) sufficient rather than keep guessing screen coordinates.
- **Auto-launch at login, added this round**: `@tauri-apps/plugin-autostart`,
  wrapped in `lib/desktop/autostart.ts` (same Tauri-detection no-op guard). Real
  toggle in Settings → General, plus an honest "Running as: Native app / Browser
  tab" status line and a note that the global shortcut is system-wide only in the
  native app. **Testing limitation**: verified the plugin initializes without
  crashing at app launch, but could NOT verify the actual enable/disable call
  succeeds — that requires clicking a checkbox inside the real Tauri webview
  itself, which isn't reachable via Playwright (Playwright drives a plain Chromium
  browser where `window.__TAURI_INTERNALS__` doesn't exist, so the toggle
  correctly renders its "not available in browser" fallback instead of the real
  control — confirming the guard works, but not exercising the actual plugin call).
  This needs the user to click it once for full confidence.
- `pnpm desktop:build` (a distributable, optionally code-signed `.app`/`.dmg`)
  still not attempted — needs a bundled Node server sidecar, a different, bigger
  problem than `desktop:dev`. `desktop:dev` remains sufficient for daily use.
- **Real launchable app, added session 4 part 5**: `~/Applications/FRIDAY.app` —
  a thin wrapper bundle (`Info.plist` + a shell script `CFBundleExecutable`
  reusing the real generated `.icns` icon), not a true standalone Tauri build.
  Its executable runs `pnpm desktop:dev` via a login+interactive shell (so it
  picks up the user's normal PATH the way a GUI launch otherwise wouldn't), logs
  to `~/Library/Logs/FRIDAY/launch.log`, and shows a native alert if the launch
  dies within the first 8 seconds. **Verified via `open` (the same LaunchServices
  path Finder uses, not just running the script directly)**: real window opened,
  confirmed as a genuine foreground process via `osascript`/System Events, real
  page loads in the log. Killed after verifying, per this project's rule about
  not leaving stray windows on the user's live desktop. First launch needs a
  right-click → Open to clear Gatekeeper's unsigned-app warning, same as any
  unsigned local build.

**Phase 3 completion — web search & video search**

- `lib/intelligence/sources/search.ts` (server-only): Tavily (`api.tavily.com/search`,
  Bearer auth, `search_depth: quick|standard|deep`). Returns `null` — not `[]` — when
  `SEARCH_API_KEY` is unset, so callers can distinguish "not configured" from
  "genuinely no results."
- `lib/intelligence/sources/video.ts` (server-only): YouTube Data API v3
  `search.list`. Same `null`-vs-empty-array distinction for `YOUTUBE_API_KEY`.
- `app/api/search` and `app/api/video` route handlers: honest `501` with a plain-
  English "not configured" message when the relevant key is missing — never a fake
  200 with empty/fabricated results.
- Wired into voice orchestration as `search_web`/`search_video` tools (see Phase 5
  section above and `friday-tools.ts`) and into the UI: `EventDetailPanel`'s
  `RelatedVideos` component fetches `/api/video?q=<story title>` per focused story,
  checks for `501` to hide the section entirely rather than show an error, and
  `MediaPanel` checks `/api/config`'s `intelligence.video` flag for its idle-state
  copy.
- **Verified with keys unset**: both routes checked live — confirmed real `501`
  responses with the expected honest messages, no fabricated data, no console
  errors.
- **Verified with real keys, session 4 part 4/5**: user signed up for Tavily and a
  YouTube Data API v3 key. First YouTube key pasted was invalid (Google returned
  `API_KEY_INVALID` — confirmed by curling Google's API directly, bypassing this
  app entirely, to isolate whether the bug was ours; it wasn't — the string was 40
  characters instead of the standard 39, a copy-paste artifact); the corrected key
  worked immediately. Both now return real results end-to-end through the actual
  app routes: real Tavily search results, real YouTube video results (e.g. "SpaceX
  launch" → real recent SpaceX coverage videos with real thumbnails).
- **Geocoding, added same day (session 4, part 4)**: `lib/intelligence/sources/geocode.ts`
  extracts a place name from each real headline via OpenAI's Responses API
  (`gpt-5-nano`, cheapest current text model — verified live pricing 2026-08-07)
  and resolves it to coordinates via Nominatim (OpenStreetMap, no key needed, rate-
  limited to ~1 req/sec per their usage policy, `User-Agent` set as required).
  **Real bug found via live testing**: `gpt-5-nano` is a reasoning model — with a
  naive small `max_output_tokens` (20), it burned the entire budget on reasoning
  tokens and returned `status: "incomplete"` with zero actual text. Fixed with
  `reasoning: { effort: "minimal" }` + `max_output_tokens: 100`, confirmed
  completing reliably. Runs as background, fire-and-forget work (never blocks a
  request) — an event without a cached location schedules geocoding and appears
  without a marker on this poll, with a marker on a later one once resolved.
  Never fabricates a location: if the model can't identify one (replies `NONE`,
  the documented behavior for stories without a clear place — e.g. product
  launches, layoffs, market-wide moves), the event simply has no marker, exactly
  as before this feature existed. **Verified end-to-end against the real,
  already-configured `OPENAI_API_KEY`/`NEWS_API_KEY`**: of 13 real live headlines,
  5 correctly resolved to real coordinates (a South Korea market story → Seoul-area
  coords, a US FDA flu-shot story → US-center coords, a solar-observation story →
  Hawaii, matching the Inouye Solar Telescope's real location) and 8 correctly
  got no marker (product launches, layoffs, market moves with no single place tied
  to them) — zero errors in the dev log across the whole run.

**Phase 2/5 — `focus_event` tool**

- New voice tool `focus_event({eventId})` in `friday-tools.ts`, dispatching to
  `useUiStore.getState().focusEvent(eventId)` — lets FRIDAY actually point at the
  globe marker/detail panel for a story it's discussing mid-conversation, instead of
  only being able to talk about news in the abstract.
- Required also returning `id` from `get_news`'s tool result (previously only
  `title`/`category`/`summary`) so the model has something to pass to `focus_event`
  on a follow-up turn.
- **Verified**: exercised via curl-equivalent direct store call and confirmed the
  globe/detail panel respond to `focusEvent` the same way a manual click does (same
  code path, `ui-store.ts`'s existing `focusEvent` action, not a new one). Full
  voice-triggered round trip (ask FRIDAY about a headline, have it call
  `focus_event`) follows the same `tool_choice: "auto"` non-determinism already
  documented in Phase 5 — mechanism proven, not guaranteed on every phrasing.

**Phase 0/1/3/4/6**: see prior session notes below this section header's history in
git — unchanged this session except where noted. Monorepo, orb, globe, dashboard,
command palette, settings, real news/markets/weather, real local Mac tools, real
voice (OpenAI Realtime) — all live and verified.

**Phase 5 — AI Orchestration (voice tool-calling)**

This is the piece that turns voice from "a chatbot bolted onto FRIDAY" into
actually controlling FRIDAY. The realtime model now has function-calling access to
real capabilities:

- `lib/voice/friday-tools.ts`: 9-11 tool definitions (JSON Schema, OpenAI Realtime
  function-calling format, verified against live docs) — `open_application`,
  `open_url`, `show_notification`, `set_volume`, `get_system_status`, `get_markets`,
  `get_weather_alerts`, `get_news`, `open_intelligence_dashboard`, plus
  `remember`/`recall` (only included if long-term memory is enabled — see Phase 7).
  `executeFridayTool(name, argsJson)` dispatches each to its real implementation.
- **Local Mac tools go through the exact same permission/approval engine as the
  command palette** — `open_application`/`open_url`/etc. call the same
  `lib/tools/client.ts` wrappers, which call `runTool()`, which checks
  disabled/ask/allow and shows the approval modal exactly as before. Voice does not
  get a bypass around tool permissions.
- `lib/voice/voice-controller.ts`: after connecting, sends a `session.update` event
  registering the tools. On `response.done`, scans the output for
  `type: "function_call"` items, executes each via `executeFridayTool`, reports
  results back via `conversation.item.create` (`function_call_output`) +
  `response.create` to let the model continue. Orb shows `executing` state while a
  tool runs (spec §8's state list, now actually reachable from voice).

**Two more real bugs found via live testing** (same discipline as Phase 4 — build,
then actually test against the real API before calling it done):

1. `realtime-session.ts`'s `connect()` resolved right after `setRemoteDescription`,
   but the WebRTC data channel isn't guaranteed open at that point — there's a
   handshake gap. The `session.update` sent immediately after `connect()` (to
   register tools) was silently dropped by `send()`'s `readyState === "open"` guard,
   with **no error anywhere**. The model ended up with zero tools and, when asked
   about battery status, confidently told the user it had no way to check — a
   plausible-sounding wrong answer that would have been very easy to miss without
   watching the actual network traffic. Fixed: `connect()` now awaits the data
   channel's `open` event before resolving.
2. After that fix, `session.update` requests started actually reaching OpenAI —
   which surfaced a second, real, distinct error from the live API: `400 Missing
   required parameter: 'session.type'`. The doc example this was written from
   didn't show a `type` field in a `session.update` payload, but the live API
   requires it anyway. Fixed by adding `type: "realtime"`.

**Verified end-to-end after both fixes** — genuinely, not just "no errors thrown":
asked (via synthesized speech) *"what is my current battery percentage right now?"*
Observed, in order: `LISTENING → THINKING → SPEAKING → EXECUTING` (the last one
confirming the model chose to call a tool) → a real `GET /api/tools/system-status`
network request → `THINKING → SPEAKING` again → FRIDAY's spoken/transcribed answer:
*"Your battery is at 21 percent right now, and it's charging."* Cross-checked
against `pmset -g batt` run independently: **21%, charging — exact match.** This is
not a hallucination; it's a genuine tool-call round trip with real data.

One honest caveat: tool invocation isn't guaranteed on every single turn — in the
same test session, a later repeat of the same question got a generic non-tool
answer instead. This is normal LLM `tool_choice: "auto"` behavior (the model's own
judgment call each turn), not an infrastructure bug — the mechanism is proven to
work when the model decides to use it.

**Phase 7 — Memory**

- `lib/memory/db.ts` (server-only): local SQLite via Node's built-in `node:sqlite`
  (stable since Node 22+, zero extra dependency, zero native build step) at
  `~/.friday/memory.db` — outside the repo, not a hosted Postgres (spec §30's
  eventual target), because a personal single-user app doesn't need that
  infrastructure yet. Schema: `memories(id, category, content, created_at)`,
  category is `preference | project | episodic`.
- `app/api/memory` (GET list/search via `?q=`, POST add, DELETE via `?id=` or
  `?category=`/`all`) — the only place the DB is touched.
- `remember`/`recall` tools (see Phase 5) let FRIDAY save/search memory *during a
  voice conversation* — confirmed working via curl (added a test entry, listed it,
  deleted it, confirmed empty).
- Settings → Memory: real UI — enable/disable toggle (persisted client-side,
  gates whether the tools are even offered to the model), search box, per-item
  delete, Clear All. Not a placeholder — every button does what it says.
- Required bumping `@types/node` from `^20` to `^26.1.2` — the old version predates
  `node:sqlite`'s type declarations (added in Node 22+), even though the actual
  Node runtime here (v26.3.0) already supported it fine. Type-only mismatch, not a
  runtime one.

**App icon + installable web manifest** (same session, before Phase 5/7): replaced
the leftover create-next-app default favicon/SVGs (unused boilerplate) with a real
generated orb icon (`app/icon.tsx`, `app/apple-icon.tsx` via Next.js's
`ImageResponse` convention — no external image tooling needed) and a web app
manifest (`app/manifest.ts`) so Safari/Chrome can "Add to Dock" FRIDAY as a
standalone window on macOS. Not real native packaging (Phase 11 — Tauri, menu bar,
global shortcut, auto-launch) but a genuinely working app-like experience today
with zero extra infrastructure.

## Current

Every phase has a live, verified vertical slice, including Phase 9 now (the SSH
command channel + sandboxed Docker execution + critical-risk approval flow — see
above). What remains in Phase 9 is breadth, not the foundation: browser
automation and richer task types beyond a single shell command.

## Next

- **Phase 9 breadth**: browser automation (headless Chromium in a container —
  the next meaningful capability, more setup than the generic command runner
  that exists now), richer task types, a Quick-Actions UI entry for `run_on_vm`
  (currently voice-only).
- **User verification needed**: confirm gesture recognition feels accurate with a
  real hand in front of the camera (Settings → Input), and click the autostart
  toggle once inside the real `pnpm desktop:dev` window if you ever want it on
  (currently off by default, which you confirmed is what you want).
- `pnpm desktop:build` (distributable, optionally signed `.app`/`.dmg`) — needs a
  bundled Node server sidecar, a materially bigger problem than `desktop:dev`. Only
  relevant if/when sharing the app with someone else matters. A wrapper `.app`
  (`~/Applications/FRIDAY.app`, launches `desktop:dev` under the hood) exists as
  a lighter-weight stand-in — see below.

## Known issues

- `config.ai.anthropic` may show "Connected" even though the user never configured it
  for FRIDAY, if `ANTHROPIC_API_KEY` happens to be in the ambient shell environment.
  Not a bug.
- Tool invocation during voice isn't guaranteed every turn (model's own judgment,
  `tool_choice: "auto"`) — see Phase 5 notes above. Could tighten with more specific
  tool descriptions or `tool_choice: "required"` for certain phrasings later, but
  that's a product decision, not a bug fix.
- Gesture recognition *accuracy* against a real hand is unverified in this
  environment — see Phase 10 notes above. Pipeline itself (camera permission,
  init, indicator, clean teardown) is verified with zero errors.
- Autostart enable/disable is unverified beyond "the plugin initializes without
  crashing" — the actual toggle click needs a real Tauri webview, which Playwright
  can't reach (it correctly renders the "not available in browser" fallback there
  instead). Needs one click from the user inside `pnpm desktop:dev`.
- Carried over: Vitest ESM/CJS config warning (harmless), `next typegen` must run
  before standalone `tsc --noEmit` (already wired into the `typecheck` script).

## Architecture changes since IMPLEMENTATION_PLAN.md

- `lib/intelligence` and `lib/tools` split into client-safe types vs. `server-only`
  implementation (sessions 2-3) — see `docs/ARCHITECTURE.md`.
- Added `lib/memory/` (server-only SQLite) and extended `lib/voice/` with
  `friday-tools.ts` (session 4) — same server-only-guarding discipline throughout;
  `app/api/memory/route.ts` is the only place the SQLite file is touched.
- Local memory storage is `~/.friday/memory.db`, not a hosted database — a
  deliberate scope-down from spec §30's eventual Postgres/pgvector target, revisit
  if/when multi-device sync or semantic search over memories actually matters.
- Added `lib/gestures/` (session 4, part 3) — camera-driven input is entirely
  client-side (no server-only guarding needed, no secrets involved), but follows
  the same opt-in/off-by-default and honest-status discipline as everything else.
  Drives the existing Globe/OrbitControls via synthetic DOM events rather than a
  parallel camera-control implementation, keeping one source of truth for camera
  behavior.
- `src-tauri/` gained a tray icon, global-shortcut plugin, and autostart plugin
  (session 4, part 3) — all additive to the Phase 11 shell from earlier in the
  session, no changes to the core "webview points at a live Next.js server"
  decision.

## Environment variables added

- `YOUTUBE_API_KEY` and `SEARCH_API_KEY` (Phase 3 completion) — both optional,
  both already documented with honest-fallback behavior in `.env.example`. No
  variables added for Phase 10 (gestures, client-side only, no keys) or Phase 11
  completion (global shortcut/tray/autostart are local OS integrations, no keys).

## Migration notes

None this session.
