import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MemoryStoreState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

/** Just the on/off toggle — actual memory content lives server-side in SQLite (lib/memory/db.ts). */
export const useMemoryStore = create<MemoryStoreState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: "friday-memory-store" },
  ),
);
