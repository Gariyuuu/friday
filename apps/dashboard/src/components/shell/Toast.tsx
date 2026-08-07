"use client";

import { AnimatePresence, motion } from "motion/react";
import { useToastStore } from "@/stores/toast-store";

export function Toast() {
  const toast = useToastStore((s) => s.toast);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[70]">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`glass-panel rounded-md px-4 py-2.5 text-sm ${
              toast.tone === "error" ? "text-danger" : "text-text"
            }`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
