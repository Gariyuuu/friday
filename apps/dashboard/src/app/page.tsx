"use client";

import { AnimatePresence } from "motion/react";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { OrbStage } from "@/components/shell/OrbStage";
import { StatusBar } from "@/components/shell/StatusBar";
import { IntelligenceMode } from "@/components/intelligence/IntelligenceMode";
import { useUiStore } from "@/stores/ui-store";

export default function Home() {
  const mode = useUiStore((s) => s.mode);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <StatusBar />
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === "orb" ? (
            <OrbStageWrapper key="orb" />
          ) : (
            <IntelligenceModeWrapper key="intelligence" />
          )}
        </AnimatePresence>
      </main>
      <CommandPalette />
    </div>
  );
}

function OrbStageWrapper() {
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <OrbStage />
    </div>
  );
}

function IntelligenceModeWrapper() {
  return (
    <div className="absolute inset-0 overflow-y-auto">
      <IntelligenceMode />
    </div>
  );
}
