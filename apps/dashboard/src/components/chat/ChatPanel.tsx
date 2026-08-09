"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/chat/chat-client";
import { type ChatMessage, useChatStore } from "@/stores/chat-store";
import { useUiStore } from "@/stores/ui-store";

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "border border-accent/30 bg-accent/10 text-text"
            : "border border-border bg-surface-raised text-text-dim"
        }`}
      >
        {message.content || <span className="text-text-faint">…</span>}
      </div>
    </div>
  );
}

/**
 * A typed-chat alternative to voice, pointed at the user's own AI Platform
 * gateway instead of OpenAI Realtime (their request — voice is "useless" for
 * quick text Q&A). Docked bottom-right with no backdrop, unlike VmPromptModal,
 * so it can stay open while the orb/globe behind it keeps running.
 */
export function ChatPanel() {
  const open = useUiStore((s) => s.chatOpen);
  const setOpen = useUiStore((s) => s.setChatOpen);
  const messages = useChatStore((s) => s.messages);
  const sending = useChatStore((s) => s.sending);
  const clear = useChatStore((s) => s.clear);
  const [value, setValue] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setValue("");
    void sendChatMessage(trimmed);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          className="glass-panel fixed bottom-6 right-6 z-50 flex h-[28rem] w-full max-w-sm flex-col rounded-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-mono-status text-[10px] uppercase tracking-widest text-accent">
                Chat with FRIDAY
              </p>
              <p className="text-[11px] text-text-faint">Text mode — no live tools, no voice</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clear}
                disabled={messages.length === 0}
                className="text-xs text-text-faint transition-colors hover:text-text disabled:pointer-events-none disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="text-text-faint transition-colors hover:text-text"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-text-faint">
                Ask anything. This mode talks to your own AI Platform gateway instead of OpenAI voice
                — it can&apos;t reach live news, markets, the VM, or saved memories.
              </p>
            ) : (
              messages.map((m) => <Bubble key={m.id} message={m} />)
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-border p-3">
            <textarea
              autoFocus
              rows={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Message FRIDAY…"
              className="min-h-0 w-full flex-1 resize-none rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint"
            />
            <button
              onClick={submit}
              disabled={!value.trim() || sending}
              className="shrink-0 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-text transition-colors hover:bg-accent/20 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
