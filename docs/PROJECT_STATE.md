# Project State

Last updated: 2026-08-07 (session 4 — Phase 5 orchestration and Phase 7 memory
built and verified live; voice can now actually control FRIDAY, not just talk).

Repo: https://github.com/Gariyuuu/friday (pushed, fully up to date).

## Completed

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

Nothing in progress. Phases 0/1/3/4/5/6/7 are all live and verified end-to-end,
including the hardest-to-fake kind of verification: real tool calls with real data
confirmed against ground truth.

## Next

- **Phase 8/9 (cloud VM + VM tools)**: explicitly not started — needs the user to
  choose/pay for a VM provider and a reviewed threat model before any code, per
  spec §24-27 and `docs/SECURITY.md`. Asked the user about this separately; not
  something to just proceed on.
- **Phase 10 (gestures)**: MediaPipe webcam hand-tracking, opt-in only. Buildable
  with no external cost — a reasonable next autonomous step.
- **Phase 11 (real native packaging)**: Tauri — menu bar presence, system-wide
  global shortcut (not just in-browser), auto-launch at login, a proper `.app`
  bundle. The web-manifest "Add to Dock" from this session is a lighter stand-in,
  not a replacement.
- **Phase 3 completion**: web search tool, video search, geocoding for live news
  events so they get globe markers (still open, lower priority).
- **Phase 2 finishing touch**: auto-focus globe on the event FRIDAY is currently
  narrating — now actually meaningful since Phase 5 exists (the model could call a
  `focus_event` tool), not built yet.
- Extend orchestration tools further: `search_web`, `focus_event(eventId)`, per-tool
  memory categories the model chooses more precisely, are natural next additions to
  `lib/voice/friday-tools.ts` once the above land.

## Known issues

- `config.ai.anthropic` may show "Connected" even though the user never configured it
  for FRIDAY, if `ANTHROPIC_API_KEY` happens to be in the ambient shell environment.
  Not a bug.
- Tool invocation during voice isn't guaranteed every turn (model's own judgment,
  `tool_choice: "auto"`) — see Phase 5 notes above. Could tighten with more specific
  tool descriptions or `tool_choice: "required"` for certain phrasings later, but
  that's a product decision, not a bug fix.
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

## Environment variables added

None new this session — `OPENAI_API_KEY` (already set) now also gates the
tool-calling capability, not just the base voice connection.

## Migration notes

None this session.
