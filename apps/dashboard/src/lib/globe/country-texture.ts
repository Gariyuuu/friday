import { geoEquirectangular, geoPath } from "d3-geo";
import * as THREE from "three";
import { WORLD_COUNTRIES } from "./country-geo";

const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

// Scale/translate chosen so this equirectangular projection lands on the
// exact same pixel-to-lat/lon mapping as Three.js's default SphereGeometry
// UVs (u=(lon+180)/360, v=(90-lat)/180) — i.e. the same convention
// lib/geo.ts's latLonToVector3 already uses for event markers. Verified by
// screenshot, not just derived on paper: continents land in the expected
// places and line up with existing geocoded event markers.
const projection = geoEquirectangular()
  .scale(TEXTURE_WIDTH / (2 * Math.PI))
  .translate([TEXTURE_WIDTH / 2, TEXTURE_HEIGHT / 2]);
const path = geoPath(projection);

/**
 * Draws the world map onto a canvas — real country borders (never fabricated
 * shapes), with countries that have real geocoded event activity filled in a
 * warm highlight (brighter with more events), everything else left as a dim
 * outline. Returns a Three.js texture ready to apply to the globe sphere.
 */
export function buildWorldTexture(eventCountByCountry: Map<string, number>): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  path.context(ctx as unknown as CanvasRenderingContext2D);

  ctx.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  const maxCount = Math.max(1, ...eventCountByCountry.values());

  for (const country of WORLD_COUNTRIES) {
    const count = eventCountByCountry.get(country.properties.name) ?? 0;
    ctx.beginPath();
    path(country);
    if (count > 0) {
      const strength = 0.3 + 0.55 * (count / maxCount);
      ctx.fillStyle = `rgba(255, 165, 60, ${strength})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 200, 120, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(139, 47, 201, 0.06)";
      ctx.fill();
      ctx.strokeStyle = "rgba(180, 130, 220, 0.35)";
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
