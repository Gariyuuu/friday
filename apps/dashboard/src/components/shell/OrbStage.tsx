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

/** Purely decorative targeting-reticle corners around the orb — no data, just chrome. */
function ReticleCorners() {
  const corners = [
    "left-0 top-0 border-l border-t",
    "right-0 top-0 border-r border-t",
    "left-0 bottom-0 border-l border-b",
    "right-0 bottom-0 border-r border-b",
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
      className="relative flex h-full flex-col items-center justify-center gap-6 px-6"
    >
      <div className="relative p-8">
        <ReticleCorners />
        <div style={{ transform: `scale(${orbScale})` }}>
          <Orb className="size-[min(88vh,1100px,92vw)]" />
        </div>
      </div>

      {!connected && (
        <p className="text-mono-status text-xs uppercase tracking-widest text-text-dim">
          {STATE_COPY[orbState]}
        </p>
      )}

      {gesturesEnabled && gestureCameraActive && (
        <p className="text-mono-status absolute bottom-6 left-6 text-[10px] uppercase tracking-widest text-text-faint">
          Gestures: on
        </p>
      )}

      <AnimatePresence>
        {connected && (
          <VoiceCallCard
            muted={muted}
            onToggleMute={() => {
              const next = !muted;
              setMuted(next);
              toggleVoiceMute(next);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
