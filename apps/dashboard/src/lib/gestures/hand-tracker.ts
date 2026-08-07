import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

/**
 * Confirmed against Google's current MediaPipe docs (2026-08-07), not recalled
 * from training data — the package/CDN/model paths are the kind of thing that
 * drifts. If hand tracking stops initializing, re-verify these first.
 */
const WASM_CDN_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";

let landmarkerPromise: Promise<HandLandmarker> | null = null;

function getHandLandmarker(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_CDN_URL).then((vision) =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 2,
      }),
    );
  }
  return landmarkerPromise;
}

export class HandTracker {
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private lastVideoTime = -1;
  private landmarker: HandLandmarker | null = null;

  async start(onResult: (result: HandLandmarkerResult) => void): Promise<void> {
    this.landmarker = await getHandLandmarker();

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 480, height: 360 },
    });

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = this.stream;
    this.video = video;
    await video.play();

    const loop = () => {
      if (!this.video || !this.landmarker) return;
      if (this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        const result = this.landmarker.detectForVideo(this.video, performance.now());
        onResult(result);
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.video?.pause();
    this.video = null;
    this.stream = null;
    this.rafId = null;
    this.lastVideoTime = -1;
  }

  isActive(): boolean {
    return this.stream !== null;
  }
}
