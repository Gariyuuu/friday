import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkline } from "../Sparkline";

describe("Sparkline", () => {
  it("renders nothing with fewer than 2 values", () => {
    const { container: empty } = render(<Sparkline values={[]} positive />);
    expect(empty.querySelector("svg")).toBeNull();

    const { container: single } = render(<Sparkline values={[5]} positive />);
    expect(single.querySelector("svg")).toBeNull();
  });

  it("plots one point per value, spanning the full 0-100 x-axis", () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4]} positive />);
    const points = container.querySelector("polyline")!.getAttribute("points")!.trim().split(" ");
    expect(points).toHaveLength(4);
    expect(points[0]).toBe("0,100"); // first value, lowest -> y=100 (bottom)
    expect(points[3]).toBe("100,0"); // last value, highest -> y=0 (top)
  });

  it("uses the success color when positive, danger when not", () => {
    const { container: up } = render(<Sparkline values={[1, 2]} positive={true} />);
    expect(up.querySelector("polyline")!.getAttribute("stroke")).toBe("var(--color-success)");

    const { container: down } = render(<Sparkline values={[1, 2]} positive={false} />);
    expect(down.querySelector("polyline")!.getAttribute("stroke")).toBe("var(--color-danger)");
  });

  it("does not divide by zero when every value is identical (flat line)", () => {
    const { container } = render(<Sparkline values={[5, 5, 5]} positive />);
    const points = container.querySelector("polyline")!.getAttribute("points")!;
    expect(points).not.toContain("NaN");
    expect(points).not.toContain("Infinity");
  });
});
