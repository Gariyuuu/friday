# Roadmap

Forward-looking only — see `PROJECT_STATE.md`/`FEATURES.md` for current
status, `TASKS.md` for near-term tracking.

## Immediate (blocking, before anything else in Phase 9)

- Independently confirm the VM-side `browse_on_vm` infrastructure (an SSH
  check of `dispatch.sh`, the Docker image, and the iptables/systemd claims)
  — see `SECURITY.md`. Nothing else in Phase 9 should be treated as fully
  trustworthy until this happens at least once by a session that actually
  opens that connection.

## Phase 9 breadth (near-term)

- Richer VM task types: multi-step browser interaction (click, type, wait
  for an element, screenshot) beyond today's single-shot shell/browse.
- A Quick-Actions UI entry for `run_on_vm`/`browse_on_vm` — currently
  voice-only, a deliberate scope cut from the original build.
- Extend the untrusted-content delimiter pattern (currently only wrapping
  `browse_on_vm` output) to `search_web`/`recall` if those ever return
  genuinely untrusted (vs. curated API) content.
- Consider whether `ssrf-guard.ts`'s check needs to account for HTTP
  redirects — it validates the initial URL/DNS resolution, but a
  VM-side fetch could still follow a redirect to a private address after
  the Mac-side check passes, if the VM-side layer isn't also enforcing it.

## Phase 11 finishing touch

- `pnpm desktop:build` — a real distributable, optionally signed
  `.app`/`.dmg`. Needs a bundled Node server sidecar (the current
  `desktop:dev` architecture depends on a live `next dev` process a
  distributable build can't assume). Only relevant once/if sharing the app
  with someone else matters — `desktop:dev` + `~/Applications/FRIDAY.app`
  are sufficient for the current single-user, single-machine use case.

## Longer-term / not yet scheduled

- Memory: revisit local SQLite vs. a hosted Postgres/pgvector setup if
  multi-device sync or semantic search over memories ever becomes a real
  need (explicitly deferred per `DECISIONS.md`).
- `packages/ui` / `packages/protocol` / `packages/security` — deliberately
  not created yet (see `ARCHITECTURE.md`'s explanation); would only make
  sense once there's a second consumer of shared UI, or a second process
  (beyond the VM) that needs a formal protocol/security contract.
- Rate limiting on the VM channel — not implemented today because mandatory
  per-call human approval provides a natural rate limit; revisit if that
  approval requirement is ever relaxed for any tool.
- Infrastructure-as-code for the VM — currently, all droplet provisioning
  and hardening was done by hand over SSH with no reproducible script in
  this repo (see `DEPLOYMENT.md`). If the droplet is ever lost, redoing
  this from prose notes is real, avoidable risk; a checked-in provisioning
  script (even a simple bash script, not necessarily Terraform) would close
  this gap.
- Gesture recognition accuracy tuning — needs real-hand feedback from the
  user first before there's anything concrete to improve.

## Explicitly out of scope / deferred by design

- A general-purpose HTTP API for the VM (the SSH-based channel was a
  deliberate choice over this — see `DECISIONS.md`). Revisit only if a
  second client besides the Mac ever needs to talk to the VM.
- Rewriting git history to remove the VM's IP from old commits — judged
  destructive and out of scope; the IP is not a credential on its own given
  the forced-command SSH restriction, even though it shouldn't have been
  committed in the first place.
