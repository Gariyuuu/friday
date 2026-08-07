# Security model

## Current state (Phase 0/1/3/4/5/6/7/10/11, Phase 8 infra only)

A VM now exists (see "Phase 8 infrastructure status" below) but runs nothing
FRIDAY-specific — no gateway, no agent, no path from the Mac to it yet. Real
security surfaces: server-side API keys (news, markets, search, video), real
local tool execution (Phase 6), voice (Phase 4, an ephemeral-credential pattern),
voice-triggered tool-calling (Phase 5), local memory storage (Phase 7), webcam
access (Phase 10, gestures), OS-level integrations — global shortcut, tray,
autostart (Phase 11), and now a hardened but otherwise inert cloud host (Phase 8).
All are live and worth understanding, not just "future work."

- `.env.example` documents every credential. Nothing in the repo is a real secret.
  `.env` / `.env.local` are gitignored.
- No `NEXT_PUBLIC_`-prefixed secret exists or should ever exist. `NEWS_API_KEY` and
  `TWELVE_DATA_API_KEY` are read only inside `server-only`-guarded modules
  (`lib/intelligence/index.ts`, `lib/intelligence/sources/*`), called only from
  route handlers — never imported by a client component. See
  `docs/ARCHITECTURE.md`'s "client/server boundary" section; this was a real gap
  caught and fixed this session, not a hypothetical.
- `GET /api/config` reports configured/not-configured as booleans only — it can never
  leak a key value, by construction (it never reads the key strings, only
  `Boolean(process.env.X)`).
