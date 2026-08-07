"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { runGlobalBriefDemo } from "@/lib/demo";
import { getSystemStatus, openApplication, openUrl, showNotification } from "@/lib/tools/client";
import { connectVoice, disconnectVoice, isVoiceConnected } from "@/lib/voice/voice-controller";
import { useOrbStore } from "@/stores/orb-store";
import { useToastStore } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";

function useToolAction() {
  const showToast = useToastStore((s) => s.show);
  return function runAction(label: string, action: () => Promise<unknown>) {
    action()
      .then(() => showToast(`${label} — done`, "success"))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showToast(`${label} — ${message}`, "error");
      });
  };
}

/** ⌘K / Ctrl+K command palette — spec §35. */
export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setMode = useUiStore((s) => s.setMode);
  const openVmPrompt = useUiStore((s) => s.openVmPrompt);
  const router = useRouter();
  const runAction = useToolAction();
  const showToast = useToastStore((s) => s.show);
  const voiceConnected = useOrbStore((s) => s.voiceStatus !== "offline" && s.voiceStatus !== "error");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  function run(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="FRIDAY Command Palette"
      className="glass-panel fixed left-1/2 top-28 z-50 w-full max-w-lg -translate-x-1/2 rounded-lg p-2 shadow-2xl"
    >
      <Command.Input
        placeholder="Ask FRIDAY or jump to…"
        className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint"
      />
      <Command.List className="mt-2 max-h-80 overflow-y-auto">
        <Command.Empty className="px-3 py-4 text-sm text-text-faint">
          No matching command.
        </Command.Empty>

        <Command.Group
          heading="Navigate"
          className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-widest text-text-faint"
        >
          <Command.Item
            onSelect={() => run(() => setMode("orb"))}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            FRIDAY Orb
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => setMode("intelligence"))}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Global Intelligence
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => router.push("/settings"))}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Settings
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading="Voice"
          className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-widest text-text-faint"
        >
          <Command.Item
            onSelect={() =>
              run(() => {
                if (isVoiceConnected()) {
                  disconnectVoice();
                } else {
                  connectVoice().catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : String(error);
                    showToast(`Voice — ${message}`, "error");
                  });
                }
              })
            }
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            {voiceConnected ? "End Voice Session" : "Talk to FRIDAY (⌥ + V)"}
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading="Quick Actions"
          className="px-2 pb-1 pt-3 text-[10px] uppercase tracking-widest text-text-faint"
        >
          <Command.Item
            onSelect={() =>
              run(() => runAction("Open Visual Studio Code", () => openApplication("Visual Studio Code")))
            }
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Open Visual Studio Code
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => runAction("Open Safari", () => openApplication("Safari")))}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Open Safari
          </Command.Item>
          <Command.Item
            onSelect={() =>
              run(() =>
                runAction("Open github.com/Gariyuuu/friday", () =>
                  openUrl("https://github.com/Gariyuuu/friday"),
                ),
              )
            }
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Open FRIDAY on GitHub
          </Command.Item>
          <Command.Item
            onSelect={() =>
              run(() =>
                runAction("Notification sent", () =>
                  showNotification("F.R.I.D.A.Y.", "This is a test notification."),
                ),
              )
            }
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Send Test Notification
          </Command.Item>
          <Command.Item
            onSelect={() =>
              run(() => {
                getSystemStatus()
                  .then((status) => {
                    const battery =
                      status.battery.percent !== null
                        ? `${status.battery.percent}% battery${status.battery.charging ? " (charging)" : ""}`
                        : "battery unknown";
                    showToast(
                      `CPU load ${status.cpuLoadAvg1m.toFixed(2)} · Memory ${status.memoryUsedPercent}% · ${battery}`,
                      "success",
                    );
                  })
                  .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : String(error);
                    showToast(`System status — ${message}`, "error");
                  });
              })
            }
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            System Status
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => openVmPrompt("shell"))}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Run Command on Cloud VM… (critical, needs approval)
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => openVmPrompt("browse"))}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Browse URL on Cloud VM… (critical, needs approval)
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading="Demo"
          className="px-2 pb-1 pt-3 text-[10px] uppercase tracking-widest text-text-faint"
        >
          <Command.Item
            onSelect={() => run(() => void runGlobalBriefDemo())}
            className="cursor-pointer rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised"
          >
            Run Global Intelligence Brief (Demo)
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
