"use client";

import type { DataFreshness, IntelligenceEvent } from "@friday/types";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/intelligence/category-style";
import { FreshnessBadge } from "./FreshnessBadge";

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

interface NewsPanelProps {
  events: IntelligenceEvent[];
  freshness: DataFreshness;
  focusedEventId: string | null;
  onSelectEvent: (id: string) => void;
}

export function NewsPanel({ events, freshness, focusedEventId, onSelectEvent }: NewsPanelProps) {
  const ranked = [...events].sort((a, b) => b.importance - a.importance);

  return (
    <section className="glass-panel flex flex-col gap-3 rounded-lg p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim">
          Breaking News
        </h2>
        <FreshnessBadge freshness={freshness} />
      </header>

      {freshness.status === "loading" && ranked.length === 0 && (
        <p className="text-sm text-text-faint">Searching global news…</p>
      )}
      {freshness.status === "unavailable" && (
        <p className="text-sm text-danger">News feed temporarily unavailable. Retrying…</p>
      )}

      <ul className="flex flex-col gap-2">
        {ranked.map((event) => (
          <li key={event.id}>
            <button
              onClick={() => onSelectEvent(event.id)}
              className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                focusedEventId === event.id
                  ? "border-accent/50 bg-accent/10"
                  : "border-transparent hover:bg-surface-raised"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: CATEGORY_COLOR[event.category] }}
                />
                <span className="text-[10px] uppercase tracking-wide text-text-dim">
                  {CATEGORY_LABEL[event.category]}
                </span>
                <span className="text-[10px] text-text-faint">· {timeAgo(event.timestamp)}</span>
              </div>
              <p className="mt-1 text-sm leading-snug text-text">{event.title}</p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
