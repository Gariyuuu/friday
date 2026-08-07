import "server-only";
import type { MediaItem } from "@friday/types";
import { createLogger } from "@/lib/logger";

const logger = createLogger("NETWORK");

interface YouTubeSearchResponse {
  items: {
    id: { videoId: string };
    snippet: {
      title: string;
      publishedAt: string;
      channelTitle: string;
      thumbnails: { default?: { url: string }; medium?: { url: string } };
    };
  }[];
}

/** Video search (spec §18) via YouTube Data API v3 — verified against live docs. */
export async function searchVideo(query: string, maxResults = 6): Promise<MediaItem[] | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`YouTube responded ${res.status}`);
    const body = (await res.json()) as YouTubeSearchResponse;

    return body.items
      .filter((item) => item.id.videoId)
      .map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        provider: "youtube" as const,
        publishedAt: item.snippet.publishedAt,
      }));
  } catch (error) {
    logger.error("video search failed", { error: String(error) });
    return null;
  }
}
