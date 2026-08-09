# Architecture

## Today (Phase 0/1/3/4/5/6/7/9/10/11)

Everything lives in `apps/dashboard`, a single Next.js 16 App Router application —
still no separate VM. Real data, local Mac tools, and memory flow through
server-side route handlers; voice connects directly to OpenAI over WebRTC (no
audio proxy) but now also has function-calling access back into all of FRIDAY's
real capabilities — that's the orchestration layer (Phase 5). `src-tauri/` wraps
this same app in a native macOS shell (Phase 11) — the product is still one
Next.js app; Tauri just gives it a native window instead of a browser tab, plus a
menu bar tray icon, a system-wide global shortcut, and optional auto-launch at
login. `lib/gestures/` (Phase 10) adds an opt-in, entirely client-side webcam
hand-tracking input path that drives the same Globe/OrbitControls as mouse input.

### Why Tauri points at a live server, not a static export

Tauri's default/simplest mode bundles static frontend files. This app has ~10 API
routes (`/api/intelligence/*`, `/api/tools/*`, `/api/voice/session`, `/api/memory`)
that only work with a running Node server — a static `next export` cannot include
them at all. So `src-tauri/tauri.conf.json`'s `beforeDevCommand` spawns a real
`next dev` process on a dedicated port (1420, chosen to avoid this machine's
multi-project dev-server port contention) and Tauri's webview just loads that URL,
same as pointing a browser at it.

