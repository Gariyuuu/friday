import { create } from "zustand";
import { voiceStatusToOrbState, type OrbState, type VoiceStatus } from "@friday/types";

interface OrbStoreState {
  voiceStatus: VoiceStatus;
  orbState: OrbState;
  /** 0-1 amplitude driving the orb's audio-reactive geometry while speaking/listening. */
  audioAmplitude: number;
  /** FRIDAY's current/last spoken response, streamed in as deltas arrive. */
  transcript: string;
  /** The user's last completed utterance, once OpenAI finishes transcribing it. */
  userTranscript: string;
  setVoiceStatus: (status: VoiceStatus) => void;
  setAudioAmplitude: (amplitude: number) => void;
  setTranscript: (text: string) => void;
  appendTranscript: (delta: string) => void;
  setUserTranscript: (text: string) => void;
  /** Escape hatch for demo/dev tooling that wants a state not reachable via voiceStatus alone. */
  forceOrbState: (state: OrbState) => void;
}

export const useOrbStore = create<OrbStoreState>((set) => ({
  voiceStatus: "offline",
  orbState: "idle",
  audioAmplitude: 0,
  transcript: "",
  userTranscript: "",
  setVoiceStatus: (status) =>
    set({ voiceStatus: status, orbState: voiceStatusToOrbState[status] }),
  setAudioAmplitude: (amplitude) =>
    set({ audioAmplitude: Math.min(1, Math.max(0, amplitude)) }),
  setTranscript: (text) => set({ transcript: text }),
  appendTranscript: (delta) => set((s) => ({ transcript: s.transcript + delta })),
  setUserTranscript: (text) => set({ userTranscript: text }),
  forceOrbState: (state) => set({ orbState: state }),
}));
