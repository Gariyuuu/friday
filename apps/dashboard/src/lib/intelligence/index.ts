import { MockIntelligenceProvider } from "./mock-provider";
import type { IntelligenceProvider } from "./provider";

export type { IntelligenceProvider, IntelligenceSnapshot } from "./provider";

let cachedProvider: IntelligenceProvider | null = null;

/**
 * No live news/market/weather providers are wired up yet (Phase 3), so this
 * always returns mock data today. Once a real provider is added, branch here
 * on FRIDAY_MOCK_MODE / whether provider credentials are configured instead
 * of changing every call site.
 */
export function getIntelligenceProvider(): IntelligenceProvider {
  if (!cachedProvider) {
    cachedProvider = new MockIntelligenceProvider();
  }
  return cachedProvider;
}
