import type { MetadataRoute } from "next";

/**
 * Lets Safari/Chrome "Add to Dock"/install FRIDAY as a standalone app window on
 * macOS — no browser chrome, its own Dock icon. Not a substitute for real native
 * packaging (Tauri, Phase 11 — menu bar, global shortcut outside the browser,
 * auto-launch), but a real, working app-like experience today with no extra infra.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "F.R.I.D.A.Y. — Personal Intelligence System",
    short_name: "FRIDAY",
    description: "Personal Intelligence System",
    start_url: "/",
    display: "standalone",
    background_color: "#050608",
    theme_color: "#050608",
    icons: [
      { src: "/manifest-icon?size=192", sizes: "192x192", type: "image/png" },
      { src: "/manifest-icon?size=512", sizes: "512x512", type: "image/png" },
    ],
  };
}
