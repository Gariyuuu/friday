import "server-only";
import dns from "node:dns/promises";

/**
 * Application-layer SSRF backstop for browse_on_vm, in addition to (not instead
 * of) the VM-side DOCKER-USER iptables block on link-local/private ranges. Two
 * independent layers: if the VM-side rule is ever lost (rebuild, migration,
 * docker restart wiping the chain), this still catches the obvious case before
 * the request ever leaves the Mac. Resolves DNS and checks the resolved
 * address, not just the literal hostname string, to defend against DNS
 * rebinding (a hostname that looks public but resolves to a private IP).
 */
const BLOCKED_V4_RANGES: [string, number][] = [
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, covers cloud metadata services
  ["10.0.0.0", 8], // RFC1918
  ["172.16.0.0", 12], // RFC1918
  ["192.168.0.0", 16], // RFC1918
  ["0.0.0.0", 8], // "this network"
];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isBlockedV4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return BLOCKED_V4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedV6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" || // loopback
    normalized.startsWith("fe80:") || // link-local
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") || // unique local (fc00::/7)
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:169.254.")
  );
}

export class SsrfBlockedError extends Error {}

export async function assertPublicUrl(rawUrl: string): Promise<void> {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new SsrfBlockedError("only http/https URLs are allowed");
  }

  const hostname = url.hostname;

  // Literal IP in the URL itself (e.g. http://169.254.169.254/...)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isBlockedV4(hostname)) {
      throw new SsrfBlockedError(`${hostname} is a private/link-local address`);
    }
    return;
  }
  if (hostname.includes(":")) {
    if (isBlockedV6(hostname)) {
      throw new SsrfBlockedError(`${hostname} is a private/link-local address`);
    }
    return;
  }

  // Domain name — resolve and check every returned address (defends against
  // DNS rebinding: a hostname that looks public but points at a private IP).
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  for (const record of records) {
    if (record.family === 4 && isBlockedV4(record.address)) {
      throw new SsrfBlockedError(`${hostname} resolves to a private/link-local address`);
    }
    if (record.family === 6 && isBlockedV6(record.address)) {
      throw new SsrfBlockedError(`${hostname} resolves to a private/link-local address`);
    }
  }
}
