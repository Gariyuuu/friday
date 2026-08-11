import { geoContains } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";

/**
 * Real country boundary polygons (Natural Earth data via `world-atlas`, the
 * standard low-res — 110m — world TopoJSON used across the D3 ecosystem).
 * No API key, fully offline, ~108KB. Used both to draw the globe's country
 * outlines and to determine which country a geocoded event actually falls
 * in (`countryNameForCoordinate`) — real point-in-polygon against real
 * boundaries, never a guessed or hardcoded country list.
 */
export const WORLD_COUNTRIES: Feature<Geometry, { name: string }>[] = (
  feature(
    worldTopology as unknown as Topology,
    (worldTopology as unknown as Topology).objects.countries as GeometryCollection,
  ) as unknown as { features: Feature<Geometry, { name: string }>[] }
).features;

/** Returns the real country name containing this point, or null (open ocean/no match). */
export function countryNameForCoordinate(longitude: number, latitude: number): string | null {
  for (const country of WORLD_COUNTRIES) {
    if (geoContains(country, [longitude, latitude])) {
      return country.properties.name;
    }
  }
  return null;
}
