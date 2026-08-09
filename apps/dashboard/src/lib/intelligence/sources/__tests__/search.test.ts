import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { searchWeb } = await import("../search");

describe("searchWeb", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null without calling fetch when SEARCH_API_KEY is unset", async () => {
    vi.stubEnv("SEARCH_API_KEY", "");
    const result = await searchWeb("test query");
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the query, auth header, and correct body shape for the default depth", async () => {
    vi.stubEnv("SEARCH_API_KEY", "tvly-test-key");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), { status: 200 }),
    );

    await searchWeb("current AI news");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.tavily.com/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer tvly-test-key" }),
      }),
    );
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(body).toEqual({ query: "current AI news", search_depth: "basic", max_results: 5 });
  });

  it.each([
    ["quick", "basic", 3],
    ["standard", "basic", 5],
    ["deep", "advanced", 10],
  ] as const)("depth=%s maps to search_depth=%s, max_results=%d", async (depth, expectedDepth, expectedMax) => {
    vi.stubEnv("SEARCH_API_KEY", "tvly-test-key");
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));

    await searchWeb("query", depth);

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(body.search_depth).toBe(expectedDepth);
    expect(body.max_results).toBe(expectedMax);
  });

  it("maps Tavily's response shape into WebSearchResult[], truncating snippets to 500 chars", async () => {
    vi.stubEnv("SEARCH_API_KEY", "tvly-test-key");
    const longContent = "x".repeat(600);
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ title: "A page", url: "https://example.com", content: longContent }],
        }),
        { status: 200 },
      ),
    );

    const result = await searchWeb("query");
    expect(result).toEqual([{ title: "A page", url: "https://example.com", snippet: "x".repeat(500) }]);
  });

  it("returns null (not a throw) when Tavily responds with a non-ok status", async () => {
    vi.stubEnv("SEARCH_API_KEY", "tvly-test-key");
    vi.mocked(fetch).mockResolvedValue(new Response("rate limited", { status: 429 }));

    await expect(searchWeb("query")).resolves.toBeNull();
  });

  it("returns null (not a throw) when fetch itself rejects", async () => {
    vi.stubEnv("SEARCH_API_KEY", "tvly-test-key");
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    await expect(searchWeb("query")).resolves.toBeNull();
  });
});
