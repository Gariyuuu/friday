import { useChatStore } from "@/stores/chat-store";

/**
 * Sends the user's message plus the running conversation to /api/chat and
 * streams the reply into the store chunk by chunk as it arrives, rather
 * than waiting for the full response. Errors land as a visible note
 * appended to the (still-empty) assistant message instead of a silent
 * failure or a toast that could get missed mid-conversation.
 */
export async function sendChatMessage(userText: string): Promise<void> {
  const store = useChatStore.getState();
  store.addMessage({ id: crypto.randomUUID(), role: "user", content: userText });

  const history = useChatStore.getState().messages.map((m) => ({ role: m.role, content: m.content }));

  const assistantId = crypto.randomUUID();
  store.addMessage({ id: assistantId, role: "assistant", content: "" });
  store.setSending(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });

    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `chat request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) useChatStore.getState().appendToMessage(assistantId, text);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    useChatStore.getState().appendToMessage(assistantId, `⚠ ${message}`);
  } finally {
    useChatStore.getState().setSending(false);
  }
}
