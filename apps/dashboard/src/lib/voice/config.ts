/**
 * OpenAI Realtime API is a fast-moving surface — these values were confirmed against
 * OpenAI's live docs on 2026-08-06 (developers.openai.com/api/docs/guides/realtime,
 * .../realtime-webrtc, .../realtime-conversations, .../realtime-transcription), NOT
 * from training-data memory, because the API has renamed endpoints before (sessions
 * → client_secrets) and training data is not a safe source here. If a voice
 * connection starts failing, re-verify these against current docs before assuming
 * the client code is at fault.
 */
/**
 * Confirmed pricing (developers.openai.com/api/docs/pricing, 2026-08-06):
 * gpt-realtime-2.1        — $32/1M audio-input tokens, $64/1M audio-output tokens
 * gpt-realtime-2.1-mini   — $10/1M audio-input tokens, $20/1M audio-output tokens
 * Using the mini variant — ~3x cheaper for personal conversational use, which is
 * what the user asked for ("cheaper is better"). Bump to the full model above if
 * voice quality/instruction-following isn't good enough once tested.
 */
export const REALTIME_MODEL = "gpt-realtime-2.1-mini";
export const REALTIME_VOICE = "marin";
export const TRANSCRIBE_MODEL = "gpt-4o-transcribe";

export const OPENAI_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
export const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
export const REALTIME_DATA_CHANNEL_LABEL = "oai-events";
