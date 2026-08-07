import { createLogger } from "@/lib/logger";
import { useGestureStore } from "@/stores/gesture-store";
import { detectGesture, type GestureFrame } from "./gesture-detector";
import { getGlobeCanvas, resetGlobeView } from "./globe-registry";
import { HandTracker } from "./hand-tracker";

const logger = createLogger("UI");
const tracker = new HandTracker();

let wasPinching = false;
let lastTwoHandDistance: number | null = null;
let lastOpenPalmAt = 0;

/**
 * Reuses OrbitControls' own well-tested drag/zoom handling by dispatching
 * synthetic pointer/wheel events at it, rather than reimplementing camera math —
 * a pinch+drag becomes a pointerdown/move/up sequence, a changing two-hand
 * distance becomes a wheel event. Spec §9's gesture set (pinch+drag rotate,
 * two-hand zoom, open-palm reset).
 */
function dispatchPointer(type: "pointerdown" | "pointermove" | "pointerup", nx: number, ny: number) {
  const canvas = getGlobeCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  // Mirror horizontally — feels natural facing the camera, like a mirror.
  const clientX = rect.left + (1 - nx) * rect.width;
  const clientY = rect.top + ny * rect.height;
  canvas.dispatchEvent(
    new PointerEvent(type, {
      clientX,
      clientY,
      pointerId: 1,
      bubbles: true,
      cancelable: true,
      pointerType: "touch",
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
    }),
  );
}

function dispatchWheel(deltaY: number) {
  const canvas = getGlobeCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new WheelEvent("wheel", {
      deltaY,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function handleFrame(frame: GestureFrame) {
  if (frame.pinch) {
    if (!wasPinching) {
      dispatchPointer("pointerdown", frame.pinch.x, frame.pinch.y);
    } else {
      dispatchPointer("pointermove", frame.pinch.x, frame.pinch.y);
    }
    wasPinching = true;
  } else if (wasPinching) {
    dispatchPointer("pointerup", 0, 0);
    wasPinching = false;
  }

  if (frame.twoHandDistance !== null) {
    if (lastTwoHandDistance !== null) {
      const delta = frame.twoHandDistance - lastTwoHandDistance;
      if (Math.abs(delta) > 0.002) dispatchWheel(-delta * 800);
    }
    lastTwoHandDistance = frame.twoHandDistance;
  } else {
    lastTwoHandDistance = null;
  }

  if (frame.openPalm) {
    const now = performance.now();
    // Debounce — an open palm can be held for a while; only reset once per hold.
    if (now - lastOpenPalmAt > 1200) {
      resetGlobeView();
      lastOpenPalmAt = now;
    }
  } else {
    lastOpenPalmAt = 0;
  }
}

export async function enableGestures(): Promise<void> {
  const store = useGestureStore.getState();
  try {
    await tracker.start((result) => {
      useGestureStore.getState().setCameraActive(true);
      handleFrame(detectGesture(result));
    });
    store.setEnabled(true);
  } catch (error) {
    logger.error("failed to start hand tracking", { error: String(error) });
    store.setEnabled(false);
    store.setCameraActive(false);
    throw error;
  }
}

export function disableGestures(): void {
  tracker.stop();
  wasPinching = false;
  lastTwoHandDistance = null;
  useGestureStore.getState().setEnabled(false);
  useGestureStore.getState().setCameraActive(false);
}

export function isGesturesActive(): boolean {
  return tracker.isActive();
}
