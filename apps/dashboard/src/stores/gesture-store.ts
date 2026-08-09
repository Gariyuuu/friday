import { create } from "zustand";
import { persist } from "zustand/middleware";

const MIN_ORB_SCALE = 0.6;
const MAX_ORB_SCALE = 1.8;

interface GestureStoreState {
  /** Whether the user has opted in — persisted so the choice sticks, but the
   *  camera itself is never opened just because this is true; connectGestures()
   *  must be called explicitly (e.g. by toggling this in Settings). */
  enabled: boolean;
  /** True only while the webcam stream is actually live — drives the on-screen
   *  camera-active indicator (spec §9: always show when the webcam is in use). */
  cameraActive: boolean;
  /** Two-hand-distance zoom scales the orb itself when on the orb screen (the
   *  globe isn't mounted there) — see gesture-controller.ts's handleFrame. 1
   *  is the orb's normal size. Not persisted; resets each session/reload. */
  orbScale: number;
  setEnabled: (enabled: boolean) => void;
  setCameraActive: (active: boolean) => void;
  adjustOrbScale: (delta: number) => void;
  resetOrbScale: () => void;
}

export const useGestureStore = create<GestureStoreState>()(
  persist(
    (set) => ({
      enabled: false,
      cameraActive: false,
      orbScale: 1,
      setEnabled: (enabled) => set({ enabled }),
      setCameraActive: (active) => set({ cameraActive: active }),
      adjustOrbScale: (delta) =>
        set((s) => ({ orbScale: Math.min(MAX_ORB_SCALE, Math.max(MIN_ORB_SCALE, s.orbScale + delta)) })),
      resetOrbScale: () => set({ orbScale: 1 }),
    }),
    { name: "friday-gesture-store", partialize: (s) => ({ enabled: s.enabled }) },
  ),
);
