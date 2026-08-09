# Deployment

FRIDAY is a personal, local-first app. There is no hosted web deployment (no
Vercel/similar) — "deployment" here means getting it running on the user's
own Mac, plus the separate cloud VM used only for sandboxed task execution.

## Running the dashboard (dev mode — this is the primary supported path)

```bash
pnpm install
cp .env.example apps/dashboard/.env.local   # optional — crypto + US weather work with zero config
pnpm dev
```

Opens at `http://localhost:3000` (or the next free port). This is a real
Next.js dev server, not a production build — there is no `pnpm build &&
pnpm start` deployment documented or exercised in this project's history.

## Native app (Tauri) — `pnpm desktop:dev`

```bash
cd apps/dashboard
pnpm desktop:dev
```

Compiles the Rust/Tauri shell (~1 min first run, cached after) and opens a
real native macOS window pointed at a `next dev` server on a fixed port
(1420). This is the actual architecture, not a shortcut: Tauri's webview
loads a live Next.js server rather than bundling a static export, because
the app has ~10 API routes a static export can't include (see
`ARCHITECTURE.md`). Verified in prior sessions via real launch (log
evidence: real page navigation, real API responses, confirmed foreground
process via `osascript`) — not re-verified live in this documentation pass.

## `pnpm desktop:build` — real, distributable, unsigned (0.26.0)

```bash
cd apps/dashboard
scripts/vendor-node-sidecar.sh   # once — vendors a portable Node binary as
                                  # a Tauri sidecar, gitignored, not committed
pnpm desktop:build
```

`~/Applications/FRIDAY.app` is now this real standalone build, not a dev-mode
wrapper (see below) — a self-contained `.app` bundling a vendored Node
sidecar running Next.js's `output: "standalone"` server on port 1421,
prepared by `scripts/prepare-desktop-build.sh`. Not code-signed — first
launch needs a right-click → Open to clear Gatekeeper's warning.

**Real bug found and fixed via testing the actual installed location, not
the build directory**: Tauri's `resources` bundling step silently drops
every symlink when copying files into the `.app`, which broke
`node_modules` (pnpm's own store is symlink-heavy) the instant the bundle
was moved out of its build folder — it only ever "worked" in place, where
the symlinks still resolved against files still on disk nearby.
`prepare-desktop-build.sh` now runs `pnpm deploy` for a clean tree, fully
dereferences it (`cp -RL`), and hoists each package's pnpm-isolated
sibling dependencies into its own `node_modules/` subfolder (classic
npm/yarn-style hoisting) — Node's own ancestor-directory-walk resolution
for a package's nested `require()` calls needs this, not just the top-level
symlinks. Bundle size grew from ~600MB to ~2GB as a result — an accepted
trade-off, documented in `ARCHITECTURE.md`. See `CHANGELOG.md`'s 0.26.0
entry for the full debugging story.

**Lesson, now a standing practice**: always verify a "distributable" build
by actually launching it from `~/Applications` (or wherever it will really
run), never just from the build output directory — that's exactly what
exposed this bug after an earlier session had reported `desktop:build` as
done based on an in-place launch alone.

## `~/Applications/FRIDAY.app` — the installed app

Since 0.26.0, this is the real `desktop:build` output above (rebuild +
reinstall after any source change — it does not auto-update). Before
0.26.0 it was a thin dev-mode wrapper (`Info.plist` + a shell script
running `pnpm desktop:dev`); that path is no longer used.

## "Add to Dock" (Safari PWA)

`app/manifest.ts` generates a real web app manifest so Safari/Chrome's "Add
to Dock" gives a standalone window with its own icon — no native extras
(no tray, no global shortcut), but zero extra infrastructure.

## Cloud VM (Phase 8/9) — separate from the dashboard's own deployment

The VM is not something FRIDAY "deploys to" — it's a fixed piece of
infrastructure the dashboard's server-side code talks to over SSH.

- **Provisioning**: done manually/interactively during a prior session (real
  DigitalOcean droplet `friday-vm-agent`, nyc1, `s-1vcpu-1gb`). No
  infrastructure-as-code exists in this repo for this — no Terraform,
  Ansible, or provisioning script checked in. The hardening steps (non-root
  user, SSH key-only, UFW, unattended upgrades, Docker install) were run
  ad hoc over SSH and are only documented in prose (`PROJECT_STATE.md`), not
  reproducible from a script in this repo. If the droplet is ever lost, a
  future session would need to redo this by hand from those notes.
- **`/opt/friday-agent/dispatch.sh`** and any Docker images
  (`friday-browser:latest`, per the disputed Phase 9 browse-task claims) live
  only on the VM — not tracked in this repo, not deployable via any command
  here. This is a real gap: there is no "redeploy the VM agent" command;
  updating `dispatch.sh` means SSHing in and editing it directly.
- **Current config**: `apps/dashboard/src/lib/vm/config.ts` reads
  `VM_HOST`/`VM_USER` from environment variables (changed this session from
  hardcoded literals — see `SECURITY.md`). `VM_SSH_KEY_PATH` defaults to
  `~/.friday/vm_agent_key`, outside the repo.

## Environment / secrets

`.env.example` at the repo root documents every variable; copy to
`apps/dashboard/.env.local` (gitignored). No CI/CD pipeline exists in this
repo (no `.github/workflows`, confirmed by directory listing) — everything
runs locally, deployed by the user manually.
