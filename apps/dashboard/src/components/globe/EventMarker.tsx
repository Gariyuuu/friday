"use client";

import { useFrame } from "@react-three/fiber";
import type { IntelligenceEvent } from "@friday/types";
import { useRef } from "react";
import * as THREE from "three";
import { CATEGORY_COLOR } from "@/lib/intelligence/category-style";
import { latLonToVector3 } from "@/lib/geo";

interface EventMarkerProps {
  event: IntelligenceEvent;
  radius: number;
  focused: boolean;
  onSelect: (id: string) => void;
}

export function EventMarker({ event, radius, focused, onSelect }: EventMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = latLonToVector3(event.latitude ?? 0, event.longitude ?? 0, radius);
  const color = CATEGORY_COLOR[event.category];

  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = focused
      ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.25
      : 1 + Math.sin(state.clock.elapsedTime * 1.5 + event.importance * 10) * 0.1;
    meshRef.current.scale.setScalar((0.03 + event.importance * 0.02) * pulse);
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event.id);
      }}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color={focused ? "#ffffff" : color} />
    </mesh>
  );
}
