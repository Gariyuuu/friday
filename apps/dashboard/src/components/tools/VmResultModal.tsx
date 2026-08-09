"use client";

import { AnimatePresence, motion } from "motion/react";
import { useUiStore } from "@/stores/ui-store";

/**
 * Shows what a VM task actually returned, once it resolves — separate from
 * the approval flow (which already happened) and from VmPromptModal (which
 * already closed on submit, see its own comment on why). Mainly exists so
 * browse_on_vm's screenshots — real returned data with nowhere to appear
 * before this — are actually viewable instead of sitting unused in the
 * result object.
 */
export function VmResultModal() {
  const result = useUiStore((s) => s.vmResult);
  const close = () => useUiStore.getState().setVmResult(null);

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="glass-panel max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <p
                className={`text-mono-status text-[10px] uppercase tracking-widest ${
                  result.ok ? "text-success" : "text-danger"
                }`}
              >
                {result.ok ? "VM task completed" : "VM task failed"}
              </p>
              <button
                onClick={close}
                className="text-text-faint transition-colors hover:text-text"
                aria-label="Close result"
              >
                ✕
              </button>
            </div>

            {(result.title || result.url) && (
              <div className="mt-3">
                {result.title && <p className="text-sm text-text">{result.title}</p>}
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    {result.url}
                  </a>
                )}
              </div>
            )}

            {result.error && (
              <p className="mt-3 whitespace-pre-wrap text-xs text-danger">{result.error}</p>
            )}

            {result.stdout && (
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-surface-raised p-2 text-xs text-text-dim">
                {result.stdout}
              </pre>
            )}
            {result.stderr && (
              <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-danger/30 bg-surface-raised p-2 text-xs text-danger">
                {result.stderr}
              </pre>
            )}
            {result.textContent && (
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-surface-raised p-2 text-xs text-text-dim">
                {result.textContent}
              </pre>
            )}

            {result.steps && result.steps.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-text-faint">Steps</p>
                <ul className="flex flex-col gap-1">
                  {result.steps.map((step, i) => (
                    <li key={i} className="text-xs">
                      <span className={step.ok ? "text-success" : "text-danger"}>{step.ok ? "✓" : "✗"}</span>{" "}
                      <span className="text-text-dim">
                        {step.action}
                        {step.selector ? ` (${step.selector})` : ""}
                      </span>
                      {step.error && <span className="text-danger"> — {step.error}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.screenshots && result.screenshots.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-text-faint">
                  Screenshots ({result.screenshots.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {result.screenshots.map((b64, i) => (
                    <a
                      key={i}
                      href={`data:image/png;base64,${b64}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="overflow-hidden rounded-md border border-border transition-colors hover:border-accent/40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${b64}`}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
