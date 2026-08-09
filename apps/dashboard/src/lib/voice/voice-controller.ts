import { createLogger } from "@/lib/logger";
import { useOrbStore } from "@/stores/orb-store";
import { useToastStore } from "@/stores/toast-store";
import { executeFridayTool, getFridayToolDefinitions } from "./friday-tools";
import { OpenAIRealtimeSession, type RealtimeServerEvent } from "./realtime-session";

const logger = createLogger("VOICE");

/**
 * Without an explicit system prompt, the realtime model has no reason to
 * proactively call open_intelligence_dashboard/get_news/search_video
 * together — tool_choice is "auto", so with no instructions it can (and in
 * practice did) just answer "what's happening in the world" conversationally
 * without ever opening the dashboard or fetching real data. This is the fix
 * for that: explicit, load-bearing instructions, not just tool descriptions.
 */
const FRIDAY_INSTRUCTIONS = `You are FRIDAY, a cinematic personal AI assistant running on the user's Mac. Be concise and warm, not chatty — a few sentences per turn unless asked for detail.

Tool use is not optional narration — when a tool exists for what the user asked, call it and answer from its real result. Never invent data, headlines, prices, or status.

Global/world-news requests (e.g. "what's happening in the world", "give me a briefing", "any big news today") are a specific case that needs MULTIPLE tool calls in the same turn, not just one:
1. Call open_intelligence_dashboard first, so the globe/news/markets dashboard is actually visible on screen — this is a visual product, don't just describe verbally what could be shown.
2. Call get_news to fetch real current headlines.
3. Pick AT MOST ONE story — the single most notable one — and call search_video for it plus focus_event with its id, so the globe highlights it while you talk about it. Do not call search_video more than once per turn; API calls cost real money.
4. Then narrate a brief summary grounded in what those tools actually returned.

If a tool reports it isn't configured or returns no results, say so plainly — don't paper over it with a plausible-sounding guess.`;

let session: OpenAIRealtimeSession | null = null;
let idleTimer: ReturnType<typeof setInterval> | null = null;
let lastActivityAt = 0;

// Voice billing is per second of connected audio, not per word spoken — a
// session left open while the user steps away keeps costing money in
// silence. Auto-disconnect after sustained inactivity rather than relying on
// the user remembering to click "End Voice."
const IDLE_TIMEOUT_MS = 3 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 20 * 1000;

function markActivity() {
  lastActivityAt = Date.now();
}

interface FunctionCallOutputItem {
  type: "function_call";
  name: string;
  call_id: string;
  arguments: string;
}

function isFunctionCall(item: unknown): item is FunctionCallOutputItem {
  return (
    typeof item === "object" &&
    item !== null &&
    (item as { type?: unknown }).type === "function_call"
  );
}

/** Executes every function call from a turn, reports results back, then lets the model continue. */
async function handleFunctionCalls(calls: FunctionCallOutputItem[]) {
  for (const call of calls) {
    let output: unknown;
    try {
      output = await executeFridayTool(call.name, call.arguments);
    } catch (error) {
      output = { error: String(error) };
      logger.error("tool call failed", { tool: call.name, error: String(error) });
    }
    session?.send({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(output ?? {}),
      },
    });
  }
  session?.send({ type: "response.create" });
  useOrbStore.getState().setVoiceStatus("thinking");
}

