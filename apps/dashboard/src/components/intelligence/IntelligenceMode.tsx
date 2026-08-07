"use client";

import { motion } from "motion/react";
import { Globe } from "@/components/globe/Globe";
import { useIntelligenceData } from "@/lib/intelligence/use-intelligence-data";
import { useUiStore } from "@/stores/ui-store";
import { EventDetailPanel } from "./EventDetailPanel";
import { MarketPanel } from "./MarketPanel";
import { MediaPanel } from "./MediaPanel";
import { NewsPanel } from "./NewsPanel";
import { SignalsPanel } from "./SignalsPanel";

export function IntelligenceMode() {
  const { events, markets, weatherAlerts, eventsFreshness, marketsFreshness, weatherFreshness } =
    useIntelligenceData();
  const focusedEventId = useUiStore((s) => s.focusedEventId);
  const focusEvent = useUiStore((s) => s.focusEvent);
  const setFocusedEventId = useUiStore((s) => s.focusEvent);

  const focusedEvent = events.find((e) => e.id === focusedEventId) ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid h-full grid-cols-1 gap-3 p-3 lg:grid-cols-[1.1fr_0.9fr] lg:grid-rows-[1fr_auto]"
    >
      <div className="glass-panel relative min-h-[280px] overflow-hidden rounded-lg lg:row-span-2">
        <div className="pointer-events-none absolute left-4 top-4 z-10">
          <p className="text-mono-status text-[10px] uppercase tracking-widest text-text-dim">
            World / Globe
          </p>
        </div>
        <Globe
          events={events}
          focusedEventId={focusedEventId}
          onSelectEvent={(id) => focusEvent(id)}
          className="h-full w-full"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NewsPanel
          events={events}
          freshness={eventsFreshness}
          focusedEventId={focusedEventId}
          onSelectEvent={(id) => focusEvent(id)}
        />
        <MarketPanel markets={markets} freshness={marketsFreshness} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SignalsPanel
          events={events}
          weatherAlerts={weatherAlerts}
          weatherFreshness={weatherFreshness}
        />
        {focusedEvent ? (
          <EventDetailPanel event={focusedEvent} onClose={() => setFocusedEventId(null)} />
        ) : (
          <MediaPanel />
        )}
      </div>
    </motion.div>
  );
}
