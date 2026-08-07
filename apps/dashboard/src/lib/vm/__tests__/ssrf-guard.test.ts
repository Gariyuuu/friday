import { describe, expect, it, vi } from "vitest";

// The real "server-only" package unconditionally throws outside Next's own
// bundler (which swaps it for a no-op only in server bundles) — harmless in
// the app itself, but needs a stub here so this pure-logic module can be unit
// tested directly without spinning up Next.
vi.mock("server-only", () => ({}));
vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn() },
}));

const { assertPublicUrl, SsrfBlockedError } = await import("../ssrf-guard");
const dns = (await import("node:dns/promises")).default;

describe("assertPublicUrl", () => {
  it("rejects non-http(s) protocols", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow(SsrfBlockedError);
    await expect(assertPublicUrl("ftp://example.com")).rejects.toThrow(SsrfBlockedError);
  });

  it.each([
    ["169.254.169.254", "cloud metadata service"],
    ["127.0.0.1", "loopback"],
    ["127.255.255.255", "loopback, upper bound"],
    ["10.0.0.1", "RFC1918 10/8"],
    ["10.255.255.255", "RFC1918 10/8, upper bound"],
    ["172.16.0.1", "RFC1918 172.16/12"],
    ["172.31.255.255", "RFC1918 172.16/12, upper bound"],
    ["192.168.1.1", "RFC1918 192.168/16"],
    ["0.0.0.0", "this-network"],
  ])("blocks literal IPv4 %s (%s)", async (ip) => {
    await expect(assertPublicUrl(`http://${ip}/`)).rejects.toThrow(SsrfBlockedError);
  });

  it.each([
    ["169.253.255.255", "just below the link-local range"],
    ["169.255.0.0", "just above the link-local range"],
    ["172.15.255.255", "just below the RFC1918 172.16/12 range"],
    ["172.32.0.0", "just above the RFC1918 172.16/12 range"],
    ["8.8.8.8", "public DNS"],
    ["1.1.1.1", "public DNS"],
  ])("allows literal IPv4 %s (%s)", async (ip) => {
    await expect(assertPublicUrl(`http://${ip}/`)).resolves.toBeUndefined();
  });

  it("blocks literal IPv6 loopback and link-local/unique-local", async () => {
    await expect(assertPublicUrl("http://[::1]/")).rejects.toThrow(SsrfBlockedError);
    await expect(assertPublicUrl("http://[fe80::1]/")).rejects.toThrow(SsrfBlockedError);
    await expect(assertPublicUrl("http://[fd12:3456::1]/")).rejects.toThrow(SsrfBlockedError);
  });

  it("allows a public IPv6 literal", async () => {
    await expect(assertPublicUrl("http://[2001:4860:4860::8888]/")).resolves.toBeUndefined();
  });

  it("blocks a hostname that resolves to a private address (DNS rebinding defense)", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "127.0.0.1", family: 4 }] as never);
    await expect(assertPublicUrl("http://looks-public.example.com/")).rejects.toThrow(SsrfBlockedError);
  });

  it("allows a hostname that resolves only to public addresses", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
    await expect(assertPublicUrl("https://example.com/")).resolves.toBeUndefined();
  });

  it("blocks if ANY resolved address is private, even alongside a public one", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "169.254.169.254", family: 4 },
    ] as never);
    await expect(assertPublicUrl("https://multi-homed.example.com/")).rejects.toThrow(SsrfBlockedError);
  });
});
