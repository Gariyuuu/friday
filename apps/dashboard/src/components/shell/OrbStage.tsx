"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Orb } from "@/components/orb/Orb";
import { useVoiceConnected } from "@/components/voice/VoiceActivation";
import { VoiceCallCard } from "@/components/voice/VoiceCallCard";
import { toggleVoiceMute } from "@/lib/voice/voice-controller";
import { useGestureStore } from "@/stores/gesture-store";
import { useOrbStore } from "@/stores/orb-store";

const STATE_COPY: Record<string, string> = {
  idle: "Tap K twice to talk (⌥ + V works too), or ⌘K for commands.",
  listening: "Listening…",
  thinking: "Thinking…",
  searching: "Searching…",
  executing: "Executing…",
  speaking: "Speaking…",
  error: "Something went wrong.",
  success: "Done.",
};

/** Purely decorative targeting-reticle corners framing the whole stage — no data, just chrome. */
function ReticleCorners() {
  const corners = [
    "left-6 top-6 border-l border-t",
    "right-6 top-6 border-r border-t",
    "left-6 bottom-6 border-l border-b",
    "right-6 bottom-6 border-r border-b",
  ];
  return (
    <>
      {corners.map((position) => (
        <span
          key={position}
          className={`pointer-events-none absolute size-6 border-accent-dim ${position}`}
        />
      ))}
    </>
  );
}

export function OrbStage() {
  const orbState = useOrbStore((s) => s.orbState);
  const connected = useVoiceConnected();
  const [muted, setMuted] = useState(false);
  const orbScale = useGestureStore((s) => s.orbScale);
  const gesturesEnabled = useGestureStore((s) => s.enabled);
  const gestureCameraActive = useGestureStore((s) => s.cameraActive);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative h-full w-full overflow-hidden"
    >
      {/* Always fills the full stage edge to edge — the orb itself grows/
          shrinks via `orbScale` inside the 3D scene (see Orb.tsx), not by
          CSS-scaling this container, so the surrounding starfield never
          reveals empty page background at the edges regardless of gesture
          state or viewport shape. */}
      <Orb className="absolute inset-0 h-full w-full" orbScale={orbScale} />

      <ReticleCorners />

      <div className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-6 px-6">
        {!connected && (
          <p
            className="text-mono-status text-xs uppercase tracking-widest text-text-dim"
            role="status"
            aria-live="polite"
          >
            {STATE_COPY[orbState]}
          </p>
        )}
      </div>

      {gesturesEnabled && gestureCameraActive && (
        <p
          className="text-mono-status absolute bottom-6 left-6 text-[10px] uppercase tracking-widest text-text-faint"
          role="status"
          aria-live="polite"
        >
          Gestures: on
        </p>
      )}

      <AnimatePresence>
        {connected && (
          <div className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center px-6">
            <div className="pointer-events-auto">
              <VoiceCallCard
                muted={muted}
                onToggleMute={() => {
                  const next = !muted;
                  setMuted(next);
                  toggleVoiceMute(next);
                }}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
