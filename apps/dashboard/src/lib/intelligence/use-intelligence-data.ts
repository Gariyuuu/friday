"use client";

import type { DataFreshness, IntelligenceEvent, MarketQuote, WeatherAlert } from "@friday/types";
import { useEffect, useState } from "react";
import { createLogger } from "@/lib/logger";
import type { IntelligenceSnapshot } from "./provider";

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

async function fetchSnapshot<T>(url: string): Promise<IntelligenceSnapshot<T>> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return (await res.json()) as IntelligenceSnapshot<T>;
}

/**
 * Fetches all three intelligence feeds from server-side routes (never calls a
 * provider directly — that's where API keys live) in parallel and streams results
 * in as each resolves.
 */
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

    fetchSnapshot<IntelligenceEvent[]>("/api/intelligence/events")
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

    fetchSnapshot<MarketQuote[]>("/api/intelligence/markets")
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

    fetchSnapshot<WeatherAlert[]>("/api/intelligence/weather")
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
