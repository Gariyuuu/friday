import type { DataFreshness, IntelligenceEvent } from "@friday/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewsPanel } from "../NewsPanel";

function freshness(overrides: Partial<DataFreshness> = {}): DataFreshness {
  return { status: "live", isMock: false, ...overrides };
}

function event(overrides: Partial<IntelligenceEvent> = {}): IntelligenceEvent {
  return {
    id: "e1",
    title: "A headline",
    summary: "summary",
    category: "geopolitics",
    importance: 0.5,
    timestamp: new Date().toISOString(),
    sources: [],
    ...overrides,
  };
}

describe("NewsPanel", () => {
  it("ranks events by importance, highest first", () => {
    const events = [
      event({ id: "low", title: "Low importance", importance: 0.2 }),
      event({ id: "high", title: "High importance", importance: 0.9 }),
      event({ id: "mid", title: "Mid importance", importance: 0.5 }),
    ];
    render(
      <NewsPanel events={events} freshness={freshness()} focusedEventId={null} onSelectEvent={vi.fn()} />,
    );

    const titles = screen.getAllByRole("button").map((b) => b.textContent);
    expect(titles[0]).toContain("High importance");
    expect(titles[1]).toContain("Mid importance");
    expect(titles[2]).toContain("Low importance");
  });

  it("shows a loading message only when loading with no events yet", () => {
    const { rerender } = render(
      <NewsPanel events={[]} freshness={freshness({ status: "loading" })} focusedEventId={null} onSelectEvent={vi.fn()} />,
    );
    expect(screen.getByText("Searching global news…")).toBeInTheDocument();

    rerender(
      <NewsPanel
        events={[event()]}
        freshness={freshness({ status: "loading" })}
        focusedEventId={null}
        onSelectEvent={vi.fn()}
      />,
    );
    expect(screen.queryByText("Searching global news…")).not.toBeInTheDocument();
  });

  it("shows an unavailable message when the feed is unavailable", () => {
    render(
      <NewsPanel events={[]} freshness={freshness({ status: "unavailable" })} focusedEventId={null} onSelectEvent={vi.fn()} />,
    );
    expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument();
  });

  it("calls onSelectEvent with the clicked event's id", () => {
    const onSelectEvent = vi.fn();
    render(
      <NewsPanel
        events={[event({ id: "abc", title: "Click me" })]}
        freshness={freshness()}
        focusedEventId={null}
        onSelectEvent={onSelectEvent}
      />,
    );
    fireEvent.click(screen.getByText("Click me"));
    expect(onSelectEvent).toHaveBeenCalledWith("abc");
  });

  it("highlights the focused event", () => {
    render(
      <NewsPanel
        events={[event({ id: "abc", title: "Focused one" })]}
        freshness={freshness()}
        focusedEventId="abc"
        onSelectEvent={vi.fn()}
      />,
    );
    expect(screen.getByText("Focused one").closest("button")).toHaveClass("border-accent/50");
  });
});
