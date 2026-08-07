import "server-only";
import type { IntelligenceEvent, MarketQuote, WeatherAlert } from "@friday/types";
import { getLiveEvents } from "./sources/events";
import { getLiveMarkets } from "./sources/markets";
import { getLiveWeatherAlerts } from "./sources/weather";
import type { IntelligenceProvider, IntelligenceSnapshot } from "./provider";

export type { IntelligenceProvider, IntelligenceSnapshot } from "./provider";

/**
 * Server-only. Each feed independently uses real data where it can (weather and
 * crypto need no key at all; news and equities/FX activate once their key is set)
 * and falls back to clearly-labeled mock data otherwise or on fetch failure. This
 * file must never be imported from a client component — it's the only place
 * NEWS_API_KEY / TWELVE_DATA_API_KEY are read. Call it from a route handler.
 */
class AutoIntelligenceProvider implements IntelligenceProvider {
  getEvents(): Promise<IntelligenceSnapshot<IntelligenceEvent[]>> {
    return getLiveEvents();
  }

  getMarkets(): Promise<IntelligenceSnapshot<MarketQuote[]>> {
    return getLiveMarkets();
  }

  getWeatherAlerts(): Promise<IntelligenceSnapshot<WeatherAlert[]>> {
    return getLiveWeatherAlerts();
  }
}

let cachedProvider: IntelligenceProvider | null = null;

export function getIntelligenceProvider(): IntelligenceProvider {
  if (!cachedProvider) {
    cachedProvider = new AutoIntelligenceProvider();
  }
  return cachedProvider;
}
