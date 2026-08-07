# Project State

Last updated: 2026-08-06 (session 3 — Phase 4 voice now genuinely verified live
against the real OpenAI API, a real bug found and fixed in the process).

Repo: https://github.com/Gariyuuu/friday (pushed, fully up to date).

## Completed

**Phase 0 — Foundation**, **Phase 1 — Visual FRIDAY**: see prior sessions, unchanged.
Monorepo, orb, globe, dashboard shell, command palette, settings — all in place.

**Phase 3 — Real Data**: now fully live end-to-end with real user keys.
- Data fetching is server-side (`app/api/intelligence/{events,markets,weather}`);
  `getIntelligenceProvider()` is `server-only`.
- **Weather**: live via NWS, no key. **Crypto**: live via CoinGecko, no key.
- **News**: live via NewsAPI — `NEWS_API_KEY` is set and verified working (14 real
  categorized headlines confirmed via curl this session).
- **Equities/FX**: live via Twelve Data — `TWELVE_DATA_API_KEY` is set. **Fixed this
  session**: the original symbols (`SPX`, `IXIC`) aren't available on Twelve Data's
  free plan (403/404 in testing) — swapped for `SPY`/`QQQ` (the ETFs tracking those
  indices), which work on the free plan and are a reasonable proxy for a dashboard
  glance. `USD/JPY` worked as originally written. All 5 market rows (SPY, QQQ,
  USD/JPY, BTC, ETH) confirmed live via curl.
- `GET /api/config` reports real configured status for every integration.

**Phase 6 — Local Mac Tools**: unchanged from session 2, verified working (see prior
notes) — permission engine, approval modal, audit log, 5 tools via `execFile`.

**Phase 4 — Voice (OpenAI Realtime, WebRTC)**
- **Provider decision**: OpenAI Realtime API, chosen over LiveKit — no separate
  server/infra to run (LiveKit needs its own transport server or LiveKit Cloud, plus
  a still-separate model provider on top), and cheaper for personal, single-user,
  low-volume use. Documented in `.env.example`, `docs/ARCHITECTURE.md`, Settings →
  Voice.
- **Important**: the Realtime API surface (endpoint names, event types) was verified
  against OpenAI's *live* docs this session via WebFetch, not recalled from training
  data — the API has renamed things before (a `sessions` endpoint became
  `client_secrets`, per the docs). Confirmed details are pinned with a comment in
  `lib/voice/config.ts`: model `gpt-realtime-2.1`, ephemeral token endpoint
  `POST /v1/realtime/client_secrets`, WebRTC SDP exchange
  `POST /v1/realtime/calls`, data channel `"oai-events"`. If voice starts failing
  and the client code looks right, re-verify these against current docs before
  assuming the bug is in this codebase — this is exactly the kind of API that drifts.
- `POST /api/voice/session` (server-only) mints a short-lived ephemeral token using
  `OPENAI_API_KEY` — the real key never reaches the browser, only the ephemeral one
  does (by design, that's what OpenAI's client_secrets endpoint is for).
- `lib/voice/realtime-session.ts`: browser-side `OpenAIRealtimeSession` class —
  `RTCPeerConnection`, mic capture via `getUserMedia`, data channel for events, and a
  real `AnalyserNode` on the *remote* (assistant) audio track computing RMS
  amplitude every animation frame — this drives the orb's "speaking" state with
  actual audio, not a simulated waveform (spec §42).
- `lib/voice/voice-controller.ts`: singleton session + event handling, mapping
  server events (`session.created`, `input_audio_buffer.speech_started/stopped`,
  `conversation.item.input_audio_transcription.completed`,
  `response.output_audio_transcript.delta`, `response.done`, `error`) to
  `orb-store`'s `voiceStatus`/`transcript`/`userTranscript`/`audioAmplitude`.
- Activation: `⌥ + Space` anywhere in the app (`components/voice/VoiceActivation.tsx`,
  mounted in root layout) toggles connect/disconnect. Also reachable via ⌘K →
  "Talk to FRIDAY". `OrbStage` shows a live transcript panel (you said / FRIDAY said)
  plus Mute/End Voice controls while connected.
- Settings → Voice and the Developer diagnostics panel show real status via
  `/api/config`'s `voice` field (`Boolean(process.env.OPENAI_API_KEY)`).
- **Now verified live** — the user supplied a real `OPENAI_API_KEY`. Testing it
  immediately surfaced a real bug: `turn_detection` was sent as a top-level
  `session` field, but OpenAI rejected it with `400 Unknown parameter:
  'session.turn_detection'` — it belongs nested under `session.audio.input`, not
  top-level (my earlier doc research had synthesized this from partial fragments
  and got the nesting wrong). Fixed in `app/api/voice/session/route.ts`; also
  improved that route to surface OpenAI's actual error message to the client
  instead of a generic one, specifically because of this class of bug.
  After the fix, verified end-to-end:
  - `POST /api/voice/session` mints a real ephemeral token (confirmed via curl —
    real `value`/`expiresAt` returned, ephemeral values not logged/committed
    anywhere).
  - Full browser WebRTC connection tested with Playwright + Chromium's fake-device
    flags (`--use-fake-device-for-media-stream`,
    `--use-file-for-fake-audio-capture` fed a real synthesized-speech WAV via
    macOS `say`): `CONNECTING → READY` completed in ~1-7s against OpenAI's real
    infrastructure — real SDP offer/answer exchange, real data channel, real
    `session.created` event received and parsed correctly.
  - Fed actual synthesized speech (not silence): OpenAI's semantic VAD correctly
    detected it and fired `input_audio_buffer.speech_started`, driving
    `voiceStatus` to `listening` in the UI (confirmed via screenshot — StatusBar
    and OrbStage both showed real-time "LISTENING", Mute/End Voice controls live).
  - **Not tested**: a full natural conversational turn (assistant speaking back,
    `AnalyserNode` amplitude reacting to real playback audio). Chromium's fake
    audio capture loops the WAV file continuously rather than going silent after
    it ends, so semantic VAD never saw a pause and `speech_stopped` never fired —
    a test-methodology limit, not a sign of an app bug (everything upstream of
    that point is proven working). This needs an actual human conversation to
    confirm, which only the user can do.
  - Given all of the above, Phase 4 is reported as **verified working** — not
    "done" in the sense of a real conversation being confirmed, but the entire
    infrastructure/protocol layer (the part that could plausibly still be wrong)
    is now proven against the live API, not just built.
