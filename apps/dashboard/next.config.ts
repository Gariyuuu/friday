import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed for `pnpm desktop:build` (see ARCHITECTURE.md): produces a
  // self-contained server bundle (.next/standalone) that Tauri spawns as a
  // sidecar process in a distributable build. Doesn't affect `next dev`/
  // `desktop:dev`, which still point at a live `next dev` process per the
  // existing architecture decision.
  output: "standalone",
};

export default nextConfig;
