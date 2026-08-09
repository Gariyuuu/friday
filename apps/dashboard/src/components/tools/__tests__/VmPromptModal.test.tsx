import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastStore } from "@/stores/toast-store";
import { useUiStore } from "@/stores/ui-store";

vi.mock("@/lib/tools/client", () => ({
  runOnVm: vi.fn(),
  browseOnVm: vi.fn(),
}));

const { runOnVm, browseOnVm } = await import("@/lib/tools/client");
const { VmPromptModal } = await import("../VmPromptModal");

describe("VmPromptModal", () => {
  beforeEach(() => {
    useUiStore.setState({ vmPromptMode: null });
    useToastStore.setState({ toast: null });
    vi.mocked(runOnVm).mockReset();
    vi.mocked(browseOnVm).mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no VM prompt mode is set", () => {
    render(<VmPromptModal />);
    expect(screen.queryByPlaceholderText(/echo hello|https:\/\/example.com/)).not.toBeInTheDocument();
  });

  it("shows shell-specific copy and placeholder in shell mode", () => {
    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    render(<VmPromptModal />);
    expect(screen.getByText("Run on Cloud VM (sandboxed)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("echo hello")).toBeInTheDocument();
  });

  it("shows browse-specific copy and placeholder in browse mode", () => {
    act(() => useUiStore.setState({ vmPromptMode: "browse" }));
    render(<VmPromptModal />);
    expect(screen.getByText("Browse on Cloud VM (headless)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://example.com")).toBeInTheDocument();
  });

  it("disables Run until non-whitespace text is entered", () => {
    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    render(<VmPromptModal />);
    const input = screen.getByPlaceholderText("echo hello");
    const run = screen.getByRole("button", { name: "Run" });

    expect(run).toBeDisabled();
    fireEvent.change(input, { target: { value: "   " } });
    expect(run).toBeDisabled();
    fireEvent.change(input, { target: { value: "echo hi" } });
    expect(run).toBeEnabled();
  });

  it("Cancel closes the prompt without calling either VM function", () => {
    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    render(<VmPromptModal />);
    fireEvent.change(screen.getByPlaceholderText("echo hello"), { target: { value: "echo hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(useUiStore.getState().vmPromptMode).toBeNull();
    expect(runOnVm).not.toHaveBeenCalled();
    expect(browseOnVm).not.toHaveBeenCalled();
  });

  it("Run calls runOnVm with the trimmed command in shell mode and closes immediately", async () => {
    vi.mocked(runOnVm).mockReturnValue(new Promise(() => {})); // never resolves in this test
    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    render(<VmPromptModal />);

    fireEvent.change(screen.getByPlaceholderText("echo hello"), { target: { value: "  echo hi  " } });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(runOnVm).toHaveBeenCalledWith("echo hi");
    expect(browseOnVm).not.toHaveBeenCalled();
    // Closes right away rather than waiting for the VM call to resolve — see
    // the component's own doc comment on why (avoids blocking the approval
    // modal underneath it).
    expect(useUiStore.getState().vmPromptMode).toBeNull();
  });

  it("Run calls browseOnVm in browse mode", () => {
    vi.mocked(browseOnVm).mockReturnValue(new Promise(() => {}));
    act(() => useUiStore.setState({ vmPromptMode: "browse" }));
    render(<VmPromptModal />);

    fireEvent.change(screen.getByPlaceholderText("https://example.com"), {
      target: { value: "https://example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(browseOnVm).toHaveBeenCalledWith("https://example.com");
    expect(runOnVm).not.toHaveBeenCalled();
  });

  it("pressing Enter in the input submits, Escape cancels", () => {
    vi.mocked(runOnVm).mockReturnValue(new Promise(() => {}));
    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    render(<VmPromptModal />);

    const input = screen.getByPlaceholderText("echo hello");
    fireEvent.change(input, { target: { value: "echo hi" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(runOnVm).toHaveBeenCalledWith("echo hi");
    expect(useUiStore.getState().vmPromptMode).toBeNull();

    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    fireEvent.keyDown(screen.getByPlaceholderText("echo hello"), { key: "Escape" });
    expect(useUiStore.getState().vmPromptMode).toBeNull();
  });

  it("shows a success toast with the command's stdout when the task resolves ok", async () => {
    vi.mocked(runOnVm).mockResolvedValue({ ok: true, stdout: "hello world" });
    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    render(<VmPromptModal />);

    fireEvent.change(screen.getByPlaceholderText("echo hello"), { target: { value: "echo hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() => {
      expect(useToastStore.getState().toast?.text).toBe("VM shell — hello world");
    });
    expect(useToastStore.getState().toast?.tone).toBe("success");
  });

  it("shows an error toast when the task resolves with ok:false", async () => {
    vi.mocked(runOnVm).mockResolvedValue({ ok: false, error: "denied by user" });
    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    render(<VmPromptModal />);

    fireEvent.change(screen.getByPlaceholderText("echo hello"), { target: { value: "echo hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() => {
      expect(useToastStore.getState().toast?.text).toBe("VM shell — denied by user");
    });
    expect(useToastStore.getState().toast?.tone).toBe("error");
  });

  it("shows an error toast when the underlying promise rejects", async () => {
    vi.mocked(runOnVm).mockRejectedValue(new Error("network down"));
    act(() => useUiStore.setState({ vmPromptMode: "shell" }));
    render(<VmPromptModal />);

    fireEvent.change(screen.getByPlaceholderText("echo hello"), { target: { value: "echo hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    await waitFor(() => {
      expect(useToastStore.getState().toast?.text).toBe("VM shell — network down");
    });
  });
});
