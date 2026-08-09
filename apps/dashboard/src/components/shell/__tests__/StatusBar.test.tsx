import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOrbStore } from "@/stores/orb-store";
import { useUiStore } from "@/stores/ui-store";
import { StatusBar } from "../StatusBar";

describe("StatusBar", () => {
  it("always shows the FRIDAY title and a Settings link", () => {
    render(<StatusBar />);
    expect(screen.getByText("F.R.I.D.A.Y.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("shows the correct label for each voice status", () => {
    act(() => useOrbStore.setState({ voiceStatus: "listening" }));
    render(<StatusBar />);
    expect(screen.getByText("LISTENING")).toBeInTheDocument();
  });

  it('shows "Global Intelligence // Live" only in intelligence mode', () => {
    act(() => useUiStore.setState({ mode: "orb" }));
    const { rerender } = render(<StatusBar />);
    expect(screen.queryByText(/Global Intelligence/)).not.toBeInTheDocument();

    act(() => useUiStore.setState({ mode: "intelligence" }));
    rerender(<StatusBar />);
    expect(screen.getByText(/Global Intelligence \/\/ Live/)).toBeInTheDocument();
  });

  it("shows a live clock instead of the placeholder", () => {
    render(<StatusBar />);
    expect(screen.queryByText("--:--")).not.toBeInTheDocument();
  });
});
