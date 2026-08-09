import type { DataFreshness } from "@friday/types";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FreshnessBadge } from "../FreshnessBadge";

function freshness(overrides: Partial<DataFreshness>): DataFreshness {
  return { status: "live", lastUpdated: undefined, isMock: false, ...overrides };
}

describe("FreshnessBadge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["live", "LIVE"],
    ["loading", "LOADING"],
    ["stale", "STALE"],
    ["unavailable", "UNAVAILABLE"],
  ] as const)("shows the %s label for status=%s", (status, label) => {
    render(<FreshnessBadge freshness={freshness({ status })} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows a DEMO DATA badge when isMock is true, and hides it otherwise", () => {
    const { rerender } = render(<FreshnessBadge freshness={freshness({ isMock: true })} />);
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();

    rerender(<FreshnessBadge freshness={freshness({ isMock: false })} />);
    expect(screen.queryByText("DEMO DATA")).not.toBeInTheDocument();
  });

  it("shows 'updated Ns ago' only when status is live AND lastUpdated is set", () => {
    const now = new Date("2026-08-08T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const thirtySecondsAgo = new Date(now.getTime() - 30_000).toISOString();

    const { rerender } = render(
      <FreshnessBadge freshness={freshness({ status: "live", lastUpdated: thirtySecondsAgo })} />,
    );
    expect(screen.getByText("· updated 30s ago")).toBeInTheDocument();

    // stale + a lastUpdated timestamp should NOT show the "updated Ns ago" text
    rerender(<FreshnessBadge freshness={freshness({ status: "stale", lastUpdated: thirtySecondsAgo })} />);
    expect(screen.queryByText(/updated.*ago/)).not.toBeInTheDocument();

    // live with no lastUpdated at all should also not show it
    rerender(<FreshnessBadge freshness={freshness({ status: "live", lastUpdated: undefined })} />);
    expect(screen.queryByText(/updated.*ago/)).not.toBeInTheDocument();
  });

  it("never shows a negative age even if lastUpdated is slightly in the future (clock skew)", () => {
    const now = new Date("2026-08-08T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const inTheFuture = new Date(now.getTime() + 5000).toISOString();
    render(<FreshnessBadge freshness={freshness({ status: "live", lastUpdated: inTheFuture })} />);

    expect(screen.getByText("· updated 0s ago")).toBeInTheDocument();
  });
});
