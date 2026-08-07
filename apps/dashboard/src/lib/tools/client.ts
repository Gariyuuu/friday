import type { AllowlistedApp } from "./registry";
import { runTool } from "./run-tool";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function openApplication(appName: AllowlistedApp) {
  return runTool("open_application", () =>
    postJson<{ ok: true }>("/api/tools/open-application", { appName }),
  );
}

export function openUrl(url: string) {
  return runTool("open_url", () => postJson<{ ok: true }>("/api/tools/open-url", { url }));
}

export function setVolume(level: number) {
  return runTool("set_volume", () =>
    postJson<{ ok: true; level: number }>("/api/tools/volume", { level }),
  );
}

export function showNotification(title: string, body: string) {
  return runTool("show_notification", () =>
    postJson<{ ok: true }>("/api/tools/notification", { title, body }),
  );
}

interface VmToolResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  error?: string;
  title?: string;
  url?: string;
  textContent?: string;
}

export function runOnVm(command: string, options?: { timeoutSeconds?: number; allowNetwork?: boolean }) {
  return runTool("run_on_vm", () =>
    postJson<VmToolResult>("/api/tools/run-on-vm", { type: "shell", command, ...options }),
  );
}

export function browseOnVm(url: string, options?: { timeoutSeconds?: number }) {
  return runTool("run_on_vm", () =>
    postJson<VmToolResult>("/api/tools/run-on-vm", { type: "browse", url, ...options }),
  );
}

export function getSystemStatus() {
  return runTool("system_status", async () => {
    const res = await fetch("/api/tools/system-status");
    if (!res.ok) throw new Error("failed to read system status");
    return res.json() as Promise<{
      cpuLoadAvg1m: number;
      cpuCount: number;
      memoryUsedPercent: number;
      memoryTotalGb: number;
      battery: { percent: number | null; charging: boolean | null };
      platform: string;
      uptimeHours: number;
    }>;
  });
}
