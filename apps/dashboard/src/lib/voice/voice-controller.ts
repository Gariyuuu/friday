import { createLogger } from "@/lib/logger";
import { useOrbStore } from "@/stores/orb-store";
import { OpenAIRealtimeSession, type RealtimeServerEvent } from "./realtime-session";

const logger = createLogger("VOICE");

let session: OpenAIRealtimeSession | null = null;

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
    case "response.done":
      store.setVoiceStatus("ready");
      store.setAudioAmplitude(0);
      break;
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
