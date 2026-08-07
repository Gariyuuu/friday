"use client";

import { useFrame } from "@react-three/fiber";
import type { OrbState } from "@friday/types";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ORB_VISUALS } from "./orb-visuals";

interface OrbParticlesProps {
  orbState: OrbState;
  count: number;
}

/** Deterministic pseudo-random in [0, 1) — keeps particle layout pure/stable across renders. */
function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function OrbParticles({ orbState, count }: OrbParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, basePositions } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 1.5 + seededRandom(i * 3.1 + 1) * 1.1;
      const theta = seededRandom(i * 7.3 + 2) * Math.PI * 2;
      const phi = Math.acos(seededRandom(i * 5.7 + 3) * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return { positions, basePositions: positions.slice() };
  }, [count]);

  useFrame((state) => {
    const visual = ORB_VISUALS[orbState];
    const t = state.clock.elapsedTime;
    const geometry = pointsRef.current?.geometry;
    if (!geometry) return;
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const jitter = visual.particleJitter;
      const offset = i * 0.37;
      attr.array[i * 3] =
        basePositions[i * 3]! + Math.sin(t * 0.6 + offset) * jitter;
      attr.array[i * 3 + 1] =
        basePositions[i * 3 + 1]! + Math.cos(t * 0.5 + offset) * jitter;
      attr.array[i * 3 + 2] =
        basePositions[i * 3 + 2]! + Math.sin(t * 0.4 + offset) * jitter;
    }
    attr.needsUpdate = true;

    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0015 + visual.rotationSpeed * 0.001;
      const material = pointsRef.current.material as THREE.PointsMaterial;
      material.color.set(visual.color);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={ORB_VISUALS[orbState].color}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}
