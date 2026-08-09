import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "@/stores/chat-store";
import { useUiStore } from "@/stores/ui-store";

vi.mock("@/lib/chat/chat-client", () => ({
  sendChatMessage: vi.fn(),
}));

const { sendChatMessage } = await import("@/lib/chat/chat-client");
const { ChatPanel } = await import("../ChatPanel");

describe("ChatPanel", () => {
  beforeEach(() => {
    useUiStore.setState({ chatOpen: false });
    useChatStore.setState({ messages: [], sending: false });
    vi.mocked(sendChatMessage).mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when chat is closed", () => {
    render(<ChatPanel />);
    expect(screen.queryByText("Chat with FRIDAY")).not.toBeInTheDocument();
  });

  it("shows the empty state when open with no messages", () => {
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);
    expect(screen.getByText("Chat with FRIDAY")).toBeInTheDocument();
    expect(screen.getByText(/Ask anything/)).toBeInTheDocument();
  });

  it("renders existing messages as bubbles instead of the empty state", () => {
    useChatStore.setState({
      messages: [
        { id: "1", role: "user", content: "hi there" },
        { id: "2", role: "assistant", content: "hello!" },
      ],
    });
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);

    expect(screen.getByText("hi there")).toBeInTheDocument();
    expect(screen.getByText("hello!")).toBeInTheDocument();
    expect(screen.queryByText(/Ask anything/)).not.toBeInTheDocument();
  });

  it("Send is disabled until non-whitespace text is entered", () => {
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);
    const send = screen.getByRole("button", { name: "Send" });

    expect(send).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Message FRIDAY…"), { target: { value: "   " } });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Message FRIDAY…"), { target: { value: "hey" } });
    expect(send).toBeEnabled();
  });

  it("clicking Send calls sendChatMessage with the trimmed text and clears the input", () => {
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Message FRIDAY…");

    fireEvent.change(input, { target: { value: "  hey there  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(sendChatMessage).toHaveBeenCalledWith("hey there");
    expect(input).toHaveValue("");
  });

  it("pressing Enter submits, Shift+Enter does not", () => {
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);
    const input = screen.getByPlaceholderText("Message FRIDAY…");

    fireEvent.change(input, { target: { value: "shift test" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(sendChatMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(sendChatMessage).toHaveBeenCalledWith("shift test");
  });

  it("pressing Escape closes the panel", () => {
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);
    fireEvent.keyDown(screen.getByPlaceholderText("Message FRIDAY…"), { key: "Escape" });
    expect(useUiStore.getState().chatOpen).toBe(false);
  });

  it("the close button closes the panel", () => {
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);
    fireEvent.click(screen.getByLabelText("Close chat"));
    expect(useUiStore.getState().chatOpen).toBe(false);
  });

  it("Clear is disabled with no messages, and clears the conversation when clicked", () => {
    useChatStore.setState({ messages: [{ id: "1", role: "user", content: "hi" }] });
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);

    const clear = screen.getByRole("button", { name: "Clear" });
    expect(clear).toBeEnabled();
    fireEvent.click(clear);
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it("Send is disabled while a message is in flight", () => {
    useChatStore.setState({ sending: true });
    act(() => useUiStore.setState({ chatOpen: true }));
    render(<ChatPanel />);

    fireEvent.change(screen.getByPlaceholderText("Message FRIDAY…"), { target: { value: "hey" } });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
