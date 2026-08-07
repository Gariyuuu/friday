"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useSyncExternalStore } from "react";
import { useOrbStore } from "@/stores/orb-store";
import { useUiStore, type GraphicsQuality } from "@/stores/ui-store";
import { OrbCore } from "./OrbCore";
import { OrbParticles } from "./OrbParticles";
import { OrbRings } from "./OrbRings";

const PARTICLE_COUNT: Record<GraphicsQuality, number> = {
  low: 180,
  balanced: 480,
  cinematic: 850,
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
}

/** The central holographic AI visualization — see spec §8. Reflects orb-store live. */
export function Orb({ className }: OrbProps) {
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
        <OrbCore orbState={orbState} audioAmplitude={audioAmplitude} />
        <OrbRings orbState={orbState} />
        <OrbParticles orbState={orbState} count={PARTICLE_COUNT[graphicsQuality]} />
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
