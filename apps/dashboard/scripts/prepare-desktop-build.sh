#!/bin/bash
# Runs as tauri.conf.json's beforeBuildCommand. `next build` with
# output:"standalone" (next.config.ts) produces a self-contained server
# entry point (server.js) and compiled build output (.next/), but doesn't
# include static assets, env vars, or a working node_modules for a bundle
# that's going to be moved elsewhere — those have to be handled by hand.
# The result becomes the "server" resource lib.rs's sidecar spawns at
# runtime (see ARCHITECTURE.md's "desktop:build" section).
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET_TRIPLE="$(rustc -vV 2>/dev/null | awk '/^host/{print $2}')"
if [ ! -f "src-tauri/binaries/node-$TARGET_TRIPLE" ]; then
  echo "prepare-desktop-build: src-tauri/binaries/node-$TARGET_TRIPLE is missing." >&2
  echo "Run scripts/vendor-node-sidecar.sh once first (it's gitignored, not committed)." >&2
  exit 1
fi

pnpm exec next build

STANDALONE_DIR=".next/standalone/apps/dashboard"
if [ ! -d "$STANDALONE_DIR" ]; then
  echo "prepare-desktop-build: expected $STANDALONE_DIR to exist after next build" >&2
  exit 1
fi

rm -rf "$STANDALONE_DIR/.next/static"
cp -r .next/static "$STANDALONE_DIR/.next/static"
rm -rf "$STANDALONE_DIR/public"
cp -r public "$STANDALONE_DIR/public"
if [ -f .env.local ]; then
  cp .env.local "$STANDALONE_DIR/.env.local"
fi

# `next build`'s own standalone node_modules is NOT what ships — replaced
# below with `pnpm deploy`'s output, fully dereferenced. Three real,
# conflicting constraints found by testing, in order:
# (1) In this pnpm monorepo, standalone's node_modules/next is a *relative*
#     symlink pointing up to a root .pnpm store that only exists alongside
#     the standalone tree itself — fine in place, but Tauri's `resources`
#     bundling only takes this apps/dashboard subtree, so the referenced
#     root never gets bundled and the shipped app crashed with "Cannot
#     find module 'next'" the moment it was copied to ~/Applications.
# (2) Tauri's `resources` bundler turned out to drop ALL symlinks
#     unconditionally, not just ones pointing outside what it's copying —
#     confirmed by diffing node_modules' contents before/after Tauri's own
#     bundling step. So nothing in the shipped tree can be a symlink,
#     which is what `pnpm deploy` (pnpm's purpose-built command for a
#     clean, complete node_modules for one workspace package) plus `cp -L`
#     to dereference it is for.
# (3) But fully dereferencing broke a DIFFERENT thing: Node resolves a
#     package's own nested requires (e.g. next's own internal
#     `require('@swc/helpers/...')`) by walking up node_modules
#     directories starting from that package's REAL file location. While
#     `next` lives inside .pnpm/next@<hash>/node_modules/next, that walk
#     finds its sibling deps (@swc/helpers etc.) one level up in the same
#     isolated folder. Once dereferenced out to a flat top-level
#     node_modules/next, that ancestor walk no longer passes through its
#     old siblings at all, and it broke with "Cannot find module
#     '@swc/helpers/_/_interop_require_default'" — reproduced with cp,
#     rsync, and even with @swc/helpers itself restored as a working
#     symlink, so it's specifically about `next`'s own location, not
#     which tool did the copying or any one dependency. Root-caused with
#     a minimal reproduction (isolating exactly this one variable) after
#     several wrong theories, not guessed.
# Fix for (3), same idea as classic npm/yarn hoisting: after dereferencing
# each top-level package, also copy its own pnpm-isolated siblings into
# ITS OWN node_modules/ subfolder, so that ancestor walk still finds them
# without needing any symlink. Verified with a live server round trip,
# not just require().
DEPLOY_DIR="$(mktemp -d)"
trap 'rm -rf "$DEPLOY_DIR"' EXIT
(cd ../.. && pnpm --filter=dashboard deploy "$DEPLOY_DIR" --prod)

# pnpm deploy leaves a self-referencing workspace symlink
# (node_modules/.pnpm/node_modules/dashboard, pointing back at this
# project's own source directory via a long relative path) that's never
# actually required at runtime. `cp -L` aborts entirely if it hits a
# dangling symlink, so this has to be stripped from the source first, not
# cleaned up after — found by testing, not documented anywhere.
find "$DEPLOY_DIR/node_modules" -type l ! -exec test -e {} \; -delete

rm -rf "$STANDALONE_DIR/node_modules"
mkdir -p "$STANDALONE_DIR/node_modules/.pnpm"
cp -RL "$DEPLOY_DIR/node_modules/.pnpm/." "$STANDALONE_DIR/node_modules/.pnpm/"

for link in "$DEPLOY_DIR"/node_modules/*; do
  name="$(basename "$link")"
  [ -L "$link" ] || continue
  real_target="$(cd "$(dirname "$link")" && readlink -f "$name")"
  isolated_nm="$(dirname "$real_target")"
  cp -RL "$real_target" "$STANDALONE_DIR/node_modules/$name"
  mkdir -p "$STANDALONE_DIR/node_modules/$name/node_modules"
  for sibling in "$isolated_nm"/*; do
    sib_name="$(basename "$sibling")"
    [ "$sib_name" = "$name" ] && continue
    cp -RL "$sibling" "$STANDALONE_DIR/node_modules/$name/node_modules/$sib_name" 2>/dev/null || true
  done
done

echo "prepare-desktop-build: standalone server ready at $STANDALONE_DIR (node_modules via pnpm deploy + hoisted siblings, $(du -sh "$STANDALONE_DIR/node_modules" | cut -f1))"
