import { z } from "zod";

export const IntelligenceCategory = z.enum([
  "geopolitics",
  "economy",
  "markets",
  "technology",
  "weather",
  "science",
  "security",
  "health",
  "culture",
  "other",
]);
export type IntelligenceCategory = z.infer<typeof IntelligenceCategory>;

export const IntelligenceSource = z.object({
  name: z.string(),
  url: z.string().url(),
  publishedAt: z.string().datetime().optional(),
});
export type IntelligenceSource = z.infer<typeof IntelligenceSource>;

export const MediaItem = z.object({
  id: z.string(),
  title: z.string(),
  thumbnailUrl: z.string().url().optional(),
  url: z.string().url(),
  provider: z.enum(["youtube", "other"]),
  publishedAt: z.string().datetime().optional(),
});
export type MediaItem = z.infer<typeof MediaItem>;

export const IntelligenceEvent = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  category: IntelligenceCategory,
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  timestamp: z.string().datetime(),
  sources: z.array(IntelligenceSource),
  relatedMedia: z.array(MediaItem).optional(),
});
export type IntelligenceEvent = z.infer<typeof IntelligenceEvent>;

export const MarketQuote = z.object({
  symbol: z.string(),
  label: z.string(),
  price: z.number(),
  changeAbsolute: z.number(),
  changePercent: z.number(),
  sparkline: z.array(z.number()).optional(),
  asOf: z.string().datetime(),
  marketState: z.enum(["open", "closed", "pre", "post", "unknown"]),
});
export type MarketQuote = z.infer<typeof MarketQuote>;

export const WeatherAlert = z.object({
  id: z.string(),
  headline: z.string(),
  severity: z.enum(["advisory", "watch", "warning", "emergency"]),
  latitude: z.number(),
  longitude: z.number(),
  region: z.string(),
  effectiveAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  source: IntelligenceSource,
});
export type WeatherAlert = z.infer<typeof WeatherAlert>;

/** Every live panel must report freshness — never render stale data silently as current. */
export const DataFreshness = z.object({
  status: z.enum(["live", "loading", "stale", "unavailable"]),
  lastUpdated: z.string().datetime().optional(),
  isMock: z.boolean(),
});
export type DataFreshness = z.infer<typeof DataFreshness>;
