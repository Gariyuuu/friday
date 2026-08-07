# Project State

Last updated: 2026-08-07 (session 4, part 5 — Phase 8 infrastructure stood up: a
real DigitalOcean droplet is live and hardened. Phase 9, the actual gateway/agent
software that lets the Mac talk to it, is NOT built yet — see below).

Repo: https://github.com/Gariyuuu/friday (pushed, fully up to date).

## Phase 8 — Cloud VM infrastructure (droplet live, agent software not started)

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
- **Not built yet — this is the real remaining work, not a formality**: the
  actual gateway service that runs on this VM and lets the Mac send it tasks
  (authenticated request/response per `docs/SECURITY.md`'s already-written threat
  model), the sandboxed execution environment for those tasks (Docker containers,
  not raw host access), browser automation tooling, and the Mac-side client that
  talks to it. The droplet is infrastructure — it does nothing on its own yet.
  This is a substantial software build, not a follow-up tweak.

Repo: https://github.com/Gariyuuu/friday (pushed, fully up to date).

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
  registers real OS-level ⌥+Space (works even when FRIDAY isn't focused), sharing
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

Every phase except Phase 9 (the VM gateway/agent software) is either live and
verified end-to-end, or verified as thoroughly as this environment allows. Search
and video keys are now live and verified (see below). Phase 8's infrastructure
(the droplet) is live and hardened — Phase 9's actual software is the next real
build, in progress next.

## Next

- **Phase 9 (VM gateway/agent software)**: the real next build. The droplet from
  Phase 8 exists but runs nothing FRIDAY-specific yet. Needs: an authenticated
  gateway service on the VM (per `docs/SECURITY.md`'s threat model — short-lived
  tokens, schema-validated requests, no reverse control back to the Mac), a
  Docker-sandboxed task execution environment (not raw host access), the Mac-side
  client/tool that sends it work, and browser automation tooling. Substantial,
  multi-step build — will be verified against the real droplet as it goes, same
  discipline as every other phase.
- **User verification needed**: confirm gesture recognition feels accurate with a
  real hand in front of the camera (Settings → Input), and click the autostart
  toggle once inside the real `pnpm desktop:dev` window if you ever want it on
  (currently off by default, which you confirmed is what you want).
- `pnpm desktop:build` (distributable, optionally signed `.app`/`.dmg`) — needs a
  bundled Node server sidecar, a materially bigger problem than `desktop:dev`. Only
  relevant if/when sharing the app with someone else matters.

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
