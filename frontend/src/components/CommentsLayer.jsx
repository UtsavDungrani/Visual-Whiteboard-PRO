import React, { useEffect, useState } from "react";

/**
 * Renders anchored comment markers over the Fabric canvas plus a composer (for
 * placing a new comment while in comment mode) and a thread popover (for reading
 * and replying). Markers are projected to screen and follow pan/zoom/move.
 *
 * The layer itself is pointer-events:none; only the markers, the composer and
 * the thread popover capture clicks, so normal canvas interaction passes
 * through. In comment mode a full-size click catcher is placed to capture the
 * placement click.
 */
export default function CommentsLayer({
  canvas,
  wrapperRef,
  comments = [],
  activePageId,
  commentMode = false,
  currentUser,
  isReadOnly = false,
  onCreate,
  onReply,
  onResolve,
  onDelete,
  onExitCommentMode,
}) {
  const [, setTick] = useState(0);
  const [composer, setComposer] = useState(null); // {left, top, anchor, elementId}
  const [composerText, setComposerText] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Re-project markers on any canvas change.
  useEffect(() => {
    if (!canvas) return;
    let animId = null;
    const schedule = () => {
      if (!animId) {
        animId = requestAnimationFrame(() => {
          animId = null;
          setTick((t) => (t + 1) % 1000000);
        });
      }
    };
    canvas.on("after:render", schedule);
    return () => {
      if (animId) cancelAnimationFrame(animId);
      canvas.off("after:render", schedule);
    };
  }, [canvas]);

  if (!canvas) return null;
  const F = window.fabric;
  const vpt = canvas.viewportTransform;
  if (!F || !vpt) return null;

  // Map element ids -> objects for anchored comments.
  const byId = {};
  (canvas.getObjects ? canvas.getObjects() : []).forEach((o) => {
    if (o && o.id) byId[o.id] = o;
  });

  const toScreen = (cx, cy) => F.util.transformPoint(new F.Point(cx, cy), vpt);

  // Resolve a comment's canvas-space anchor (element top-right if pinned).
  const anchorOf = (c) => {
    if (c.element_id && byId[c.element_id]) {
      const obj = byId[c.element_id];
      const r = obj.getBoundingRect(true, true);
      return { x: r.left + r.width, y: r.top };
    }
    return { x: c.anchor?.x || 0, y: c.anchor?.y || 0 };
  };

  const pageComments = comments.filter(
    (c) => !c.page_id || !activePageId || c.page_id === activePageId,
  );

  // Compute the composer position from a placement click on the catcher.
  const handleCatcherClick = (e) => {
    const wrapEl = wrapperRef?.current;
    const rect = wrapEl ? wrapEl.getBoundingClientRect() : { left: 0, top: 0 };
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const inv = F.util.invertTransform(vpt);
    const cp = F.util.transformPoint(new F.Point(sx, sy), inv);
    // Anchor to an element if the click landed on one.
    let elementId = "";
    if (typeof canvas.findTarget === "function") {
      const target = canvas.findTarget(e, true);
      if (target && target.id && target.id !== "page-boundary") {
        elementId = target.id;
      }
    }
    setComposer({ left: sx, top: sy, anchor: { x: cp.x, y: cp.y }, elementId });
    setComposerText("");
    setActiveId(null);
  };

  const submitComposer = () => {
    const text = composerText.trim();
    if (!text) return;
    onCreate({
      pageId: activePageId,
      elementId: composer.elementId || "",
      anchor: composer.anchor,
      text,
    });
    setComposer(null);
    setComposerText("");
    if (onExitCommentMode) onExitCommentMode();
  };

  const activeComment = pageComments.find((c) => c._id === activeId) || null;

  return (
    <>
      {/* Placement click catcher (comment mode only) */}
      {commentMode && !isReadOnly && (
        <div
          className="comment-catcher"
          onClick={handleCatcherClick}
          title="Click to place a comment"
        />
      )}

      {/* Markers */}
      {pageComments.map((c) => {
        const a = anchorOf(c);
        const p = toScreen(a.x, a.y);
        return (
          <button
            key={c._id}
            className={`comment-marker ${c.resolved ? "resolved" : ""} ${
              activeId === c._id ? "active" : ""
            }`}
            style={{
              left: `${p.x}px`,
              top: `${p.y}px`,
              borderColor: c.author?.color || "#6366f1",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveId((id) => (id === c._id ? null : c._id));
              setComposer(null);
              setReplyText("");
            }}
            title={c.resolved ? "Resolved comment" : "Comment"}
          >
            <i className="fa-solid fa-comment"></i>
            {c.replies?.length > 0 && (
              <span className="comment-count">{c.replies.length + 1}</span>
            )}
          </button>
        );
      })}

      {/* New-comment composer */}
      {composer && (
        <div
          className="comment-popover"
          style={{ left: `${composer.left}px`, top: `${composer.top}px` }}
        >
          <textarea
            className="comment-textarea"
            placeholder="Add a comment..."
            value={composerText}
            autoFocus
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                submitComposer();
              if (e.key === "Escape") setComposer(null);
            }}
          />
          <div className="comment-actions">
            <button
              className="comment-btn ghost"
              onClick={() => setComposer(null)}
            >
              Cancel
            </button>
            <button
              className="comment-btn primary"
              onClick={submitComposer}
              disabled={!composerText.trim()}
            >
              Comment
            </button>
          </div>
        </div>
      )}

      {/* Thread popover */}
      {activeComment &&
        (() => {
          const a = anchorOf(activeComment);
          const p = toScreen(a.x, a.y);
          const canDelete =
            currentUser &&
            (currentUser.id === activeComment.author?.id ||
              currentUser.isOwner);
          return (
            <div
              className="comment-popover thread"
              style={{ left: `${p.x}px`, top: `${p.y}px` }}
            >
              <div className="comment-thread-head">
                <span
                  className="comment-avatar"
                  style={{
                    backgroundColor: activeComment.author?.color || "#6366f1",
                  }}
                >
                  {(activeComment.author?.name || "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <div className="comment-meta">
                  <strong>
                    {activeComment.author?.name || "Collaborator"}
                  </strong>
                </div>
                <button
                  className="comment-icon-btn"
                  title={activeComment.resolved ? "Reopen" : "Resolve"}
                  onClick={() =>
                    onResolve(activeComment._id, !activeComment.resolved)
                  }
                >
                  <i
                    className={`fa-solid ${
                      activeComment.resolved ? "fa-rotate-left" : "fa-check"
                    }`}
                  ></i>
                </button>
                {canDelete && (
                  <button
                    className="comment-icon-btn danger"
                    title="Delete thread"
                    onClick={() => {
                      onDelete(activeComment._id);
                      setActiveId(null);
                    }}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
                <button
                  className="comment-icon-btn"
                  title="Close"
                  onClick={() => setActiveId(null)}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className="comment-body">{activeComment.text}</div>

              {activeComment.replies?.map((r, i) => (
                <div className="comment-reply" key={i}>
                  <span
                    className="comment-avatar sm"
                    style={{ backgroundColor: r.author?.color || "#94a3b8" }}
                  >
                    {(r.author?.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{r.author?.name || "Collaborator"}</strong>
                    <div className="comment-reply-text">{r.text}</div>
                  </div>
                </div>
              ))}

              {!isReadOnly && (
                <div className="comment-reply-input">
                  <input
                    type="text"
                    placeholder="Reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && replyText.trim()) {
                        onReply(activeComment._id, replyText.trim());
                        setReplyText("");
                      }
                    }}
                  />
                  <button
                    className="comment-btn primary"
                    disabled={!replyText.trim()}
                    onClick={() => {
                      onReply(activeComment._id, replyText.trim());
                      setReplyText("");
                    }}
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          );
        })()}
    </>
  );
}
