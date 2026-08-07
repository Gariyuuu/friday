import "server-only";
import type { MarketQuote } from "@friday/types";
import { createLogger } from "@/lib/logger";
import type { IntelligenceSnapshot } from "../provider";
import { MOCK_MARKETS } from "./mock-data";

const logger = createLogger("NETWORK");

const CRYPTO_IDS = ["bitcoin", "ethereum"] as const;
const CRYPTO_LABEL: Record<(typeof CRYPTO_IDS)[number], string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
};
const CRYPTO_SYMBOL: Record<(typeof CRYPTO_IDS)[number], string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
};

interface CoinGeckoMarket {
  id: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
}

/** Downsamples a long sparkline to a compact set of points for the UI. */
function downsample(values: number[], targetPoints = 12): number[] {
  if (values.length <= targetPoints) return values;
  const step = values.length / targetPoints;
  return Array.from({ length: targetPoints }, (_, i) => values[Math.floor(i * step)]!);
}

/** CoinGecko's public market endpoint needs no API key — real crypto data with zero setup. */
async function getCryptoQuotes(): Promise<MarketQuote[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS.join(",")}&sparkline=true&price_change_percentage=24h`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
  const body = (await res.json()) as CoinGeckoMarket[];

  return body.map((coin) => {
    const id = coin.id as (typeof CRYPTO_IDS)[number];
    return {
      symbol: CRYPTO_SYMBOL[id] ?? coin.id.toUpperCase(),
      label: CRYPTO_LABEL[id] ?? coin.id,
      price: coin.current_price,
      changeAbsolute: coin.price_change_24h,
      changePercent: coin.price_change_percentage_24h,
      sparkline: coin.sparkline_in_7d ? downsample(coin.sparkline_in_7d.price) : undefined,
      asOf: coin.last_updated,
      marketState: "open" as const,
    };
  });
}

// Raw index symbols (SPX/IXIC) aren't available on Twelve Data's free plan and
// returned 403/404 in testing — SPY/QQQ (the ETFs tracking them) are, and are close
// enough proxies for a dashboard glance rather than a trading terminal.
const EQUITY_SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "S&P 500 (SPY)" },
  { symbol: "QQQ", label: "NASDAQ 100 (QQQ)" },
  { symbol: "USD/JPY", label: "USD/JPY" },
];

interface TwelveDataQuote {
  symbol: string;
  close: string;
  change: string;
  percent_change: string;
  datetime: string;
  is_market_open: boolean;
}

/** Equities/FX need a free Twelve Data key — see .env.example TWELVE_DATA_API_KEY. */
async function getEquityQuotes(apiKey: string): Promise<MarketQuote[]> {
  const symbols = EQUITY_SYMBOLS.map((s) => s.symbol).join(",");
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Twelve Data responded ${res.status}`);
  const body = (await res.json()) as Record<string, TwelveDataQuote> | TwelveDataQuote;

  const quotes: TwelveDataQuote[] =
    typeof (body as TwelveDataQuote).symbol === "string"
      ? [body as TwelveDataQuote]
      : Object.values(body as Record<string, TwelveDataQuote>);

  return quotes.flatMap((q) => {
    const meta = EQUITY_SYMBOLS.find((s) => s.symbol === q.symbol);
    const price = Number(q.close);
    const changeAbsolute = Number(q.change);
    const changePercent = Number(q.percent_change);
    if (!meta || Number.isNaN(price)) return [];
    return [
      {
        symbol: q.symbol,
        label: meta.label,
        price,
        changeAbsolute,
        changePercent,
        asOf: q.datetime ?? new Date().toISOString(),
        marketState: q.is_market_open ? ("open" as const) : ("closed" as const),
      },
    ];
  });
}

export async function getLiveMarkets(): Promise<IntelligenceSnapshot<MarketQuote[]>> {
  const twelveDataKey = process.env.TWELVE_DATA_API_KEY;

  try {
    const [crypto, equities] = await Promise.all([
      getCryptoQuotes(),
      twelveDataKey ? getEquityQuotes(twelveDataKey).catch(() => []) : Promise.resolve([]),
    ]);

    if (crypto.length === 0 && equities.length === 0) {
      throw new Error("no live quotes returned");
    }

    return {
      data: [...equities, ...crypto],
      freshness: { status: "live", lastUpdated: new Date().toISOString(), isMock: false },
    };
  } catch (error) {
    logger.error("live market fetch failed, falling back to demo data", {
      error: String(error),
    });
    return {
      data: MOCK_MARKETS,
      freshness: { status: "stale", lastUpdated: new Date().toISOString(), isMock: true },
    };
  }
}