function handleServerEvent(event: RealtimeServerEvent) {
  const store = useOrbStore.getState();
  markActivity();

  switch (event.type) {
    case "session.created":
      store.setVoiceStatus("ready");
      break;
    case "input_audio_buffer.speech_started":
      store.setVoiceStatus("listening");
      store.setUserTranscript("");
      break;
    case "input_audio_buffer.speech_stopped":
      store.setVoiceStatus("thinking");
      break;
    case "conversation.item.input_audio_transcription.completed":
      if (typeof event.transcript === "string") store.setUserTranscript(event.transcript);
      break;
    case "response.output_audio_transcript.delta":
      if (useOrbStore.getState().voiceStatus !== "speaking") {
        store.setTranscript("");
        store.setVoiceStatus("speaking");
      }
      if (typeof event.delta === "string") store.appendTranscript(event.delta);
      break;
    case "response.done": {
      const output = (event.response as { output?: unknown[] } | undefined)?.output ?? [];
      const calls = output.filter(isFunctionCall);
      if (calls.length > 0) {
        store.setVoiceStatus("executing");
        void handleFunctionCalls(calls);
      } else {
        store.setVoiceStatus("ready");
        store.setAudioAmplitude(0);
      }
      break;
    }
    case "error": {
      const message = event.error?.message ?? "";
      // Real race, more likely now that a single turn often chains several
      // tool calls (see FRIDAY_INSTRUCTIONS): the server can auto-create a
      // response for a new user turn (VAD-detected) at the same moment
      // handleFunctionCalls() sends its own response.create() to continue
      // the previous turn. The rejected response.create is redundant, not
      // fatal — the in-flight response the server already started continues
      // normally. Surfacing this as voiceStatus "error" would show a false
      // "Something went wrong" over an interaction that's actually still
      // succeeding, so just log it.
      if (message.includes("already has an active response in progress")) {
        logger.warn("redundant response.create ignored (a response was already in flight)", { message });
        break;
      }
      logger.error("realtime session error", { message });
      store.setVoiceStatus("error");
      break;
    }
    default:
      break;
  }
}

export async function connectVoice(): Promise<void> {
  if (session) return;
  const store = useOrbStore.getState();
  store.setVoiceStatus("connecting");

  const next = new OpenAIRealtimeSession({
    onServerEvent: handleServerEvent,
    onConnectionStateChange: (state) => {
      if (state === "failed" || state === "disconnected" || state === "closed") {
        useOrbStore.getState().setVoiceStatus("offline");
      }
    },
    onAudioLevel: (level) => {
      if (useOrbStore.getState().voiceStatus === "speaking") {
        useOrbStore.getState().setAudioAmplitude(level);
      }
    },
  });

  try {
    await next.connect();
    session = next;
    markActivity();
    idleTimer = setInterval(() => {
      if (Date.now() - lastActivityAt > IDLE_TIMEOUT_MS) {
        logger.info("disconnecting voice session after sustained inactivity");
        useToastStore.getState().show("Voice session ended after 3 minutes of inactivity", "success");
        disconnectVoice();
      }
    }, IDLE_CHECK_INTERVAL_MS);
    // Give FRIDAY her real capabilities for this session — local Mac tools (still
    // gated by the same approval engine as the command palette), live intelligence
    // data, dashboard control, and memory (spec §29's orchestration layer).
    next.send({
      type: "session.update",
      session: {
        // Confirmed required via a live 400 ("Missing required parameter:
        // 'session.type'") — session.update needs this even though it wasn't
        // shown in the doc example this was first written from.
        type: "realtime",
        instructions: FRIDAY_INSTRUCTIONS,
        tools: getFridayToolDefinitions(),
        tool_choice: "auto",
      },
    });
  } catch (error) {
    logger.error("failed to connect voice session", { error: String(error) });
    store.setVoiceStatus("error");
    throw error;
  }
}

export function disconnectVoice(): void {
  session?.disconnect();
  session = null;
  if (idleTimer !== null) {
    clearInterval(idleTimer);
    idleTimer = null;
  }
  useOrbStore.getState().setVoiceStatus("offline");
  useOrbStore.getState().setAudioAmplitude(0);
}

export function toggleVoiceMute(muted: boolean): void {
  session?.setMuted(muted);
}

export function isVoiceConnected(): boolean {
  return session !== null;
}

/** Shared by the in-app ⌥+V listener and the Tauri system-wide global shortcut. */
export async function toggleVoice(): Promise<void> {
  if (isVoiceConnected()) {
    disconnectVoice();
  } else {
    await connectVoice();
  }
}
