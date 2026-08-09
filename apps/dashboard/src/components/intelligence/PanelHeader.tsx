"use client";

import type { DataFreshness } from "@friday/types";
import { FreshnessBadge } from "./FreshnessBadge";

interface PanelHeaderProps {
  title: string;
  freshness: DataFreshness;
  /** Real item count for this panel — never a fabricated/estimated number. */
  count?: number;
}

/** Shared HUD-style header for intelligence panels — a denser, more
 *  cinematic card header (accent tick + count pill) than a plain <h2>,
 *  used consistently so panels read as one system rather than four
 *  differently-styled boxes. */
export function PanelHeader({ title, freshness, count }: PanelHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border pb-2">
      <div className="flex items-center gap-2">
        <span className="h-3 w-0.5 bg-accent/60" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim">{title}</h2>
        {count !== undefined && (
          <span className="text-mono-status rounded-full border border-border px-1.5 text-[10px] text-text-faint">
            {count}
          </span>
        )}
      </div>
      <FreshnessBadge freshness={freshness} />
    </header>
  );
}
