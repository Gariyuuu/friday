"use client";

import Link from "next/link";
import { useState } from "react";
import { useUiStore, type GraphicsQuality } from "@/stores/ui-store";

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
              <NotConfigured setting="Realtime voice provider" phase="Phase 4" />
            </div>
          )}

          {section === "ai" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">AI Providers</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {["OpenAI", "Anthropic", "Gemini"].map((provider) => (
                  <li key={provider} className="flex items-center justify-between">
                    <span className="text-text-dim">{provider}</span>
                    <span className="text-mono-status text-xs text-text-faint">
                      Not configured
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-faint">
                Configured via server-side environment variables — never entered directly in
                this UI. See <code className="text-text-dim">.env.example</code>.
              </p>
            </div>
          )}

          {section === "intelligence" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">Intelligence</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {["News", "Markets", "Weather", "Video search"].map((feed) => (
                  <li key={feed} className="flex items-center justify-between">
                    <span className="text-text-dim">{feed}</span>
                    <span className="text-mono-status text-xs text-warning">Demo data</span>
                  </li>
                ))}
              </ul>
              <NotConfigured setting="Live provider connections" phase="Phase 3" />
            </div>
          )}

          {section === "memory" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">Memory</h2>
              <NotConfigured setting="Long-term memory" phase="Phase 7" />
            </div>
          )}

          {section === "tools" && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-text-dim">Tool Permissions</h2>
              <NotConfigured setting="Local Mac tools and the permission engine" phase="Phase 6" />
            </div>
          )}

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
                  <span className="text-mono-status text-xs text-text-faint">OFFLINE</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">AI provider</span>
                  <span className="text-mono-status text-xs text-text-faint">
                    Not configured
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">VM</span>
                  <span className="text-mono-status text-xs text-text-faint">OFFLINE</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-text-dim">Intelligence data</span>
                  <span className="text-mono-status text-xs text-warning">Demo data</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
