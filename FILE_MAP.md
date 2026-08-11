# File Map

Annotated guide to the key files, especially the VM/SSH exec-channel code
path (flagged throughout — this is the highest-risk surface in the repo).
Paths relative to repo root unless noted.

## Root

- `CLAUDE.md` — operating manual, conventions, "NEVER" rules. Read first.
- `PROJECT_STATE.md` — exact current stopping point, verified vs. unverified
  claims for the in-progress `browse_on_vm` feature.
- `SECURITY.md` — threat model; the VM/browse security section is the most
  important reading in this repo before touching `lib/vm/*`.
- `HANDOFF.md` — start-here onboarding for a fresh session.
- `TASKS.md`, `SESSION_LOG.md`, `CHANGELOG.md`, `DECISIONS.md`, `FEATURES.md`,
  `ROADMAP.md`, `DATABASE.md`, `DEPLOYMENT.md`, `TESTING.md`, `UI_SYSTEM.md` —
  rest of the canonical documentation set.
- `.env.example` — every environment variable this project reads, with
  honest fallback behavior documented per variable. No real secrets.
- `docs/IMPLEMENTATION_PLAN.md` — the original full build spec/phasing.
  Historical — kept for context, not updated as a living doc.

## `apps/dashboard/src/lib/vm/` — the VM/SSH exec channel (read `SECURITY.md` first)

- `config.ts` — `VM_HOST`/`VM_USER` (now read from env vars, not hardcoded —
  see `SECURITY.md`'s findings), `VM_SSH_KEY_PATH` (defaults to
  `~/.friday/vm_agent_key`, outside the repo), timeout constants.
- `vm-client.ts` — `runVmTask()`: the only place that actually opens an SSH
  connection. `execFile`'s the system `ssh` binary with a fixed argument
  array (never a shell string), pipes a JSON task via stdin, parses a JSON
  result from stdout. This is the file to read to understand exactly what
  can and can't be sent to the VM.
- `ssrf-guard.ts` — **added this session's timeframe** (commit `1769221`),
  independently verified by reading it: `assertPublicUrl()` blocks
  loopback/link-local/RFC1918 destinations (including via DNS resolution,
  defending against DNS rebinding) before a `browse` request is dispatched.
  A real, correct application-layer SSRF mitigation, independent of
  whatever the VM-side situation turns out to be.

## `apps/dashboard/src/app/api/tools/run-on-vm/route.ts`

The HTTP entry point for both VM task types. Zod discriminated-union
validation on `type: "shell" | "browse"`. For `browse`, calls
`assertPublicUrl()` before dispatch and returns `400` if blocked. Calls
`runVmTask()`, returns the result. This is the only route that can reach
the VM — no other code path exists to do so.

## `apps/dashboard/src/lib/tools/`

- `registry.ts` — `TOOL_REGISTRY`: every tool's `riskLevel`,
  `requiresConfirmation`, `executionLocation`. `run_on_vm` is the only
  `"critical"`-risk, `"vm"`-execution entry — read this file to see the
  full local-tool allowlist too (`open_application`, `open_url`,
  `set_volume`, `show_notification`, `system_status`).
- `run-tool.ts` — `runTool()`: the single choke point every tool call goes
  through (permission check → approval modal if "ask" → execute → audit
  log). Never bypass this by calling `/api/tools/*` directly.
- `client.ts` — typed wrappers (`runOnVm()`, `browseOnVm()`, etc.) calling
  the API routes through `runTool()`.
- `approval.ts` — promise-based bridge between "ask" mode and the approval
  modal UI.

## `apps/dashboard/src/lib/voice/`

- `friday-tools.ts` — voice's tool definitions (JSON Schema) and
  `executeFridayTool()` dispatch. This is where `browse_on_vm`'s returned
  page content gets wrapped in the `BEGIN/END UNTRUSTED PAGE CONTENT`
  delimiter before reaching the model — read this file to see the
  prompt-injection mitigation directly.
- `voice-controller.ts` — WebRTC session lifecycle, server-event → orb-store
  wiring, function-call dispatch back to `executeFridayTool()`.
