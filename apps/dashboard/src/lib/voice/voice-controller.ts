import { createLogger } from "@/lib/logger";
import { useOrbStore } from "@/stores/orb-store";
import { executeFridayTool, getFridayToolDefinitions } from "./friday-tools";
import { OpenAIRealtimeSession, type RealtimeServerEvent } from "./realtime-session";

const logger = createLogger("VOICE");

let session: OpenAIRealtimeSession | null = null;

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
    case "error":
      logger.error("realtime session error", { message: event.error?.message });
      store.setVoiceStatus("error");
      break;
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
  useOrbStore.getState().setVoiceStatus("offline");
  useOrbStore.getState().setAudioAmplitude(0);
}

export function toggleVoiceMute(muted: boolean): void {
  session?.setMuted(muted);
}

export function isVoiceConnected(): boolean {
  return session !== null;
}
