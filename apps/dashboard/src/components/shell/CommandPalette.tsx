"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { runGlobalBriefDemo } from "@/lib/demo";
import { useUiStore } from "@/stores/ui-store";

/** ⌘K / Ctrl+K command palette — spec §35. */
export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const setMode = useUiStore((s) => s.setMode);
  const router = useRouter();

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
