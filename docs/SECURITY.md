# Security model

## Current state (Phase 0/1)

There is no server-side secret handling, no VM, no tool execution, and no user data
storage yet. The app runs entirely client-side against mock data. The main live
security surface today is: don't accidentally introduce one before it's needed.

- `.env.example` documents every credential the later phases will need. Nothing in it
  is real. `.env` / `.env.local` are gitignored.
- No `NEXT_PUBLIC_`-prefixed secret exists or should ever exist — that prefix ships a
  value into the browser bundle.
- The settings UI shows every unconfigured integration as "Not configured" rather
  than a working-looking control, so there's never a UI element implying a capability
  that isn't real (spec §67).

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

## Tool risk model (Phase 6+)

Every tool declares `riskLevel` (low/medium/high/critical) and
`requiresConfirmation`. Medium+ risk actions show an explicit approval prompt
(action, requester, Allow Once / Always Allow / Deny) before executing — see spec
§23. High-risk tools can never become unrestricted without an explicit warning shown
to the user at the point permissions are changed.
