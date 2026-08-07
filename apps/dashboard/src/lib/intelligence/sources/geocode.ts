import "server-only";
import { createLogger } from "@/lib/logger";

const logger = createLogger("NETWORK");

/**
 * Confirmed live against api.openai.com (2026-08-07): gpt-5-nano is the cheapest
 * current text model ($0.05/$0.40 per MTok, developers.openai.com/api/docs/pricing).
 * It's a reasoning model — reasoning tokens count against max_output_tokens, so a
 * naive small budget returns "incomplete" with zero text. reasoning.effort:"minimal"
 * + max_output_tokens:100 was the smallest combination that reliably completed in
 * live testing.
 */
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const EXTRACTION_MODEL = "gpt-5-nano";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "FRIDAY-Personal-AI/0.7 (personal single-user assistant, no public traffic)";
const NOMINATIM_MIN_INTERVAL_MS = 1100; // Nominatim usage policy: max ~1 request/sec

interface GeoPoint {
  latitude: number;
  longitude: number;
}

const cache = new Map<string, GeoPoint | null>();
const inFlight = new Set<string>();

// Serializes both the OpenAI extraction call and the Nominatim call for a given
// event so background geocoding never bursts past Nominatim's rate limit.
let queue: Promise<void> = Promise.resolve();
let lastNominatimCall = 0;

function enqueue(task: () => Promise<void>): void {
  queue = queue.then(task, task);
}

async function extractLocationName(title: string, summary: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EXTRACTION_MODEL,
      reasoning: { effort: "minimal" },
      max_output_tokens: 100,
      input: [
        {
          type: "message",
          role: "developer",
          content:
            "Extract the single most specific real-world place name (city and " +
            "country, or just country) this news story is about. Reply with ONLY " +
            "the place name, nothing else, no punctuation, no explanation. If no " +
            "specific real-world place is clearly identifiable, reply with exactly NONE.",
        },
        { type: "message", role: "user", content: `Title: ${title}\nDescription: ${summary}` },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI Responses API returned ${res.status}`);
  const body = (await res.json()) as { output?: { type: string; content?: { type: string; text?: string }[] }[] };
  const message = body.output?.find((item) => item.type === "message");
  const text = message?.content?.find((c) => c.type === "output_text")?.text?.trim();
  if (!text || text.toUpperCase() === "NONE") return null;
  return text;
}

async function geocodePlaceName(place: string): Promise<GeoPoint | null> {
  const wait = NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastNominatimCall);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimCall = Date.now();

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(place)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim returned ${res.status}`);
  const results = (await res.json()) as { lat: string; lon: string }[];
  const first = results[0];
  if (!first) return null;
  return { latitude: Number.parseFloat(first.lat), longitude: Number.parseFloat(first.lon) };
}

/** Cached, synchronous — never blocks a request. Returns undefined until resolved. */
export function getCachedLocation(eventId: string): GeoPoint | undefined {
  const hit = cache.get(eventId);
  return hit ?? undefined;
}

/**
 * Fire-and-forget: geocoding a real headline needs an LLM extraction call plus a
 * rate-limited geocoder lookup, both too slow to do inline on a request a user is
 * waiting on. Schedules the work in the background; the globe marker appears on a
 * later poll once `cache` has the answer. Never throws — a failure just means that
 * event stays without a marker, same as before this feature existed.
 */
export function scheduleGeocode(eventId: string, title: string, summary: string): void {
  if (cache.has(eventId) || inFlight.has(eventId)) return;
  inFlight.add(eventId);

  enqueue(async () => {
    try {
      const place = await extractLocationName(title, summary);
      const point = place ? await geocodePlaceName(place) : null;
      cache.set(eventId, point);
    } catch (error) {
      logger.error("background event geocoding failed", { eventId, error: String(error) });
      cache.set(eventId, null);
    } finally {
      inFlight.delete(eventId);
    }
  });
}
