function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** All no-ops outside the packaged Tauri app — auto-launch-at-login is a desktop-only concept. */
export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false;
  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return isEnabled();
}

export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  const mod = await import("@tauri-apps/plugin-autostart");
  await (enabled ? mod.enable() : mod.disable());
}

export function isDesktopApp(): boolean {
  return isTauri();
}
