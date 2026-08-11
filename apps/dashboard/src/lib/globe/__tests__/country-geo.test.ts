import { describe, expect, it } from "vitest";
import { countryNameForCoordinate, WORLD_COUNTRIES } from "../country-geo";

describe("WORLD_COUNTRIES", () => {
  it("loads a real, substantial set of country boundaries", () => {
    expect(WORLD_COUNTRIES.length).toBeGreaterThan(150);
  });
});

describe("countryNameForCoordinate", () => {
  it("matches well-known real coordinates to their real countries", () => {
    expect(countryNameForCoordinate(-74.006, 40.7128)).toBe("United States of America"); // NYC
    expect(countryNameForCoordinate(-0.1276, 51.5074)).toBe("United Kingdom"); // London
    expect(countryNameForCoordinate(139.6917, 35.6895)).toBe("Japan"); // Tokyo
    expect(countryNameForCoordinate(2.3522, 48.8566)).toBe("France"); // Paris
  });

  it("returns null for open ocean, not a fabricated nearest-country guess", () => {
    expect(countryNameForCoordinate(-40, 0)).toBeNull(); // mid-Atlantic
  });
});
