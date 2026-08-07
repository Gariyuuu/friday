"use client";

import type { DataFreshness } from "@friday/types";
import { useSyncExternalStore } from "react";

function subscribeTick(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

function getTickSnapshot() {
  return Math.floor(Date.now() / 1000);
}

function getTickServerSnapshot() {
  return 0;
}

function secondsAgo(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
}

const STATUS_LABEL: Record<DataFreshness["status"], string> = {
  live: "LIVE",
  loading: "LOADING",
  stale: "STALE",
  unavailable: "UNAVAILABLE",
};

const STATUS_COLOR: Record<DataFreshness["status"], string> = {
  live: "text-success",
  loading: "text-text-dim",
  stale: "text-warning",
  unavailable: "text-danger",
};

/** Never let a panel render stale data silently as current — spec §38. */
export function FreshnessBadge({ freshness }: { freshness: DataFreshness }) {
  useSyncExternalStore(subscribeTick, getTickSnapshot, getTickServerSnapshot);

  return (
    <span className="text-mono-status flex items-center gap-1.5 text-[10px] uppercase text-text-dim">
      <span className={STATUS_COLOR[freshness.status]}>●</span>
      <span className={STATUS_COLOR[freshness.status]}>{STATUS_LABEL[freshness.status]}</span>
      {freshness.isMock && (
        <span className="rounded border border-warning/40 px-1 text-warning">DEMO DATA</span>
      )}
      {freshness.lastUpdated && freshness.status === "live" && (
        <span>· updated {secondsAgo(freshness.lastUpdated)}s ago</span>
      )}
    </span>
  );
}
