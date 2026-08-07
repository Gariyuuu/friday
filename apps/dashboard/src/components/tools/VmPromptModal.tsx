"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { browseOnVm, runOnVm } from "@/lib/tools/client";
import { useToastStore } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";

/**
 * Quick-Actions entry point for run_on_vm/browse_on_vm — previously voice-only.
 * Just collects the command/URL text; the actual critical-risk approval prompt
 * (ToolApprovalModal) still fires from runTool() same as every other path in.
 * Closes itself immediately on submit rather than waiting for the task to
 * finish — otherwise this modal's own backdrop stays mounted on top of
 * ToolApprovalModal (same z-index, later in the DOM) and blocks its buttons,
 * a real bug caught by driving this through an actual browser, not just
 * checking the API in isolation.
 */
export function VmPromptModal() {
  const mode = useUiStore((s) => s.vmPromptMode);
  const close = useUiStore((s) => s.closeVmPrompt);
  const showToast = useToastStore((s) => s.show);
  const [value, setValue] = useState("");

  function handleClose() {
    setValue("");
    close();
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || !mode) return;

    const action = mode === "shell" ? runOnVm(trimmed) : browseOnVm(trimmed);
    action
      .then((result) => {
        if (result.ok) {
          const summary = mode === "shell" ? result.stdout || "(no output)" : result.title || result.url;
          showToast(`VM ${mode} — ${summary}`.slice(0, 120), "success");
        } else {
          showToast(`VM ${mode} — ${result.error ?? "failed"}`, "error");
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showToast(`VM ${mode} — ${message}`, "error");
      });

    setValue("");
    close();
  }

  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="glass-panel w-full max-w-sm rounded-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-mono-status text-[10px] uppercase tracking-widest text-accent">
              {mode === "shell" ? "Run on Cloud VM (sandboxed)" : "Browse on Cloud VM (headless)"}
            </p>
            <p className="mt-1 text-xs text-text-faint">
              {mode === "shell"
                ? "Runs in an isolated, network-off-by-default Docker container. You'll be asked to approve it."
                : "Renders the page with a real headless browser. You'll be asked to approve it."}
            </p>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") handleClose();
              }}
              placeholder={mode === "shell" ? "echo hello" : "https://example.com"}
              className="mt-3 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="rounded-md px-3 py-2 text-sm text-text-dim transition-colors hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!value.trim()}
                className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-text transition-colors hover:bg-accent/20 disabled:opacity-50"
              >
                Run
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
