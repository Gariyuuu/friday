"use client";

/** No video provider is configured yet (Phase 3 — needs YOUTUBE_API_KEY). Honest empty state, not a fake widget. */
export function MediaPanel() {
  return (
    <section className="glass-panel flex flex-col gap-3 rounded-lg p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim">
          Live / Relevant Media
        </h2>
        <span className="text-mono-status text-[10px] uppercase text-text-faint">
          Not configured
        </span>
      </header>
      <p className="text-sm text-text-faint">
        Configure a video provider (<code className="text-text-dim">YOUTUBE_API_KEY</code>) to
        surface related clips and broadcasts for the story you&apos;re viewing.
      </p>
    </section>
  );
}
