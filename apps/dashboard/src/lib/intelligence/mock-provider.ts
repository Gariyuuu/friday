import type { IntelligenceEvent, MarketQuote, WeatherAlert } from "@friday/types";
import { MOCK_EVENTS, MOCK_MARKETS, MOCK_WEATHER_ALERTS } from "./sources/mock-data";
import type { IntelligenceProvider, IntelligenceSnapshot } from "./provider";

async function simulateLatency(ms = 350) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Used when nothing is configured — see sources/mock-data.ts for the DEMO DATA itself. */
export class MockIntelligenceProvider implements IntelligenceProvider {
  async getEvents(): Promise<IntelligenceSnapshot<IntelligenceEvent[]>> {
    await simulateLatency();
    return {
      data: MOCK_EVENTS,
      freshness: { status: "live", lastUpdated: new Date().toISOString(), isMock: true },
    };
  }

  async getMarkets(): Promise<IntelligenceSnapshot<MarketQuote[]>> {
    await simulateLatency(200);
    return {
      data: MOCK_MARKETS,
      freshness: { status: "live", lastUpdated: new Date().toISOString(), isMock: true },
    };
  }

  async getWeatherAlerts(): Promise<IntelligenceSnapshot<WeatherAlert[]>> {
    await simulateLatency(250);
    return {
      data: MOCK_WEATHER_ALERTS,
      freshness: { status: "live", lastUpdated: new Date().toISOString(), isMock: true },
    };
  }
}
