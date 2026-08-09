import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "@/stores/chat-store";

const { sendChatMessage } = await import("../chat-client");

function streamResponse(chunks: string[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status });
}

describe("sendChatMessage", () => {
  beforeEach(() => {
    useChatStore.setState({ messages: [], sending: false });
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds the user message immediately, then an empty assistant message", async () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // never resolves in this test
    void sendChatMessage("hello there");

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "hello there" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: "" });
    expect(useChatStore.getState().sending).toBe(true);
  });

  it("posts the full running history to /api/chat", async () => {
    useChatStore.setState({
      messages: [{ id: "1", role: "user", content: "earlier message" }],
    });
    vi.mocked(fetch).mockResolvedValue(streamResponse(["ok"]));

    await sendChatMessage("follow up");

    expect(fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string) as {
      messages: { role: string; content: string }[];
    };
    expect(body.messages).toEqual([
      { role: "user", content: "earlier message" },
      { role: "user", content: "follow up" },
    ]);
  });

  it("streams chunks into the assistant message as they arrive", async () => {
    vi.mocked(fetch).mockResolvedValue(streamResponse(["Hel", "lo", " world"]));

    await sendChatMessage("hi");

    const messages = useChatStore.getState().messages;
    expect(messages[1]?.content).toBe("Hello world");
    expect(useChatStore.getState().sending).toBe(false);
  });

  it("appends a visible error to the assistant message when the server responds with an error", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "AI_PLATFORM_API_KEY is not configured" }), {
        status: 501,
      }),
    );

    await sendChatMessage("hi");

    const messages = useChatStore.getState().messages;
    expect(messages[1]?.content).toBe("⚠ AI_PLATFORM_API_KEY is not configured");
    expect(useChatStore.getState().sending).toBe(false);
  });

  it("appends a visible error when the fetch itself rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    await sendChatMessage("hi");

    const messages = useChatStore.getState().messages;
    expect(messages[1]?.content).toBe("⚠ network down");
  });
});
