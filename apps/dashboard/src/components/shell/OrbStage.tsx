"use client";

import { motion } from "motion/react";
import { Orb } from "@/components/orb/Orb";
import { useOrbStore } from "@/stores/orb-store";

const STATE_COPY: Record<string, string> = {
  idle: "Press ⌘K, or say “Friday” once voice is connected.",
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col items-center justify-center gap-6"
    >
      <Orb className="h-[min(60vh,480px)] w-[min(60vh,480px)]" />
      <p className="text-mono-status text-xs uppercase tracking-widest text-text-dim">
        {STATE_COPY[orbState]}
      </p>
    </motion.div>
  );
}
