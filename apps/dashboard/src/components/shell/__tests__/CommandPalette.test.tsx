import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOrbStore } from "@/stores/orb-store";
import { useToastStore } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/demo", () => ({
  runGlobalBriefDemo: vi.fn(),
}));

vi.mock("@/lib/tools/client", () => ({
  openApplication: vi.fn().mockResolvedValue({ ok: true }),
  openUrl: vi.fn().mockResolvedValue({ ok: true }),
  showNotification: vi.fn().mockResolvedValue({ ok: true }),
  getSystemStatus: vi.fn(),
}));

vi.mock("@/lib/voice/voice-controller", () => ({
  connectVoice: vi.fn().mockResolvedValue(undefined),
  disconnectVoice: vi.fn(),
  isVoiceConnected: vi.fn(() => false),
}));

const { runGlobalBriefDemo } = await import("@/lib/demo");
const { openApplication, openUrl, showNotification, getSystemStatus } = await import("@/lib/tools/client");
const { connectVoice, disconnectVoice, isVoiceConnected } = await import("@/lib/voice/voice-controller");
const { CommandPalette } = await import("../CommandPalette");

function selectItem(name: string) {
  fireEvent.click(screen.getByText(name));
}

describe("CommandPalette", () => {
  beforeEach(() => {
    useUiStore.setState({ commandPaletteOpen: true, mode: "orb", vmPromptMode: null });
    useToastStore.setState({ toast: null });
    useOrbStore.setState({ voiceStatus: "offline" });
    vi.mocked(isVoiceConnected).mockReturnValue(false);
    push.mockClear();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("is not in the DOM when closed", () => {
    useUiStore.setState({ commandPaletteOpen: false });
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText("Ask FRIDAY or jump to…")).not.toBeInTheDocument();
  });

  it("renders the input and item groups when open", () => {
    render(<CommandPalette />);
    expect(screen.getByPlaceholderText("Ask FRIDAY or jump to…")).toBeInTheDocument();
    expect(screen.getByText("FRIDAY Orb")).toBeInTheDocument();
    expect(screen.getByText("Global Intelligence")).toBeInTheDocument();
  });

  it("Cmd+K toggles the palette open/closed via the global listener", () => {
    useUiStore.setState({ commandPaletteOpen: false });
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText("Ask FRIDAY or jump to…")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it("Escape closes the palette", () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it("'FRIDAY Orb' sets mode to orb and closes the palette", () => {
    useUiStore.setState({ mode: "intelligence" });
    render(<CommandPalette />);
    selectItem("FRIDAY Orb");

    expect(useUiStore.getState().mode).toBe("orb");
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it("'Global Intelligence' sets mode to intelligence", () => {
    render(<CommandPalette />);
    selectItem("Global Intelligence");
    expect(useUiStore.getState().mode).toBe("intelligence");
  });

  it("'Settings' navigates via the router and closes", () => {
    render(<CommandPalette />);
    selectItem("Settings");
    expect(push).toHaveBeenCalledWith("/settings");
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it("shows 'Talk to FRIDAY' when not connected, and connects on select", () => {
    render(<CommandPalette />);
    expect(screen.getByText(/Talk to FRIDAY/)).toBeInTheDocument();

    selectItem(screen.getByText(/Talk to FRIDAY/).textContent!);
    expect(connectVoice).toHaveBeenCalled();
    expect(disconnectVoice).not.toHaveBeenCalled();
  });

  it("shows 'End Voice Session' when connected, and disconnects on select", () => {
    // Two independent signals happen to both need setting: the label is
    // driven by orb-store's voiceStatus, but the click handler itself
    // checks isVoiceConnected() (the real WebRTC connection state) — they
    // stay in sync in the real app because voice-controller.ts updates
    // orb-store as the connection changes, but nothing links them
    // automatically here.
    useOrbStore.setState({ voiceStatus: "listening" });
    vi.mocked(isVoiceConnected).mockReturnValue(true);
    render(<CommandPalette />);
    expect(screen.getByText("End Voice Session")).toBeInTheDocument();

    selectItem("End Voice Session");
    expect(disconnectVoice).toHaveBeenCalled();
    expect(connectVoice).not.toHaveBeenCalled();
  });

  it("'Open Visual Studio Code' calls openApplication with the exact allowlisted name", () => {
    render(<CommandPalette />);
    selectItem("Open Visual Studio Code");
    expect(openApplication).toHaveBeenCalledWith("Visual Studio Code");
  });

  it("'Open FRIDAY on GitHub' calls openUrl with the repo URL", () => {
    render(<CommandPalette />);
    selectItem("Open FRIDAY on GitHub");
    expect(openUrl).toHaveBeenCalledWith("https://github.com/Gariyuuu/friday");
  });

  it("'Send Test Notification' calls showNotification", () => {
    render(<CommandPalette />);
    selectItem("Send Test Notification");
    expect(showNotification).toHaveBeenCalledWith("F.R.I.D.A.Y.", "This is a test notification.");
  });

  it("'System Status' formats a success toast from the real result shape", async () => {
    vi.mocked(getSystemStatus).mockResolvedValue({
      cpuLoadAvg1m: 1.2345,
      cpuCount: 8,
      memoryUsedPercent: 42,
      memoryTotalGb: 16,
      battery: { percent: 87, charging: true },
      platform: "darwin",
      uptimeHours: 5,
    });
    render(<CommandPalette />);
    selectItem("System Status");

    await waitFor(() => {
      expect(useToastStore.getState().toast?.text).toBe(
        "CPU load 1.23 · Memory 42% · 87% battery (charging)",
      );
    });
  });

  it("'Run Command on Cloud VM…' opens the shell VM prompt", () => {
    render(<CommandPalette />);
    selectItem("Run Command on Cloud VM… (critical, needs approval)");
    expect(useUiStore.getState().vmPromptMode).toBe("shell");
  });

  it("'Browse URL on Cloud VM…' opens the browse VM prompt", () => {
    render(<CommandPalette />);
    selectItem("Browse URL on Cloud VM… (critical, needs approval)");
    expect(useUiStore.getState().vmPromptMode).toBe("browse");
  });

  it("'Run Global Intelligence Brief (Demo)' calls the demo function", () => {
    render(<CommandPalette />);
    selectItem("Run Global Intelligence Brief (Demo)");
    expect(runGlobalBriefDemo).toHaveBeenCalled();
  });
});
