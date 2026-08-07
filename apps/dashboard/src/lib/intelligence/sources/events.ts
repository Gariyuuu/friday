import "server-only";
import type { IntelligenceCategory, IntelligenceEvent } from "@friday/types";
import { createLogger } from "@/lib/logger";
import type { IntelligenceSnapshot } from "../provider";
import { getCachedLocation, scheduleGeocode } from "./geocode";
import { MOCK_EVENTS } from "./mock-data";

const logger = createLogger("NETWORK");

/**
 * NewsAPI.org's free "developer" plan is keyless-registration but API-key gated, and
 * is restricted by NewsAPI's own terms to local/dev use (not a hosted production
 * service) — a reasonable fit for a personal assistant running on your own machine.
 * See .env.example NEWS_API_KEY and the checklist in docs/PROJECT_STATE.md.
 */
const CATEGORY_QUERIES: { newsApiCategory: string; category: IntelligenceCategory; pageSize: number }[] = [
  { newsApiCategory: "technology", category: "technology", pageSize: 5 },
  { newsApiCategory: "business", category: "economy", pageSize: 5 },
  { newsApiCategory: "science", category: "science", pageSize: 4 },
];

interface NewsApiArticle {
  source: { name: string };
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
}

interface NewsApiResponse {
  status: string;
  articles: NewsApiArticle[];
}

async function fetchCategory(
  apiKey: string,
  newsApiCategory: string,
  category: IntelligenceCategory,
  pageSize: number,
): Promise<IntelligenceEvent[]> {
  const url = `https://newsapi.org/v2/top-headlines?category=${newsApiCategory}&language=en&pageSize=${pageSize}&apiKey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`NewsAPI responded ${res.status}`);
  const body = (await res.json()) as NewsApiResponse;
  if (body.status !== "ok") throw new Error("NewsAPI returned an error status");

  return body.articles
    .filter((a) => a.title && a.url)
    .map((article, index) => {
      const summary = article.description ?? "";
      const location = getCachedLocation(article.url);
      if (!location) scheduleGeocode(article.url, article.title, summary);

      return {
        id: article.url,
        title: article.title,
        summary,
        category,
        importance: Math.max(0.3, 0.9 - index * 0.1),
        timestamp: article.publishedAt,
        sources: [{ name: article.source.name, url: article.url }],
        // Geocoded in the background (lib/intelligence/sources/geocode.ts) — an LLM
        // extracts a place name, then Nominatim resolves it. Too slow to do inline
        // on a request the user is waiting on, so a marker appears on a later poll
        // once resolved, never blocking or fabricating a location in the meantime.
        ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
      };
    });
}

export async function getLiveEvents(): Promise<IntelligenceSnapshot<IntelligenceEvent[]>> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return {
      data: MOCK_EVENTS,
      freshness: { status: "live", lastUpdated: new Date().toISOString(), isMock: true },
    };
  }

  try {
    const results = await Promise.all(
      CATEGORY_QUERIES.map((q) => fetchCategory(apiKey, q.newsApiCategory, q.category, q.pageSize)),
    );
    const events = results.flat();
    if (events.length === 0) throw new Error("no live articles returned");

    return {
      data: events,
      freshness: { status: "live", lastUpdated: new Date().toISOString(), isMock: false },
    };
  } catch (error) {
    logger.error("live news fetch failed, falling back to demo data", {
      error: String(error),
    });
    return {
      data: MOCK_EVENTS,
      freshness: { status: "stale", lastUpdated: new Date().toISOString(), isMock: true },
    };
  }
}
