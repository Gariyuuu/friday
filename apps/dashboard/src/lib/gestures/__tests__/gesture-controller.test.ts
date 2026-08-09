import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GestureFrame } from "../gesture-detector";

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
});
