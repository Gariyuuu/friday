"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useSyncExternalStore } from "react";
import { useOrbStore } from "@/stores/orb-store";
import { useUiStore, type GraphicsQuality } from "@/stores/ui-store";
import { OrbCore } from "./OrbCore";
import { OrbParticles } from "./OrbParticles";
import { OrbRings } from "./OrbRings";
import { OrbStarfield } from "./OrbStarfield";

const PARTICLE_COUNT: Record<GraphicsQuality, number> = {
  low: 180,
  balanced: 480,
  cinematic: 850,
};

// A separate, distant, mostly-static star layer — see OrbStarfield.tsx.
// Reaches out to where a wide monitor's edges actually are (the near
// OrbParticles halo alone left them looking sparse, confirmed via a real
// wide-viewport screenshot — spreading the SAME particles further out
// diluted density near the orb without fixing the true problem, which is
// that surface density falls off with the square of radius).
const STARFIELD_COUNT: Record<GraphicsQuality, number> = {
  low: 220,
  balanced: 550,
  cinematic: 950,
};

const DPR_RANGE: Record<GraphicsQuality, [number, number]> = {
  low: [1, 1],
  balanced: [1, 1.5],
  cinematic: [1, 2],
};

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

interface OrbProps {
  className?: string;
  /** Gesture-driven size (0.6-1.8, default 1) — applied to the 3D group
   *  itself, not a CSS transform on the canvas, so the starfield around it
   *  always still fills the full container edge to edge regardless of scale. */
  orbScale?: number;
}

/** The central holographic AI visualization — see spec §8. Reflects orb-store live. */
export function Orb({ className, orbScale = 1 }: OrbProps) {
  const orbState = useOrbStore((s) => s.orbState);
  const audioAmplitude = useOrbStore((s) => s.audioAmplitude);
  const graphicsQuality = useUiStore((s) => s.graphicsQuality);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 42 }}
        dpr={DPR_RANGE[graphicsQuality]}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 3, 3]} intensity={0.6} />
        <group scale={orbScale}>
          <OrbCore orbState={orbState} audioAmplitude={audioAmplitude} />
          <OrbRings orbState={orbState} />
        </group>
        <OrbParticles orbState={orbState} count={PARTICLE_COUNT[graphicsQuality]} />
        <OrbStarfield count={STARFIELD_COUNT[graphicsQuality]} />
        {graphicsQuality !== "low" && (
          <EffectComposer multisampling={0} enableNormalPass={false}>
            <Bloom
              intensity={graphicsQuality === "cinematic" ? 0.6 : 0.45}
              luminanceThreshold={0.6}
              luminanceSmoothing={0.15}
              radius={0.5}
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
