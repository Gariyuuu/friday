import type { ToolDefinition, ToolPermissionMode } from "@friday/types";

/**
 * The full set of local Mac tools FRIDAY can call today (spec §22). Deliberately
 * narrow: no arbitrary shell, no filesystem-wide access. Adding a tool means adding
 * an entry here AND a route handler that validates its own strict input — never a
 * generic "run this command" endpoint.
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: "open_application",
    description: "Launch an allowlisted application",
    executionLocation: "local",
    riskLevel: "medium",
    requiresConfirmation: true,
    timeoutMs: 5000,
  },
  {
    name: "open_url",
    description: "Open a URL in the default browser",
    executionLocation: "local",
    riskLevel: "low",
    requiresConfirmation: true,
    timeoutMs: 5000,
  },
  {
    name: "set_volume",
    description: "Set or read the system output volume",
    executionLocation: "local",
    riskLevel: "low",
    requiresConfirmation: false,
    timeoutMs: 3000,
  },
  {
    name: "show_notification",
    description: "Show a macOS notification",
    executionLocation: "local",
    riskLevel: "low",
    requiresConfirmation: false,
    timeoutMs: 3000,
  },
  {
    name: "system_status",
    description: "Read CPU load, memory, and battery status",
    executionLocation: "local",
    riskLevel: "low",
    requiresConfirmation: false,
    timeoutMs: 3000,
  },
];

/** Low-risk, no-confirmation tools default to "allow"; everything else asks first. */
export const DEFAULT_TOOL_PERMISSIONS: Record<string, ToolPermissionMode> = Object.fromEntries(
  TOOL_REGISTRY.map((tool) => [
    tool.name,
    tool.requiresConfirmation ? "ask" : "allow",
  ]),
);

/** Exact app names only — never pass user-supplied strings straight to `open -a`. */
export const APP_ALLOWLIST = [
  "Visual Studio Code",
  "Safari",
  "Google Chrome",
  "Terminal",
  "Finder",
  "Notes",
  "Calendar",
  "Slack",
  "Spotify",
] as const;

export type AllowlistedApp = (typeof APP_ALLOWLIST)[number];
