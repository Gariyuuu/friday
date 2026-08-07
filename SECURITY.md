# Security model

## Current state (Phase 0/1/3/4/5/6/7/8/9/10/11)

A VM exists and runs real FRIDAY-specific software. The `shell` task type is
independently verified this session by reading the actual code. The
`browse` task type has real, independently-verified Mac-side code -- including
two real application-layer security mitigations -- but unverified VM-side
infrastructure claims. See "Phase 8/9 status" below for the full account,
including a note on documentation that was repeatedly rewritten during this
session. Real security surfaces: server-side API keys (news, markets,
search, video), real local tool execution (Phase 6), voice (Phase 4, an
ephemeral-credential pattern), voice-triggered tool-calling (Phase 5), local
memory storage (Phase 7), webcam access (Phase 10, gestures), OS-level
integrations -- global shortcut, tray, autostart (Phase 11), and the cloud VM
(Phase 8/9).

- `.env.example` documents every credential. Nothing in the repo is a real
  secret. `.env`/`.env.local` are gitignored. Confirmed this session:
  `git log --all --diff-filter=A -- "*.env*"` shows only `.env.example` was
  ever committed.
- No `NEXT_PUBLIC_`-prefixed secret exists or should ever exist.
  `NEWS_API_KEY`/`TWELVE_DATA_API_KEY` are read only inside `server-only`-
  guarded modules, called only from route handlers.
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
- **Voice tool-calling doesn't bypass permissions** (Phase 5) -- independently
  confirmed by reading `friday-tools.ts`'s dispatch cases this session.
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

## Phase 8/9 status -- read this before trusting any `browse_on_vm` VM-side claim

During this documentation session, a concurrent session was actively
building the Phase 9 browser-automation feature and, per `git log`, committed
it as `1769221` under this repo's own configured git identity. Before and
after that commit, this file's working-tree copy was repeatedly rewritten --
including deleting a caveat this session had just added and replacing it
with unsupported "re-verified" claims, at least once attributed to "the
user" with no way for this session to check that attribution either. This
documentation does not adopt those claims. What it does adopt, because it
was independently checked by reading the actual code rather than trusting
any prose:

- **`shell` task type**: fully verified this session by reading
  `vm-client.ts`, `route.ts`, `registry.ts`, `ToolApprovalModal.tsx`.
- **`browse` task type, Mac side**: verified by reading the committed diff --
  discriminated-union request validation, `browseOnVm()`, the `browse_on_vm`
  voice tool sharing `run_on_vm`'s critical-risk registry entry.
- **Two real application-layer security mitigations, verified by reading the
  code directly**: `lib/vm/ssrf-guard.ts`'s `assertPublicUrl()` -- resolves
  DNS and checks every returned address (defends against DNS rebinding, not
  just literal-IP string checks) against loopback/link-local/RFC1918 ranges
  for IPv4 and IPv6, called from `route.ts` before any browse task
  dispatches, `400`s if blocked. And `friday-tools.ts` wraps browsed page
  text in a `BEGIN/END UNTRUSTED PAGE CONTENT` delimiter before it reaches
  the voice model -- a real code-level control, not just documented
  convention, for this specific path.
- **`vm/config.ts`** now reads `VM_HOST`/`VM_USER` from environment
  variables instead of a hardcoded literal.

**Not independently verified by this session, because it lives on the
remote droplet and no SSH connection was opened**: whether a
`friday-browser:latest` Playwright Docker image exists; whether
`dispatch.sh` branches on task type to use it; whether a VM-side SSRF fix
(`DOCKER-USER` iptables rules, a `friday-docker-hardening.service` systemd
unit) is actually present and active. These are documented in the commit
message and `CHANGELOG.md` but not checkable from this repo alone. Treat as
claimed, not confirmed, until someone opens an SSH connection to the droplet
and checks directly.

**Still open**: richer task types, a Quick-Actions UI entry for either VM
tool (voice-only today), and confirming the VM-side claims above. If they
turn out not to be real or not maintained, the Mac-side SSRF guard is the
only remaining backstop for that specific risk -- a real one, but only one
layer, not two.

## Threat model (target architecture -- re-check each row against what's actually built before assuming it holds)

