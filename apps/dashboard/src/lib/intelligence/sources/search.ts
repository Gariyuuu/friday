import "server-only";
import { createLogger } from "@/lib/logger";

const logger = createLogger("NETWORK");

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface TavilyResponse {
  results: { title: string; url: string; content: string }[];
}

/**
 * Web search tool (spec §20). Uses Tavily — built specifically for LLM/agent
 * search (clean structured results, no HTML scraping needed), generous free tier.
 * Confirmed against Tavily's current API docs (2026-08-07): POST /search,
 * Authorization: Bearer, JSON body {query}.
 */
export async function searchWeb(
  query: string,
  depth: "quick" | "standard" | "deep" = "standard",
): Promise<WebSearchResult[] | null> {
  const apiKey = process.env.SEARCH_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        search_depth: depth === "deep" ? "advanced" : "basic",
        max_results: depth === "quick" ? 3 : depth === "deep" ? 10 : 5,
      }),
    });

    if (!res.ok) throw new Error(`Tavily responded ${res.status}`);
    const body = (await res.json()) as TavilyResponse;

    return body.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content.slice(0, 500),
    }));
  } catch (error) {
    logger.error("web search failed", { error: String(error) });
    return null;
  }
}
