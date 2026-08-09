import { NextResponse } from "next/server";

/**
 * Reports which integrations are configured — booleans only, never the actual
 * secret values. Consumed by the Settings page so it shows real status instead of
 * a hardcoded guess. See spec §46: never display configured secrets after saving.
 */
export async function GET() {
  return NextResponse.json({
    ai: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
    },
    intelligence: {
      news: Boolean(process.env.NEWS_API_KEY),
      equities: Boolean(process.env.TWELVE_DATA_API_KEY),
      crypto: true, // CoinGecko, no key required
      weather: true, // NWS, no key required (US coverage only)
      video: Boolean(process.env.YOUTUBE_API_KEY),
      search: Boolean(process.env.SEARCH_API_KEY),
    },
    // Voice provider is OpenAI Realtime (decided this session — cheaper and no
    // separate infra to run vs. LiveKit). It just needs OPENAI_API_KEY.
    voice: Boolean(process.env.OPENAI_API_KEY),
    // A typed alternative to voice, pointed at the user's own OpenAI-compatible
    // gateway (see app/api/chat/route.ts) — separate from `voice` above.
    chat: Boolean(process.env.AI_PLATFORM_API_KEY),
    memory: Boolean(process.env.DATABASE_URL),
    // run_on_vm/browse_on_vm are SSH-based (lib/vm/config.ts's VM_HOST), not
    // the reserved-for-future VM_GATEWAY_URL — this was checking the wrong
    // var and always reported false even with the VM fully configured.
    vm: Boolean(process.env.VM_HOST),
  });
}
