#!/bin/bash
# Runs as tauri.conf.json's beforeBuildCommand. `next build` with
# output:"standalone" (next.config.ts) produces a self-contained server
# bundle, but doesn't include static assets or env vars — those have to be
# copied in by hand per Next.js's own standalone docs. The result becomes
# the "server" resource lib.rs's sidecar spawns at runtime (see
# ARCHITECTURE.md's "desktop:build" section).
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

echo "prepare-desktop-build: standalone server ready at $STANDALONE_DIR"
