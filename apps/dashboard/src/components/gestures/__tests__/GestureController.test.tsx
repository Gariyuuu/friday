import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useToastStore } from "@/stores/toast-store";

vi.mock("@/lib/gestures/gesture-controller", () => ({
  enableGestures: vi.fn(),
  disableGestures: vi.fn(),
}));

// zustand's persist middleware reads window.localStorage once at
// module-evaluation time — stub before dynamically importing gesture-store.ts.
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

const { enableGestures, disableGestures } = await import("@/lib/gestures/gesture-controller");
const { useGestureStore } = await import("@/stores/gesture-store");
const { GestureController } = await import("../GestureController");

describe("GestureController", () => {
  beforeEach(() => {
    vi.mocked(enableGestures).mockReset();
    vi.mocked(disableGestures).mockReset();
    useToastStore.setState({ toast: null });
    act(() => useGestureStore.setState({ enabled: false }));
  });

  it("does not touch the camera on mount when gestures are already off", () => {
    render(<GestureController />);
    expect(enableGestures).not.toHaveBeenCalled();
    expect(disableGestures).not.toHaveBeenCalled();
  });

  it("calls enableGestures when the store toggles on", () => {
    vi.mocked(enableGestures).mockResolvedValue(undefined);
    render(<GestureController />);

    act(() => useGestureStore.setState({ enabled: true }));
    expect(enableGestures).toHaveBeenCalledTimes(1);
  });

  it("calls disableGestures when the store toggles back off", () => {
    vi.mocked(enableGestures).mockResolvedValue(undefined);
    render(<GestureController />);

    act(() => useGestureStore.setState({ enabled: true }));
    act(() => useGestureStore.setState({ enabled: false }));
    expect(disableGestures).toHaveBeenCalledTimes(1);
  });

  it("shows an error toast when enableGestures rejects (e.g. camera permission denied)", async () => {
    vi.mocked(enableGestures).mockRejectedValue(new Error("permission denied"));
    render(<GestureController />);

    act(() => useGestureStore.setState({ enabled: true }));

    await waitFor(() => {
      expect(useToastStore.getState().toast?.text).toBe("Gestures — permission denied");
    });
    expect(useToastStore.getState().toast?.tone).toBe("error");
  });

  it("calls disableGestures on unmount if gestures were active", () => {
    vi.mocked(enableGestures).mockResolvedValue(undefined);
    const { unmount } = render(<GestureController />);
    act(() => useGestureStore.setState({ enabled: true }));

    unmount();
    expect(disableGestures).toHaveBeenCalledTimes(1);
  });

  it("does not call disableGestures on unmount if gestures were never started", () => {
    const { unmount } = render(<GestureController />);
    unmount();
    expect(disableGestures).not.toHaveBeenCalled();
  });
});
