# Security model

## Current state (Phase 0/1/3/4/6)

Still no VM, no user data storage/memory. Three real security surfaces now exist:
server-side API keys (news, markets), real local tool execution (Phase 6), and voice
(Phase 4, an ephemeral-credential pattern). All are live and worth understanding, not
just "future work."

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
- The settings UI shows every *unbuilt* integration as "Not configured" rather than a
  working-looking control (spec §67) — this still applies to memory and the VM
  connection. Voice was tested against the real API this session and confirmed
  working (real WebRTC handshake, real speech detection) — see
  `docs/PROJECT_STATE.md`.

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

## Threat model (for Phase 8+ — must be re-reviewed, not just referenced, before VM work starts)

| Threat | Mitigation |
|---|---|
| Malicious website content | Browser automation treats all page content as **data**, never as instructions. A webpage cannot request credentials, tool escalation, or policy changes — only the user + system policy can grant those (spec §77-78). |
| Prompt injection via tool output | Same principle — tool/browser output is data passed to the model, never trusted as a new system instruction. |
| Compromised VM | VM holds only the credentials it needs for its own job (least privilege, spec §79) — never Mac credentials, never a database admin key it doesn't use. Isolation is architectural, not just a promise: no path exists for the VM to reach the Mac except the one authenticated gateway channel. |
| Malicious downloaded file | Downloads land in an isolated, ephemeral directory on the VM. Nothing transfers to the Mac automatically — metadata is shown first, transfer requires explicit user action (spec §80). |
| Leaked API token | Tokens are short-lived where the provider supports it, scoped per-service, and never logged (`lib/logger.ts` redacts anything matching `key|token|secret|password|authorization`). |
| Manipulated browser content directing tool use | Tool permissions originate only from USER + SYSTEM POLICY, never from content the agent reads (spec §77). |

## Connection security (Phase 8 requirement, not yet built)

HTTPS/WSS only, authenticated requests, short-lived tokens, rate limiting, schema
validation (Zod) on every message crossing the Mac↔VM boundary, timeouts, and payload
size limits. VM payloads are never trusted blindly regardless of source.

## Tool risk model (implemented, Phase 6)

Every tool declares `riskLevel` (low/medium/high/critical) and
`requiresConfirmation` (`lib/tools/registry.ts`). Tools with `requiresConfirmation`
(`open_application`, `open_url`) default to "ask" and show the exact approval prompt
from spec §23 (action description, "Requested by: FRIDAY", Allow Once / Always Allow
This Tool / Deny) before executing — implemented in
`components/tools/ToolApprovalModal.tsx` and `lib/tools/run-tool.ts`. Read-only or
harmless tools (`set_volume`, `show_notification`, `system_status`) default to
"allow". Every call — approved or denied — is written to the audit log
(`ToolRunRecord[]` in `stores/tool-store.ts`), visible in Settings → Tools → Recent
Activity. No tool currently reaches "high" or "critical" risk; if one is added later,
it should not be settable to "allow" without a distinct, more serious warning than
the current dropdown gives for low/medium tools (not yet built — today's UI treats
all risk levels' permission control the same way).
