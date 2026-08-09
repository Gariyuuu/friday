# Security model

## Current state (Phase 0/1/3/4/5/6/7/8/9/10/11)

A real DigitalOcean droplet exists and runs real FRIDAY-specific software.
Both VM task types (`shell`, `browse`, including multi-step browser
interaction) are independently, live-verified end-to-end -- Mac-side code
by reading it, VM-side infrastructure (Docker image, `dispatch.sh`,
`friday-browser:latest`, the iptables SSRF rules, the systemd hardening
unit) by opening real SSH connections and running real tasks against the
droplet directly, repeated across multiple sessions. Real security
surfaces: server-side API keys (news, markets, search, video), real local
tool execution (Phase 6), voice (Phase 4, an ephemeral-credential pattern),
voice-triggered tool-calling (Phase 5), local memory storage (Phase 7),
webcam access (Phase 10, gestures), OS-level integrations -- global
shortcut, tray, autostart (Phase 11), and the cloud VM (Phase 8/9).

- `.env.example` documents every credential. Nothing in the repo is a real
  secret. `.env`/`.env.local` are gitignored. Confirmed:
  `git log --all --diff-filter=A -- "*.env*"` shows only `.env.example` was
  ever committed.
- No `NEXT_PUBLIC_`-prefixed secret exists or should ever exist.
  `NEWS_API_KEY`/`TWELVE_DATA_API_KEY`/etc. are read only inside
  `server-only`-guarded modules, called only from route handlers.
- `GET /api/config` reports configured/not-configured as booleans only --
  can never leak a key value (never reads the string, only `Boolean(...)`).
