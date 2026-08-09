"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { browseOnVm, runOnVm, type VmBrowseStep } from "@/lib/tools/client";
import { useToastStore } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";

const MAX_STEPS = 10; // mirrors the server-side cap in app/api/tools/run-on-vm/route.ts
const STEP_ACTIONS: VmBrowseStep["action"][] = ["click", "type", "wait", "screenshot"];

function emptyStep(): VmBrowseStep {
  return { action: "click", selector: "" };
}

/**
 * Quick-Actions entry point for run_on_vm/browse_on_vm — previously voice-only.
 * Collects the command/URL text, and for browse mode, an optional sequence of
 * click/type/wait/screenshot steps (mirrors what voice can already send as a
 * JSON string — this gives the same capability a real form instead of
 * requiring hand-written JSON). Closes itself immediately on submit rather
 * than waiting for the task to finish — otherwise this modal's own backdrop
 * stays mounted on top of ToolApprovalModal (same z-index, later in the DOM)
 * and blocks its buttons, a real bug caught by driving this through an actual
 * browser, not just checking the API in isolation. The result (including any
 * screenshots) shows up afterward in VmResultModal once the task resolves.
 */
export function VmPromptModal() {
  const mode = useUiStore((s) => s.vmPromptMode);
  const close = useUiStore((s) => s.closeVmPrompt);
  const setVmResult = useUiStore((s) => s.setVmResult);
  const showToast = useToastStore((s) => s.show);
  const [value, setValue] = useState("");
  const [steps, setSteps] = useState<VmBrowseStep[]>([]);

  function reset() {
    setValue("");
    setSteps([]);
  }

  function handleClose() {
    reset();
    close();
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || !mode) return;

    const cleanSteps = steps
      .filter((s) => s.action === "screenshot" || s.action === "wait" || s.selector?.trim())
      .map((s) => ({
        ...s,
        selector: s.selector?.trim() || undefined,
        text: s.text || undefined,
      }));

    const action =
      mode === "shell"
        ? runOnVm(trimmed)
        : browseOnVm(trimmed, cleanSteps.length > 0 ? { steps: cleanSteps } : undefined);

    action
      .then((result) => {
        setVmResult(result);
        if (result.ok) {
          const summary = mode === "shell" ? result.stdout || "(no output)" : result.title || result.url;
          showToast(`VM ${mode} — ${summary}`.slice(0, 120), "success");
        } else {
          showToast(`VM ${mode} — ${result.error ?? "failed"}`, "error");
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        setVmResult({ ok: false, error: message });
        showToast(`VM ${mode} — ${message}`, "error");
      });

    reset();
    close();
  }

  function updateStep(index: number, patch: Partial<VmBrowseStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
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
            className="glass-panel w-full max-w-md rounded-lg p-5"
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
                if (e.key === "Enter" && (mode === "shell" || steps.length === 0)) handleSubmit();
                if (e.key === "Escape") handleClose();
              }}
              placeholder={mode === "shell" ? "echo hello" : "https://example.com"}
              className="mt-3 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint"
            />

            {mode === "browse" && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-text-faint">
                    Steps after page load (optional)
                  </span>
                  <button
                    onClick={() => setSteps((prev) => [...prev, emptyStep()])}
                    disabled={steps.length >= MAX_STEPS}
                    className="text-xs text-accent hover:underline disabled:pointer-events-none disabled:opacity-40"
                  >
                    + Add step
                  </button>
                </div>
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md border border-border p-1.5">
                    <select
                      value={step.action}
                      onChange={(e) => updateStep(i, { action: e.target.value as VmBrowseStep["action"] })}
                      className="rounded border border-border bg-surface-raised px-1.5 py-1 text-xs text-text"
                    >
                      {STEP_ACTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    {step.action !== "screenshot" && (
                      <input
                        value={step.selector ?? ""}
                        onChange={(e) => updateStep(i, { selector: e.target.value })}
                        placeholder={step.action === "wait" ? "selector (optional)" : "CSS selector"}
                        className="min-w-0 flex-1 rounded border border-border bg-surface-raised px-1.5 py-1 text-xs text-text placeholder:text-text-faint"
                      />
                    )}
                    {step.action === "type" && (
                      <input
                        value={step.text ?? ""}
                        onChange={(e) => updateStep(i, { text: e.target.value })}
                        placeholder="text to type"
                        className="min-w-0 flex-1 rounded border border-border bg-surface-raised px-1.5 py-1 text-xs text-text placeholder:text-text-faint"
                      />
                    )}
                    <button
                      onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-text-faint hover:text-danger"
                      aria-label={`Remove step ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

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
