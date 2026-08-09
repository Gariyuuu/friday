import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOrbStore } from "@/stores/orb-store";
import { useToastStore } from "@/stores/toast-store";

vi.mock("@/lib/voice/voice-controller", () => ({
  toggleVoice: vi.fn(),
}));
vi.mock("@/lib/desktop/global-shortcut", () => ({
  registerDesktopGlobalShortcut: vi.fn(),
}));

const { toggleVoice } = await import("@/lib/voice/voice-controller");
const { registerDesktopGlobalShortcut } = await import("@/lib/desktop/global-shortcut");
const { VoiceActivation, useVoiceConnected } = await import("../VoiceActivation");

describe("VoiceActivation", () => {
  beforeEach(() => {
    vi.mocked(toggleVoice).mockReset();
    vi.mocked(registerDesktopGlobalShortcut).mockReset();
    useToastStore.setState({ toast: null });
  });

  it("calls toggleVoice on Alt+V", () => {
    vi.mocked(toggleVoice).mockResolvedValue(undefined);
    render(<VoiceActivation />);

    fireEvent.keyDown(window, { code: "KeyV", altKey: true });
    expect(toggleVoice).toHaveBeenCalledTimes(1);
  });

  it("does not call toggleVoice for other keys, or KeyV without Alt", () => {
    vi.mocked(toggleVoice).mockResolvedValue(undefined);
    render(<VoiceActivation />);

    fireEvent.keyDown(window, { code: "KeyV", altKey: false });
    fireEvent.keyDown(window, { code: "KeyA", altKey: true });
    expect(toggleVoice).not.toHaveBeenCalled();
  });

  it("shows an error toast when toggleVoice rejects", async () => {
    vi.mocked(toggleVoice).mockRejectedValue(new Error("mic permission denied"));
    render(<VoiceActivation />);

    fireEvent.keyDown(window, { code: "KeyV", altKey: true });

    await waitFor(() => {
      expect(useToastStore.getState().toast?.text).toBe("Voice — mic permission denied");
    });
    expect(useToastStore.getState().toast?.tone).toBe("error");
  });

  it("registers a desktop global shortcut callback that also calls toggleVoice", () => {
    vi.mocked(toggleVoice).mockResolvedValue(undefined);
    render(<VoiceActivation />);

    expect(registerDesktopGlobalShortcut).toHaveBeenCalledTimes(1);
    const callback = vi.mocked(registerDesktopGlobalShortcut).mock.calls[0]![0];
    callback();
    expect(toggleVoice).toHaveBeenCalledTimes(1);
  });

  it("removes the keydown listener on unmount", () => {
    vi.mocked(toggleVoice).mockResolvedValue(undefined);
    const { unmount } = render(<VoiceActivation />);
    unmount();

    fireEvent.keyDown(window, { code: "KeyV", altKey: true });
    expect(toggleVoice).not.toHaveBeenCalled();
  });

  describe("double-tap K", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("calls toggleVoice when K is pressed twice within the double-tap window", () => {
      vi.mocked(toggleVoice).mockResolvedValue(undefined);
      render(<VoiceActivation />);

      fireEvent.keyDown(window, { code: "KeyK" });
      vi.advanceTimersByTime(150);
      fireEvent.keyDown(window, { code: "KeyK" });

      expect(toggleVoice).toHaveBeenCalledTimes(1);
    });

    it("does not call toggleVoice for a single K press", () => {
      vi.mocked(toggleVoice).mockResolvedValue(undefined);
      render(<VoiceActivation />);

      fireEvent.keyDown(window, { code: "KeyK" });
      expect(toggleVoice).not.toHaveBeenCalled();
    });

    it("does not count two K presses outside the double-tap window as a double-tap", () => {
      vi.mocked(toggleVoice).mockResolvedValue(undefined);
      render(<VoiceActivation />);

      fireEvent.keyDown(window, { code: "KeyK" });
      vi.advanceTimersByTime(500);
      fireEvent.keyDown(window, { code: "KeyK" });

      expect(toggleVoice).not.toHaveBeenCalled();
    });

    it("does not trigger while typing in an input, textarea, or contentEditable element", () => {
      vi.mocked(toggleVoice).mockResolvedValue(undefined);
      const { container } = render(
        <div>
          <VoiceActivation />
          <input data-testid="text-input" />
          <textarea data-testid="text-area" />
          <div data-testid="editable" contentEditable="true" suppressContentEditableWarning />
        </div>,
      );

      for (const testId of ["text-input", "text-area", "editable"]) {
        const el = container.querySelector(`[data-testid="${testId}"]`)!;
        fireEvent.keyDown(el, { code: "KeyK" });
        vi.advanceTimersByTime(100);
        fireEvent.keyDown(el, { code: "KeyK" });
      }

      expect(toggleVoice).not.toHaveBeenCalled();
    });

    it("does not trigger when a modifier is held (e.g. Cmd+K stays reserved for the command palette)", () => {
      vi.mocked(toggleVoice).mockResolvedValue(undefined);
      render(<VoiceActivation />);

      fireEvent.keyDown(window, { code: "KeyK", metaKey: true });
      vi.advanceTimersByTime(100);
      fireEvent.keyDown(window, { code: "KeyK", metaKey: true });

      expect(toggleVoice).not.toHaveBeenCalled();
    });

    it("ignores auto-repeated keydown events from a held key", () => {
      vi.mocked(toggleVoice).mockResolvedValue(undefined);
      render(<VoiceActivation />);

      fireEvent.keyDown(window, { code: "KeyK" });
      vi.advanceTimersByTime(50);
      fireEvent.keyDown(window, { code: "KeyK", repeat: true });

      expect(toggleVoice).not.toHaveBeenCalled();
    });
  });
});

describe("useVoiceConnected", () => {
  function Probe() {
    const connected = useVoiceConnected();
    return <span>{connected ? "connected" : "not connected"}</span>;
  }

  it("is false for offline and error, true otherwise", () => {
    act(() => useOrbStore.setState({ voiceStatus: "offline" }));
    const { rerender, getByText } = render(<Probe />);
    expect(getByText("not connected")).toBeInTheDocument();

    act(() => useOrbStore.setState({ voiceStatus: "error" }));
    rerender(<Probe />);
    expect(getByText("not connected")).toBeInTheDocument();

    act(() => useOrbStore.setState({ voiceStatus: "listening" }));
    rerender(<Probe />);
    expect(getByText("connected")).toBeInTheDocument();
  });
});
