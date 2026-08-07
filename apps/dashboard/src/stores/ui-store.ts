import { create } from "zustand";

export type UiMode = "orb" | "intelligence" | "settings";
export type GraphicsQuality = "low" | "balanced" | "cinematic";

interface UiStoreState {
  mode: UiMode;
  commandPaletteOpen: boolean;
  focusedEventId: string | null;
  graphicsQuality: GraphicsQuality;
  setMode: (mode: UiMode) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  focusEvent: (id: string | null) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  mode: "orb",
  commandPaletteOpen: false,
  focusedEventId: null,
  graphicsQuality: "balanced",
  setMode: (mode) => set({ mode }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  focusEvent: (id) => set({ focusedEventId: id, mode: "intelligence" }),
  setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
}));
