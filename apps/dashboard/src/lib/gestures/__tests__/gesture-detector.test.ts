import type { HandLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { describe, expect, it } from "vitest";
import { detectGesture } from "../gesture-detector";

function pt(x: number, y: number): NormalizedLandmark {
  return { x, y, z: 0, visibility: 1 };
}

/**
 * A synthetic 21-point hand with fingers extended straight up from the
 * wrist and the thumb held away from the index finger — a neutral "open
 * palm, not pinching" pose. Indices follow MediaPipe's standard convention
 * (see gesture-detector.ts's own comment).
 */
function openHand(originX = 0.5): NormalizedLandmark[] {
  const hand: NormalizedLandmark[] = new Array(21).fill(null).map(() => pt(originX, 0.9));
  hand[0] = pt(originX, 0.9); // wrist
  hand[9] = pt(originX, 0.6); // middle MCP — defines palmSize with wrist
  hand[4] = pt(originX - 0.2, 0.55); // thumb tip, held well away from index
  hand[6] = pt(originX + 0.02, 0.55); // index PIP
  hand[8] = pt(originX + 0.02, 0.2); // index tip — far from wrist, extended
  hand[10] = pt(originX, 0.55); // middle PIP
  hand[12] = pt(originX, 0.2); // middle tip — extended
  hand[14] = pt(originX - 0.02, 0.55); // ring PIP
  hand[16] = pt(originX - 0.02, 0.2); // ring tip — extended
  hand[18] = pt(originX - 0.04, 0.6); // pinky PIP
  hand[20] = pt(originX - 0.04, 0.55); // pinky tip — NOT extended (curled)
  return hand;
}

/** Same base pose, but thumb and index tips brought together — a pinch. */
function pinchingHand(originX = 0.5): NormalizedLandmark[] {
  const hand = openHand(originX);
  hand[4] = pt(originX + 0.01, 0.2); // thumb tip right next to index tip
  hand[8] = pt(originX + 0.02, 0.2); // index tip
  return hand;
}

function resultWith(hands: NormalizedLandmark[][]): HandLandmarkerResult {
  return { landmarks: hands } as HandLandmarkerResult;
}

describe("detectGesture", () => {
  it("reports no hands when landmarks is empty", () => {
    const frame = detectGesture(resultWith([]));
    expect(frame).toEqual({ handCount: 0, pinch: null, openPalm: false, twoHandDistance: null });
  });

  it("detects a pinch when thumb and index tips are close relative to palm size", () => {
    const frame = detectGesture(resultWith([pinchingHand()]));
    expect(frame.handCount).toBe(1);
    expect(frame.pinch).not.toBeNull();
    expect(frame.pinch!.x).toBeCloseTo(0.515, 1);
  });

  it("does not report a pinch when thumb and index are far apart", () => {
    const frame = detectGesture(resultWith([openHand()]));
    expect(frame.pinch).toBeNull();
  });

  it("detects an open palm when 3+ fingers are extended and not pinching", () => {
    const frame = detectGesture(resultWith([openHand()]));
    expect(frame.openPalm).toBe(true);
  });

  it("does not report an open palm while pinching, even with fingers extended", () => {
    const frame = detectGesture(resultWith([pinchingHand()]));
    expect(frame.openPalm).toBe(false);
  });

  it("reports twoHandDistance only when two hands are visible", () => {
    const oneHand = detectGesture(resultWith([openHand()]));
    expect(oneHand.twoHandDistance).toBeNull();

    const twoHands = detectGesture(resultWith([openHand(0.3), openHand(0.7)]));
    expect(twoHands.handCount).toBe(2);
    expect(twoHands.twoHandDistance).toBeCloseTo(0.4, 1);
  });

  it("uses the first hand as primary for pinch/openPalm when multiple hands are present", () => {
    const frame = detectGesture(resultWith([pinchingHand(0.3), openHand(0.7)]));
    expect(frame.pinch).not.toBeNull();
    expect(frame.openPalm).toBe(false);
  });
});
