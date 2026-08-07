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
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

interface VmTaskRequest {
  command: string;
  timeoutSeconds?: number;
  allowNetwork?: boolean;
}

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
  const timeoutSeconds = request.timeoutSeconds ?? VM_DEFAULT_TIMEOUT_SECONDS;
  const stdinPayload = JSON.stringify({
    command: request.command,
    timeoutSeconds,
    allowNetwork: request.allowNetwork ?? false,
  });

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
      // image pulls on a cold cache.
      { timeout: (timeoutSeconds + VM_SSH_CONNECT_TIMEOUT_SECONDS + 15) * 1000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          logger.error("vm task failed", { error: String(error), stderr });
          resolve({ ok: false, stdout: stdout ?? "", stderr: stderr ?? "", exitCode: null, error: String(error) });
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
