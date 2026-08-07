import { z } from "zod";

export const OrbState = z.enum([
  "idle",
  "listening",
  "thinking",
  "searching",
  "executing",
  "speaking",
  "error",
  "success",
]);
export type OrbState = z.infer<typeof OrbState>;

export const VoiceStatus = z.enum([
  "offline",
  "connecting",
  "ready",
  "listening",
  "thinking",
  "speaking",
  "executing",
  "error",
]);
export type VoiceStatus = z.infer<typeof VoiceStatus>;

/** VoiceStatus drives OrbState; this is the single source of truth for that mapping. */
export const voiceStatusToOrbState: Record<VoiceStatus, OrbState> = {
  offline: "idle",
  connecting: "thinking",
  ready: "idle",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
  executing: "executing",
  error: "error",
};
