import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// zustand's persist middleware reads window.localStorage once at
// module-evaluation time (see run-tool.test.ts's fuller note) — stub it
// before dynamically importing anything that pulls tool-store.ts in.
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
const { resolveApproval } = await import("@/lib/tools/approval");
const { ToolApprovalModal } = await import("../ToolApprovalModal");

vi.mock("@/lib/tools/approval", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tools/approval")>();
  return { ...actual, resolveApproval: vi.fn(actual.resolveApproval) };
});

describe("ToolApprovalModal", () => {
  beforeEach(() => {
    useToolStore.setState({ pendingApproval: null });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there is no pending approval", () => {
    render(<ToolApprovalModal />);
    expect(screen.queryByText("FRIDAY Request")).not.toBeInTheDocument();
  });

  it("shows the tool description and an 'Always Allow' option for a non-critical tool", () => {
    useToolStore.setState({
      pendingApproval: { id: "1", toolName: "open_url", description: "Open a URL", riskLevel: "low" },
    });
    render(<ToolApprovalModal />);

    expect(screen.getByText("Open a URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Always Allow This Tool" })).toBeInTheDocument();
    expect(screen.queryByText(/Critical/)).not.toBeInTheDocument();
  });

  it("shows the critical-risk warning banner and hides 'Always Allow' for a critical tool", () => {
    useToolStore.setState({
      pendingApproval: { id: "1", toolName: "run_on_vm", description: "Run a command on the VM", riskLevel: "critical" },
    });
    render(<ToolApprovalModal />);

    expect(screen.getByText(/Critical — runs on the cloud VM/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Always Allow This Tool" })).not.toBeInTheDocument();
    // Allow Once and Deny must still be available even for critical tools.
    expect(screen.getByRole("button", { name: "Allow Once" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deny" })).toBeInTheDocument();
  });

  it("resolves 'allow_once' with the pending approval's id when clicked", async () => {
    useToolStore.setState({
      pendingApproval: { id: "abc-123", toolName: "open_url", description: "Open a URL", riskLevel: "low" },
    });
    render(<ToolApprovalModal />);

    fireEvent.click(screen.getByRole("button", { name: "Allow Once" }));
    expect(resolveApproval).toHaveBeenCalledWith("abc-123", "allow_once");
  });

  it("resolves 'deny' with the pending approval's id when clicked", async () => {
    useToolStore.setState({
      pendingApproval: { id: "abc-123", toolName: "open_url", description: "Open a URL", riskLevel: "low" },
    });
    render(<ToolApprovalModal />);

    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(resolveApproval).toHaveBeenCalledWith("abc-123", "deny");
  });

  it("resolves 'always_allow' with the pending approval's id when clicked", async () => {
    useToolStore.setState({
      pendingApproval: { id: "abc-123", toolName: "open_url", description: "Open a URL", riskLevel: "low" },
    });
    render(<ToolApprovalModal />);

    fireEvent.click(screen.getByRole("button", { name: "Always Allow This Tool" }));
    expect(resolveApproval).toHaveBeenCalledWith("abc-123", "always_allow");
  });
});