`pnpm desktop:build` (the distributable bundle) needed the same problem solved
for production: `next.config.ts` sets `output: "standalone"`, producing a
self-contained server bundle; `scripts/prepare-desktop-build.sh` (the
`beforeBuildCommand`) copies in static assets/`.env.local` that standalone mode
leaves out. `lib.rs` spawns that server as a Tauri sidecar process on a
dedicated port (1421, distinct from devUrl's 1420) using a vendored,
self-contained Node binary (`scripts/vendor-node-sidecar.sh` — deliberately
*not* the Homebrew-installed `node`, which dynamically links dozens of
Homebrew-managed dylibs by absolute path and isn't portable outside a
Homebrew install), waits for the port to accept connections, then navigates
the main window to it. The window's `frontendDist` (`apps/dashboard/public/`)
only ever shows a brief "Starting F.R.I.D.A.Y.…" placeholder in the moment
before that navigation happens.

```
apps/dashboard/src-tauri/   Tauri v2 native shell — Rust, points at the Next.js
                              server rather than bundling static files (see above).
                              lib.rs also builds the tray icon (Show/Quit) and
                              registers the global-shortcut + autostart plugins.
apps/dashboard/src/
  app/
    "/"                     Orb + Intelligence Mode (client)
    "/settings"              Settings (client)
    api/intelligence/*/       Route handlers: events, markets, weather (server)
    api/tools/*/               Route handlers: open-application, open-url, volume,
                                notification, system-status (server)
    api/voice/session/         Mints an ephemeral OpenAI Realtime token (server)
    api/memory/                 CRUD over the local SQLite memory store (server)
    api/search/, api/video/     Web search (Tavily) / video search (YouTube) route
                                handlers — honest 501 when unconfigured (server)
    api/config/                Reports which integrations are configured (booleans only)
  components/
    orb/                      The holographic AI core (Three.js / React Three Fiber)
    globe/                    The interactive globe + event markers
    intelligence/              Dashboard panels (news, markets, signals, media, detail)
    shell/                     Status bar, command palette, orb stage wrapper, toast
    tools/                     Tool approval modal
    voice/                     VoiceActivation (⌥+V keyboard listener, renders nothing)
    gestures/                  GestureController (lifecycle), CameraActiveIndicator
  stores/                      Zustand: orb-store, ui-store, tool-store, memory-store,
                                gesture-store (persisted where relevant), toast-store
  lib/
    intelligence/
      provider.ts               Shared types (client-safe, no secrets)
      index.ts                  server-only: AutoIntelligenceProvider, picks live vs mock per feed
      sources/                  server-only: weather.ts (NWS), markets.ts (CoinGecko+Twelve Data),
                                  events.ts (NewsAPI), search.ts (Tavily), video.ts (YouTube),
                                  geocode.ts (background place-name extraction + Nominatim
                                  lookup for real headlines), mock-data.ts (shared demo data)
      use-intelligence-data.ts  client hook — fetches /api/intelligence/*, never imports a provider
    tools/
      registry.ts                Tool definitions + app allowlist + default permissions
      approval.ts                Promise-based bridge between "ask" mode and the approval modal
      run-tool.ts                The one path every tool call goes through (permission → approval → audit log → execute)
      client.ts                  Typed wrappers calling /api/tools/* through run-tool
    voice/
      config.ts                  Pinned model/endpoint constants — see the comment there before touching
      realtime-session.ts        Client-side WebRTC session (RTCPeerConnection, mic, remote-audio analyser)
      voice-controller.ts        Singleton session + server-event → orb-store wiring + function-call dispatch,
                                  toggleVoice() shared with the Tauri global shortcut
      friday-tools.ts            Tool definitions (JSON Schema) + executeFridayTool() dispatch — the orchestration layer
    memory/
      db.ts                      server-only: node:sqlite wrapper, ~/.friday/memory.db
    gestures/
      hand-tracker.ts             Wraps @mediapipe/tasks-vision's HandLandmarker
      gesture-detector.ts         Raw landmarks → pinch/open-palm/two-hand-distance
      gesture-controller.ts       Dispatches synthetic pointer/wheel events at the globe canvas
      globe-registry.ts           Module-level registry Globe.tsx populates with its OrbitControls ref
    desktop/
      global-shortcut.ts          Tauri-only (no-ops outside Tauri) ⌥+V registration
      autostart.ts                Tauri-only autostart enable/disable + isDesktopApp()
    logger.ts                    Structured, redacting logger
    demo.ts                      Demo-only sequence exercising every orb state

packages/types/                Shared Zod schemas — the contract every backend conforms to
```

### The client/server boundary (read this before adding a new data source or tool)

`lib/intelligence/{index.ts,sources/*}` and the execution side of `lib/tools/*` start
with `import "server-only"`. That's not decoration — Next.js will throw a build error
if anything under those imports ends up in a client bundle, which is the guardrail
against accidentally shipping `NEWS_API_KEY` or `TWELVE_DATA_API_KEY` to the browser.
**Never import these from a component.** Client code talks to `/api/intelligence/*`
and `/api/tools/*` over `fetch`, always. `lib/intelligence/provider.ts` (just types)
and `lib/tools/registry.ts` (just definitions + the allowlist, no execution) are the
exception — they're safe for either side because they hold no secrets and do nothing.

This split didn't exist in the very first build (Phase 1 called the provider directly
from a client hook) because Phase 1 had no secrets to leak. It became a real
requirement the moment Phase 3 added `NEWS_API_KEY` — see `PROJECT_STATE.md`'s
Known Issues for the full story.

### State machine

`voiceStatus` (offline/connecting/ready/listening/thinking/speaking/executing/error)
is the single source of truth for orb visuals — `voiceStatusToOrbState` in
`@friday/types` maps it to the 8 `OrbState` values from spec §8. Two things drive it
now: the demo sequence (`lib/demo.ts`, fake, explicitly labeled) and
`lib/voice/voice-controller.ts` (real, from actual OpenAI Realtime server events).

### Data flow (intelligence)

`IntelligenceMode` → `useIntelligenceData()` → `fetch("/api/intelligence/*")` → route
handler → `getIntelligenceProvider()` → per-feed source (live-if-configured-else-mock,
with graceful fallback on fetch failure). Every panel receives a `DataFreshness`
object alongside its data — `isMock` and `status` are never faked, so "is this real,
is this fresh" is always visible (spec §38, §67).

### Data flow (tools)

