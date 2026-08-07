import type { HandLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";

/**
 * MediaPipe's 21-point hand landmark indices — a stable, long-established
 * convention (not expected to change): 0 wrist, 4 thumb tip, 8 index tip,
 * 12 middle tip, 16 ring tip, 20 pinky tip; *_PIP are the middle knuckle of
 * each non-thumb finger.
 */
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface GestureFrame {
  handCount: number;
  /** Normalized [0,1] position of the primary (first-detected) hand's pinch point, if pinching. */
  pinch: { x: number; y: number } | null;
  /** True when a hand is held open with fingers spread — used for "reset view". */
  openPalm: boolean;
  /** Distance between two hands' wrists (normalized), only set with 2 hands visible — drives zoom. */
  twoHandDistance: number | null;
}

/** Converts raw MediaPipe output into the semantic gestures spec §9 describes. */
export function detectGesture(result: HandLandmarkerResult): GestureFrame {
  const hands = result.landmarks;
  if (!hands || hands.length === 0) {
    return { handCount: 0, pinch: null, openPalm: false, twoHandDistance: null };
  }

  const primary = hands[0]!;
  const palmSize = dist(primary[WRIST]!, primary[MIDDLE_MCP]!) || 0.001;
  const pinchDistance = dist(primary[THUMB_TIP]!, primary[INDEX_TIP]!) / palmSize;
  const isPinching = pinchDistance < 0.55;

  const fingerExtended = (tip: number, pip: number) =>
    dist(primary[tip]!, primary[WRIST]!) > dist(primary[pip]!, primary[WRIST]!) * 1.15;
  const extendedCount = [
    fingerExtended(INDEX_TIP, INDEX_PIP),
    fingerExtended(MIDDLE_TIP, MIDDLE_PIP),
    fingerExtended(RING_TIP, RING_PIP),
    fingerExtended(PINKY_TIP, PINKY_PIP),
  ].filter(Boolean).length;
  const openPalm = extendedCount >= 3 && !isPinching;

  let twoHandDistance: number | null = null;
  if (hands.length >= 2) {
    twoHandDistance = dist(hands[0]![WRIST]!, hands[1]![WRIST]!);
  }

  return {
    handCount: hands.length,
    pinch: isPinching
      ? { x: (primary[THUMB_TIP]!.x + primary[INDEX_TIP]!.x) / 2, y: (primary[THUMB_TIP]!.y + primary[INDEX_TIP]!.y) / 2 }
      : null,
    openPalm,
    twoHandDistance,
  };
}
