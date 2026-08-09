"use client";

import type { DataFreshness, IntelligenceEvent } from "@friday/types";
import { useState } from "react";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/intelligence/category-style";
import { PanelHeader } from "./PanelHeader";

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

/** event.importance is a real 0-1 score from the data pipeline — this just
 *  renders it as a small ring instead of not showing it at all. */
function ImportanceRing({ importance }: { importance: number }) {
  const pct = Math.round(importance * 100);
  const circumference = 2 * Math.PI * 7;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0 -rotate-90">
      <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - importance)}
        strokeLinecap="round"
        className="text-accent"
      />
      <title>{pct}% importance</title>
    </svg>
  );
}

/** The article's own real photo when the provider returned one — never a
 *  placeholder. Falls back to the importance ring if there's no image, or
 *  if the real image URL 404s/fails to load. Plain <img>, not next/image —
 *  arbitrary external news-site domains, not worth a remote-pattern
 *  allowlist entry per source. */
function Thumbnail({ event }: { event: IntelligenceEvent }) {
  const [failed, setFailed] = useState(false);

  if (!event.imageUrl || failed) {
    return <ImportanceRing importance={event.importance} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={event.imageUrl}
      alt={event.title}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-md object-cover"
    />
  );
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
    <section className="glass-panel flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-lg p-4">
      <PanelHeader title="Breaking News" freshness={freshness} count={ranked.length} />

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
              className={`flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-left transition-colors ${
                focusedEventId === event.id
                  ? "border-accent/50 bg-accent/10"
                  : "border-transparent hover:bg-surface-raised"
              }`}
            >
              <Thumbnail event={event} />
              <div className="min-w-0 flex-1">
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
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
