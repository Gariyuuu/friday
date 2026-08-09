import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../friday-tools", () => ({
  getFridayToolDefinitions: () => [{ type: "function", name: "get_news", description: "", parameters: {} }],
  executeFridayTool: vi.fn().mockResolvedValue({ ok: true }),
}));

interface FakeSession {
  callbacks: { onServerEvent?: (event: unknown) => void; onConnectionStateChange?: (s: string) => void };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  setMuted: ReturnType<typeof vi.fn>;
}

let createdSessions: FakeSession[] = [];

vi.mock("../realtime-session", () => ({
  OpenAIRealtimeSession: vi.fn().mockImplementation(function (callbacks: FakeSession["callbacks"]) {
    const instance: FakeSession = {
      callbacks,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
      send: vi.fn(),
      setMuted: vi.fn(),
    };
    createdSessions.push(instance);
    return instance;
  }),
}));

describe("voice-controller", () => {
  let connectVoice: typeof import("../voice-controller").connectVoice;
  let disconnectVoice: typeof import("../voice-controller").disconnectVoice;
  let isVoiceConnected: typeof import("../voice-controller").isVoiceConnected;
  let useOrbStore: typeof import("@/stores/orb-store").useOrbStore;
  let useToastStore: typeof import("@/stores/toast-store").useToastStore;

  beforeEach(async () => {
    createdSessions = [];
    vi.resetModules();
    const mod = await import("../voice-controller");
    connectVoice = mod.connectVoice;
    disconnectVoice = mod.disconnectVoice;
    isVoiceConnected = mod.isVoiceConnected;
    useOrbStore = (await import("@/stores/orb-store")).useOrbStore;
    useToastStore = (await import("@/stores/toast-store")).useToastStore;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends session.update with real instructions covering the world-news tool sequence", async () => {
    await connectVoice();
    const sent = createdSessions[0]!.send.mock.calls.map((c) => c[0]);
    const update = sent.find((e) => e.type === "session.update");

    expect(update).toBeDefined();
    expect(update.session.type).toBe("realtime");
    expect(typeof update.session.instructions).toBe("string");
    expect(update.session.instructions).toContain("open_intelligence_dashboard");
    expect(update.session.instructions).toContain("get_news");
    expect(update.session.tool_choice).toBe("auto");
  });

  it("is a no-op the second time if already connected", async () => {
    await connectVoice();
    await connectVoice();
    expect(createdSessions).toHaveLength(1);
  });

  it("disconnectVoice tears down the session and resets voice status", async () => {
    await connectVoice();
    disconnectVoice();

    expect(createdSessions[0]!.disconnect).toHaveBeenCalledTimes(1);
    expect(useOrbStore.getState().voiceStatus).toBe("offline");
    expect(isVoiceConnected()).toBe(false);
  });

  it("auto-disconnects after sustained inactivity and shows a toast, without disconnecting early", async () => {
    vi.useFakeTimers();
    await connectVoice();
    const fakeSession = createdSessions[0]!;

    // Just under the 3-minute idle window — should NOT have disconnected yet.
    await vi.advanceTimersByTimeAsync(2.5 * 60 * 1000);
    expect(fakeSession.disconnect).not.toHaveBeenCalled();

    // Just past the idle window (the 20s-interval check crosses the 180s
    // threshold at t=200s) — should auto-disconnect. Stopped short of
    // t=203.5s on purpose: the toast's own 3500ms auto-dismiss timer would
    // otherwise also fire within the same advance and clear it before the
    // assertion below runs.
    await vi.advanceTimersByTimeAsync(51 * 1000);
    expect(fakeSession.disconnect).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toast?.text).toMatch(/inactivity/i);
  });

  it("activity (a server event) resets the idle clock so it does not disconnect prematurely", async () => {
    vi.useFakeTimers();
    await connectVoice();
    const fakeSession = createdSessions[0]!;

    await vi.advanceTimersByTimeAsync(2.5 * 60 * 1000);
    fakeSession.callbacks.onServerEvent?.({ type: "session.created" }); // real activity
    await vi.advanceTimersByTimeAsync(2.5 * 60 * 1000); // would have fired if the clock hadn't reset

    expect(fakeSession.disconnect).not.toHaveBeenCalled();
  });

  it("does not set voiceStatus to 'error' for a redundant response.create race", async () => {
    await connectVoice();
    useOrbStore.getState().setVoiceStatus("thinking");
    createdSessions[0]!.callbacks.onServerEvent?.({
      type: "error",
      error: { message: "Conversation already has an active response in progress: resp_abc123" },
    });

    expect(useOrbStore.getState().voiceStatus).toBe("thinking");
  });

  it("sets voiceStatus to 'error' for a genuine session error", async () => {
    await connectVoice();
    createdSessions[0]!.callbacks.onServerEvent?.({
      type: "error",
      error: { message: "invalid request" },
    });

    expect(useOrbStore.getState().voiceStatus).toBe("error");
  });
});
