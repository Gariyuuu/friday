"use client";

import type { IntelligenceEvent } from "@friday/types";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/intelligence/category-style";

interface EventDetailPanelProps {
  event: IntelligenceEvent | null;
  onClose: () => void;
}

export function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  if (!event) {
    return (
      <section className="glass-panel flex flex-1 flex-col items-center justify-center rounded-lg p-6 text-center">
        <p className="text-sm text-text-faint">
          Select a marker on the globe or a headline to see details and sources here.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel flex flex-1 flex-col gap-3 rounded-lg p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <span
            className="text-[10px] uppercase tracking-wide"
            style={{ color: CATEGORY_COLOR[event.category] }}
          >
            {CATEGORY_LABEL[event.category]}
          </span>
          <h2 className="mt-1 text-base font-medium leading-snug text-text">{event.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-text-faint transition-colors hover:text-text"
          aria-label="Close detail"
        >
          ✕
        </button>
      </header>

      <p className="text-sm leading-relaxed text-text-dim">{event.summary}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {event.region && (
          <>
            <dt className="text-text-faint">Region</dt>
            <dd className="text-text-dim">{event.region}</dd>
          </>
        )}
        {event.confidence !== undefined && (
          <>
            <dt className="text-text-faint">Confidence</dt>
            <dd className="text-text-dim">{Math.round(event.confidence * 100)}%</dd>
          </>
        )}
      </dl>

      <div>
        <h3 className="mb-1.5 text-[10px] uppercase tracking-wide text-text-faint">Sources</h3>
        <ul className="flex flex-col gap-1">
          {event.sources.map((source) => (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
