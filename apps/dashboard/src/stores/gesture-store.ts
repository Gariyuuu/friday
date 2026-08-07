import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GestureStoreState {
  /** Whether the user has opted in — persisted so the choice sticks, but the
   *  camera itself is never opened just because this is true; connectGestures()
   *  must be called explicitly (e.g. by toggling this in Settings). */
  enabled: boolean;
  /** True only while the webcam stream is actually live — drives the on-screen
   *  camera-active indicator (spec §9: always show when the webcam is in use). */
  cameraActive: boolean;
  setEnabled: (enabled: boolean) => void;
  setCameraActive: (active: boolean) => void;
}

export const useGestureStore = create<GestureStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      cameraActive: false,
      setEnabled: (enabled) => set({ enabled }),
      setCameraActive: (active) => set({ cameraActive: active }),
    }),
    { name: "friday-gesture-store", partialize: (s) => ({ enabled: s.enabled }) },
  ),
);
