"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type { IntelligenceEvent } from "@friday/types";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { registerGlobeControls } from "@/lib/gestures/globe-registry";
import { countryNameForCoordinate } from "@/lib/globe/country-geo";
import { buildWorldTexture } from "@/lib/globe/country-texture";
import { EventMarker } from "./EventMarker";

const GLOBE_RADIUS = 1.4;

interface GlobeMeshProps {
  texture: THREE.CanvasTexture;
}

/** The real country-boundary/highlight map, textured onto the sphere surface. */
function CountryMesh({ texture }: GlobeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.03;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[GLOBE_RADIUS - 0.012, 64, 40]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

/** A subtle holographic latitude/longitude grid layered over the country map. */
function GridMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.03;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[GLOBE_RADIUS, 28, 18]} />
      <meshBasicMaterial color="#c9a6ff" wireframe transparent opacity={0.12} />
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
  useEffect(() => {
    return () => registerGlobeControls(null);
  }, []);

  const geolocatedEvents = useMemo(
    () => events.filter((e) => e.latitude !== undefined && e.longitude !== undefined),
    [events],
  );

  // Real point-in-polygon match against real country boundaries — never a
  // fabricated or hardcoded country list. Countries with no geocoded events
  // this session simply get no highlight, not an invented one.
  const eventCountByCountry = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of geolocatedEvents) {
      const country = countryNameForCoordinate(event.longitude!, event.latitude!);
      if (country) counts.set(country, (counts.get(country) ?? 0) + 1);
    }
    return counts;
  }, [geolocatedEvents]);

  const countryTexture = useMemo(() => buildWorldTexture(eventCountByCountry), [eventCountByCountry]);
  useEffect(() => () => countryTexture.dispose(), [countryTexture]);

  return (
    <div className={className} data-gesture-target="globe">
      <Canvas camera={{ position: [0, 0.4, 3.6], fov: 45 }} gl={{ antialias: false, alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 2, 4]} intensity={0.5} />
        <CountryMesh texture={countryTexture} />
        <GridMesh />
        {geolocatedEvents.map((event) => (
          <EventMarker
            key={event.id}
            event={event}
            radius={GLOBE_RADIUS + 0.02}
            focused={event.id === focusedEventId}
            onSelect={onSelectEvent}
          />
        ))}
        <OrbitControls
          ref={(instance) => registerGlobeControls(instance)}
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
