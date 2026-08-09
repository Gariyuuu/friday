# Features

Phase-by-phase, feature-by-feature status. "Verified" means this documentation
pass (or a cited prior session, per `CHANGELOG.md`/`git log`) actually
exercised the thing against real data/APIs/hardware, not just that the code
compiles. See `PROJECT_STATE.md` for narrative detail and `SECURITY.md` for
the VM/browser-automation caveats specifically.

| Feature | Phase | Status | Evidence |
|---|---|---|---|
| Orb UI (8 states, Three.js/R3F) | 0/1 | Built | Present in `components/orb/`; drives from real `voiceStatus` in production, fake demo sequence only via explicit "Demo" command-palette action |
| Intelligence dashboard (globe, news/market/media panels) | 1/2 | Built, verified with real data | `DataFreshness`/`isMock` wired per prior sessions |
| Command palette (⌘K) | 1 | Built | `cmdk`-based, includes Quick Actions |
| News (NewsAPI) | 3 | Live with real key | Verified against 13+ real headlines, geocoded (see below) |
| Markets: crypto | 3 | Live, zero config | CoinGecko, no key needed |
| Markets: equities/FX | 3 | Live with real key | Twelve Data (SPY/QQQ proxies — SPX/IXIC aren't on free plan) |
| Weather alerts | 3 | Live, zero config | api.weather.gov, US only |
| Web search (`search_web`) | 3 | Live with real key | Tavily; honest 501 when unconfigured |
| Video search (`search_video`) | 3 | Live with real key | YouTube Data API v3; honest 501 when unconfigured |
| News-event geocoding | 3 | Live with real key | OpenAI Responses API (gpt-5-nano) + Nominatim; verified 5/13 real headlines resolved correctly, 8/13 correctly got no marker |
| Voice (OpenAI Realtime, WebRTC) | 4 | Live, verified | Ephemeral-token pattern; real speech-detection test via macOS `say` + Chromium fake-audio |
| Voice tool-calling / orchestration | 5 | Live, verified | Real battery-status round trip, cross-checked against `pmset -g batt` |
| `focus_event` voice tool | 2/5 | Live, verified | Confirmed via direct store call matching manual click behavior |
| Local Mac tools (5: open_application, open_url, set_volume, show_notification, system_status) | 6 | Built, real `execFile` execution | No shell-string construction anywhere; independently confirmed by reading `lib/tools/*` this session |
| Tool permission engine (disabled/ask/allow + approval modal + audit log) | 6 | Built | Independently confirmed by reading `run-tool.ts`/`ToolApprovalModal.tsx` this session |
| Memory (`remember`/`recall`, local SQLite) | 7 | Built, verified | `~/.friday/memory.db` via `node:sqlite`; curl-tested add/list/delete |
| Cloud VM infrastructure (DigitalOcean droplet) | 8 | Live, verified | Real hardened droplet, `165.22.184.128`, confirmed live via direct SSH sessions across multiple work sessions |
| `run_on_vm` — shell task type | 9 | Live, verified | SSH-based, forced-command, sandboxed Docker, critical-risk approval — real round trips through the live app |
| `browse_on_vm` — browse task type | 9 | Live, verified end-to-end | Both Mac-side (SSRF guard, prompt-injection delimiter) and VM-side (Playwright image, `dispatch.sh` branching, iptables SSRF rules, and a browser-launched forward proxy that also catches redirect-based SSRF) independently confirmed via direct SSH sessions and real task execution against the droplet. See `SECURITY.md`'s threat-model table for the full three-layer SSRF story. |
| Gestures (MediaPipe hand-tracking) | 10 | Built, pipeline verified, accuracy unverified | Zero-error pipeline (permission, WASM load, detectForVideo) confirmed via Playwright fake-device flags; real-hand accuracy needs the user |
| Native packaging (Tauri: tray, global shortcut, autostart) | 11 | Built, verified | Real launch confirmed via logs + `osascript`; autostart toggle click itself unverified (needs real Tauri webview) |
| `~/Applications/FRIDAY.app` wrapper | 11 | Built, verified | Verified via `open` (LaunchServices), real foreground process confirmed |
| `desktop:build` (distributable/signed bundle) | 11 | Live, verified | Real bundled Node sidecar (`prepare-desktop-build.sh`: `pnpm deploy` + full symlink dereference + hoisting) running a standalone Next.js server; verified by launching the actual `~/Applications/FRIDAY.app`, not just the build output directory (0.26.0) |
| Quick-Actions UI entry for VM tools | 9 | Live, verified | `⌘K` entries for both `run_on_vm` and `browse_on_vm`, including a step-builder for multi-step browse sequences and a results panel that renders returned screenshots |
| Multi-step browser interaction (click/type/wait/screenshot) | 9 | Live, verified | Up to 10 steps; verified with genuine interaction against real sites (Wikipedia search box, real typed text, real screenshot) |
| Text chat (custom-API alternative to voice) | — (user request, 0.29.0) | Live, verified | `/api/chat` streams from the user's own AI Platform gateway; no tool access, honest 501 when unconfigured; verified end-to-end via a real headless-browser session (message sent → real streamed reply from the gateway rendered, zero console errors) |

## Legend

- **Live/Built, verified**: exercised against real data/hardware/API this
  session or a cited prior session, with a specific test described.
- **Built, unverified** / **Split status**: code exists and was read/
  confirmed present, but the specific claim of it working end-to-end wasn't
  independently exercised.
- **Not built**: no code found for this.