- **Local tools are real now** (Phase 6, not "coming later"): `open_application`,
  `open_url`, `set_volume`, `show_notification`, `system_status`. All five run via
  Node's `execFile` with an argument array — never a shell string, so there is no
  command-injection surface from user input. `open_application` only accepts a value
  from a hardcoded 9-app allowlist (`lib/tools/registry.ts`) via a Zod enum — the
  request literally cannot name an app outside that list. `open_url` restricts to
  `http:`/`https:` protocols. `show_notification`'s AppleScript string interpolation
  escapes `"` and `\` before building the script (`notification/route.ts`) —
  necessary because that one *does* build a script from user-controllable text
  (notification title/body), which `execFile` alone doesn't protect against.
  Everything routes through a permission engine (disabled/ask/allow per tool,
  `stores/tool-store.ts`) and an approval modal for anything not explicitly allowed
  — see "Tool risk model" below, now implemented rather than planned.
- **Voice uses an ephemeral-credential pattern** (Phase 4): `OPENAI_API_KEY` is read
  only in `app/api/voice/session/route.ts` (server-only), which exchanges it for a
  short-lived token from OpenAI's `client_secrets` endpoint. Only that short-lived
  token — never the real key — reaches the browser, which uses it to open a direct
  WebRTC connection to OpenAI. This is the same shape as the tool/intelligence
  boundary (real secret stays server-side) applied to a case where the client still
  needs *some* credential to talk to a third party directly.
- **Voice tool-calling doesn't bypass permissions** (Phase 5): when the realtime
  model calls `open_application`/`open_url`/etc., `friday-tools.ts` routes through
  the exact same `lib/tools/client.ts` → `runTool()` path as the command palette —
  same approval modal, same audit log. There is no separate, less-restricted
  execution path for voice-triggered actions.
- **Memory is local-only** (Phase 7): SQLite at `~/.friday/memory.db`, outside the
  repo, never transmitted anywhere except back to the browser via
  `/api/memory` when the Settings UI reads it. The `remember`/`recall` tools are
  only offered to the model when memory is enabled — disabling it in Settings
  removes the tools from the next session's tool list entirely, not just hides a UI
  element.
- **Webcam access is local-only and opt-in** (Phase 10): the camera stream feeds
  MediaPipe's HandLandmarker entirely in the browser (`lib/gestures/`) — no video
  frame or landmark data is ever sent to a server, logged, or stored. Off by
  default; nothing touches the camera until the user enables it in Settings →
  Input, and disabling it stops the stream immediately (confirmed via Playwright:
  the camera-active indicator is removed from the DOM on toggle-off). The macOS
  native app declares `NSCameraUsageDescription` in `Info.plist` so the system
  permission prompt shows a real explanation rather than a blank one.
- **OS-level integrations are additive, not new trust boundaries** (Phase 11): the
  global shortcut and autostart plugins run entirely on the Mac (no VM, no new
  network surface) and are gated the same way as everything else — `isTauri()`
  guards in `lib/desktop/*` make them no-ops in a plain browser tab, so a web
  deployment never touches Tauri-only capabilities. The tray icon exposes only
  Show/Quit, nothing that bypasses the tool-permission engine.
- The settings UI shows every *unbuilt* integration as "Not configured" rather than a
  working-looking control (spec §67) — this still applies to the VM connection.
  Voice, orchestration, and memory were all tested against real systems this session
  and confirmed working — see `docs/PROJECT_STATE.md`.

## The model this project is committed to (governs every future phase)

**Mac = trusted interface. Cloud VM = semi-trusted execution sandbox. External AI
APIs = reasoning providers.**

Normal direction of control: Mac → authenticated request → VM → structured result →
Mac. Never the reverse. The VM must never hold:

- Mac SSH credentials or admin password
- Unrestricted Mac filesystem access
- macOS Keychain access
- Broad personal credentials of any kind

Any action on the Mac itself goes through a narrowly-scoped local tool service
(Phase 6), not a generic shell. No `rm`, no arbitrary shell, no `sudo`, no
filesystem-wide read, no automatic AppleScript — see spec §22 for the exact allowlist
(open_application, open_url, volume, notification, system_status, and
explicitly-user-selected file/clipboard reads only).

## Phase 8/9 status (2026-08-07)

A real VM exists (DigitalOcean droplet `friday-vm-agent`, nyc1, 1 vCPU/1GB,
Ubuntu 26.04 LTS) with baseline OS hardening verified over a real SSH session,
**and** a first real task-execution channel is live on top of it — see
`docs/PROJECT_STATE.md`'s Phase 9 section for the full build. Short version:
SSH-based (not HTTPS/token, a deliberate deviation from this section's original
sketch — see PROJECT_STATE for why), a dedicated key forced (verified, not just
configured) to only run `/opt/friday-agent/dispatch.sh`, which executes tasks
inside network-isolated-by-default, resource-limited, `--cap-drop=ALL` Docker
containers — never on the host. Registered as a `riskLevel: "critical"` tool
requiring individual approval every time (no "Always Allow" for critical tools —
a UI change made specifically because this was the first tool to reach that
level). The DigitalOcean API token used to provision the droplet was used
in-memory only and was not written to any file, including this repo.

**Still open**: browser automation, richer task types, and the specific mitigations
in the table below that go beyond what a generic sandboxed-command-runner
provides (e.g. "malicious downloaded file" handling assumes a browser automation
capability that doesn't exist yet).

## Threat model (target architecture — re-check each row against what's actually built before assuming it holds)

| Threat | Mitigation |
|---|---|
| Malicious website content | Browser automation treats all page content as **data**, never as instructions. A webpage cannot request credentials, tool escalation, or policy changes — only the user + system policy can grant those (spec §77-78). |
| Prompt injection via tool output | Same principle — tool/browser output is data passed to the model, never trusted as a new system instruction. |
| Compromised VM | VM holds only the credentials it needs for its own job (least privilege, spec §79) — never Mac credentials, never a database admin key it doesn't use. Isolation is architectural, not just a promise: no path exists for the VM to reach the Mac except the one authenticated gateway channel. |
| Malicious downloaded file | Downloads land in an isolated, ephemeral directory on the VM. Nothing transfers to the Mac automatically — metadata is shown first, transfer requires explicit user action (spec §80). |
| Leaked API token | Tokens are short-lived where the provider supports it, scoped per-service, and never logged (`lib/logger.ts` redacts anything matching `key|token|secret|password|authorization`). |
| Manipulated browser content directing tool use | Tool permissions originate only from USER + SYSTEM POLICY, never from content the agent reads (spec §77). |

## Connection security (Phase 9, built via SSH instead of HTTPS/WSS — see status above)

Original target was HTTPS/WSS + bearer tokens; what's actually built uses SSH
key auth instead (see Phase 8/9 status above for why) — same properties, different
mechanism: authenticated (SSH key, forced-command restricted), encrypted in
transit (SSH transport), schema-validated (Zod on the Mac-side route, `jq`-parsed
JSON on the VM side, never a shell string built from the payload), timed out
(both a VM-side `timeout` and a Mac-side `execFile` timeout backstop), and payload
size bounded (`z.string().max(4000)` on the command). Rate limiting is not
implemented — a personal single-user tool with mandatory per-call approval (see
Tool risk model below) has a natural rate limit (a human has to click Allow each
time) that a rate limiter would be redundant with today; revisit if that changes.

## Tool risk model (implemented, Phase 6; critical tier added Phase 9)

Every tool declares `riskLevel` (low/medium/high/critical) and
`requiresConfirmation` (`lib/tools/registry.ts`). Tools with `requiresConfirmation`
(`open_application`, `open_url`, `run_on_vm`) default to "ask" and show the
approval prompt from spec §23 (action description, "Requested by: FRIDAY", Allow
Once / Always Allow This Tool / Deny) before executing — implemented in
`components/tools/ToolApprovalModal.tsx` and `lib/tools/run-tool.ts`. Read-only or
harmless tools (`set_volume`, `show_notification`, `system_status`) default to
"allow". Every call — approved or denied — is written to the audit log
(`ToolRunRecord[]` in `stores/tool-store.ts`), visible in Settings → Tools → Recent
Activity. **`run_on_vm` (Phase 9) is the first tool to reach "critical"** — for
critical-risk tools specifically, the approval modal shows a distinct red-bordered
warning banner and omits the "Always Allow" option entirely, so every VM execution
requires an individual, explicit approval with no way to pre-authorize future
calls. "high"-risk tools still get the same treatment as low/medium (no tool has
reached "high" yet — revisit if one does).
