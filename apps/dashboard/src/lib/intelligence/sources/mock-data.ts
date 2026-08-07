import type { IntelligenceEvent, MarketQuote, WeatherAlert } from "@friday/types";

/**
 * DEMO DATA. Shared by MockIntelligenceProvider (used when nothing is configured) and
 * by live sources as a fallback when a real fetch fails — see spec §47 (fail gracefully).
 * Never presented without the `isMock: true` freshness flag being surfaced.
 */

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const MOCK_EVENTS: IntelligenceEvent[] = [
  {
    id: "evt-boj-policy",
    title: "Bank of Japan holds rates, signals gradual normalization",
    summary:
      "The BOJ kept its policy rate unchanged but reiterated it will move toward normalization if inflation trends hold, sending the yen modestly higher against the dollar.",
    category: "economy",
    importance: 0.82,
    confidence: 0.9,
    latitude: 35.6762,
    longitude: 139.6503,
    country: "Japan",
    region: "Tokyo",
    timestamp: minutesAgo(12),
    sources: [
      { name: "Nikkei Asia", url: "https://asia.nikkei.com" },
      { name: "Reuters", url: "https://reuters.com" },
    ],
  },
  {
    id: "evt-flood-kyushu",
    title: "Heavy rainfall triggers flood warnings across southern Kyushu",
    summary:
      "Sustained rainfall has prompted evacuation advisories in several prefectures as rivers approach flood stage; authorities are monitoring landslide risk overnight.",
    category: "weather",
    importance: 0.7,
    confidence: 0.85,
    latitude: 31.5966,
    longitude: 130.5571,
    country: "Japan",
    region: "Kyushu",
    timestamp: minutesAgo(24),
    sources: [{ name: "Japan Meteorological Agency", url: "https://jma.go.jp" }],
  },
  {
    id: "evt-chip-export-rules",
    title: "New export licensing rules proposed for advanced chip equipment",
    summary:
      "Regulators are weighing tighter licensing requirements on lithography tooling exports, a move that could affect semiconductor capital equipment makers.",
    category: "technology",
    importance: 0.76,
    confidence: 0.75,
    latitude: 38.9072,
    longitude: -77.0369,
    country: "United States",
    region: "Washington, D.C.",
    timestamp: minutesAgo(41),
    sources: [
      { name: "Reuters", url: "https://reuters.com" },
      { name: "Bloomberg", url: "https://bloomberg.com" },
    ],
  },
  {
    id: "evt-eu-energy-talks",
    title: "EU energy ministers meet on winter gas storage targets",
    summary:
      "Ministers are discussing whether to relax mandatory storage targets given mild autumn demand and elevated LNG imports.",
    category: "geopolitics",
    importance: 0.58,
    confidence: 0.8,
    latitude: 50.8503,
    longitude: 4.3517,
    country: "Belgium",
    region: "Brussels",
    timestamp: minutesAgo(58),
    sources: [{ name: "Politico Europe", url: "https://politico.eu" }],
  },
  {
    id: "evt-fusion-milestone",
    title: "Research reactor reports sustained net-positive fusion pulse",
    summary:
      "A national laboratory reported a longer sustained net energy gain than prior attempts, a incremental but closely watched step for fusion research programs.",
    category: "science",
    importance: 0.63,
    confidence: 0.7,
    latitude: 37.6819,
    longitude: -121.7681,
    country: "United States",
    region: "California",
    timestamp: minutesAgo(75),
    sources: [{ name: "Nature News", url: "https://nature.com" }],
  },
  {
    id: "evt-shipping-lane",
    title: "Red Sea shipping disruptions continue to reroute freight",
    summary:
      "Container lines continue diverting around the Cape of Good Hope, adding roughly ten days to Asia-Europe transit and keeping freight rates elevated.",
    category: "security",
    importance: 0.68,
    confidence: 0.82,
    latitude: 20.0,
    longitude: 38.0,
    country: "Red Sea",
    region: "Bab-el-Mandeb",
    timestamp: minutesAgo(90),
    sources: [{ name: "Lloyd's List", url: "https://lloydslist.com" }],
  },
];

export const MOCK_MARKETS: MarketQuote[] = [
  {
    symbol: "SPX",
    label: "S&P 500",
    price: 6812.4,
    changeAbsolute: 18.2,
    changePercent: 0.27,
    sparkline: [6770, 6781, 6775, 6790, 6803, 6795, 6812.4],
    asOf: minutesAgo(1),
    marketState: "open",
  },
  {
    symbol: "IXIC",
    label: "NASDAQ",
    price: 22984.1,
    changeAbsolute: -42.6,
    changePercent: -0.18,
    sparkline: [23050, 23020, 23005, 22990, 23010, 22970, 22984.1],
    asOf: minutesAgo(1),
    marketState: "open",
  },
  {
    symbol: "BTC",
    label: "Bitcoin",
    price: 108420,
    changeAbsolute: 1240,
    changePercent: 1.16,
    sparkline: [106800, 107100, 107500, 107900, 108100, 108300, 108420],
    asOf: minutesAgo(0),
    marketState: "open",
  },
  {
    symbol: "USDJPY",
    label: "USD/JPY",
    price: 151.82,
    changeAbsolute: -0.64,
    changePercent: -0.42,
    sparkline: [152.6, 152.4, 152.1, 151.95, 151.88, 151.9, 151.82],
    asOf: minutesAgo(1),
    marketState: "open",
  },
];

export const MOCK_WEATHER_ALERTS: WeatherAlert[] = [
  {
    id: "wx-kyushu-flood",
    headline: "Flood warning — southern Kyushu river basins",
    severity: "warning",
    latitude: 31.5966,
    longitude: 130.5571,
    region: "Kyushu, Japan",
    effectiveAt: minutesAgo(30),
    expiresAt: new Date(Date.now() + 8 * 3_600_000).toISOString(),
    source: { name: "Japan Meteorological Agency", url: "https://jma.go.jp" },
  },
];
