import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const logger = createLogger("NETWORK");

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

/**
 * A plain text-chat alternative to voice (Phase 4 uses OpenAI Realtime,
 * which this deliberately does NOT touch) — user preference, pointed at
 * their own OpenAI-compatible gateway instead of OpenAI. This mode has no
 * tool access at all (no live news/markets/VM/memory) — said explicitly
 * here rather than let the model imply it can do things it can't in this
 * pathway.
 */
const SYSTEM_PROMPT =
  "You are FRIDAY, a helpful personal AI assistant, responding here through a text chat. " +
  "You do NOT have access to FRIDAY's live tools in this mode — no real-time news, markets, " +
  "weather, cloud VM, or saved memories. If asked about live/current data, say plainly that " +
  "this chat mode can't fetch it (voice mode can) rather than guessing or making something up. " +
  "Be concise and direct.";

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const apiKey = process.env.AI_PLATFORM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI_PLATFORM_API_KEY is not configured — text chat is unavailable" },
      { status: 501 },
    );
  }
  const baseUrl = process.env.AI_PLATFORM_BASE_URL ?? "https://api.gariyuuu.com/v1";
  const model = process.env.AI_PLATFORM_MODEL ?? "Yuu no Sekai";

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...parsed.data.messages],
        stream: true,
        // This gateway's underlying model (Qwen3) defaults to a verbose
        // "thinking" mode that burns far more output tokens than a plain
        // reply needs — a real, previously-documented gotcha for this
        // specific gateway, not a generic OpenAI-compatible option.
        reasoning: { enabled: false },
        max_tokens: 800,
      }),
      // Next.js's dev-mode fetch patch (Data Cache instrumentation) buffers
      // and hangs on this streaming body indefinitely without this — a real
      // bug found via a direct plain-Node fetch test (closed in ~40ms) vs.
      // the same call from inside a route handler (never closed). Also
      // semantically correct: a chat reply must never be cached.
      cache: "no-store",
    });
  } catch (error) {
    logger.error("chat gateway request failed", { error: String(error) });
    return NextResponse.json({ error: "failed to reach the chat gateway" }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const bodyText = await upstream.text().catch(() => "");
    logger.error("chat gateway responded with an error", {
      status: upstream.status,
      body: bodyText.slice(0, 500),
    });
    return NextResponse.json({ error: `chat gateway responded ${upstream.status}` }, { status: 502 });
  }

  // Re-stream only the real text deltas as plain text chunks — simpler for
  // the client than parsing SSE itself, and never forwards the raw upstream
  // payload (usage/cost/provider metadata) to the browser.
  //
  // Pumps eagerly from `start()` rather than reading lazily from `pull()` —
  // a real bug found via live testing: under Next.js dev (Turbopack), the
  // stream's `pull()` stopped being re-invoked after the upstream's last
  // content chunk, so the final read that would observe `done: true` (and
  // call `controller.close()`) never happened, hanging the response
  // indefinitely even though all the real content had already reached the
  // client. A plain Node script doing the identical upstream read loop
  // closed in ~40ms, isolating this to the pull-driven ReadableStream
  // adapter specifically, not the upstream connection.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]" || payload === "") continue;
            try {
              const chunk = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // an occasional malformed/partial SSE line — skip it, don't crash the stream
            }
          }
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
