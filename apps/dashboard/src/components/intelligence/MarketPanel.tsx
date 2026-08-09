"use client";

import type { DataFreshness, MarketQuote } from "@friday/types";
import { PanelHeader } from "./PanelHeader";
import { Sparkline } from "./Sparkline";

interface MarketPanelProps {
  markets: MarketQuote[];
  freshness: DataFreshness;
}

export function MarketPanel({ markets, freshness }: MarketPanelProps) {
  return (
    <section className="glass-panel flex flex-col gap-3 rounded-lg p-4">
      <PanelHeader title="Market Monitor" freshness={freshness} count={markets.length} />

      {freshness.status === "loading" && markets.length === 0 && (
        <p className="text-sm text-text-faint">Querying market data…</p>
      )}

      <ul className="flex flex-col gap-2">
        {markets.map((quote) => {
          const positive = quote.changePercent >= 0;
          // The label already ends with "(SYMBOL)" (e.g. "S&P 500 (SPY)") —
          // strip it since the symbol is also shown on its own line below,
          // rather than showing it twice in an already-narrow card.
          const label = quote.label.replace(/\s*\([^)]*\)\s*$/, "");
          return (
            <li
              key={quote.symbol}
              className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 ${
                positive ? "border-success/20" : "border-danger/20"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-text">{label}</p>
                <p className="text-mono-status text-xs text-text-faint">{quote.symbol}</p>
              </div>
              <Sparkline values={quote.sparkline ?? []} positive={positive} />
              <div className="shrink-0 text-right">
                <p className="text-mono-status text-sm text-text">
                  {quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p
                  className={`text-mono-status text-xs ${positive ? "text-success" : "text-danger"}`}
                >
                  {positive ? "+" : ""}
                  {quote.changePercent.toFixed(2)}%
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
