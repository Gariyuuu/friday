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

// Nearly the camera's own viewing axis (camera sits at [0,0,4.2] looking at
// the origin — see Orb.tsx), with a slight upper-right bias for character.
// This is deliberately view-facing, not an oblique world-space direction: a
// direction close to an oblique corner made almost the ENTIRE visible
// hemisphere read as "hot" (only the unseen back face showed the cool
// edge color) — found by actually screenshotting it, not assumed. Facing
// the camera instead means the *center* of the visible disc reads hot and
// the silhouette/rim reads cool, which is the actual sun/corona look and
// is visible from the fixed camera angle this scene always renders from.
const HOT_DIRECTION = new THREE.Vector3(0.15, 0.2, 0.95).normalize();

function computeVertexGradientT(geometry: THREE.BufferGeometry): Float32Array {
  const normalAttr = geometry.getAttribute("normal") as THREE.BufferAttribute;
  const t = new Float32Array(normalAttr.count);
  const n = new THREE.Vector3();
  for (let i = 0; i < normalAttr.count; i++) {
    n.fromBufferAttribute(normalAttr, i);
    t[i] = Math.pow(THREE.MathUtils.clamp(n.dot(HOT_DIRECTION), 0, 1), 1.4);
  }
  return t;
}

export function OrbCore({ orbState, audioAmplitude }: OrbCoreProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const shellOuterRef = useRef<THREE.Mesh>(null);
  const shellInnerRef = useRef<THREE.Mesh>(null);
  const coreColorRef = useRef(new THREE.Color(ORB_VISUALS.idle.coreColor));
  const edgeColorRef = useRef(new THREE.Color(ORB_VISUALS.idle.edgeColor));
  const scaleRef = useRef(1);
  const vertexTRef = useRef<Float32Array | null>(null);
  const mixColor = useRef(new THREE.Color());

  useFrame((state, delta) => {
    const visual = ORB_VISUALS[orbState];
    const t = state.clock.elapsedTime;

    const breathing = orbState === "idle" ? Math.sin(t * 0.8) * 0.03 : 0;
    const speakingPulse = orbState === "speaking" ? audioAmplitude * 0.25 : 0;
    const targetScale = visual.coreScale + breathing + speakingPulse;
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, targetScale, 4, delta);

    const lerpAmount = Math.min(1, delta * 3);
    coreColorRef.current.lerp(new THREE.Color(visual.coreColor), lerpAmount);
    edgeColorRef.current.lerp(new THREE.Color(visual.edgeColor), lerpAmount);

    if (coreRef.current) {
      coreRef.current.scale.setScalar(scaleRef.current);

      const geometry = coreRef.current.geometry;
      if (!vertexTRef.current) {
        vertexTRef.current = computeVertexGradientT(geometry);
        geometry.setAttribute(
          "color",
          new THREE.BufferAttribute(new Float32Array(vertexTRef.current.length * 3), 3),
        );
      }
      const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
      const tArr = vertexTRef.current;
      // Boost above 1.0 at the hot end so Bloom's luminance threshold still
      // catches a glow around the core, same visual role emissive used to
      // play — meshBasicMaterial has no emissive channel of its own.
      const glowBoost = orbState === "speaking" ? 1.3 + audioAmplitude * 0.6 : 1.3;
      for (let i = 0; i < tArr.length; i++) {
        mixColor.current.copy(edgeColorRef.current).lerp(coreColorRef.current, tArr[i]!);
        const boost = 1 + (glowBoost - 1) * tArr[i]!;
        colorAttr.setXYZ(i, mixColor.current.r * boost, mixColor.current.g * boost, mixColor.current.b * boost);
      }
      colorAttr.needsUpdate = true;
    }

    if (shellOuterRef.current) {
      shellOuterRef.current.rotation.y += delta * visual.rotationSpeed;
      shellOuterRef.current.rotation.x += delta * visual.rotationSpeed * 0.4;
      const mat = shellOuterRef.current.material as THREE.MeshBasicMaterial;
      mat.color.copy(edgeColorRef.current);
    }

    if (shellInnerRef.current) {
      shellInnerRef.current.rotation.y -= delta * visual.rotationSpeed * 0.7;
      shellInnerRef.current.rotation.z += delta * visual.rotationSpeed * 0.5;
      const mat = shellInnerRef.current.material as THREE.MeshBasicMaterial;
      mat.color.copy(coreColorRef.current).lerp(edgeColorRef.current, 0.5);
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.55, 2]} />
        {/* Unlit on purpose: an earlier lit (meshStandardMaterial) version
            washed the per-vertex orange->purple gradient into a flat pastel
            blob — ambient/point lighting + emissive dominated the final
            pixel so strongly the vertex colors barely showed, confirmed by
            comparing against the (correctly vivid, already-unlit) wireframe
            shells below. meshBasicMaterial renders vertex colors exactly as
            computed, with zero lighting interaction. */}
        <meshBasicMaterial vertexColors color="#ffffff" toneMapped />
      </mesh>
      <mesh ref={shellInnerRef}>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshBasicMaterial
          color={ORB_VISUALS.idle.coreColor}
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>
      <mesh ref={shellOuterRef}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshBasicMaterial
          color={ORB_VISUALS.idle.edgeColor}
          wireframe
          transparent
          opacity={0.18}
        />
      </mesh>
    </group>
  );
}
