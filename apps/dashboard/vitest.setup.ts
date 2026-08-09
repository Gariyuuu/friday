import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement ResizeObserver — cmdk (CommandPalette) uses it to
// measure list items. A no-op stub is enough for tests, which don't care
// about real layout measurements.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom doesn't implement scrollIntoView either — same cmdk usage.
Element.prototype.scrollIntoView ??= () => {};
