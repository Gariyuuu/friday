import type { DataFreshness, IntelligenceEvent, MarketQuote, WeatherAlert } from "@friday/types";

export interface IntelligenceSnapshot<T> {
  data: T;
  freshness: DataFreshness;
}

/**
 * Every real backend (news search, market data, weather) implements this same
 * shape so Phase 3 can swap MockIntelligenceProvider for a live one without
 * touching any component. Nothing outside this folder should call a vendor
 * API directly.
 */
export interface IntelligenceProvider {
  getEvents(): Promise<IntelligenceSnapshot<IntelligenceEvent[]>>;
  getMarkets(): Promise<IntelligenceSnapshot<MarketQuote[]>>;
  getWeatherAlerts(): Promise<IntelligenceSnapshot<WeatherAlert[]>>;
}
