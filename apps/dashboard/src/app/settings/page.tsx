"use client";

import type { ToolPermissionMode } from "@friday/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TOOL_REGISTRY } from "@/lib/tools/registry";
import { useOrbStore } from "@/stores/orb-store";
import { useToolStore } from "@/stores/tool-store";
import { useUiStore, type GraphicsQuality } from "@/stores/ui-store";

interface ConfigStatus {
  ai: { openai: boolean; anthropic: boolean; gemini: boolean };
  intelligence: {
    news: boolean;
    equities: boolean;
    crypto: boolean;
    weather: boolean;
    video: boolean;
    search: boolean;
  };
  voice: boolean;
  memory: boolean;
  vm: boolean;
}

function useConfigStatus() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((body: ConfigStatus) => setStatus(body))
      .catch(() => setStatus(null));
  }, []);
  return status;
}

function StatusTag({ ok, onLabel = "Connected" }: { ok: boolean; onLabel?: string }) {
  return (
    <span
      className={`text-mono-status text-xs ${ok ? "text-success" : "text-text-faint"}`}
    >
      {ok ? onLabel : "Not configured"}
    </span>
  );
}

type SectionId =
  | "general"
  | "voice"
  | "ai"
  | "intelligence"
  | "memory"
  | "tools"
  | "security"
  | "display"
  | "developer";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "voice", label: "Voice" },
  { id: "ai", label: "AI" },
  { id: "intelligence", label: "Intelligence" },
  { id: "memory", label: "Memory" },
  { id: "tools", label: "Tools" },
  { id: "security", label: "Security" },
  { id: "display", label: "Display" },
  { id: "developer", label: "Developer" },
];

function NotConfigured({ setting, phase }: { setting: string; phase: string }) {
  return (
    <p className="text-sm text-text-faint">
      {setting} is not configured yet — this ships in {phase}. No credentials are stored and
      nothing here does anything until then.
    </p>
  );
}

const QUALITY_OPTIONS: { id: GraphicsQuality; label: string; description: string }[] = [
  { id: "low", label: "Low", description: "No bloom, fewer particles. Best on battery." },
  { id: "balanced", label: "Balanced", description: "Default — bloom on, moderate particle count." },
  { id: "cinematic", label: "Cinematic", description: "Full bloom + particle density. Plugged in recommended." },
];

