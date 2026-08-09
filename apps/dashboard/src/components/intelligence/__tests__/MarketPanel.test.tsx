import type { DataFreshness, MarketQuote } from "@friday/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketPanel } from "../MarketPanel";

function freshness(overrides: Partial<DataFreshness> = {}): DataFreshness {
  return { status: "live", isMock: false, ...overrides };
}

function quote(overrides: Partial<MarketQuote> = {}): MarketQuote {
  return {
    symbol: "SPY",
    label: "S&P 500",
    price: 500,
    changeAbsolute: 1,
    changePercent: 1,
    asOf: new Date().toISOString(),
    marketState: "open",
    ...overrides,
  };
}

describe("MarketPanel", () => {
  it("shows a loading message only when loading with no markets yet", () => {
    const { rerender } = render(<MarketPanel markets={[]} freshness={freshness({ status: "loading" })} />);
    expect(screen.getByText("Querying market data…")).toBeInTheDocument();

    rerender(<MarketPanel markets={[quote()]} freshness={freshness({ status: "loading" })} />);
    expect(screen.queryByText("Querying market data…")).not.toBeInTheDocument();
  });

  it("formats a positive change with a + sign and success styling", () => {
    render(<MarketPanel markets={[quote({ changePercent: 2.5 })]} freshness={freshness()} />);
    const changeText = screen.getByText("+2.50%");
    expect(changeText).toHaveClass("text-success");
  });

  it("formats a negative change without a + sign and danger styling", () => {
    render(<MarketPanel markets={[quote({ changePercent: -1.23 })]} freshness={freshness()} />);
    const changeText = screen.getByText("-1.23%");
    expect(changeText).toHaveClass("text-danger");
  });

  it("treats exactly 0% change as positive (matches the >= 0 check)", () => {
    render(<MarketPanel markets={[quote({ changePercent: 0 })]} freshness={freshness()} />);
    expect(screen.getByText("+0.00%")).toHaveClass("text-success");
  });

  it("formats the price with locale grouping and shows the symbol/label", () => {
    render(<MarketPanel markets={[quote({ symbol: "SPY", label: "S&P 500", price: 5123.4 })]} freshness={freshness()} />);
    expect(screen.getByText("S&P 500")).toBeInTheDocument();
    expect(screen.getByText("SPY")).toBeInTheDocument();
    expect(screen.getByText("5,123.4")).toBeInTheDocument();
  });
});
