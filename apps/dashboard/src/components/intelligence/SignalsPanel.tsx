"use client";

import type { DataFreshness, IntelligenceEvent, WeatherAlert } from "@friday/types";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/intelligence/category-style";
import { PanelHeader } from "./PanelHeader";

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

const ALERT_BORDER: Record<WeatherAlert["severity"], string> = {
  advisory: "border-l-text-faint",
  watch: "border-l-warning",
  warning: "border-l-warning",
  emergency: "border-l-danger",
};

export function SignalsPanel({ events, weatherAlerts, weatherFreshness }: SignalsPanelProps) {
  const tally = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});
  const maxTally = Math.max(1, ...Object.values(tally));

  return (
    <section className="glass-panel flex flex-col gap-4 rounded-lg p-4">
      <PanelHeader title="Global Signals" freshness={weatherFreshness} count={weatherAlerts.length} />

      <div>
        <h3 className="mb-2 text-[10px] uppercase tracking-wide text-text-faint">
          Weather Alerts
        </h3>
        {weatherAlerts.length === 0 ? (
          <p className="text-sm text-text-faint">No active alerts.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {weatherAlerts.map((alert) => (
              <li
                key={alert.id}
                className={`border-l-2 pl-2.5 text-sm ${ALERT_BORDER[alert.severity]}`}
              >
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
        <ul className="flex flex-col gap-2">
          {Object.entries(tally).map(([category, count]) => (
            <li key={category} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 truncate text-text-dim">
                {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(count / maxTally) * 100}%`,
                    background: CATEGORY_COLOR[category as keyof typeof CATEGORY_COLOR],
                  }}
                />
              </span>
              <span className="text-mono-status w-4 shrink-0 text-right text-text-faint">
                {count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
