"use client";

import { useEffect, useRef } from "react";
import { disableGestures, enableGestures } from "@/lib/gestures/gesture-controller";
import { useToastStore } from "@/stores/toast-store";
import { useGestureStore } from "@/stores/gesture-store";

/**
 * Starts/stops the webcam + hand tracker in response to the Settings toggle.
 * Renders nothing. The webcam is never opened just because `enabled` was true on
 * a previous visit without the user re-confirming this session — see Settings →
 * Input, which is the only place `setEnabled(true)` should be called from a cold
 * start (this effect only reacts to changes, it doesn't grant permission itself).
 */
export function GestureController() {
  const enabled = useGestureStore((s) => s.enabled);
  const showToast = useToastStore((s) => s.show);
  const started = useRef(false);

  useEffect(() => {
    if (enabled && !started.current) {
      started.current = true;
      enableGestures().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showToast(`Gestures — ${message}`, "error");
      });
    } else if (!enabled && started.current) {
      started.current = false;
      disableGestures();
    }
  }, [enabled, showToast]);

  useEffect(() => {
    return () => {
      if (started.current) disableGestures();
    };
  }, []);

  return null;
}
