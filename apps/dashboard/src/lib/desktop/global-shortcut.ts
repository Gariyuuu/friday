import { createLogger } from "@/lib/logger";

const logger = createLogger("UI");

/** True only inside the packaged Tauri app — never in a plain browser tab. */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let registered = false;

/**
 * Registers ⌥+V as a real OS-level global shortcut when running inside the
 * Tauri desktop app (works even when FRIDAY isn't the focused window) — see
 * spec §11. No-op in a plain browser tab; the in-app `keydown` listener in
 * VoiceActivation.tsx already covers that case. Dynamically imports the plugin
 * so a plain web deployment never even loads Tauri-only code.
 */
export function registerDesktopGlobalShortcut(onTrigger: () => void): void {
  if (!isTauri() || registered) return;
  registered = true;

  import("@tauri-apps/plugin-global-shortcut")
    .then(({ register }) => register("Alt+V", (event) => {
      if (event.state === "Pressed") onTrigger();
    }))
    .catch((error: unknown) => {
      logger.error("failed to register global shortcut", { error: String(error) });
      registered = false;
    });
}
