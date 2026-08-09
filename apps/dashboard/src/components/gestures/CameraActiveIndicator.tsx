"use client";

import { useGestureStore } from "@/stores/gesture-store";
import { useUiStore } from "@/stores/ui-store";

const LEGEND: Record<string, string> = {
  orb: "Two hands together/apart — resize · open palm — reset",
  intelligence: "Pinch + drag — rotate globe · two hands together/apart — zoom · open palm — reset",
};

/**
 * Always visible whenever the webcam is actually in use — spec §9. Also the
 * one place the active gesture vocabulary is spelled out on-screen (the
 * fuller explanation only lives in Settings → Input, which nobody re-reads
 * mid-session) — what the gestures actually do differs by mode (resize the
 * orb vs. drive the globe camera), so the legend is mode-aware.
 */
export function CameraActiveIndicator() {
  const cameraActive = useGestureStore((s) => s.cameraActive);
  const mode = useUiStore((s) => s.mode);

  if (!cameraActive) return null;

  return (
    <div className="glass-panel fixed left-6 top-16 z-[55] flex flex-col gap-1 rounded-md px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
        <span className="text-mono-status text-[10px] uppercase tracking-widest text-text-dim">
          Camera Active — Gestures
        </span>
      </div>
      <span className="text-[10px] text-text-faint">{LEGEND[mode] ?? LEGEND.orb}</span>
    </div>
  );
}