Command palette / any future caller → `lib/tools/client.ts` wrapper → `runTool()` →
permission check (`tool-store`) → approval modal if "ask" → `fetch("/api/tools/*")` →
route handler validates with Zod → `execFile` (never a shell string) → result →
audit log entry in `tool-store`, visible in Settings → Tools.

### Data flow (voice)

`⌥+V` or ⌘K → "Talk to FRIDAY" → `connectVoice()` → `fetch("/api/voice/session")`
(server mints an ephemeral token with `OPENAI_API_KEY`, never sent to the browser) →
browser opens an `RTCPeerConnection` directly to OpenAI (`/v1/realtime/calls`) using
that ephemeral token → mic audio flows out, assistant audio flows back and plays
through an `<audio>` element while an `AnalyserNode` on that same remote stream feeds
real amplitude into `orb-store` → a data channel (`"oai-events"`) carries JSON events
(speech started/stopped, transcript deltas, response done) that
`voice-controller.ts` maps onto `voiceStatus`/`transcript`/`userTranscript`. The Mac
process (Next.js server) is only in the loop for the initial token mint — audio
itself never round-trips through it.

### Data flow (orchestration — Phase 5)

After `connectVoice()` establishes the WebRTC session, it sends a `session.update`
event registering `friday-tools.ts`'s tool definitions. When the model decides to
call one (its own judgment, `tool_choice: "auto"` — not guaranteed every turn), a
`response.done` event's `output` array contains a `function_call` item
(`name`/`call_id`/`arguments`). `voice-controller.ts` dispatches it through
`executeFridayTool()`, which either calls a local-tool client wrapper (going through
the *same* `runTool()` permission/approval path as the command palette — voice
doesn't bypass it), fetches live intelligence data (including `search_web`/
`search_video`), flips `ui-store`'s mode, focuses a specific globe event
(`focus_event`), or reads/writes memory. The result is sent back via
`conversation.item.create` (`function_call_output`) + `response.create`, and the
model continues speaking with the real result in hand. This is the actual
"voice → intent → tool/data → spoken answer" loop the whole rest of the app was
built to support.

### Data flow (gestures — Phase 10)

`GestureController` (mounted in `layout.tsx`, always present but inert) watches
`gesture-store`'s persisted `enabled` flag. On enable: `hand-tracker.ts` starts a
`getUserMedia` webcam stream and MediaPipe's HandLandmarker (WASM + model loaded
from CDN), `gesture-detector.ts` turns each frame's landmarks into a
pinch/open-palm/two-hand-distance reading, and `gesture-controller.ts` translates
those into synthetic `PointerEvent`/`WheelEvent`s dispatched directly at the
Globe's canvas (found via `globe-registry.ts`) — reusing OrbitControls' existing
drag/zoom handling rather than reimplementing camera math. `CameraActiveIndicator`
reflects `gesture-store`'s transient `cameraActive` flag whenever the webcam is
actually in use. Off by default; nothing touches the camera until the user opts in
from Settings → Input.

### Data flow (geocoding real news events)

`fetchCategory` (events.ts) checks `geocode.ts`'s in-memory cache (keyed by article
URL) for each real headline. A cache hit attaches `latitude`/`longitude` to the
event immediately; a miss returns the event without coordinates *and* schedules
background work — never blocks the request. That background work runs through a
single serialized queue: an OpenAI Responses API call (`gpt-5-nano`, minimal
reasoning effort) extracts a place name or decides there isn't one, then a
rate-limited Nominatim lookup (max ~1 req/sec, per their usage policy) resolves it
to coordinates. The result — including a deliberate `null` for "no place found" —
is cached so the same article is never re-processed. A globe marker for a fresh
headline typically appears a poll or two after the headline itself does, not
instantly; this is a deliberate tradeoff (never make the user wait on an LLM call)
over a made-up placeholder location.

### Data flow (VM task execution — Phase 9)

