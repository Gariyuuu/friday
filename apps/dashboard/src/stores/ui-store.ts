import { create } from "zustand";

export type UiMode = "orb" | "intelligence" | "settings";
export type GraphicsQuality = "low" | "balanced" | "cinematic";

export type VmPromptMode = "shell" | "browse";

interface UiStoreState {
  mode: UiMode;
  commandPaletteOpen: boolean;
  focusedEventId: string | null;
  graphicsQuality: GraphicsQuality;
  vmPromptMode: VmPromptMode | null;
  setMode: (mode: UiMode) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  focusEvent: (id: string | null) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  openVmPrompt: (mode: VmPromptMode) => void;
  closeVmPrompt: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  mode: "orb",
  commandPaletteOpen: false,
  focusedEventId: null,
  graphicsQuality: "balanced",
  vmPromptMode: null,
  setMode: (mode) => set({ mode }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  focusEvent: (id) => set({ focusedEventId: id, mode: "intelligence" }),
  setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
  openVmPrompt: (mode) => set({ vmPromptMode: mode }),
  closeVmPrompt: () => set({ vmPromptMode: null }),
}));
