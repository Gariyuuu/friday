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

## `~/Applications/FRIDAY.app` — the current "installed app" experience

A thin wrapper bundle, not a true standalone build: `Info.plist` + a shell
script as `CFBundleExecutable` that runs `pnpm desktop:dev` via a login+
interactive shell (to pick up the normal PATH a GUI launch wouldn't have),
logging to `~/Library/Logs/FRIDAY/launch.log`. Reuses the real generated
`.icns` icon. Double-clickable and Spotlight-searchable. First launch needs
a right-click → Open to clear Gatekeeper's unsigned-app warning (it is not
code-signed). Verified in a prior session via `open` (LaunchServices), per
`PROJECT_STATE.md`.

## `pnpm desktop:build` — NOT set up

A real distributable, optionally-signed `.app`/`.dmg` bundle. Not attempted
— per prior session notes, it needs a bundled Node server sidecar (the dev
setup depends on a live `next dev` process, which a distributable build
can't assume exists). No config for a sidecar exists in `src-tauri/`,
confirmed by inspection this session. Running `pnpm desktop:build` today
would produce a non-functional app per `CLAUDE.md`'s own note.

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
