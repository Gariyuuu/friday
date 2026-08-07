# UI System

FRIDAY's interface is a Next.js/Tailwind v4 web app (rendered either in a
browser tab, a Tauri native window, or as an installed PWA — same UI code in
all three). No separate design-system package exists; tokens live directly
in `apps/dashboard/src/app/globals.css`, independently confirmed by reading
that file this session.

## Design language

"Cinematic dark theme" per `CLAUDE.md`/`README.md` — a near-black void
background, a cyan accent, restrained glass-panel surfaces with backdrop
blur, monospace status text. Not a generic admin-dashboard look: the
centerpiece is a holographic 3D orb (Three.js / React Three Fiber) with 8
distinct visual states tied to `voiceStatus`.

## Color tokens (from `globals.css`, verified this session)

```css
--color-void: #050608;              /* page background */
--color-surface: #0b0e13;           /* panel background */
--color-surface-raised: #12161d;    /* elevated surface (hover, raised panel) */
--color-border: rgba(255,255,255,0.08);
--color-border-strong: rgba(255,255,255,0.14);
--color-text: #e6e9ee;
--color-text-dim: #8b94a3;
--color-text-faint: #565d6b;
--color-accent: #6ee7ff;            /* cyan — primary interactive/highlight color */
--color-accent-dim: rgba(110,231,255,0.35);
--color-danger: #f87171;            /* critical-risk warnings, deny actions */
--color-warning: #fbbf24;
--color-success: #4ade80;
```

Exposed to Tailwind v4 via `@theme inline`, so these are usable directly as
utility classes (e.g. `text-accent`, `border-danger`) rather than needing a
separate `tailwind.config` color palette.

## Typography

- Sans: `--font-geist-sans` (Next.js's bundled Geist), applied to `body`
  with `font-feature-settings: "cv11", "ss01"` (stylistic alternates).
- Mono: `--font-geist-mono`, used specifically for status/label text via
  the `.text-mono-status` utility class (`letter-spacing: 0.04em`,
  uppercase in practice per component usage) — the "HUD readout" look for
  things like risk-level badges and freshness indicators.

## Key reusable patterns (verified by reading the actual CSS/components)

- **`.glass-panel`**: `color-mix(in srgb, var(--color-surface) 88%,
  transparent)` + 1px border + `backdrop-filter: blur(20px)`. The base
  surface treatment for the approval modal, dashboard panels, and the
  command palette.
- **Critical-risk styling**: `ToolApprovalModal.tsx` conditionally applies
  `border-2 border-danger` and a red-text warning banner when
  `pending.riskLevel === "critical"` — the only tool tier that gets this
  treatment (independently confirmed by reading the component).
- **Reduced motion**: `globals.css` has a `prefers-reduced-motion: reduce`
  block collapsing all animation/transition durations to near-zero —
  applies globally, not per-component opt-in.
- **`DataFreshness`/`FreshnessBadge`**: every live data panel renders a
  badge showing `live`/`loading`/`stale`/`unavailable` + whether the data
  is mock — a project-wide convention (`CLAUDE.md`'s coding conventions),
  not just a visual nicety; it's how the "never fabricate live data" rule
  is made visible in the UI.

## Component organization

```
components/
  orb/            The holographic AI core (Three.js/R3F, 8 states, bloom postprocessing)
  globe/          Interactive 3D globe + category-colored event markers
  intelligence/   News/markets/signals/media/detail panels
  shell/          Status bar, command palette (cmdk), orb stage wrapper, toast
  tools/          ToolApprovalModal
  voice/          VoiceActivation (⌥+V listener, renders nothing itself)
  gestures/       GestureController (lifecycle), CameraActiveIndicator
```

## Motion

`motion` (Framer Motion's current package name) drives panel/transition
choreography — e.g. `ToolApprovalModal`'s enter/exit animation
(`AnimatePresence`, opacity + scale).

## Graphics quality setting

A user-facing "graphics quality" setting exists (per `docs/
IMPLEMENTATION_PLAN.md`'s stack notes and `ARCHITECTURE.md`'s mention of it)
to manage Three.js render cost on integrated GPUs — not independently
re-verified in detail this session beyond confirming the orb/postprocessing
stack exists as described.

## What's NOT a formal design system

There's no Storybook, no `packages/ui`, and no documented spacing/sizing
scale beyond Tailwind's defaults — this is intentional per
`ARCHITECTURE.md`'s "why no packages/ui yet" note: with one Next.js app,
there's nothing to share a UI package into yet. If a second app is ever
added to this monorepo, extracting `globals.css`'s tokens and the
`glass-panel`/`text-mono-status` patterns into `packages/ui` would be the
natural next step.
