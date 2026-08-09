import type { IntelligenceEvent } from "@friday/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventDetailPanel } from "../EventDetailPanel";

function event(overrides: Partial<IntelligenceEvent> = {}): IntelligenceEvent {
  return {
    id: "e1",
    title: "A real headline",
    summary: "A real summary",
    category: "technology",
    importance: 0.5,
    timestamp: new Date().toISOString(),
    sources: [{ name: "Reuters", url: "https://reuters.com/article" }],
    ...overrides,
  };
}

describe("EventDetailPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // never resolves unless overridden
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a placeholder when no event is selected", () => {
    render(<EventDetailPanel event={null} onClose={vi.fn()} />);
    expect(screen.getByText(/Select a marker on the globe/)).toBeInTheDocument();
  });

  it("shows the category, title, and summary for a selected event", () => {
    render(<EventDetailPanel event={event({ category: "economy", title: "Rates held" })} onClose={vi.fn()} />);
    expect(screen.getByText("Economy")).toBeInTheDocument();
    expect(screen.getByText("Rates held")).toBeInTheDocument();
    expect(screen.getByText("A real summary")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<EventDetailPanel event={event()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close detail"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Region only when present", () => {
    const { rerender } = render(<EventDetailPanel event={event({ region: "Tokyo" })} onClose={vi.fn()} />);
    expect(screen.getByText("Tokyo")).toBeInTheDocument();

    rerender(<EventDetailPanel event={event({ region: undefined })} onClose={vi.fn()} />);
    expect(screen.queryByText("Region")).not.toBeInTheDocument();
  });

  it("shows Confidence as a rounded percentage only when defined", () => {
    const { rerender } = render(<EventDetailPanel event={event({ confidence: 0.876 })} onClose={vi.fn()} />);
    expect(screen.getByText("88%")).toBeInTheDocument();

    rerender(<EventDetailPanel event={event({ confidence: undefined })} onClose={vi.fn()} />);
    expect(screen.queryByText("Confidence")).not.toBeInTheDocument();
  });

  it("lists each source by name, linking to its url", () => {
    render(
      <EventDetailPanel
        event={event({ sources: [{ name: "Reuters", url: "https://reuters.com/x" }, { name: "AP", url: "https://ap.org/y" }] })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: "Reuters" })).toHaveAttribute("href", "https://reuters.com/x");
    expect(screen.getByRole("link", { name: "AP" })).toHaveAttribute("href", "https://ap.org/y");
  });

  describe("related videos", () => {
    it("shows a searching message while the fetch is pending", () => {
      render(<EventDetailPanel event={event()} onClose={vi.fn()} />);
      expect(screen.getByText("Searching for related videos…")).toBeInTheDocument();
    });

    it("hides the section entirely when the video provider isn't configured (501)", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 501 }));
      render(<EventDetailPanel event={event()} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.queryByText("Searching for related videos…")).not.toBeInTheDocument();
      });
      expect(screen.queryByText("No related videos found.")).not.toBeInTheDocument();
    });

    it("shows real results once the fetch resolves", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [
              {
                id: "v1",
                title: "A real video",
                url: "https://youtube.com/watch?v=v1",
                thumbnailUrl: "https://img/thumb.jpg",
                provider: "youtube",
                publishedAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200 },
        ),
      );
      render(<EventDetailPanel event={event()} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("A real video")).toBeInTheDocument();
      });
      expect(screen.getByRole("link", { name: /A real video/ })).toHaveAttribute(
        "href",
        "https://youtube.com/watch?v=v1",
      );
    });

    it("shows a no-results message when the provider returns zero videos", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));
      render(<EventDetailPanel event={event()} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText("No related videos found.")).toBeInTheDocument();
      });
    });

    it("re-fetches for a newly selected event instead of showing the previous one's videos", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));
      const { rerender } = render(<EventDetailPanel event={event({ id: "e1", title: "First" })} onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByText("No related videos found.")).toBeInTheDocument());

      // A different event id remounts RelatedVideos (via its `key`) — should
      // go back to "searching" rather than keep showing the previous event's
      // (stale) results.
      vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
      rerender(<EventDetailPanel event={event({ id: "e2", title: "Second" })} onClose={vi.fn()} />);
      expect(screen.getByText("Searching for related videos…")).toBeInTheDocument();
    });
  });
});
