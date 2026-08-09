#!/bin/bash
# Downloads the official self-contained Node.js binary from nodejs.org and
# places it where Tauri's sidecar mechanism expects it
# (src-tauri/binaries/node-<target-triple>). Run once before `pnpm
# desktop:build`; not needed for `pnpm desktop:dev`.
#
# Deliberately NOT the system/Homebrew `node` — tested and confirmed that
# binary dynamically links against dozens of Homebrew-managed dylibs
# (libnode, libuv, libnghttp2, etc.) via absolute /opt/homebrew paths, so
# it isn't portable outside a Homebrew install. The official nodejs.org
# build only links standard macOS system frameworks (confirmed via
# `otool -L`) and is safe to bundle into the app.
set -euo pipefail
cd "$(dirname "$0")/.."

NODE_VERSION="22.14.0"
TARGET_TRIPLE="$(rustc -vV 2>/dev/null | awk '/^host/{print $2}')"
if [ -z "$TARGET_TRIPLE" ]; then
  echo "vendor-node-sidecar: couldn't determine the Rust target triple (is rustc installed?)" >&2
  exit 1
fi

case "$TARGET_TRIPLE" in
  aarch64-apple-darwin) NODE_PLATFORM="darwin-arm64" ;;
  x86_64-apple-darwin) NODE_PLATFORM="darwin-x64" ;;
  *)
    echo "vendor-node-sidecar: no known nodejs.org build for target $TARGET_TRIPLE — add one to this script" >&2
    exit 1
    ;;
esac

DEST_DIR="src-tauri/binaries"
DEST="$DEST_DIR/node-$TARGET_TRIPLE"
mkdir -p "$DEST_DIR"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ARCHIVE="node-v${NODE_VERSION}-${NODE_PLATFORM}.tar.gz"
echo "vendor-node-sidecar: downloading $ARCHIVE..."
curl -fsSL -o "$TMP_DIR/$ARCHIVE" "https://nodejs.org/dist/v${NODE_VERSION}/${ARCHIVE}"
tar -xzf "$TMP_DIR/$ARCHIVE" -C "$TMP_DIR"

cp "$TMP_DIR/node-v${NODE_VERSION}-${NODE_PLATFORM}/bin/node" "$DEST"
chmod +x "$DEST"

echo "vendor-node-sidecar: wrote $DEST ($(du -h "$DEST" | cut -f1))"
