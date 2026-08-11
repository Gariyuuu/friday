"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

interface OrbStarfieldProps {
  count: number;
}

/** Deterministic pseudo-random in [0, 1) — same generator OrbParticles uses, kept local to avoid a cross-import. */
function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A distant, mostly-static field of background stars, separate from the
 * near-orb OrbParticles halo — user asked for the orb screen to feel like
 * being inside an infinite universe rather than a bounded box, and now that
 * the canvas fills the full viewport (not a centered square), a starfield
 * needs to reach every edge, including on a wide monitor. Distributed evenly
 * across a wide radius band (uniform per unit *volume*, not per unit
 * radius — a naive uniform-in-radius or even sqrt-biased spread left the
 * outer reaches looking sparse, confirmed via a real wide-viewport
 * screenshot, since a fixed point budget spread further out has its surface
 * density fall off with the square of radius; cube-root compensates for
 * that). Deliberately outside the orb's `<group scale={orbScale}>` (see
 * Orb.tsx) so gesture-driven orb resizing never shrinks the universe around it.
 */
export function OrbStarfield({ count }: OrbStarfieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 3 + Math.pow(seededRandom(i * 4.1 + 11), 1 / 3) * 6;
      const theta = seededRandom(i * 8.3 + 12) * Math.PI * 2;
      const phi = Math.acos(seededRandom(i * 6.7 + 13) * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, [count]);

  useFrame(() => {
    if (pointsRef.current) pointsRef.current.rotation.y += 0.00008;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.016} color="#c9a6ff" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}
