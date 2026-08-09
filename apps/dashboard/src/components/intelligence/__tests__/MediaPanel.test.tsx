import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaPanel } from "../MediaPanel";

describe("MediaPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows 'Not configured' and setup guidance before /api/config resolves and when video is false", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ intelligence: { video: false } }), { status: 200 }),
    );
    render(<MediaPanel />);

    expect(screen.getByText("Not configured")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/YOUTUBE_API_KEY/)).toBeInTheDocument();
    });
  });

  it("shows 'Ready' and the selection prompt once /api/config reports video is configured", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ intelligence: { video: true } }), { status: 200 }),
    );
    render(<MediaPanel />);

    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });
    expect(screen.getByText(/Select a headline or globe marker/)).toBeInTheDocument();
  });

  it("falls back to the not-configured copy if the config fetch itself fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    render(<MediaPanel />);

    await waitFor(() => {
      expect(screen.getByText(/YOUTUBE_API_KEY/)).toBeInTheDocument();
    });
  });
});