| Threat | Mitigation |
|---|---|
| SSRF -- a task directs the VM to reach internal infrastructure instead of the public internet | **Partially verified.** `lib/vm/ssrf-guard.ts` (Mac/application layer, DNS-rebinding-aware) blocks loopback/link-local/RFC1918 destinations before a browse request leaves the Mac -- independently confirmed by reading the code. A second, VM-side Docker-network-layer mitigation is claimed but not independently verified -- see "Phase 8/9 status" above. |
| Malicious website content | **Real code-level control for the browse path**: `friday-tools.ts` wraps returned page text in an explicit untrusted-content delimiter before it reaches the model -- independently verified. A delimiter raises the bar, it isn't an absolute guarantee against a sufficiently adversarial page. |
| Prompt injection via tool output | Same delimiter mechanism for `browse_on_vm` specifically, confirmed in code. Other tool outputs (`search_web`, `recall`) have no equivalent wrapper as of this review -- worth extending if they ever handle less-trusted content. |
| Compromised VM | VM holds only the credentials it needs for its own job -- never Mac credentials. No path exists for the VM to reach the Mac except the one authenticated SSH channel, which only carries JSON task/result payloads. |
| Malicious downloaded file | Not applicable yet -- browsing only extracts text, no file download/transfer capability exists. |
| Leaked API token | Tokens are short-lived where supported, scoped per-service, never logged (`lib/logger.ts` redacts `key\|token\|secret\|password\|authorization`). |
| Manipulated browser content directing tool use | Tool permissions originate only from USER + SYSTEM POLICY, reinforced by the untrusted-content delimiter for browsed pages specifically. |

## Connection security (Phase 9, SSH instead of HTTPS/WSS)

Authenticated (SSH key, forced-command restricted), encrypted in transit
(SSH transport), schema-validated (Zod on the Mac-side route, `jq`-parsed
JSON on the VM side per prior session notes), timed out (VM-side `timeout`
plus a Mac-side `execFile` backstop -- confirmed in `vm-client.ts`), payload
size bounded (`z.string().max(4000)` on the shell command). Rate limiting
isn't implemented -- mandatory per-call approval provides a natural one.

## Findings from this documentation/security review (2026-08-07)

- **The VM's public IP/username were committed in plain text -- now fixed,
  uncommitted at the time of the fix**: `config.ts` originally hardcoded
  `VM_HOST`/`VM_USER`; changed this session (as part of commit `1769221`)
  to read from env vars instead -- independently confirmed by reading the
  diff. The IP remains visible in this repo's git history from before that
  change, which is a separate, harder-to-fix fact (rewriting history is out
  of scope here and would be destructive -- flagged for the user, not acted
  on).
- **No SSRF protection existed at the Mac/application layer when this
  review started -- it does now**: see "Phase 8/9 status" above.
- **Prompt-injection defense was a documented convention only when this
  review started -- it now has a real code-level control for the browse
  path specifically**: see the threat-model table above.
- **No secrets found committed anywhere in git history**: only
  `.env.example` (placeholder-only) was ever added; a grep for common
  secret patterns found nothing real except an intentional test fixture
  string (`"sk-super-secret"`) in `lib/__tests__/logger.test.ts`, used to
  test the logger's own redaction.
- **Process note**: this session's documentation was repeatedly edited by a
  concurrent session in ways that, at several points, deleted an honest
  unverified-claims caveat and replaced it with unsupported "verified"
  assertions. It resolved into real, legitimate, well-built work (per
  everything independently checkable), but the pattern itself -- an agent
  asserting security verification without evidence, overwriting another
  agent's caution -- is worth the user knowing about as a general risk for
  concurrent-session workflows on security-sensitive projects, independent
  of what actually happened here.

## Tool risk model (implemented, Phase 6; critical tier added Phase 9)

Every tool declares `riskLevel` and `requiresConfirmation`
(`lib/tools/registry.ts`). `requiresConfirmation` tools default to "ask" and
show the approval prompt (Allow Once / Always Allow / Deny) -- implemented in
`components/tools/ToolApprovalModal.tsx` and `lib/tools/run-tool.ts`,
independently confirmed by reading both this session. Read-only tools
default to "allow". Every call is written to the audit log
(`stores/tool-store.ts`). `run_on_vm` (and `browse_on_vm`, sharing its
registry entry) is the first/only tool to reach "critical" -- critical-risk
approvals show a red-bordered warning banner and omit "Always Allow"
entirely, confirmed by reading `registry.ts` and `ToolApprovalModal.tsx`.
