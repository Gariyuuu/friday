import "server-only";
import { execFile } from "node:child_process";
import { createLogger } from "@/lib/logger";
import {
  VM_DEFAULT_TIMEOUT_SECONDS,
  VM_HOST,
  VM_SSH_CONNECT_TIMEOUT_SECONDS,
  VM_SSH_KEY_PATH,
  VM_USER,
} from "./config";

const logger = createLogger("VM");

export interface VmTaskResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  error?: string;
  title?: string;
  url?: string;
  textContent?: string;
}

interface VmShellTaskRequest {
  type?: "shell";
  command: string;
  timeoutSeconds?: number;
  allowNetwork?: boolean;
}

interface VmBrowseTaskRequest {
  type: "browse";
  url: string;
  timeoutSeconds?: number;
}

type VmTaskRequest = VmShellTaskRequest | VmBrowseTaskRequest;

/**
 * Runs one task on the FRIDAY VM's sandboxed Docker dispatch script over SSH.
 * Never builds a shell string — the ssh binary is invoked via execFile with a
 * fixed argument array, and the task itself is sent as a JSON stdin payload the
 * remote dispatch.sh parses with jq, not string-interpolated into a command.
 * The remote authorized_keys entry force-runs dispatch.sh regardless of what
 * "command" execFile would otherwise pass on the SSH command line — this
 * function doesn't even attempt to pass one.
 */
export async function runVmTask(request: VmTaskRequest): Promise<VmTaskResult> {
  if (!VM_HOST) {
    return { ok: false, error: "VM_HOST is not configured — the cloud VM is unavailable" };
  }

  const timeoutSeconds = request.timeoutSeconds ?? VM_DEFAULT_TIMEOUT_SECONDS;
  const stdinPayload = JSON.stringify({ ...request, timeoutSeconds });
  // Browse tasks spend real time launching a browser + rendering a page —
  // give them extra room above the base SSH-connect backstop.
  const backstopSeconds = request.type === "browse" ? 25 : 15;

  return new Promise((resolve) => {
    const child = execFile(
      "ssh",
      [
        "-i",
        VM_SSH_KEY_PATH,
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=accept-new",
        "-o",
        `ConnectTimeout=${VM_SSH_CONNECT_TIMEOUT_SECONDS}`,
        `${VM_USER}@${VM_HOST}`,
      ],
      // Hard backstop above the VM-side timeout, covering SSH connect + Docker
      // image pulls / browser launch on a cold cache.
      {
        timeout: (timeoutSeconds + VM_SSH_CONNECT_TIMEOUT_SECONDS + backstopSeconds) * 1000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          logger.error("vm task failed", { error: String(error), stderr });
          resolve({ ok: false, stdout: stdout || undefined, stderr: stderr || undefined, error: String(error) });
          return;
        }
        try {
          const parsed = JSON.parse(stdout) as Omit<VmTaskResult, "error">;
          resolve(parsed);
        } catch {
          resolve({ ok: false, stdout, stderr, exitCode: null, error: "dispatch.sh returned non-JSON output" });
        }
      },
    );
    child.stdin?.write(stdinPayload);
    child.stdin?.end();
  });
}
