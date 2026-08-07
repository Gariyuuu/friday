"use client";

import { AnimatePresence, motion } from "motion/react";
import { resolveApproval } from "@/lib/tools/approval";
import { useToolStore } from "@/stores/tool-store";

/** The approval prompt from spec §23 — shown whenever a tool's permission mode is "ask". */
export function ToolApprovalModal() {
  const pending = useToolStore((s) => s.pendingApproval);

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="glass-panel w-full max-w-sm rounded-lg p-5"
          >
            <p className="text-mono-status text-[10px] uppercase tracking-widest text-accent">
              FRIDAY Request
            </p>
            <p className="mt-2 text-sm text-text">{pending.description}</p>
            <p className="mt-1 text-xs text-text-faint">Requested by: FRIDAY</p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => resolveApproval(pending.id, "allow_once")}
                className="rounded-md border border-border px-3 py-2 text-sm text-text transition-colors hover:bg-surface-raised"
              >
                Allow Once
              </button>
              <button
                onClick={() => resolveApproval(pending.id, "always_allow")}
                className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-text transition-colors hover:bg-accent/20"
              >
                Always Allow This Tool
              </button>
              <button
                onClick={() => resolveApproval(pending.id, "deny")}
                className="rounded-md px-3 py-2 text-sm text-text-dim transition-colors hover:text-danger"
              >
                Deny
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
