import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/voice/voice-controller", () => ({
  disconnectVoice: vi.fn(),
  toggleVoiceMute: vi.fn(),
}));
// Orb renders a real react-three-fiber Canvas, which needs a real WebGL
// context jsdom doesn't have — OrbStage's own logic (state copy, transcript
// panel, mute/end buttons, gesture scale) doesn't depend on what's inside
// Orb, so stub it out rather than fighting jsdom for WebGL.
vi.mock("@/components/orb/Orb", () => ({
  Orb: () => <div data-testid="orb-stub" />,
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

const { disconnectVoice, toggleVoiceMute } = await import("@/lib/voice/voice-controller");
const { useOrbStore } = await import("@/stores/orb-store");
const { useGestureStore } = await import("@/stores/gesture-store");
const { OrbStage } = await import("../OrbStage");

describe("OrbStage", () => {
  beforeEach(() => {
    vi.mocked(disconnectVoice).mockReset();
    vi.mocked(toggleVoiceMute).mockReset();
    act(() => {
      useOrbStore.setState({
        orbState: "idle",
        voiceStatus: "offline",
        transcript: "",
        userTranscript: "",
        voiceConnectedAt: null,
      });
      useGestureStore.setState({ orbScale: 1 });
    });
  });

  it("shows the idle state copy and no voice controls when not connected", () => {
    render(<OrbStage />);
    expect(screen.getByText("Press ⌥ + V to talk, or ⌘K for commands.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End call" })).not.toBeInTheDocument();
  });

  it("shows the call card and voice controls once connected", () => {
    act(() => useOrbStore.setState({ voiceStatus: "listening" }));
    render(<OrbStage />);
    expect(screen.getByText("F.R.I.D.A.Y.")).toBeInTheDocument();
    expect(screen.getByText(/Listening…/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End call" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
  });

  it("shows the transcript panel only once there's a transcript to show", () => {
    act(() => useOrbStore.setState({ voiceStatus: "speaking" }));
    const { rerender } = render(<OrbStage />);
    expect(screen.queryByText(/You:/)).not.toBeInTheDocument();

    act(() => useOrbStore.setState({ userTranscript: "what's the weather", transcript: "It's sunny." }));
    rerender(<OrbStage />);
    expect(screen.getByText("what's the weather")).toBeInTheDocument();
    expect(screen.getByText("It's sunny.")).toBeInTheDocument();
  });

  it("Mute toggles the button label and calls toggleVoiceMute", () => {
    act(() => useOrbStore.setState({ voiceStatus: "listening" }));
    render(<OrbStage />);

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    expect(toggleVoiceMute).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Unmute" }));
    expect(toggleVoiceMute).toHaveBeenCalledWith(false);
  });

  it("End call calls disconnectVoice", () => {
    act(() => useOrbStore.setState({ voiceStatus: "listening" }));
    render(<OrbStage />);

    fireEvent.click(screen.getByRole("button", { name: "End call" }));
    expect(disconnectVoice).toHaveBeenCalledTimes(1);
  });

  it("applies gesture-store's orbScale as a CSS transform on the orb wrapper", () => {
    act(() => useGestureStore.setState({ orbScale: 1.4 }));
    render(<OrbStage />);

    const wrapper = screen.getByTestId("orb-stub").parentElement;
    expect(wrapper).toHaveStyle({ transform: "scale(1.4)" });
  });
});
