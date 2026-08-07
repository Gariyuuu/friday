"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { IntelligenceEvent } from "@friday/types";
import { useRef } from "react";
import type * as THREE from "three";
import { EventMarker } from "./EventMarker";

const GLOBE_RADIUS = 1.4;

function GlobeMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.03;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[GLOBE_RADIUS, 28, 18]} />
      <meshBasicMaterial color="#6ee7ff" wireframe transparent opacity={0.22} />
    </mesh>
  );
}

interface GlobeProps {
  events: IntelligenceEvent[];
  focusedEventId: string | null;
  onSelectEvent: (id: string) => void;
  className?: string;
}

/** Interactive globe — rotate/zoom via drag+scroll, click a marker to focus its event. Spec §14. */
export function Globe({ events, focusedEventId, onSelectEvent, className }: GlobeProps) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0.4, 3.6], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 2, 4]} intensity={0.5} />
        <GlobeMesh />
        {events
          .filter((e) => e.latitude !== undefined && e.longitude !== undefined)
          .map((event) => (
            <EventMarker
              key={event.id}
              event={event}
              radius={GLOBE_RADIUS + 0.02}
              focused={event.id === focusedEventId}
              onSelect={onSelectEvent}
            />
          ))}
        <OrbitControls
          enablePan={false}
          minDistance={2.2}
          maxDistance={5.5}
          rotateSpeed={0.5}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
