"use client";

import { useFrame } from "@react-three/fiber";
import type { OrbState } from "@friday/types";
import { useRef } from "react";
import * as THREE from "three";
import { ORB_VISUALS } from "./orb-visuals";

interface OrbRingsProps {
  orbState: OrbState;
}

const RING_CONFIGS = [
  { radius: 1.55, tilt: [Math.PI / 2.3, 0, 0.3] as const, speed: 1 },
  { radius: 1.85, tilt: [Math.PI / 3.2, 0.6, 0] as const, speed: -0.7 },
  { radius: 2.15, tilt: [Math.PI / 1.8, -0.4, 0.5] as const, speed: 0.45 },
];

export function OrbRings({ orbState }: OrbRingsProps) {
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const spreadRef = useRef(1);

  useFrame((state, delta) => {
    const visual = ORB_VISUALS[orbState];
    spreadRef.current = THREE.MathUtils.damp(spreadRef.current, visual.ringSpread, 3, delta);

    RING_CONFIGS.forEach((config, i) => {
      const g = groupRefs.current[i];
      if (!g) return;
      g.rotation.z += delta * visual.rotationSpeed * config.speed;
      const scale = spreadRef.current;
      g.scale.setScalar(scale);
    });
  });

  return (
    <>
      {RING_CONFIGS.map((config, i) => (
        <group
          key={config.radius}
          ref={(el) => {
            groupRefs.current[i] = el;
          }}
          rotation={config.tilt as unknown as [number, number, number]}
        >
          <mesh>
            <torusGeometry args={[config.radius, 0.004, 8, 128]} />
            <meshBasicMaterial
              color={ORB_VISUALS[orbState].color}
              transparent
              opacity={0.4}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
