"use client";

import { useEffect, useState } from "react";

/** Shown when no story is focused yet — see EventDetailPanel for the real, wired-up video results. */
export function MediaPanel() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((body: { intelligence: { video: boolean } }) => setConfigured(body.intelligence.video))
      .catch(() => setConfigured(null));
  }, []);

  return (
    <section className="glass-panel flex flex-col gap-3 rounded-lg p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim">
          Live / Relevant Media
        </h2>
        <span className="text-mono-status text-[10px] uppercase text-text-faint">
          {configured ? "Ready" : "Not configured"}
        </span>
      </header>
      {configured ? (
        <p className="text-sm text-text-faint">
          Select a headline or globe marker to see related videos for that story.
        </p>
      ) : (
        <p className="text-sm text-text-faint">
          Configure a video provider (<code className="text-text-dim">YOUTUBE_API_KEY</code>) to
          surface related clips and broadcasts for the story you&apos;re viewing.
        </p>
      )}
    </section>
  );
}