export default function SettingsPage() {
  const [section, setSection] = useState<SectionId>("general");
  const graphicsQuality = useUiStore((s) => s.graphicsQuality);
  const setGraphicsQuality = useUiStore((s) => s.setGraphicsQuality);
  const config = useConfigStatus();
  const voiceStatus = useOrbStore((s) => s.voiceStatus);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <h1 className="text-sm font-semibold tracking-[0.2em] text-text">SETTINGS</h1>
        <Link
          href="/"
          className="text-[10px] uppercase tracking-widest text-text-dim transition-colors hover:text-text"
        >
          Back to FRIDAY
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 border-r border-border p-3">
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSection(s.id)}
                  className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    section === s.id
                      ? "bg-surface-raised text-text"
                      : "text-text-dim hover:text-text"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 overflow-y-auto p-6">
          {section === "general" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">General</h2>
              <NotConfigured setting="Startup behavior and global shortcut" phase="Phase 11 (desktop packaging)" />
            </div>
          )}

          {section === "voice" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">Voice</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-dim">OpenAI Realtime (WebRTC)</span>
                <StatusTag ok={config?.voice ?? false} onLabel="Ready" />
              </div>
              <p className="text-xs text-text-faint">
                Chosen over LiveKit — no separate server to run, and cheaper for
                personal, low-volume use. Needs{" "}
                <code className="text-text-dim">OPENAI_API_KEY</code> with Realtime
                API access. Once set, press{" "}
                <code className="text-text-dim">⌥ + Space</code> anywhere in the app
                to start talking.
              </p>
              {!config?.voice && (
                <NotConfigured setting="OPENAI_API_KEY" phase="right now — just add the key" />
              )}
            </div>
          )}

          {section === "ai" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">AI Providers</h2>
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">OpenAI</span>
                  <StatusTag ok={config?.ai.openai ?? false} />
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Anthropic</span>
                  <StatusTag ok={config?.ai.anthropic ?? false} />
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Gemini</span>
                  <StatusTag ok={config?.ai.gemini ?? false} />
                </li>
              </ul>
              <p className="text-xs text-text-faint">
                Configured via server-side environment variables — never entered directly in
                this UI. See <code className="text-text-dim">.env.example</code>. No orchestration
                uses these yet (Phase 5) — this just reports whether a key is present.
              </p>
            </div>
          )}

          {section === "intelligence" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">Intelligence</h2>
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">News</span>
                  <StatusTag ok={config?.intelligence.news ?? false} onLabel="Live (NewsAPI)" />
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Markets — crypto</span>
                  <StatusTag ok={config?.intelligence.crypto ?? false} onLabel="Live (CoinGecko)" />
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Markets — equities/FX</span>
                  <StatusTag ok={config?.intelligence.equities ?? false} onLabel="Live (Twelve Data)" />
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Weather alerts</span>
                  <StatusTag ok={config?.intelligence.weather ?? false} onLabel="Live (NWS, US only)" />
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Video search</span>
                  <StatusTag ok={config?.intelligence.video ?? false} />
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Web search</span>
                  <StatusTag ok={config?.intelligence.search ?? false} />
                </li>
              </ul>
              <p className="text-xs text-text-faint">
                Crypto and weather need no key and are live by default. News and
                equities/FX show demo data until their key is set — see{" "}
                <code className="text-text-dim">.env.example</code>.
              </p>
            </div>
          )}

          {section === "memory" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">Memory</h2>
              <NotConfigured setting="Long-term memory" phase="Phase 7" />
            </div>
          )}

          {section === "tools" && <ToolsSection />}

          {section === "security" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">Security</h2>
              <NotConfigured setting="Cloud VM connection" phase="Phase 8" />
              <p className="text-xs text-text-faint">
                See <code className="text-text-dim">docs/SECURITY.md</code> for the threat model
                that will govern that phase before it starts.
              </p>
            </div>
          )}

          {section === "display" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">Graphics</h2>
              <div className="flex flex-col gap-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setGraphicsQuality(opt.id)}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      graphicsQuality === opt.id
                        ? "border-accent/50 bg-accent/10"
                        : "border-border hover:bg-surface-raised"
                    }`}
                  >
                    <p className="text-sm text-text">{opt.label}</p>
                    <p className="text-xs text-text-faint">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {section === "developer" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">
                Developer Diagnostics
              </h2>
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Voice</span>
                  <span className="text-mono-status text-xs text-text-faint">
                    {voiceStatus.toUpperCase()}
                    {config?.voice ? "" : " (no key)"}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">AI provider</span>
                  <StatusTag
                    ok={(config?.ai.openai || config?.ai.anthropic || config?.ai.gemini) ?? false}
                    onLabel="Key present (unused until Phase 5)"
                  />
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">VM</span>
                  <span className="text-mono-status text-xs text-text-faint">OFFLINE</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Intelligence data</span>
                  <span className="text-mono-status text-xs text-success">
                    Live (crypto + US weather; news/equities need keys)
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PERMISSION_OPTIONS: ToolPermissionMode[] = ["disabled", "ask", "allow"];

function ToolsSection() {
  const permissions = useToolStore((s) => s.permissions);
  const setPermission = useToolStore((s) => s.setPermission);
  const runHistory = useToolStore((s) => s.runHistory);

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-text-dim">Tool Permissions</h2>
        <p className="text-xs text-text-faint">
          Every local Mac tool call goes through this — no arbitrary shell, no
          filesystem-wide access, only the actions listed below. See{" "}
          <code className="text-text-dim">docs/SECURITY.md</code>.
        </p>
        <ul className="flex flex-col gap-2">
          {TOOL_REGISTRY.map((tool) => (
            <li
              key={tool.name}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm text-text">{tool.description}</p>
                <p className="text-mono-status text-[10px] uppercase text-text-faint">
                  {tool.riskLevel} risk
                </p>
              </div>
              <select
                value={permissions[tool.name] ?? "ask"}
                onChange={(e) =>
                  setPermission(tool.name, e.target.value as ToolPermissionMode)
                }
                className="rounded-md border border-border bg-surface-raised px-2 py-1 text-xs text-text"
              >
                {PERMISSION_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "disabled" ? "Disabled" : mode === "ask" ? "Ask Every Time" : "Allowed"}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-widest text-text-dim">Recent Activity</h2>
        {runHistory.length === 0 ? (
          <p className="text-sm text-text-faint">No tool calls yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {runHistory.slice(0, 10).map((record) => (
              <li key={record.id} className="flex items-center justify-between text-xs">
                <span className="text-text-dim">{record.toolName}</span>
                <span
                  className={
                    record.result === "success"
                      ? "text-success"
                      : record.result === "denied"
                        ? "text-text-faint"
                        : "text-danger"
                  }
                >
                  {record.result}
                </span>
                <span className="text-text-faint">
                  {new Date(record.startedAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