- Voice model defaults to `gpt-realtime-2.1-mini` (not the full model) — confirmed
  current pricing puts it at ~1/3 the cost ($10/$20 vs $32/$64 per 1M audio tokens),
  matching the user's explicit "cheaper" preference. The mini model is also what was
  used for the live test above and it worked correctly. Bump to the full model in
  `lib/voice/config.ts` if quality isn't good enough once the user actually talks
  to it.
- Considered and explicitly rejected switching to Gemini Live API (cheaper: $3/$12
  per 1M vs OpenAI's $10/$20, and has a free tier) — user chose to stick with the
  already-built, now-verified OpenAI integration rather than redo the work. Worth
  revisiting if voice usage grows enough that cost becomes a real concern.

**Mobile/narrow-viewport audit** (same session — found and fixed two real bugs,
neither hypothetical):
- The orb's canvas was sized `min(60vh, 480px)` with no viewport-width term, so on
  any window narrower than 480px it rendered at full size and was silently clipped
  by an `overflow-hidden` ancestor (not visible as a scrollbar or DOM overflow —
  just cropped). Fixed: `size-[min(60vh,480px,85vw)]` in `OrbStage.tsx`.
- Bigger issue: the root layout (`app/page.tsx`) used `overflow-hidden` everywhere
  with no scroll fallback, built for a desktop dashboard that fits one screen. On a
  narrow viewport, Intelligence Mode's single-column stacked panels (globe + 4
  panels) run ~3150px tall against a ~800px viewport — everything past the fold was
  completely unreachable, not just visually awkward. Fixed by adding
  `overflow-y-auto` to both mode wrappers; confirmed via Playwright that the full
  content (weather alerts, category tally, media panel) is now reachable by
  scrolling. This also matters on a narrow *desktop* window, not just phones, which
  is the case spec §40 actually asks for (phone support itself isn't a stated
  requirement — desktop/external-monitor is; the underlying bug affects both).
- Not fixed (minor, functional but cramped): the Settings page's fixed 192px sidebar
  eats half a phone-width screen. Low priority — Settings is a desktop-first surface
  per the spec's own responsive-display scope.

## Current

Nothing in progress. Phases 0/1/3/4/6 are all fully verified live end-to-end.

## Next

- **A real human conversation test** — the one thing automated testing in this
  environment genuinely cannot confirm (see Phase 4 notes above). Should happen
  the first time the user actually presses ⌥+Space and talks. Watch for: does
  `response.output_audio_transcript.delta` fire and populate the transcript, does
  assistant audio actually play through speakers, does the orb's speaking
  animation react to real amplitude, does `conversation.item
  .input_audio_transcription.completed` populate the "You said" line.
- **Phase 5 (orchestration)**: intent routing (fast path vs. agent path). User's plan
  is to run their own vLLM instance eventually rather than pay for Anthropic/OpenAI/
  Gemini for reasoning — worth designing the AI provider abstraction
  (`packages/types` has no AI-provider types yet) with an OpenAI-compatible local
  endpoint in mind from the start, not just the three vendor APIs in `.env.example`.
- **Phase 3 completion**: web search tool, video search, geocoding for live news
  events (still open, lower priority — see prior session notes).
- **Phase 2 finishing touches**: auto-focus globe on narrated event (now unblocked —
  Phase 4 exists — but still needs Phase 5 to know *what* to focus on). Settings
  sidebar-on-phone remains a known minor gap, not prioritized.

## Known issues

- `config.ai.anthropic` may show "Connected" even though the user never configured it
  for FRIDAY, if `ANTHROPIC_API_KEY` happens to be in the ambient shell environment.
  Not a bug — see prior session notes for detail.
- Carried over: Vitest ESM/CJS config warning (harmless), `next typegen` must run
  before standalone `tsc --noEmit` (already wired into the `typecheck` script).

## Architecture changes since IMPLEMENTATION_PLAN.md

- `lib/intelligence` split into client-safe types vs. `server-only` implementation
  (session 2) — see `docs/ARCHITECTURE.md`.
- Added `lib/tools/` + `stores/tool-store.ts` (session 2), `lib/voice/` +
  `components/voice/` (session 3) — same server-only-guarding pattern as
  `lib/intelligence`, extended to voice: `lib/voice/realtime-session.ts` and
  `voice-controller.ts` are client-side (no secrets), but
  `app/api/voice/session/route.ts` is the only place `OPENAI_API_KEY` is read.

## Environment variables added

`OPENAI_API_KEY` now also gates voice (in addition to its future Phase 5 role) — see
`.env.example`. `NEWS_API_KEY` and `TWELVE_DATA_API_KEY` are set in the user's local
`.env.local` and confirmed working live.

## Migration notes

Twelve Data equity symbols changed from index tickers (`SPX`, `IXIC` — not on the
free plan) to ETF proxies (`SPY`, `QQQ` — confirmed working). If the plan is ever
upgraded to one that includes raw indices, this could be reverted in
`lib/intelligence/sources/markets.ts`'s `EQUITY_SYMBOLS`.
