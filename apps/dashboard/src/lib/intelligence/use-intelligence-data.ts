"use client";

import type { DataFreshness, IntelligenceEvent, MarketQuote, WeatherAlert } from "@friday/types";
import { useEffect, useState } from "react";
import { createLogger } from "@/lib/logger";
import { getIntelligenceProvider } from "./index";

const logger = createLogger("NETWORK");

interface IntelligenceData {
  events: IntelligenceEvent[];
  markets: MarketQuote[];
  weatherAlerts: WeatherAlert[];
  eventsFreshness: DataFreshness;
  marketsFreshness: DataFreshness;
  weatherFreshness: DataFreshness;
}

const LOADING: DataFreshness = { status: "loading", isMock: true };

/** Fetches all three intelligence feeds in parallel and streams results in as each resolves. */
export function useIntelligenceData() {
  const [data, setData] = useState<IntelligenceData>({
    events: [],
    markets: [],
    weatherAlerts: [],
    eventsFreshness: LOADING,
    marketsFreshness: LOADING,
    weatherFreshness: LOADING,
  });

  useEffect(() => {
    let cancelled = false;
    const provider = getIntelligenceProvider();

    provider
      .getEvents()
      .then((snapshot) => {
        if (cancelled) return;
        setData((prev) => ({
          ...prev,
          events: snapshot.data,
          eventsFreshness: snapshot.freshness,
        }));
      })
      .catch((error: unknown) => {
        logger.error("failed to load intelligence events", { error: String(error) });
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            eventsFreshness: { status: "unavailable", isMock: true },
          }));
        }
      });

    provider
      .getMarkets()
      .then((snapshot) => {
        if (cancelled) return;
        setData((prev) => ({
          ...prev,
          markets: snapshot.data,
          marketsFreshness: snapshot.freshness,
        }));
      })
      .catch((error: unknown) => {
        logger.error("failed to load market data", { error: String(error) });
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            marketsFreshness: { status: "unavailable", isMock: true },
          }));
        }
      });

    provider
      .getWeatherAlerts()
      .then((snapshot) => {
        if (cancelled) return;
        setData((prev) => ({
          ...prev,
          weatherAlerts: snapshot.data,
          weatherFreshness: snapshot.freshness,
        }));
      })
      .catch((error: unknown) => {
        logger.error("failed to load weather alerts", { error: String(error) });
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            weatherFreshness: { status: "unavailable", isMock: true },
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
