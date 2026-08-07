import { createLogger } from "@/lib/logger";
import { OPENAI_REALTIME_CALLS_URL, REALTIME_DATA_CHANNEL_LABEL } from "./config";

const logger = createLogger("VOICE");

export interface RealtimeServerEvent {
  type: string;
  transcript?: string;
  delta?: string;
  error?: { message?: string };
  [key: string]: unknown;
}

export interface RealtimeSessionCallbacks {
  onServerEvent?: (event: RealtimeServerEvent) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  /** 0-1 RMS amplitude of the assistant's outgoing audio, sampled every animation frame. */
  onAudioLevel?: (level: number) => void;
}

/**
 * One WebRTC voice session with OpenAI's Realtime API. See lib/voice/config.ts for
 * why the exact endpoints/model here are pinned to what was verified against live
 * docs rather than assumed from training data.
 */
export class OpenAIRealtimeSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private rafId: number | null = null;

  constructor(private callbacks: RealtimeSessionCallbacks) {}

  async connect(): Promise<void> {
    const tokenRes = await fetch("/api/voice/session", { method: "POST" });
    if (!tokenRes.ok) {
      const body = (await tokenRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "failed to create voice session");
    }
    const { value: ephemeralKey } = (await tokenRes.json()) as { value: string };

    const pc = new RTCPeerConnection();
    this.pc = pc;
    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange?.(pc.connectionState);
    };

    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    this.audioEl = audioEl;
    pc.ontrack = (event) => {
      audioEl.srcObject = event.streams[0] ?? null;
      if (event.streams[0]) this.setupAnalyser(event.streams[0]);
    };

    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micStream = micStream;
    micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

    const dc = pc.createDataChannel(REALTIME_DATA_CHANNEL_LABEL);
    this.dc = dc;
    dc.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as RealtimeServerEvent;
        this.callbacks.onServerEvent?.(parsed);
      } catch (error) {
        logger.warn("received unparseable realtime event", { error: String(error) });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpRes = await fetch(OPENAI_REALTIME_CALLS_URL, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
    });
    if (!sdpRes.ok) {
      throw new Error(`voice connection rejected (${sdpRes.status})`);
    }
    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  private setupAnalyser(stream: MediaStream) {
    const audioCtx = new AudioContext();
    this.audioCtx = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i]! - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      this.callbacks.onAudioLevel?.(Math.min(1, rms * 4));
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  send(event: Record<string, unknown>) {
    if (this.dc?.readyState === "open") {
      this.dc.send(JSON.stringify(event));
    }
  }

  setMuted(muted: boolean) {
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  disconnect() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    void this.audioCtx?.close();
    this.dc?.close();
    this.pc?.close();
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.pc = null;
    this.dc = null;
    this.micStream = null;
    this.audioCtx = null;
  }
}
