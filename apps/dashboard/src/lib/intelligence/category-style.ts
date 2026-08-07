import type { IntelligenceCategory } from "@friday/types";

export const CATEGORY_COLOR: Record<IntelligenceCategory, string> = {
  geopolitics: "#f59e0b",
  economy: "#6ee7ff",
  markets: "#4ade80",
  technology: "#a78bfa",
  weather: "#38bdf8",
  science: "#f472b6",
  security: "#f87171",
  health: "#34d399",
  culture: "#fbbf24",
  other: "#94a3b8",
};

export const CATEGORY_LABEL: Record<IntelligenceCategory, string> = {
  geopolitics: "Geopolitics",
  economy: "Economy",
  markets: "Markets",
  technology: "Technology",
  weather: "Weather",
  science: "Science",
  security: "Security",
  health: "Health",
  culture: "Culture",
  other: "Other",
};
