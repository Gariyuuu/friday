"use client";

import type { DataFreshness, MarketQuote } from "@friday/types";
import { FreshnessBadge } from "./FreshnessBadge";
import { Sparkline } from "./Sparkline";

interface MarketPanelProps {
  markets: MarketQuote[];
  freshness: DataFreshness;
}

export function MarketPanel({ markets, freshness }: MarketPanelProps) {
  return (
    <section className="glass-panel flex flex-col gap-3 rounded-lg p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim">
          Market Monitor
        </h2>
        <FreshnessBadge freshness={freshness} />
      </header>

      {freshness.status === "loading" && markets.length === 0 && (
        <p className="text-sm text-text-faint">Querying market data…</p>
      )}

      <ul className="flex flex-col divide-y divide-border">
        {markets.map((quote) => {
          const positive = quote.changePercent >= 0;
          return (
            <li key={quote.symbol} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm text-text">{quote.label}</p>
                <p className="text-mono-status text-xs text-text-faint">{quote.symbol}</p>
              </div>
              <Sparkline values={quote.sparkline ?? []} positive={positive} />
              <div className="text-right">
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
