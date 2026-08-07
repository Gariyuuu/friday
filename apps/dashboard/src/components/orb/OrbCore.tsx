"use client";

import { useFrame } from "@react-three/fiber";
import type { OrbState } from "@friday/types";
import { useRef } from "react";
import * as THREE from "three";
import { ORB_VISUALS } from "./orb-visuals";

interface OrbCoreProps {
  orbState: OrbState;
  audioAmplitude: number;
}

export function OrbCore({ orbState, audioAmplitude }: OrbCoreProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const shellOuterRef = useRef<THREE.Mesh>(null);
  const shellInnerRef = useRef<THREE.Mesh>(null);
  const colorRef = useRef(new THREE.Color(ORB_VISUALS.idle.color));
  const scaleRef = useRef(1);

  useFrame((state, delta) => {
    const visual = ORB_VISUALS[orbState];
    const t = state.clock.elapsedTime;

    const breathing = orbState === "idle" ? Math.sin(t * 0.8) * 0.03 : 0;
    const speakingPulse = orbState === "speaking" ? audioAmplitude * 0.25 : 0;
    const targetScale = visual.coreScale + breathing + speakingPulse;
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, targetScale, 4, delta);

    colorRef.current.lerp(new THREE.Color(visual.color), Math.min(1, delta * 3));

    if (coreRef.current) {
      coreRef.current.scale.setScalar(scaleRef.current);
      const material = coreRef.current.material as THREE.MeshStandardMaterial;
      material.color.copy(colorRef.current);
      material.emissive.copy(colorRef.current);
      material.emissiveIntensity = orbState === "speaking" ? 1.4 + audioAmplitude : 1.4;
    }

    if (shellOuterRef.current) {
      shellOuterRef.current.rotation.y += delta * visual.rotationSpeed;
      shellOuterRef.current.rotation.x += delta * visual.rotationSpeed * 0.4;
      const mat = shellOuterRef.current.material as THREE.MeshBasicMaterial;
      mat.color.copy(colorRef.current);
    }

    if (shellInnerRef.current) {
      shellInnerRef.current.rotation.y -= delta * visual.rotationSpeed * 0.7;
      shellInnerRef.current.rotation.z += delta * visual.rotationSpeed * 0.5;
      const mat = shellInnerRef.current.material as THREE.MeshBasicMaterial;
      mat.color.copy(colorRef.current);
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial
          color={ORB_VISUALS.idle.color}
          emissive={ORB_VISUALS.idle.color}
          emissiveIntensity={1.4}
          roughness={0.25}
          metalness={0.6}
        />
      </mesh>
      <mesh ref={shellInnerRef}>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshBasicMaterial
          color={ORB_VISUALS.idle.color}
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>
      <mesh ref={shellOuterRef}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshBasicMaterial
          color={ORB_VISUALS.idle.color}
          wireframe
          transparent
          opacity={0.18}
        />
      </mesh>
    </group>
  );
}
