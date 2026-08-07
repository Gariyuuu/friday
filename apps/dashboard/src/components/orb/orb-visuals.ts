import type { OrbState } from "@friday/types";

export interface OrbVisualParams {
  color: string;
  coreScale: number;
  rotationSpeed: number;
  ringSpread: number;
  particleJitter: number;
}

/** Single source of truth mapping each orb state to its visual tuning — see spec §8. */
export const ORB_VISUALS: Record<OrbState, OrbVisualParams> = {
  idle: {
    color: "#6ee7ff",
    coreScale: 1,
    rotationSpeed: 0.12,
    ringSpread: 1,
    particleJitter: 0.02,
  },
  listening: {
    color: "#6ee7ff",
    coreScale: 0.9,
    rotationSpeed: 0.18,
    ringSpread: 0.85,
    particleJitter: 0.08,
  },
  thinking: {
    color: "#8ff0ff",
    coreScale: 1.05,
    rotationSpeed: 0.55,
    ringSpread: 1.15,
    particleJitter: 0.05,
  },
  searching: {
    color: "#7ee0ff",
    coreScale: 1,
    rotationSpeed: 0.4,
    ringSpread: 1.25,
    particleJitter: 0.06,
  },
  executing: {
    color: "#9ae6b4",
    coreScale: 1.08,
    rotationSpeed: 0.7,
    ringSpread: 1.3,
    particleJitter: 0.12,
  },
  speaking: {
    color: "#6ee7ff",
    coreScale: 1,
    rotationSpeed: 0.25,
    ringSpread: 1,
    particleJitter: 0.03,
  },
  error: {
    color: "#f87171",
    coreScale: 0.95,
    rotationSpeed: 0.15,
    ringSpread: 0.9,
    particleJitter: 0.1,
  },
  success: {
    color: "#4ade80",
    coreScale: 1.15,
    rotationSpeed: 0.3,
    ringSpread: 1.1,
    particleJitter: 0.04,
  },
};
