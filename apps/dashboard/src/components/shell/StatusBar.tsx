"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useOrbStore } from "@/stores/orb-store";
import { useUiStore } from "@/stores/ui-store";

function subscribeClock(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

function getClockSnapshot() {
  return Math.floor(Date.now() / 1000);
}

function getClockServerSnapshot() {
  return 0;
}

function useNow(): Date | null {
  const seconds = useSyncExternalStore(subscribeClock, getClockSnapshot, getClockServerSnapshot);
  return seconds ? new Date(seconds * 1000) : null;
}

const VOICE_LABEL: Record<string, string> = {
  offline: "OFFLINE",
  connecting: "CONNECTING",
  ready: "READY",
  listening: "LISTENING",
  thinking: "THINKING",
  speaking: "SPEAKING",
  executing: "EXECUTING",
  error: "ERROR",
};

export function StatusBar() {
  const voiceStatus = useOrbStore((s) => s.voiceStatus);
  const mode = useUiStore((s) => s.mode);
  const now = useNow();

  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-3">
      <div className="flex items-baseline gap-3">
        <h1 className="text-sm font-semibold tracking-[0.2em] text-text">F.R.I.D.A.Y.</h1>
        <span className="hidden text-[11px] uppercase tracking-widest text-text-faint sm:inline">
          Personal Intelligence System
        </span>
      </div>

      <div className="flex items-center gap-4">
        {mode === "intelligence" && (
          <span className="text-mono-status hidden text-[10px] uppercase tracking-widest text-accent md:inline">
            Global Intelligence // Live
          </span>
        )}
        <span className="text-mono-status flex items-center gap-1.5 text-[10px] uppercase text-text-dim">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              voiceStatus === "offline" ? "bg-text-faint" : "bg-accent"
            }`}
          />
          {VOICE_LABEL[voiceStatus]}
        </span>
        <span className="text-mono-status hidden text-[10px] text-text-faint sm:inline">
          {now
            ? now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : "--:--"}
        </span>
        <Link
          href="/settings"
          className="text-[10px] uppercase tracking-widest text-text-dim transition-colors hover:text-text"
        >
          Settings
        </Link>
      </div>
    </header>
  );
}
