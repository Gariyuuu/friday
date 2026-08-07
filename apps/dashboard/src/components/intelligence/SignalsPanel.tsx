"use client";

import type { DataFreshness, IntelligenceEvent, WeatherAlert } from "@friday/types";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/intelligence/category-style";
import { FreshnessBadge } from "./FreshnessBadge";

interface SignalsPanelProps {
  events: IntelligenceEvent[];
  weatherAlerts: WeatherAlert[];
  weatherFreshness: DataFreshness;
}

const SEVERITY_COLOR: Record<WeatherAlert["severity"], string> = {
  advisory: "text-text-dim",
  watch: "text-warning",
  warning: "text-warning",
  emergency: "text-danger",
};

export function SignalsPanel({ events, weatherAlerts, weatherFreshness }: SignalsPanelProps) {
  const tally = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="glass-panel flex flex-col gap-4 rounded-lg p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim">
          Global Signals
        </h2>
        <FreshnessBadge freshness={weatherFreshness} />
      </header>

      <div>
        <h3 className="mb-2 text-[10px] uppercase tracking-wide text-text-faint">
          Weather Alerts
        </h3>
        {weatherAlerts.length === 0 ? (
          <p className="text-sm text-text-faint">No active alerts.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weatherAlerts.map((alert) => (
              <li key={alert.id} className="text-sm">
                <span className={`${SEVERITY_COLOR[alert.severity]} uppercase text-[10px]`}>
                  {alert.severity}
                </span>{" "}
                <span className="text-text">{alert.headline}</span>
                <p className="text-xs text-text-faint">{alert.region}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-[10px] uppercase tracking-wide text-text-faint">
          Activity by Category
        </h3>
        <ul className="flex flex-col gap-1.5">
          {Object.entries(tally).map(([category, count]) => (
            <li key={category} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: CATEGORY_COLOR[category as keyof typeof CATEGORY_COLOR] }}
                />
                <span className="text-text-dim">
                  {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}
                </span>
              </span>
              <span className="text-mono-status text-text-faint">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
