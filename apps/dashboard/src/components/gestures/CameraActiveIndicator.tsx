"use client";

import { useGestureStore } from "@/stores/gesture-store";

/** Always visible whenever the webcam is actually in use — spec §9. */
export function CameraActiveIndicator() {
  const cameraActive = useGestureStore((s) => s.cameraActive);

  if (!cameraActive) return null;

  return (
    <div className="glass-panel fixed left-6 top-16 z-[55] flex items-center gap-2 rounded-md px-3 py-1.5">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
      <span className="text-mono-status text-[10px] uppercase tracking-widest text-text-dim">
        Camera Active — Gestures
      </span>
    </div>
  );
}
