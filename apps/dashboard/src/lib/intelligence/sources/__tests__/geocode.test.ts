import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function openAiResponse(text: string) {
  return new Response(
    JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text }] }] }),
    { status: 200 },
  );
}

function nominatimResponse(results: { lat: string; lon: string }[]) {
  return new Response(JSON.stringify(results), { status: 200 });
}

/**
 * Waits for a pending scheduleGeocode task to finish. The module serializes
 * work through its own internal queue and rate-limits Nominatim calls via a
 * real setTimeout — fake timers plus a few real microtask turns (for the
 * fetch promises themselves) reliably drains it without a real ~1.1s wait
 * per test.
 */
async function flush() {
  await vi.advanceTimersByTimeAsync(1200);
}

describe("geocode (scheduleGeocode / getCachedLocation)", () => {
  // A fresh module import per test resets ALL internal state (cache,
  // in-flight set, the serialization queue, and the Nominatim rate-limit
  // clock) — otherwise these tests would interfere with each other, since
  // the module intentionally has no exported reset function (it's meant to
  // live for the whole app process, not be torn down between requests).
  let getCachedLocation: (id: string) => unknown;
  let scheduleGeocode: (id: string, title: string, summary: string) => void;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.stubGlobal("fetch", vi.fn());
    vi.resetModules();
    const mod = await import("../geocode");
    getCachedLocation = mod.getCachedLocation;
    scheduleGeocode = mod.scheduleGeocode;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns undefined for an event that was never scheduled", () => {
    expect(getCachedLocation("never-scheduled")).toBeUndefined();
  });

  it("resolves a full pipeline: extraction finds a place, Nominatim geocodes it", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(openAiResponse("Tokyo, Japan"))
      .mockResolvedValueOnce(nominatimResponse([{ lat: "35.6762", lon: "139.6503" }]));

    scheduleGeocode("e1", "BOJ holds rates", "The Bank of Japan kept rates unchanged.");
    await flush();

    expect(getCachedLocation("e1")).toEqual({ latitude: 35.6762, longitude: 139.6503 });
  });

  it("sends the Nominatim request with a URL-encoded place and the required User-Agent", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(openAiResponse("São Paulo, Brazil"))
      .mockResolvedValueOnce(nominatimResponse([{ lat: "-23.55", lon: "-46.63" }]));

    scheduleGeocode("e1", "title", "summary");
    await flush();

    const nominatimCall = vi.mocked(fetch).mock.calls.find((c) => String(c[0]).includes("nominatim"));
    expect(nominatimCall).toBeDefined();
    expect(String(nominatimCall![0])).toContain(encodeURIComponent("São Paulo, Brazil"));
    expect((nominatimCall![1] as RequestInit).headers).toMatchObject({
      "User-Agent": expect.stringContaining("FRIDAY"),
    });
  });

  it("caches no-location when the model replies NONE, without calling Nominatim", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(openAiResponse("NONE"));

    scheduleGeocode("e1", "Samsung breaks pre-order records", "no place mentioned");
    await flush();

    expect(getCachedLocation("e1")).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1); // extraction only, no geocode call
  });

  it("caches no-location when Nominatim returns no results for the extracted place", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(openAiResponse("Nowhereville"))
      .mockResolvedValueOnce(nominatimResponse([]));

    scheduleGeocode("e1", "title", "summary");
    await flush();

    expect(getCachedLocation("e1")).toBeUndefined();
  });

  it("does not call fetch at all when OPENAI_API_KEY is unset", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    scheduleGeocode("e1", "title", "summary");
    await flush();

    expect(fetch).not.toHaveBeenCalled();
    expect(getCachedLocation("e1")).toBeUndefined();
  });

  it("never throws and caches no-location when the extraction API errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("server error", { status: 500 }));

    expect(() => scheduleGeocode("e1", "title", "summary")).not.toThrow();
    await flush();

    expect(getCachedLocation("e1")).toBeUndefined();
  });

  it("never throws and caches no-location when the Nominatim call errors", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(openAiResponse("Paris, France"))
      .mockRejectedValueOnce(new Error("network down"));

    scheduleGeocode("e1", "title", "summary");
    await flush();

    expect(getCachedLocation("e1")).toBeUndefined();
  });

  it("does not schedule a duplicate extraction for an event already cached", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(openAiResponse("Berlin, Germany"))
      .mockResolvedValueOnce(nominatimResponse([{ lat: "52.52", lon: "13.405" }]));

    scheduleGeocode("e1", "title", "summary");
    await flush();
    expect(getCachedLocation("e1")).toEqual({ latitude: 52.52, longitude: 13.405 });

    const callCountAfterFirst = vi.mocked(fetch).mock.calls.length;
    scheduleGeocode("e1", "title", "summary"); // already cached — should be a no-op
    await flush();

    expect(vi.mocked(fetch).mock.calls.length).toBe(callCountAfterFirst);
  });

  it("does not schedule a second extraction while the first is still in flight for the same id", async () => {
    let extractionStarted!: () => void;
    const started = new Promise<void>((resolve) => (extractionStarted = resolve));
    let resolveExtraction!: (value: Response) => void;

    vi.mocked(fetch).mockImplementationOnce(() => {
      extractionStarted();
      return new Promise((resolve) => (resolveExtraction = resolve));
    });

    scheduleGeocode("e1", "title", "summary"); // starts, still pending
    scheduleGeocode("e1", "title", "summary"); // should be deduped via the in-flight set

    await started; // wait until the mocked fetch has actually been invoked
    resolveExtraction(openAiResponse("NONE"));
    await flush();

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
