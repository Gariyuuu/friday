import { render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastStore } from "@/stores/toast-store";
import { Toast } from "../Toast";

describe("Toast", () => {
  beforeEach(() => {
    useToastStore.setState({ toast: null });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when there is no toast", () => {
    render(<Toast />);
    expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
  });

  it("shows the toast text once show() is called", () => {
    render(<Toast />);
    act(() => {
      useToastStore.getState().show("Saved successfully", "success");
    });
    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("applies the danger text styling for an error tone but not for success", () => {
    render(<Toast />);
    act(() => {
      useToastStore.getState().show("It broke", "error");
    });
    expect(screen.getByText("It broke")).toHaveClass("text-danger");
    act(() => {
      useToastStore.getState().show("It worked", "success");
    });
    expect(screen.getByText("It worked")).not.toHaveClass("text-danger");
  });

  it("auto-dismisses after 3500ms", () => {
    // Asserts on the store's state directly rather than DOM presence: motion/
    // react's exit animation keeps the element mounted (fading out) for a
    // moment after the store clears it, and that animation runs on rAF, not
    // fake timers, so it wouldn't settle within this test regardless. The
    // behavior actually being tested is toast-store's setTimeout dismissal,
    // not the animation.
    vi.useFakeTimers();
    useToastStore.getState().show("Temporary message", "success");
    expect(useToastStore.getState().toast?.text).toBe("Temporary message");

    vi.advanceTimersByTime(3500);
    expect(useToastStore.getState().toast).toBeNull();
  });

  it("a newer toast replaces an older one instead of being cancelled by its dismiss timer", () => {
    vi.useFakeTimers();
    render(<Toast />);

    act(() => {
      useToastStore.getState().show("First", "success");
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      useToastStore.getState().show("Second", "success");
    });

    // First's 3500ms timer fires here (1000 + 3500 = 4500ms since First was
    // shown), but Second is now current — it must not be dismissed by First's
    // stale timer callback.
    act(() => {
      vi.advanceTimersByTime(3600);
    });
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