- **Local tools are real** (Phase 6): `open_application`, `open_url`,
  `set_volume`, `show_notification`, `system_status` -- all via `execFile`
  with an argument array, never a shell string. `open_application` is
  Zod-enum-restricted to a 9-app allowlist. `open_url` restricts to
  `http:`/`https:`. `show_notification`'s AppleScript interpolation escapes
  `"`/`\`. All route through the permission engine + approval modal.
- **Voice uses an ephemeral-credential pattern** (Phase 4): `OPENAI_API_KEY`
  is read only server-side, exchanged for a short-lived token -- only that
  token reaches the browser.
- **Voice tool-calling doesn't bypass permissions** (Phase 5): local-tool
  and VM-tool handlers in `friday-tools.ts` call the same
  `lib/tools/client.ts` wrappers the command palette uses -- same approval
  modal, same audit log, regardless of trigger source.
- **Memory is local-only** (Phase 7): SQLite at `~/.friday/memory.db`.
- **Webcam access is local-only and opt-in** (Phase 10): no frame/landmark
  data ever leaves the browser.
- **OS-level integrations are additive** (Phase 11): gated by `isTauri()`
  guards, no new network surface.

## The model this project is committed to (governs every future phase)

**Mac = trusted interface. Cloud VM = semi-trusted execution sandbox.
External AI APIs = reasoning providers.**

Normal direction of control: Mac -> authenticated request -> VM -> structured
result -> Mac. Never the reverse. The VM must never hold Mac SSH credentials,
admin password, Keychain access, or broad personal credentials. Any action
on the Mac goes through a narrowly-scoped local tool service (Phase 6), not
a generic shell.

## Phase 8/9 status

Both task types are built, live-verified, and in day-to-day use:

- **`shell` task type**: SSH channel (forced-command, restricted key),
  ephemeral `--network=none`-by-default Docker container, critical-risk
  approval flow. Verified by reading `vm-client.ts`/`route.ts`/
  `registry.ts`/`ToolApprovalModal.tsx` and by real round trips through the
  live app.
- **`browse` task type**: real headless-Chromium page loads and multi-step
  interaction (click/type/wait/screenshot, up to 10 steps) on the droplet,
  verified with genuine interaction against real sites (Wikipedia search,
  Hacker News) -- screenshots decoded and visually confirmed, not just
  assumed present.
- **Quick Actions UI**: both tools have a `⌘K` entry, including a
  step-builder for `browse`'s multi-step sequences (add/remove rows, an
  action dropdown, conditional selector/text inputs, capped at 10 steps)
  and a dedicated results panel that renders returned screenshots as real
  clickable images.
- **`vm/config.ts`** reads `VM_HOST`/`VM_USER` from environment variables,
  not a hardcoded literal. The VM's public IP remains visible in this
  repo's git history from before that change -- rewriting history was
  judged not worth the disruption; flagged here for the record.

**Historical note**: an earlier documentation pass on this repo (2026-08-07)
was produced by a concurrent Claude Code session that had not opened an SSH
connection to the droplet and, as a result, repeatedly hedged VM-side claims
as "unverified"/"claimed but not confirmed." Every one of those claims has
since been independently confirmed by direct SSH sessions against the real
droplet, multiple times, across multiple work sessions. That hedged framing
no longer reflects reality and has been retired from this file. The
underlying lesson -- don't assert verification status you can't back with
evidence, especially on a security document -- still stands as general
practice.

## Threat model (target architecture -- re-check each row against what's actually built before assuming it holds)

| Threat | Mitigation |
|---|---|
| SSRF -- a task directs the VM to reach internal infrastructure instead of the public internet | **Three independent, live-verified layers.** (1) `lib/vm/ssrf-guard.ts` (Mac/application layer, DNS-rebinding-aware) blocks loopback/link-local/RFC1918 destinations before a browse request ever leaves the Mac. (2) VM-side `DOCKER-USER` iptables rules (`friday-docker-hardening.service`) block the same ranges at the packet level regardless of what the container's own code does -- verified live by observing a blocked `wget` fail with a DNS resolution error inside a running task. (3) VM-side, inside `browse.js`: the headless browser is launched pointed at a local forward proxy that re-checks every request (including HTTP redirects and subresources) against the same blocklist before allowing a connection. This layer exists because a real test found that Playwright's `page.route()` interception does **not** re-fire for a server-side HTTP redirect on the main navigation frame in the Chromium version this project uses -- confirmed with a controlled local test (a redirect from an allowed target to a blocked one silently succeeded under `page.route()`, then genuinely failed to reach the blocked target once a forward proxy was used instead, confirmed by observing the blocked server's request log stayed empty). The proxy blocks HTTPS via CONNECT refusal (surfaces as a real `page.goto()` failure) and HTTP via a marked 403 response (checked explicitly so a blocked navigation reports `ok:false`, not a misleadingly "successful" result). 21 unit tests cover the range-matching logic itself (`lib/vm/__tests__/ssrf-guard.test.ts`), including a real bug this test suite caught: Node's `URL` parser keeps brackets on an IPv6 literal hostname (`"[::1]"`), so an early version of the blocklist comparison never matched them -- fixed, re-verified live. |
| Malicious website content | **Real code-level control for the browse path**: `friday-tools.ts` wraps returned page text in an explicit untrusted-content delimiter before it reaches the model. A delimiter raises the bar, it isn't an absolute guarantee against a sufficiently adversarial page. |
| Prompt injection via tool output | Same delimiter mechanism for `browse_on_vm` specifically. Other tool outputs (`search_web`, `recall`) have no equivalent wrapper as of this review -- worth extending if they ever handle less-trusted content. |
| Compromised VM | VM holds only the credentials it needs for its own job -- never Mac credentials. No path exists for the VM to reach the Mac except the one authenticated SSH channel, which only carries JSON task/result payloads. |
| Malicious downloaded file | Not applicable yet -- browsing only extracts text and screenshots, no file download/transfer capability exists. |
| Leaked API token | Tokens are short-lived where supported, scoped per-service, never logged (`lib/logger.ts` redacts `key\|token\|secret\|password\|authorization`). |
| Manipulated browser content directing tool use | Tool permissions originate only from USER + SYSTEM POLICY, reinforced by the untrusted-content delimiter for browsed pages specifically. |

## Connection security (Phase 9, SSH instead of HTTPS/WSS)

Authenticated (SSH key, forced-command restricted), encrypted in transit
(SSH transport), schema-validated (Zod on the Mac-side route, `jq`-parsed
JSON on the VM side), timed out (VM-side `timeout` plus a Mac-side
`execFile` backstop in `vm-client.ts`), payload size bounded
(`z.string().max(4000)` on the shell command). Rate limiting isn't
implemented -- mandatory per-call approval provides a natural one.

## Notable findings from live security work (chronological)

- **The VM's public IP/username were committed in plain text -- fixed**:
  `config.ts` originally hardcoded `VM_HOST`/`VM_USER`; changed to read
  from env vars instead. The IP remains visible in this repo's git history
  from before that change.
- **No SSRF protection existed at the Mac/application layer at one point in
  this project's history -- it does now**, and now has three independent
  layers (see the threat-model table above).
- **Prompt-injection defense was a documented convention only at one
  point -- it now has a real code-level control for the browse path
  specifically**: see the threat-model table above.
- **IPv6 SSRF-guard bug**: Node's `URL` parser keeps brackets on IPv6
  literal hostnames, so an early blocklist check silently never matched
  them. Found by writing tests, not by inspection. Fixed.
- **Redirect-following SSRF gap**: `ssrf-guard.ts` only validates the URL a
  browse task is *given*, not where an HTTP redirect on the VM-side browser
  actually lands. Tried fixing this with Playwright's `page.route()`
  first; a controlled local test proved that approach doesn't actually
  work for main-frame redirects in this Chromium version (the interception
  handler is only invoked once, for the initial request). Replaced with a
  local forward proxy the browser is launched pointed at, which does cover
  every hop -- verified with the same controlled test methodology (the
  blocked target's own request log confirmed it never received a
  connection), then re-verified against the real droplet.
- **No secrets found committed anywhere in git history**: only
  `.env.example` (placeholder-only) was ever added; a grep for common
  secret patterns found nothing real except an intentional test fixture
  string (`"sk-super-secret"`) in `lib/__tests__/logger.test.ts`, used to
  test the logger's own redaction.

## Tool risk model (implemented, Phase 6; critical tier added Phase 9)

Every tool declares `riskLevel` and `requiresConfirmation`
(`lib/tools/registry.ts`). `requiresConfirmation` tools default to "ask" and
show the approval prompt (Allow Once / Always Allow / Deny) -- implemented in
`components/tools/ToolApprovalModal.tsx` and `lib/tools/run-tool.ts`. Every
call is written to the audit log (`stores/tool-store.ts`). `run_on_vm` (and
`browse_on_vm`, sharing its registry entry) is the first/only tool to reach
"critical" -- critical-risk approvals show a red-bordered warning banner and
omit "Always Allow" entirely.
