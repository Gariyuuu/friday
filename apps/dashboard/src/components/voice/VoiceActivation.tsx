"use client";

import { useEffect, useRef } from "react";
import { registerDesktopGlobalShortcut } from "@/lib/desktop/global-shortcut";
import { toggleVoice } from "@/lib/voice/voice-controller";
import { useOrbStore } from "@/stores/orb-store";
import { useToastStore } from "@/stores/toast-store";

const DOUBLE_TAP_WINDOW_MS = 400;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return true;
  // Checked via the raw attribute, not the `isContentEditable`/`contentEditable`
  // DOM properties — jsdom implements neither (both read back `undefined` even
  // when the attribute is set), so a property-based check would silently never
  // match in tests. The attribute is spec-compliant to check directly anyway.
  const attr = target.getAttribute("contenteditable");
  return attr === "true" || attr === "";
}

/**
 * Double-tap K toggles the realtime voice session — a user preference over
 * the original ⌥+V, which still works too (kept as the system-wide
 * shortcut for when FRIDAY isn't focused; see lib/desktop/global-shortcut.ts
 * — a bare, unmodified key isn't safe to register globally since it'd
 * intercept normal typing in every other app). Double-tap only fires when
 * FRIDAY's own window has focus, and never while an input/textarea/
 * contentEditable is focused, so typing a word containing "kk" elsewhere
 * (or in FRIDAY's own command palette/prompt inputs) is never affected.
 * Renders nothing itself.
 */
export function VoiceActivation() {
  const showToast = useToastStore((s) => s.show);
  // -Infinity, not 0: performance.now() legitimately reads exactly 0 at the
  // start of a fresh timer clock (real page load or a fake-timers test), so
  // a plain 0 sentinel would make the very first-ever K press collide with
  // a same-instant "last press" and register as an accidental double-tap.
  const lastKAt = useRef(-Infinity);

  useEffect(() => {
    function fireToggle() {
      toggleVoice().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showToast(`Voice — ${message}`, "error");
      });
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.code === "KeyV") {
        e.preventDefault();
        fireToggle();
        return;
      }

      if (
        e.code === "KeyK" &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.repeat &&
        !isEditableTarget(e.target)
      ) {
        const now = performance.now();
        if (now - lastKAt.current <= DOUBLE_TAP_WINDOW_MS) {
          lastKAt.current = -Infinity;
          e.preventDefault();
          fireToggle();
        } else {
          lastKAt.current = now;
        }
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
