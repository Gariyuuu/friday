"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Orb } from "@/components/orb/Orb";
import { useVoiceConnected } from "@/components/voice/VoiceActivation";
import { disconnectVoice, toggleVoiceMute } from "@/lib/voice/voice-controller";
import { useOrbStore } from "@/stores/orb-store";

const STATE_COPY: Record<string, string> = {
  idle: "Press ⌥ + Space to talk, or ⌘K for commands.",
  listening: "Listening…",
  thinking: "Thinking…",
  searching: "Searching…",
  executing: "Executing…",
  speaking: "Speaking…",
  error: "Something went wrong.",
  success: "Done.",
};

export function OrbStage() {
  const orbState = useOrbStore((s) => s.orbState);
  const voiceStatus = useOrbStore((s) => s.voiceStatus);
  const transcript = useOrbStore((s) => s.transcript);
  const userTranscript = useOrbStore((s) => s.userTranscript);
  const connected = useVoiceConnected();
  const [muted, setMuted] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col items-center justify-center gap-6 px-6"
    >
      <Orb className="h-[min(60vh,480px)] w-[min(60vh,480px)]" />
      <p className="text-mono-status text-xs uppercase tracking-widest text-text-dim">
        {connected ? `VOICE // ${voiceStatus.toUpperCase()}` : STATE_COPY[orbState]}
      </p>

      {connected && (
        <div className="flex w-full max-w-md flex-col items-center gap-3">
          {(userTranscript || transcript) && (
            <div className="glass-panel w-full rounded-lg p-4 text-center">
              {userTranscript && (
                <p className="text-xs text-text-faint">
                  <span className="text-text-dim">You: </span>
                  {userTranscript}
                </p>
              )}
              {transcript && <p className="mt-1 text-sm text-text">{transcript}</p>}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = !muted;
                setMuted(next);
                toggleVoiceMute(next);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-dim transition-colors hover:text-text"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={() => disconnectVoice()}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-text-dim transition-colors hover:text-danger"
            >
              End Voice
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
