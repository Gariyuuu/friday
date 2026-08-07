import path from "node:path";
import os from "node:os";

/**
 * Phase 9 VM agent channel. Deliberately SSH-based rather than a public HTTPS
 * gateway: the droplet's firewall stays default-deny with only SSH open (see
 * SECURITY.md), so there's no new network attack surface to defend, and it
 * reuses SSH's already-hardened auth instead of hand-rolling a token scheme.
 * The dedicated key below is authorized on the VM ONLY to run
 * /opt/friday-agent/dispatch.sh (a forced `command=` in authorized_keys, not
 * just convention) — even a fully compromised key can't get a shell, only
 * dispatch sandboxed, network-isolated-by-default Docker tasks.
 */
/**
 * Deployment-specific, not committed as a literal — the droplet's IP is real,
 * public infrastructure-identifying information. A public GitHub repo is not
 * the place for it (see SECURITY.md's findings), even though the forced-command
 * SSH restriction means knowing it alone doesn't grant access.
 */
export const VM_HOST = process.env.VM_HOST ?? "";
export const VM_USER = process.env.VM_USER ?? "friday";
export const VM_SSH_KEY_PATH = path.join(os.homedir(), ".friday", "vm_agent_key");
export const VM_DEFAULT_TIMEOUT_SECONDS = 30;
export const VM_SSH_CONNECT_TIMEOUT_SECONDS = 10;
