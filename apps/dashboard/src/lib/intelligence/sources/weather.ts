import "server-only";
import type { WeatherAlert } from "@friday/types";
import { createLogger } from "@/lib/logger";
import type { IntelligenceSnapshot } from "../provider";
import { MOCK_WEATHER_ALERTS } from "./mock-data";

const logger = createLogger("NETWORK");

/**
 * NWS (api.weather.gov) is free, keyless, and covers the US only. No sign-up needed —
 * this is real data from the moment the app runs, with no action required from the user.
 * Coverage is US-only; global severe-weather coverage is a future enhancement.
 */
const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active?severity=Severe,Extreme&status=actual";
const USER_AGENT = "FRIDAY-personal-assistant (github.com/Gariyuuu/friday)";

interface NwsFeature {
  properties: {
    id: string;
    event: string;
    headline: string;
    areaDesc: string;
    effective: string;
    expires?: string;
    senderName: string;
  };
  geometry: { type: string; coordinates: unknown } | null;
}

function severityFromEvent(event: string): WeatherAlert["severity"] {
  const lower = event.toLowerCase();
  if (lower.includes("emergency")) return "emergency";
  if (lower.includes("warning")) return "warning";
  if (lower.includes("watch")) return "watch";
  return "advisory";
}

function centroidOf(geometry: NwsFeature["geometry"]): { lat: number; lon: number } | null {
  if (!geometry || geometry.type !== "Polygon") return null;
  const rings = geometry.coordinates as [number, number][][];
  const ring = rings[0];
  if (!ring || ring.length === 0) return null;
  const sum = ring.reduce((acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat], [0, 0]);
  return { lon: sum[0] / ring.length, lat: sum[1] / ring.length };
}

export async function getLiveWeatherAlerts(): Promise<IntelligenceSnapshot<WeatherAlert[]>> {
  try {
    const res = await fetch(NWS_ALERTS_URL, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`NWS responded ${res.status}`);
    const body = (await res.json()) as { features: NwsFeature[] };

    const alerts: WeatherAlert[] = body.features.slice(0, 8).map((feature) => {
      const p = feature.properties;
      const center = centroidOf(feature.geometry);
      return {
        id: p.id,
        headline: p.headline || p.event,
        severity: severityFromEvent(p.event),
        latitude: center?.lat ?? 0,
        longitude: center?.lon ?? 0,
        region: p.areaDesc,
        effectiveAt: p.effective,
        expiresAt: p.expires,
        source: { name: p.senderName || "National Weather Service", url: "https://weather.gov" },
      };
    });

    return {
      data: alerts,
      freshness: { status: "live", lastUpdated: new Date().toISOString(), isMock: false },
    };
  } catch (error) {
    logger.error("NWS weather fetch failed, falling back to demo data", {
      error: String(error),
    });
    return {
      data: MOCK_WEATHER_ALERTS,
      freshness: { status: "stale", lastUpdated: new Date().toISOString(), isMock: true },
    };
  }
}
