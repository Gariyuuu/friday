/**
 * OpenAI Realtime API is a fast-moving surface — these values were confirmed against
 * OpenAI's live docs on 2026-08-06 (developers.openai.com/api/docs/guides/realtime,
 * .../realtime-webrtc, .../realtime-conversations, .../realtime-transcription), NOT
 * from training-data memory, because the API has renamed endpoints before (sessions
 * → client_secrets) and training data is not a safe source here. If a voice
 * connection starts failing, re-verify these against current docs before assuming
 * the client code is at fault.
 */
export const REALTIME_MODEL = "gpt-realtime-2.1";
export const REALTIME_VOICE = "marin";
export const TRANSCRIBE_MODEL = "gpt-4o-transcribe";

export const OPENAI_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
export const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
export const REALTIME_DATA_CHANNEL_LABEL = "oai-events";
