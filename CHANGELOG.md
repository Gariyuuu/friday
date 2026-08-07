# Changelog

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
