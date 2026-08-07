import "server-only";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import {
  OPENAI_CLIENT_SECRETS_URL,
  REALTIME_MODEL,
  REALTIME_VOICE,
  TRANSCRIBE_MODEL,
} from "@/lib/voice/config";

const logger = createLogger("VOICE");

/**
 * Mints a short-lived ephemeral token so the browser can open a WebRTC session
 * directly with OpenAI without ever seeing OPENAI_API_KEY. This is the one place
 * that key is read for voice — see docs/ARCHITECTURE.md's client/server boundary.
 */
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured — voice is unavailable" },
      { status: 501 },
    );
  }

  try {
    const res = await fetch(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          audio: {
            input: { transcription: { model: TRANSCRIBE_MODEL } },
            output: { voice: REALTIME_VOICE },
          },
          turn_detection: { type: "semantic_vad" },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error("OpenAI client_secrets request failed", { status: res.status, body });
      return NextResponse.json({ error: "failed to create voice session" }, { status: 502 });
    }

    const data = (await res.json()) as { value: string; expires_at?: number };
    logger.info("minted realtime ephemeral token");
    return NextResponse.json({ value: data.value, expiresAt: data.expires_at });
  } catch (error) {
    logger.error("failed to mint voice session token", { error: String(error) });
    return NextResponse.json({ error: "failed to create voice session" }, { status: 500 });
  }
}
