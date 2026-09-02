import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CommentsLayer from "./CommentsLayer";

// Identity-projection Fabric stub so canvas coords map 1:1 to screen coords.
beforeAll(() => {
  globalThis.window = globalThis.window || {};
  window.fabric = {
    Point: class {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    },
    util: {
      transformPoint: (p) => ({ x: p.x, y: p.y }),
      invertTransform: (m) => m,
    },
  };
});

function mockCanvas(objects = []) {
  return {
    viewportTransform: [1, 0, 0, 1, 0, 0],
    getObjects: () => objects,
    on: () => {},
    off: () => {},
    findTarget: () => null,
  };
}

const baseProps = {
  canvas: mockCanvas(),
  wrapperRef: { current: null },
  activePageId: "page-1",
  commentMode: false,
  currentUser: { id: "u1", name: "Me", color: "#123", isOwner: true },
  isReadOnly: false,
  onCreate: vi.fn(),
  onReply: vi.fn(),
  onResolve: vi.fn(),
  onDelete: vi.fn(),
  onExitCommentMode: vi.fn(),
};

describe("CommentsLayer", () => {
  it("renders a marker per comment on the active page", () => {
    const comments = [
      {
        _id: "c1",
        page_id: "page-1",
        anchor: { x: 10, y: 20 },
        author: {},
        replies: [],
        text: "one",
      },
      {
        _id: "c2",
        page_id: "page-2",
        anchor: { x: 0, y: 0 },
        author: {},
        replies: [],
        text: "other page",
      },
    ];
    const { container } = render(
      <CommentsLayer {...baseProps} comments={comments} />,
    );
    // Only the page-1 comment renders a marker.
    expect(container.querySelectorAll(".comment-marker")).toHaveLength(1);
  });

  it("opens a thread with text and replies when a marker is clicked", () => {
    const comments = [
      {
        _id: "c1",
        page_id: "page-1",
        anchor: { x: 10, y: 20 },
        author: { name: "Al", color: "#f00", id: "u9" },
        replies: [{ author: { name: "Bo" }, text: "a reply" }],
        text: "the comment",
      },
    ];
    const { container } = render(
      <CommentsLayer {...baseProps} comments={comments} />,
    );
    fireEvent.click(container.querySelector(".comment-marker"));
    expect(screen.getByText("the comment")).toBeInTheDocument();
    expect(screen.getByText("a reply")).toBeInTheDocument();
  });

  it("resolves a thread from the popover", () => {
    const onResolve = vi.fn();
    const comments = [
      {
        _id: "c1",
        page_id: "page-1",
        anchor: { x: 1, y: 1 },
        author: {},
        replies: [],
        resolved: false,
        text: "x",
      },
    ];
    const { container } = render(
      <CommentsLayer
        {...baseProps}
        comments={comments}
        onResolve={onResolve}
      />,
    );
    fireEvent.click(container.querySelector(".comment-marker"));
    fireEvent.click(screen.getByTitle("Resolve"));
    expect(onResolve).toHaveBeenCalledWith("c1", true);
  });

  it("shows a placement catcher only in comment mode", () => {
    const { container, rerender } = render(
      <CommentsLayer {...baseProps} comments={[]} commentMode={false} />,
    );
    expect(container.querySelector(".comment-catcher")).toBeNull();
    rerender(<CommentsLayer {...baseProps} comments={[]} commentMode={true} />);
    expect(container.querySelector(".comment-catcher")).not.toBeNull();
  });

  it("creates a comment through the composer", () => {
    const onCreate = vi.fn();
    const { container } = render(
      <CommentsLayer
        {...baseProps}
        comments={[]}
        commentMode={true}
        onCreate={onCreate}
      />,
    );
    fireEvent.click(container.querySelector(".comment-catcher"));
    const textarea = container.querySelector(".comment-textarea");
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: "New note" } });
    fireEvent.click(screen.getByText("Comment"));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      pageId: "page-1",
      text: "New note",
    });
  });

  it("renders nothing without a canvas", () => {
    const { container } = render(
      <CommentsLayer {...baseProps} canvas={null} comments={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
