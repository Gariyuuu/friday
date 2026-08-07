import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger";

describe("createLogger", () => {
  it("redacts secret-shaped keys but keeps other context intact", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createLogger("SECURITY");

    logger.info("configured provider", {
      apiKey: "sk-super-secret",
      provider: "openai",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logged.context.apiKey).toBe("[redacted]");
    expect(logged.context.provider).toBe("openai");
    expect(logged.category).toBe("SECURITY");

    spy.mockRestore();
  });

  it("suppresses messages below the configured minimum level", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createLogger("UI", { minLevel: "warn" });

    logger.info("should not be emitted");

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
