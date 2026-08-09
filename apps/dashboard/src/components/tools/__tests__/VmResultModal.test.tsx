import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "@/stores/ui-store";
import { VmResultModal } from "../VmResultModal";

describe("VmResultModal", () => {
  beforeEach(() => {
    useUiStore.setState({ vmResult: null });
  });

  it("renders nothing when there is no result", () => {
    render(<VmResultModal />);
    expect(screen.queryByText(/VM task/)).not.toBeInTheDocument();
  });

  it("shows a success header and stdout for a successful shell result", () => {
    act(() => useUiStore.setState({ vmResult: { ok: true, stdout: "hello world", exitCode: 0 } }));
    render(<VmResultModal />);

    expect(screen.getByText("VM task completed")).toBeInTheDocument();
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("shows a failure header and the error message for a failed result", () => {
    act(() => useUiStore.setState({ vmResult: { ok: false, error: "denied by user" } }));
    render(<VmResultModal />);

    expect(screen.getByText("VM task failed")).toBeInTheDocument();
    expect(screen.getByText("denied by user")).toBeInTheDocument();
  });

  it("shows the title and a link to the url for a browse result", () => {
    act(() =>
      useUiStore.setState({
        vmResult: { ok: true, title: "Example Domain", url: "https://example.com" },
      }),
    );
    render(<VmResultModal />);

    expect(screen.getByText("Example Domain")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://example.com" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("lists step results with success/failure markers", () => {
    act(() =>
      useUiStore.setState({
        vmResult: {
          ok: true,
          steps: [
            { action: "click", selector: "#go", ok: true },
            { action: "type", selector: "#input", ok: false, error: "not found" },
          ],
        },
      }),
    );
    render(<VmResultModal />);

    expect(screen.getByText(/click \(#go\)/)).toBeInTheDocument();
    expect(screen.getByText(/type \(#input\)/)).toBeInTheDocument();
    expect(screen.getByText(/not found/)).toBeInTheDocument();
  });

  it("renders each screenshot as a clickable image linking to the full-size data URL", () => {
    act(() =>
      useUiStore.setState({
        vmResult: { ok: true, screenshots: ["aGVsbG8=", "d29ybGQ="] },
      }),
    );
    render(<VmResultModal />);

    expect(screen.getByText("Screenshots (2)")).toBeInTheDocument();
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "data:image/png;base64,aGVsbG8=");
  });

  it("closes when the close button is clicked", () => {
    act(() => useUiStore.setState({ vmResult: { ok: true, stdout: "x" } }));
    render(<VmResultModal />);

    fireEvent.click(screen.getByLabelText("Close result"));
    expect(useUiStore.getState().vmResult).toBeNull();
  });

  it("closes when clicking the backdrop", () => {
    act(() => useUiStore.setState({ vmResult: { ok: true, stdout: "x" } }));
    const { container } = render(<VmResultModal />);

    fireEvent.click(container.firstChild as Element);
    expect(useUiStore.getState().vmResult).toBeNull();
  });
});
