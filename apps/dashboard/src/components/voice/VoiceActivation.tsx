"use client";

import { useEffect } from "react";
import { registerDesktopGlobalShortcut } from "@/lib/desktop/global-shortcut";
import { toggleVoice } from "@/lib/voice/voice-controller";
import { useOrbStore } from "@/stores/orb-store";
import { useToastStore } from "@/stores/toast-store";

/**
 * ⌥+V toggles the realtime voice session — spec §11. In the browser this only
 * works while the window/tab is focused (standard `keydown`); inside the Tauri app
 * it's also registered as a real system-wide shortcut that works even when FRIDAY
 * isn't focused — see lib/desktop/global-shortcut.ts. Renders nothing itself.
 */
export function VoiceActivation() {
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.code === "KeyV") {
        e.preventDefault();
        toggleVoice().catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          showToast(`Voice — ${message}`, "error");
        });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showToast]);

  useEffect(() => {
    registerDesktopGlobalShortcut(() => {
      toggleVoice().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showToast(`Voice — ${message}`, "error");
      });
    });
  }, [showToast]);

  return null;
}

export function useVoiceConnected() {
  return useOrbStore((s) => s.voiceStatus !== "offline" && s.voiceStatus !== "error");
}
