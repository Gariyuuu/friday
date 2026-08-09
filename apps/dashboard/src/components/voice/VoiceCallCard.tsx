"use client";

import { motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { disconnectVoice } from "@/lib/voice/voice-controller";
import { useOrbStore } from "@/stores/orb-store";

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting…",
  ready: "Connected",
  listening: "Listening…",
  thinking: "Thinking…",
  searching: "Searching…",
  executing: "Executing…",
  speaking: "Speaking…",
  error: "Something went wrong.",
};

function subscribeClock(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

/** Live call-duration timer, MM:SS — same useSyncExternalStore clock pattern as StatusBar. */
function useCallDuration(connectedAt: number | null): string | null {
  const seconds = useSyncExternalStore(
    subscribeClock,
    () => (connectedAt ? Math.floor((Date.now() - connectedAt) / 1000) : null),
    () => null,
  );
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" strokeLinecap="round" />
      {muted && <line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" />}
    </svg>
  );
}

function EndCallIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5c-2.9 0-5.6-.7-8-1.9a2 2 0 0 1-1.1-1.9l.2-2.5a1.5 1.5 0 0 1 1.2-1.4c1.4-.3 2.9-.5 4.4-.6a1.2 1.2 0 0 1 1.2.9l.5 1.7a1.2 1.2 0 0 1-.4 1.3l-1 .8c1 1.4 2.4 2.5 4 3.1l1-1a1.2 1.2 0 0 1 1.3-.3l1.7.6a1.2 1.2 0 0 1 .8 1.2c0 1.5-.2 3-.5 4.4a1.5 1.5 0 0 1-1.4 1.2l-2.5.1a2 2 0 0 1-1.9-1.1c-1.2-2.4-1.9-5.1-1.9-8Z" />
    </svg>
  );
}

/**
 * The "popup window" while voice is connected — a native-call-style card
 * (contact name, live duration timer, circular icon controls) rather than
 * plain text + small text buttons. Only ever shows real, current session
 * state — no fabricated call metadata.
 */
export function VoiceCallCard({ muted, onToggleMute }: { muted: boolean; onToggleMute: () => void }) {
  const voiceStatus = useOrbStore((s) => s.voiceStatus);
  const voiceConnectedAt = useOrbStore((s) => s.voiceConnectedAt);
  const transcript = useOrbStore((s) => s.transcript);
  const userTranscript = useOrbStore((s) => s.userTranscript);
  const duration = useCallDuration(voiceConnectedAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.25 }}
      className="glass-panel flex w-full max-w-xs flex-col items-center gap-5 rounded-2xl border-border px-6 py-6"
    >
      <div className="flex flex-col items-center gap-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
        <h2 className="mt-2 text-lg font-semibold tracking-wide text-text">F.R.I.D.A.Y.</h2>
        <p className="text-mono-status text-xs uppercase tracking-widest text-text-dim">
          {duration ?? "0:00"} · {STATUS_LABEL[voiceStatus] ?? voiceStatus}
        </p>
      </div>

      {(userTranscript || transcript) && (
        <div className="w-full rounded-lg border border-border bg-surface/60 p-3 text-center">
          {userTranscript && (
            <p className="text-xs text-text-faint">
              <span className="text-text-dim">You: </span>
              {userTranscript}
            </p>
          )}
          {transcript && <p className="mt-1 text-sm text-text">{transcript}</p>}
        </div>
      )}

      <div className="flex items-center gap-6">
        <button
          onClick={onToggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          className={`flex size-12 items-center justify-center rounded-full border transition-colors ${
            muted
              ? "border-warning bg-warning/20 text-warning"
              : "border-border text-text-dim hover:text-text"
          }`}
        >
          <MicIcon muted={muted} />
        </button>
        <button
          onClick={() => disconnectVoice()}
          aria-label="End call"
          className="flex size-14 items-center justify-center rounded-full bg-danger text-white transition-transform hover:scale-105"
        >
          <EndCallIcon />
        </button>
      </div>
    </motion.div>
  );
}
