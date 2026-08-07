import { beforeEach, describe, expect, it, vi } from "vitest";

// zustand's persist middleware reads `window.localStorage` exactly once, at
// module-evaluation time when tool-store.ts's `persist(...)` call runs — a
// plain top-level `import` at the top of this file would already be too
// late to stub it first (imports are hoisted and evaluated before any of
// this file's own statements). Stub it, then dynamically import afterward.
const memoryStore = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => memoryStore.set(key, value),
    removeItem: (key: string) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
  },
});

const { useToolStore } = await import("@/stores/tool-store");
const { resolveApproval } = await import("../approval");
const { runTool } = await import("../run-tool");

/**
 * run-tool.ts is the single enforcement point every tool call (local, voice,
 * VM) goes through — permission check, approval prompt, audit log. This is
 * the actual security boundary the rest of the app's "never bypass
 * permissions" claims depend on, so it's worth testing directly rather than
 * only exercising it incidentally through UI flows.
 */
describe("runTool", () => {
  beforeEach(() => {
    useToolStore.setState({
      permissions: { open_url: "allow", run_on_vm: "ask" },
      runHistory: [],
      pendingApproval: null,
    });
  });

  it("throws for an unregistered tool name without calling execute", async () => {
    const execute = vi.fn();
    await expect(runTool("not_a_real_tool", execute)).rejects.toThrow("unknown tool");
    expect(execute).not.toHaveBeenCalled();
  });

  it("throws immediately when the tool's permission mode is disabled", async () => {
    useToolStore.getState().setPermission("open_url", "disabled");
    const execute = vi.fn();
    await expect(runTool("open_url", execute)).rejects.toThrow(/disabled in Settings/);
    expect(execute).not.toHaveBeenCalled();
  });

  it("runs immediately and logs a success record when permission is allow", async () => {
    const result = await runTool("open_url", async () => "done");
    expect(result).toBe("done");

    const record = useToolStore.getState().runHistory[0];
    expect(record).toMatchObject({ toolName: "open_url", result: "success", approvedByUser: true });
  });

  it("logs a failure record and rethrows when execute() throws", async () => {
    await expect(
      runTool("open_url", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const record = useToolStore.getState().runHistory[0];
    expect(record).toMatchObject({ toolName: "open_url", result: "failure", errorMessage: "Error: boom" });
  });

  it("waits for approval when mode is ask, and denies without calling execute", async () => {
    const execute = vi.fn().mockResolvedValue("should not run");
    const promise = runTool("run_on_vm", execute);

    // runTool synchronously sets pendingApproval before awaiting the decision.
    const pending = useToolStore.getState().pendingApproval;
    expect(pending?.toolName).toBe("run_on_vm");
    expect(pending?.riskLevel).toBe("critical");

    resolveApproval(pending!.id, "deny");
    await expect(promise).rejects.toThrow("denied by user");

    expect(execute).not.toHaveBeenCalled();
    expect(useToolStore.getState().pendingApproval).toBeNull();
    const record = useToolStore.getState().runHistory[0];
    expect(record).toMatchObject({ toolName: "run_on_vm", result: "denied", approvedByUser: false });
    // A single denial must not silently change the standing permission.
    expect(useToolStore.getState().permissions.run_on_vm).toBe("ask");
  });

  it("allow_once runs the tool but leaves the permission mode as ask", async () => {
    const promise = runTool("run_on_vm", async () => "ran");
    const pending = useToolStore.getState().pendingApproval!;
    resolveApproval(pending.id, "allow_once");

    await expect(promise).resolves.toBe("ran");
    expect(useToolStore.getState().permissions.run_on_vm).toBe("ask");
  });

  it("always_allow runs the tool and flips the permission mode to allow", async () => {
    const promise = runTool("run_on_vm", async () => "ran");
    const pending = useToolStore.getState().pendingApproval!;
    resolveApproval(pending.id, "always_allow");

    await expect(promise).resolves.toBe("ran");
    expect(useToolStore.getState().permissions.run_on_vm).toBe("allow");
  });
});