- `realtime-session.ts` — the actual `RTCPeerConnection` handling.
- `config.ts` — pinned model/endpoint constants; comment there warns to
  check current OpenAI docs before touching, since this API has renamed
  things before.

## `apps/dashboard/src/lib/chat/chat-client.ts` + `src/app/api/chat/route.ts`

A typed-chat alternative to voice (0.29.0), pointed at the user's own
OpenAI-compatible AI Platform gateway instead of OpenAI — separate from
`lib/voice/`, no tool access, no shared code. `route.ts` is the server-only
streaming proxy (reads `AI_PLATFORM_API_KEY` etc., never exposes them to
the client); `chat-client.ts` is the client-only fetch wrapper driving
`stores/chat-store.ts`, consumed by `components/chat/ChatPanel.tsx`. The
`ReadableStream` in `route.ts` pumps eagerly from `start()`, not lazily
from `pull()` — see its doc comment for the real Next.js dev-mode hang this
avoids.

## `apps/dashboard/src/components/tools/ToolApprovalModal.tsx`

The approval UI every "ask"-mode tool call shows. Critical-risk tools
(`run_on_vm`/`browse_on_vm`) get a distinct red-bordered warning banner and
have the "Always Allow" button omitted entirely — independently confirmed
by reading this file this session.

## `apps/dashboard/src/lib/intelligence/`

- `provider.ts` — client-safe types only, no secrets.
- `index.ts` — server-only: picks live-vs-mock per feed.
- `sources/` — `weather.ts` (NWS), `markets.ts` (CoinGecko + Twelve Data),
  `events.ts` (NewsAPI), `search.ts` (Tavily), `video.ts` (YouTube),
  `geocode.ts` (background place-name extraction + Nominatim), `mock-data.ts`.

## `apps/dashboard/src/lib/globe/` + `src/components/globe/`

Real country-boundary/highlight rendering for the 3D globe (0.31.0) —
client-only, no secrets. `lib/globe/country-geo.ts` loads real
`world-atlas` topojson (Natural Earth data, offline, no API key) and
exposes `countryNameForCoordinate()` (real point-in-polygon via `d3-geo`,
used to find which country a geocoded news event actually falls in —
never a hardcoded list). `lib/globe/country-texture.ts` draws country
borders + event-count highlights onto a canvas, deliberately using the
same equirectangular convention as `lib/geo.ts`'s `latLonToVector3` so the
texture aligns with existing event marker positions. `components/globe/
Globe.tsx`'s `CountryMesh` applies that texture to the sphere (unlit
`meshBasicMaterial` — see OrbCore.tsx's doc comment for why lit materials
don't render vertex/texture colors faithfully in this app's lighting
setup); `GridMesh` is the separate holographic lat/lon wireframe layered
on top.

## `apps/dashboard/src/lib/memory/db.ts`

Server-only `node:sqlite` wrapper for `~/.friday/memory.db`. The only file
that touches the memory database besides `app/api/memory/route.ts`.

## `apps/dashboard/src/lib/gestures/`

Entirely client-side (no secrets, no server-only guarding needed):
`hand-tracker.ts` (MediaPipe), `gesture-detector.ts` (landmarks →
pinch/palm/distance), `gesture-controller.ts` (synthetic pointer/wheel
events at the globe canvas), `globe-registry.ts`.

## `apps/dashboard/src/lib/desktop/`

Tauri-only (`isTauri()`/`"__TAURI_INTERNALS__" in window` guards make these
no-ops in a plain browser tab): `global-shortcut.ts`, `autostart.ts`.

## `apps/dashboard/src-tauri/`

Native macOS shell (Tauri v2, Rust). `src/lib.rs` builds the tray icon and
registers the global-shortcut/autostart plugins. Points at a live Next.js
dev server rather than bundling a static export (see `ARCHITECTURE.md` for
why).

## `packages/types/`

Shared Zod schemas — the single source of truth for any shape crossing a
client/server or (eventually) Mac/VM boundary.

## `packages/config/`

Shared ESLint base for non-Next.js packages.
