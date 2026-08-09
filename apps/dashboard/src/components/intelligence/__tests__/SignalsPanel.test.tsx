import type { DataFreshness, IntelligenceEvent, WeatherAlert } from "@friday/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignalsPanel } from "../SignalsPanel";

function freshness(overrides: Partial<DataFreshness> = {}): DataFreshness {
  return { status: "live", isMock: false, ...overrides };
}

function event(overrides: Partial<IntelligenceEvent> = {}): IntelligenceEvent {
  return {
    id: "e1",
    title: "title",
    summary: "summary",
    category: "geopolitics",
    importance: 0.5,
    timestamp: new Date().toISOString(),
    sources: [],
    ...overrides,
  };
}

function alert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    id: "a1",
    headline: "Severe thunderstorm warning",
    severity: "warning",
    latitude: 0,
    longitude: 0,
    region: "Texas",
    effectiveAt: new Date().toISOString(),
    source: { name: "NWS", url: "https://weather.gov" },
    ...overrides,
  };
}

describe("SignalsPanel", () => {
  it("shows 'No active alerts' when there are none", () => {
    render(<SignalsPanel events={[]} weatherAlerts={[]} weatherFreshness={freshness()} />);
    expect(screen.getByText("No active alerts.")).toBeInTheDocument();
  });

  it("lists each weather alert's severity, headline, and region", () => {
    render(
      <SignalsPanel
        events={[]}
        weatherAlerts={[alert({ headline: "Tornado watch", severity: "emergency", region: "Oklahoma" })]}
        weatherFreshness={freshness()}
      />,
    );
    expect(screen.getByText("emergency")).toBeInTheDocument();
    expect(screen.getByText("Tornado watch")).toBeInTheDocument();
    expect(screen.getByText("Oklahoma")).toBeInTheDocument();
  });

  it("tallies events by category correctly", () => {
    const events = [
      event({ category: "geopolitics" }),
      event({ category: "geopolitics" }),
      event({ category: "economy" }),
    ];
    render(<SignalsPanel events={events} weatherAlerts={[]} weatherFreshness={freshness()} />);

    const geoRow = screen.getByText("Geopolitics").closest("li")!;
    expect(geoRow).toHaveTextContent("2");
    const econRow = screen.getByText("Economy").closest("li")!;
    expect(econRow).toHaveTextContent("1");
  });
});
