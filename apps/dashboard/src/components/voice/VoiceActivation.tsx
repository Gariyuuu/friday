"use client";

import { useEffect } from "react";
import { connectVoice, disconnectVoice, isVoiceConnected } from "@/lib/voice/voice-controller";
import { useOrbStore } from "@/stores/orb-store";
import { useToastStore } from "@/stores/toast-store";

/** ⌥+Space toggles the realtime voice session — spec §11. Renders nothing itself. */
export function VoiceActivation() {
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.code === "Space") {
        e.preventDefault();
        if (isVoiceConnected()) {
          disconnectVoice();
        } else {
          connectVoice().catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            showToast(`Voice — ${message}`, "error");
          });
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showToast]);

  return null;
}

export function useVoiceConnected() {
  return useOrbStore((s) => s.voiceStatus !== "offline" && s.voiceStatus !== "error");
}
