import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { searchVideo } = await import("../video");

describe("searchVideo", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null without calling fetch when YOUTUBE_API_KEY is unset", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    const result = await searchVideo("test query");
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("builds the request URL with the expected query params", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "AIza-test-key");
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    await searchVideo("SpaceX launch", 4);

    const calledUrl = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe("https://www.googleapis.com/youtube/v3/search");
    expect(calledUrl.searchParams.get("part")).toBe("snippet");
    expect(calledUrl.searchParams.get("q")).toBe("SpaceX launch");
    expect(calledUrl.searchParams.get("type")).toBe("video");
    expect(calledUrl.searchParams.get("maxResults")).toBe("4");
    expect(calledUrl.searchParams.get("key")).toBe("AIza-test-key");
  });

  it("defaults maxResults to 6 when not specified", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "AIza-test-key");
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));

    await searchVideo("query");

    const calledUrl = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(calledUrl.searchParams.get("maxResults")).toBe("6");
  });

  it("maps YouTube's response shape into MediaItem[], preferring the medium thumbnail", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "AIza-test-key");
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: { videoId: "abc123" },
              snippet: {
                title: "A real video",
                publishedAt: "2026-08-01T00:00:00Z",
                channelTitle: "Someone",
                thumbnails: { default: { url: "default.jpg" }, medium: { url: "medium.jpg" } },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await searchVideo("query");
    expect(result).toEqual([
      {
        id: "abc123",
        title: "A real video",
        thumbnailUrl: "medium.jpg",
        url: "https://www.youtube.com/watch?v=abc123",
        provider: "youtube",
        publishedAt: "2026-08-01T00:00:00Z",
      },
    ]);
  });

  it("falls back to the default thumbnail when no medium thumbnail exists", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "AIza-test-key");
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: { videoId: "abc123" },
              snippet: {
                title: "A real video",
                publishedAt: "2026-08-01T00:00:00Z",
                channelTitle: "Someone",
                thumbnails: { default: { url: "default.jpg" } },
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await searchVideo("query");
    expect(result![0]!.thumbnailUrl).toBe("default.jpg");
  });

  it("filters out items with no videoId", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "AIza-test-key");
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: {},
              snippet: {
                title: "No id",
                publishedAt: "2026-08-01T00:00:00Z",
                channelTitle: "x",
                thumbnails: {},
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await searchVideo("query");
    expect(result).toEqual([]);
  });

  it("returns null (not a throw) on a non-ok response", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "AIza-test-key");
    vi.mocked(fetch).mockResolvedValue(new Response("quota exceeded", { status: 403 }));

    await expect(searchVideo("query")).resolves.toBeNull();
  });

  it("returns null (not a throw) when fetch itself rejects", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "AIza-test-key");
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    await expect(searchVideo("query")).resolves.toBeNull();
  });
});
