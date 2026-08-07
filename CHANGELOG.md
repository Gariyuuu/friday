# Changelog

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