Command palette or voice's `run_on_vm`/`browse_on_vm` tools → `lib/tools/
client.ts`'s `runOnVm()`/`browseOnVm()` (both go through the *same* `run_on_vm`
registry entry and risk profile — it's one execution surface, two task shapes)
→ `runTool()` (same permission/approval/audit-log path as every other tool —
critical-risk tools additionally skip the "Always Allow" option, see
`SECURITY.md`) → `POST /api/tools/run-on-vm` → Zod discriminated-union
validation on `type: "shell" | "browse"` → `lib/vm/vm-client.ts` → `execFile`'s
the system `ssh` binary (fixed argument array, JSON task piped via stdin, never
a shell string) → the VM's `authorized_keys` forces the connection to run
`/opt/friday-agent/dispatch.sh` regardless of what command SSH was asked for →
that script branches on `type`: a shell task runs inside an ephemeral,
network-isolated-by-default, resource-limited Docker container; a browse task
runs inside `friday-browser:latest` (a custom image layering the `playwright`
npm package onto Microsoft's official Playwright base image, built once on the
VM) with networking enabled and real headless-Chromium rendering → one JSON
result flows back over the same SSH connection → parsed and returned to the
caller. No public port opened on the VM for either task type — the firewall
stays exactly as locked down as Phase 8 left it (SSH only); browse tasks reach
the internet via the container's own NAT'd egress, not a new host-level port.
A separate `DOCKER-USER` iptables layer (see `SECURITY.md`) blocks container
egress to the cloud metadata service and this droplet's private VPC ranges
regardless of which task type or network mode is used. See `PROJECT_STATE.md`'s
Phase 9 section for why SSH was chosen over a public HTTPS gateway.

### Data flow (VM browse task — Phase 9, uncommitted)

The Mac-side half of a second VM task type exists in the working tree but is
**uncommitted and not confirmed working end-to-end** (see `PROJECT_STATE.md`'s
"Uncommitted work" section). As built: voice's `browse_on_vm` or a future
Quick Action → `lib/tools/client.ts`'s `browseOnVm()` → same `runTool()` path
as `runOnVm()` → `POST /api/tools/run-on-vm` with `{type: "browse", url}` →
Zod validates it's a well-formed `http`/`https` URL (no private/link-local IP
filtering at this layer — see `SECURITY.md`'s findings) → `vm-client.ts` sends
the same JSON-over-SSH-stdin shape, just with `type: "browse"` instead of
`type: "shell"` → the VM's `dispatch.sh` would need to branch on `type` to
launch a headless browser instead of a shell container. Whether `dispatch.sh`
actually has that branch was **not verified this session** (it isn't tracked
in this repo; no SSH connection was opened to check). `PROJECT_STATE.md` and
`SECURITY.md` both contain detailed claims about a Playwright-based image and
an SSRF fix for this path, found already written in the working tree at the
start of this documentation pass rather than authored by it — see the
editorial notes in those files before treating those claims as confirmed.

## Where things go next (see `docs/IMPLEMENTATION_PLAN.md` for full phasing)

- **Phase 9 breadth**: confirm the uncommitted `browse_on_vm` Mac-side change
  above actually has a working VM-side counterpart, then commit it; richer
  task types beyond single-shot shell/browse — the channel and permission
  model exist now, this is about what gets sent over it.
- **Phase 11 finishing touch**: `desktop:build` (distributable bundle) needs a
  bundled Node server sidecar, a materially bigger problem than `desktop:dev` —
  not attempted, only relevant once/if sharing the app with someone else matters.

## Why no `packages/ui` / `packages/protocol` / `packages/security` yet

The spec's suggested tree (§5) includes these from day one. `packages/tools` doesn't
exist either, but its equivalent (`apps/dashboard/src/lib/tools`) is real now — it
just didn't need to be a separate workspace package since nothing outside
`apps/dashboard` calls it yet. `ui`/`protocol`/`security` stay deferred: with one
Next.js app there's nothing to share into a `ui` package, and `protocol`/`security`
only have real shape once there's a second process (the VM) to define a contract
with. Creating them empty now would violate the "no fake placeholders" rule (§67)
more than it would establish structure.
