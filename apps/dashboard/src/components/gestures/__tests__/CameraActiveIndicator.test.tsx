import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// zustand's persist middleware reads window.localStorage once at
// module-evaluation time (see run-tool.test.ts's fuller note) — stub it
// before dynamically importing anything that pulls gesture-store.ts in.
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

const { useGestureStore } = await import("@/stores/gesture-store");
const { CameraActiveIndicator } = await import("../CameraActiveIndicator");

describe("CameraActiveIndicator", () => {
  it("renders nothing when the camera is not active", () => {
    act(() => useGestureStore.setState({ cameraActive: false }));
    render(<CameraActiveIndicator />);
    expect(screen.queryByText(/Camera Active/)).not.toBeInTheDocument();
  });

  it("shows the indicator when the camera becomes active", () => {
    act(() => useGestureStore.setState({ cameraActive: false }));
    render(<CameraActiveIndicator />);

    act(() => useGestureStore.setState({ cameraActive: true }));
    expect(screen.getByText(/Camera Active — Gestures/)).toBeInTheDocument();

    act(() => useGestureStore.setState({ cameraActive: false }));
    expect(screen.queryByText(/Camera Active/)).not.toBeInTheDocument();
  });
});
