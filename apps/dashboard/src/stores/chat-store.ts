import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatStoreState {
  messages: ChatMessage[];
  sending: boolean;
  addMessage: (message: ChatMessage) => void;
  appendToMessage: (id: string, delta: string) => void;
  setSending: (sending: boolean) => void;
  clear: () => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  messages: [],
  sending: false,
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  appendToMessage: (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m)),
    })),
  setSending: (sending) => set({ sending }),
  clear: () => set({ messages: [] }),
}));
