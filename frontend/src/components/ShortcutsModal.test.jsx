import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShortcutsModal from "./ShortcutsModal";

describe("ShortcutsModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <ShortcutsModal isOpen={false} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the shortcut groups when open", () => {
    render(<ShortcutsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    // A representative shortcut label and key.
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Rectangle")).toBeInTheDocument();
  });

  it("calls onClose from the close button", () => {
    const onClose = vi.fn();
    render(<ShortcutsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ShortcutsModal isOpen={true} onClose={onClose} />,
    );
    fireEvent.click(container.querySelector(".shortcuts-overlay"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when the modal body is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ShortcutsModal isOpen={true} onClose={onClose} />,
    );
    fireEvent.click(container.querySelector(".shortcuts-modal"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
