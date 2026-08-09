import { create } from "zustand";
import type { VmToolResult } from "@/lib/tools/client";

export type UiMode = "orb" | "intelligence" | "settings";
export type GraphicsQuality = "low" | "balanced" | "cinematic";

export type VmPromptMode = "shell" | "browse";

interface UiStoreState {
  mode: UiMode;
  commandPaletteOpen: boolean;
  focusedEventId: string | null;
  graphicsQuality: GraphicsQuality;
  vmPromptMode: VmPromptMode | null;
  /** Set once a VM task (started from VmPromptModal) resolves — shown in
   *  VmResultModal. Separate from the prompt itself, which already closed
   *  immediately on submit (see VmPromptModal's own comment on why). */
  vmResult: VmToolResult | null;
  /** A typed-chat alternative to voice (Command Palette → "Chat with FRIDAY
   *  (Text)") — a separate overlay, not a UiMode, so it can stay open
   *  alongside whatever screen is behind it. */
  chatOpen: boolean;
  setMode: (mode: UiMode) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  focusEvent: (id: string | null) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  openVmPrompt: (mode: VmPromptMode) => void;
  closeVmPrompt: () => void;
  setVmResult: (result: VmToolResult | null) => void;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  mode: "orb",
  commandPaletteOpen: false,
  focusedEventId: null,
  graphicsQuality: "balanced",
  vmPromptMode: null,
  vmResult: null,
  chatOpen: false,
  setMode: (mode) => set({ mode }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  focusEvent: (id) => set({ focusedEventId: id, mode: "intelligence" }),
  setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
  openVmPrompt: (mode) => set({ vmPromptMode: mode }),
  closeVmPrompt: () => set({ vmPromptMode: null }),
  setVmResult: (result) => set({ vmResult: result }),
  setChatOpen: (open) => set({ chatOpen: open }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
}));
