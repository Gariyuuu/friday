import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GestureFrame } from "../gesture-detector";

// zustand's persist middleware reads window.localStorage once at
// module-evaluation time — stub before dynamically importing gesture-store.ts
// (directly or transitively via gesture-controller.ts).
const memoryStore = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => memoryStore.set(key, value),
    removeItem: (key: string) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
  },
});

/**
 * dispatchPointer/dispatchWheel/handleFrame translate semantic gestures into
 * synthetic DOM PointerEvent/WheelEvent dispatched at the globe's canvas —
 * the logic that lets gestures drive OrbitControls without reimplementing
 * camera math. This has never been directly tested; only exercised
 * end-to-end via a real webcam, which can't verify the coordinate math or
 * the open-palm reset debounce precisely.
 */
describe("gesture-controller event dispatch", () => {
  let canvas: HTMLCanvasElement;
  let dispatchPointer: typeof import("../gesture-controller").dispatchPointer;
  let dispatchWheel: typeof import("../gesture-controller").dispatchWheel;
  let handleFrame: typeof import("../gesture-controller").handleFrame;
  let resetGlobeViewMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    document.body.innerHTML = '<div data-gesture-target="globe"><canvas></canvas></div>';
    canvas = document.querySelector("canvas")!;
    // jsdom doesn't implement layout, so getBoundingClientRect returns all
    // zeros by default — stub a realistic rect so the coordinate math (which
    // is relative to the canvas's position/size) is actually meaningful.
    canvas.getBoundingClientRect = () => ({
      left: 100,
      top: 50,
      width: 400,
      height: 300,
      right: 500,
      bottom: 350,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });

    resetGlobeViewMock = vi.fn();
    vi.doMock("../globe-registry", () => ({
      getGlobeCanvas: () => document.querySelector('[data-gesture-target="globe"] canvas'),
      resetGlobeView: resetGlobeViewMock,
    }));
    vi.resetModules();
    const mod = await import("../gesture-controller");
    dispatchPointer = mod.dispatchPointer;
    dispatchWheel = mod.dispatchWheel;
    handleFrame = mod.handleFrame;
  });

  afterEach(() => {
    vi.doUnmock("../globe-registry");
    document.body.innerHTML = "";
  });

  function frame(overrides: Partial<GestureFrame> = {}): GestureFrame {
    return { handCount: 1, pinch: null, openPalm: false, twoHandDistance: null, ...overrides };
  }

  describe("dispatchPointer", () => {
    it("converts normalized coordinates to canvas-relative client coordinates, mirrored horizontally", () => {
      const events: PointerEvent[] = [];
      canvas.addEventListener("pointerdown", (e) => events.push(e as PointerEvent));

      // nx=0.25 should land at the RIGHT side of the canvas (mirrored: 1 - nx).
      dispatchPointer("pointerdown", 0.25, 0.5);

      expect(events).toHaveLength(1);
      expect(events[0]!.clientX).toBeCloseTo(100 + (1 - 0.25) * 400); // 400
      expect(events[0]!.clientY).toBeCloseTo(50 + 0.5 * 300); // 200
    });

    it("sets buttons=1 for down/move and buttons=0 for up", () => {
      const events: PointerEvent[] = [];
      canvas.addEventListener("pointerdown", (e) => events.push(e as PointerEvent));
      canvas.addEventListener("pointerup", (e) => events.push(e as PointerEvent));

      dispatchPointer("pointerdown", 0.5, 0.5);
      dispatchPointer("pointerup", 0.5, 0.5);

      expect(events[0]!.buttons).toBe(1);
      expect(events[1]!.buttons).toBe(0);
    });

    it("does nothing (no throw) when the globe canvas isn't present", () => {
      document.body.innerHTML = "";
      expect(() => dispatchPointer("pointerdown", 0.5, 0.5)).not.toThrow();
    });
  });

  describe("dispatchWheel", () => {
    it("dispatches a wheel event centered on the canvas with the given deltaY", () => {
      const events: WheelEvent[] = [];
      canvas.addEventListener("wheel", (e) => events.push(e as WheelEvent));

      dispatchWheel(-120);

      expect(events).toHaveLength(1);
      expect(events[0]!.deltaY).toBe(-120);
      expect(events[0]!.clientX).toBeCloseTo(100 + 400 / 2); // 300, canvas center
      expect(events[0]!.clientY).toBeCloseTo(50 + 300 / 2); // 200, canvas center
    });
  });

  describe("handleFrame", () => {
    it("dispatches pointerdown on the first pinched frame, pointermove on subsequent ones", () => {
      const types: string[] = [];
      canvas.addEventListener("pointerdown", () => types.push("down"));
      canvas.addEventListener("pointermove", () => types.push("move"));

      handleFrame(frame({ pinch: { x: 0.5, y: 0.5 } }));
      handleFrame(frame({ pinch: { x: 0.51, y: 0.5 } }));
      handleFrame(frame({ pinch: { x: 0.52, y: 0.5 } }));

      expect(types).toEqual(["down", "move", "move"]);
    });

    it("dispatches pointerup when a pinch ends", () => {
      const types: string[] = [];
      canvas.addEventListener("pointerdown", () => types.push("down"));
      canvas.addEventListener("pointerup", () => types.push("up"));

      handleFrame(frame({ pinch: { x: 0.5, y: 0.5 } }));
      handleFrame(frame({ pinch: null })); // released

      expect(types).toEqual(["down", "up"]);
    });

    it("dispatches a wheel event only once two-hand distance has a prior frame to diff against", () => {
      const wheels: number[] = [];
      canvas.addEventListener("wheel", (e) => wheels.push((e as WheelEvent).deltaY));

      handleFrame(frame({ twoHandDistance: 0.3 })); // first frame — establishes baseline, no wheel yet
      expect(wheels).toHaveLength(0);

      handleFrame(frame({ twoHandDistance: 0.35 })); // distance grew — should fire a wheel
      expect(wheels).toHaveLength(1);
      expect(wheels[0]).toBeLessThan(0); // growing distance (zoom out gesture) -> negative deltaY per the impl
    });

    it("does not dispatch a wheel event for a sub-threshold distance change", () => {
      const wheels: number[] = [];
      canvas.addEventListener("wheel", () => wheels.push(1));

      handleFrame(frame({ twoHandDistance: 0.3 }));
      handleFrame(frame({ twoHandDistance: 0.3005 })); // well under the 0.002 threshold

      expect(wheels).toHaveLength(0);
    });

    it("calls resetGlobeView on an open palm, debounced to once per 1200ms", () => {
      vi.useFakeTimers();
      // The module's debounce clock (lastOpenPalmAt) starts at 0; with a
      // fresh fake-timer clock also starting near 0, the very first call
      // wouldn't clear the ">1200ms since last reset" bar. Advance past it
      // first so the test exercises steady-state behavior, not a cold-start
      // coincidence.
      vi.advanceTimersByTime(2000);

      handleFrame(frame({ openPalm: true }));
      expect(resetGlobeViewMock).toHaveBeenCalledTimes(1);

      handleFrame(frame({ openPalm: true })); // held open — should NOT re-trigger immediately
      expect(resetGlobeViewMock).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1300);
      handleFrame(frame({ openPalm: true })); // held past the debounce window — fires again
      expect(resetGlobeViewMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe("handleFrame, orb screen (no globe canvas mounted)", () => {
    let useGestureStore: typeof import("@/stores/gesture-store").useGestureStore;

    beforeEach(async () => {
      // No globe canvas in the DOM this time — simulates being on the orb
      // screen, where gesture-controller.ts falls back to scaling the orb
      // instead of driving OrbitControls.
      document.body.innerHTML = "";
      vi.doMock("../globe-registry", () => ({
        getGlobeCanvas: () => document.querySelector('[data-gesture-target="globe"] canvas'),
        resetGlobeView: vi.fn(),
      }));
      vi.resetModules();
      const mod = await import("../gesture-controller");
      handleFrame = mod.handleFrame;
      useGestureStore = (await import("@/stores/gesture-store")).useGestureStore;
      useGestureStore.setState({ orbScale: 1 });
    });

    it("does not dispatch pointer/wheel events (nothing to dispatch them at)", () => {
      const events: string[] = [];
      document.addEventListener("pointerdown", () => events.push("down"));
      document.addEventListener("wheel", () => events.push("wheel"));

      handleFrame(frame({ pinch: { x: 0.5, y: 0.5 } }));
      handleFrame(frame({ twoHandDistance: 0.3 }));
      handleFrame(frame({ twoHandDistance: 0.35 }));

      expect(events).toHaveLength(0);
    });

    it("grows orbScale as two-hand distance grows", () => {
      handleFrame(frame({ twoHandDistance: 0.3 })); // baseline frame
      expect(useGestureStore.getState().orbScale).toBe(1);

      handleFrame(frame({ twoHandDistance: 0.35 })); // distance grew
      expect(useGestureStore.getState().orbScale).toBeGreaterThan(1);
    });

    it("shrinks orbScale as two-hand distance shrinks", () => {
      handleFrame(frame({ twoHandDistance: 0.35 }));
      handleFrame(frame({ twoHandDistance: 0.3 }));
      expect(useGestureStore.getState().orbScale).toBeLessThan(1);
    });

    it("clamps orbScale to a sane range instead of growing/shrinking unbounded", () => {
      let distance = 0.1;
      for (let i = 0; i < 50; i++) {
        distance += 0.05;
        handleFrame(frame({ twoHandDistance: distance }));
      }
      expect(useGestureStore.getState().orbScale).toBeLessThanOrEqual(1.8);

      handleFrame(frame({ twoHandDistance: null }));
      let shrinking = distance;
      for (let i = 0; i < 50; i++) {
        shrinking -= 0.05;
        handleFrame(frame({ twoHandDistance: shrinking }));
      }
      expect(useGestureStore.getState().orbScale).toBeGreaterThanOrEqual(0.6);
    });

    it("resets orbScale to 1 on an open palm", () => {
      // Same cold-start debounce quirk as the globe reset test above:
      // lastOpenPalmAt starts at 0, so the very first call needs the clock
      // pushed forward past the 1200ms debounce window first.
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);

      handleFrame(frame({ twoHandDistance: 0.3 }));
      handleFrame(frame({ twoHandDistance: 0.4 }));
      expect(useGestureStore.getState().orbScale).not.toBe(1);

      handleFrame(frame({ openPalm: true }));
      expect(useGestureStore.getState().orbScale).toBe(1);

      vi.useRealTimers();
    });
  });
});

describe("toActionableGestureError", () => {
  it("gives an actionable message for a camera-permission-denied error", async () => {
    const { toActionableGestureError } = await import("../gesture-controller");
    const err = toActionableGestureError(new DOMException("blocked", "NotAllowedError"));
    expect(err.message).toContain("System Settings");
    expect(err.message).toContain("Camera");
  });

  it("gives an actionable message when no camera device exists", async () => {
    const { toActionableGestureError } = await import("../gesture-controller");
    const err = toActionableGestureError(new DOMException("none found", "NotFoundError"));
    expect(err.message).toBe("No camera found on this Mac.");
  });

  it("gives an actionable message when the camera is already in use", async () => {
    const { toActionableGestureError } = await import("../gesture-controller");
    const err = toActionableGestureError(new DOMException("busy", "NotReadableError"));
    expect(err.message).toBe("Camera is already in use by another app.");
  });

  it("passes through an unrelated real Error unchanged", async () => {
    const { toActionableGestureError } = await import("../gesture-controller");
    const original = new Error("something else entirely");
    expect(toActionableGestureError(original)).toBe(original);
  });

  it("wraps a non-Error thrown value", async () => {
    const { toActionableGestureError } = await import("../gesture-controller");
    const err = toActionableGestureError("a plain string");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("a plain string");
  });
});
