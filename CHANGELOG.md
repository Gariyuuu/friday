# Changelog

## 0.1.0 — Foundation & Visual FRIDAY

- Monorepo scaffold: pnpm workspaces + Turborepo, `apps/dashboard`, `packages/types`,
  `packages/config`
- Shared Zod schemas for intelligence events, market quotes, weather alerts, orb/voice
  state, and tool definitions
- Structured, secret-redacting logger
- Cinematic dark theme; holographic orb (Three.js/R3F) with all 8 states, bloom, and a
  graphics quality setting
- Interactive 3D globe with category-colored, clickable event markers
- Intelligence dashboard: news, markets, global signals, media, and event-detail
  panels, all backed by a swappable mock data provider with freshness indicators
- Command palette (⌘K) with a demo action exercising the full orb/dashboard flow
- Settings page with honest not-configured states for every unbuilt integration
