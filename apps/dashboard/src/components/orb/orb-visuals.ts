import type { OrbState } from "@friday/types";

export interface OrbVisualParams {
  /** Hot/center color of the core's lit-sphere gradient — see OrbCore.tsx. */
  coreColor: string;
  /** Cool/rim color of the core's gradient, and the color used by the shells,
   *  rings, and particles surrounding it (the "corona"). */
  edgeColor: string;
  coreScale: number;
  rotationSpeed: number;
  ringSpread: number;
  particleJitter: number;
}

/**
 * Single source of truth mapping each orb state to its visual tuning — see
 * spec §8. Identity is a warm amber/orange core fading to a purple rim/corona
 * (user-requested "sun and supernova" look, replacing the original flat
 * cyan). `error`/`success` stay flat single colors (coreColor === edgeColor)
 * since those are semantic status colors, not part of the brand identity.
 */
export const ORB_VISUALS: Record<OrbState, OrbVisualParams> = {
  idle: {
    coreColor: "#ffb347",
    edgeColor: "#8b2fc9",
    coreScale: 1,
    rotationSpeed: 0.12,
    ringSpread: 1,
    particleJitter: 0.02,
  },
  listening: {
    coreColor: "#ff9d42",
    edgeColor: "#a855f7",
    coreScale: 0.9,
    rotationSpeed: 0.18,
    ringSpread: 0.85,
    particleJitter: 0.08,
  },
  thinking: {
    coreColor: "#ffd166",
    edgeColor: "#9333ea",
    coreScale: 1.05,
    rotationSpeed: 0.55,
    ringSpread: 1.15,
    particleJitter: 0.05,
  },
  searching: {
    coreColor: "#ff8f3d",
    edgeColor: "#7c3aed",
    coreScale: 1,
    rotationSpeed: 0.4,
    ringSpread: 1.25,
    particleJitter: 0.06,
  },
  executing: {
    coreColor: "#ffbb54",
    edgeColor: "#7c3aed",
    coreScale: 1.08,
    rotationSpeed: 0.7,
    ringSpread: 1.3,
    particleJitter: 0.12,
  },
  speaking: {
    coreColor: "#ffb347",
    edgeColor: "#8b2fc9",
    coreScale: 1,
    rotationSpeed: 0.25,
    ringSpread: 1,
    particleJitter: 0.03,
  },
  error: {
    coreColor: "#f87171",
    edgeColor: "#f87171",
    coreScale: 0.95,
    rotationSpeed: 0.15,
    ringSpread: 0.9,
    particleJitter: 0.1,
  },
  success: {
    coreColor: "#4ade80",
    edgeColor: "#4ade80",
    coreScale: 1.15,
    rotationSpeed: 0.3,
    ringSpread: 1.1,
    particleJitter: 0.04,
  },
};
