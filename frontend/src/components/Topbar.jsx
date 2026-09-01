import React from "react";

export default function Topbar({
  title,
  setTitle,
  canvasMode = "freehand",
  setCanvasMode = () => {},
  isOwner = true,
  onSave,
  onLoad,
  onExport,
  savedId,
  roomUsers = [],
  currentUser = {},
  onRenameUser,
  onCleanup,
  onAssist,
  onClearPage,
  isCleanupLoading = false,
  isAssistLoading = false,
  onExit,
  isReadOnly = false,
  onOpenPermissionsPanel,
  boardMeta = { owner: null, collaborators: [], isPublic: false },
}) {
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // navigator.clipboard is undefined on insecure origins and rejects when the
  // clipboard-write permissions policy blocks it (e.g. the app running framed),
  // so fall back to the legacy copy command, then to manual copy.
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // blocked or unavailable - try the legacy path below
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      ta.remove();
    }
  };

  const handleShare = async () => {
    if (!savedId) {
      alert("Please save the board first to generate a shareable link!");
      return;
    }

    // Share by board id, not a title slug. Titles are not unique (every new
    // board defaults to "My Whiteboard"), the slug reflects the possibly-unsaved
    // title in the input, and the server resolves a slug per-viewer — so a
    // slug link could 404 or, worse, open a different board for the recipient.
    // The id is unique and the loader accepts it directly.
    const shareUrl = `${window.location.origin}/board/${savedId}`;

    if (await copyToClipboard(shareUrl)) {
      alert("Share link copied to clipboard: " + shareUrl);
    } else {
      // Nothing could reach the clipboard - let the user copy it by hand.
      window.prompt("Copy this share link:", shareUrl);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onExit && (
          <button
            onClick={onExit}
            className="btn btn-secondary btn-back"
            title="Back to Dashboard"
            style={{
              marginRight: "8px",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              ></path>
            </svg>
            <span>Exit</span>
          </button>
        )}
        <div
          className="logo-container"
          style={{ cursor: onExit ? "pointer" : "default" }}
          onClick={onExit}
        >
          <div className="logo-icon">W</div>
          <span className="logo-text">Whiteboard Pro</span>
        </div>

        <div
          className="board-title-container"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <input
            type="text"
            className="board-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Whiteboard"
            title="Rename whiteboard"
            disabled={isReadOnly}
          />
          {isReadOnly && (
            <span
              className="badge badge-view-only"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "var(--color-danger)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              View Only
            </span>
          )}
        </div>

        {/* Mode Selector / Label */}
        {isOwner ? (
          <button
            onClick={() =>
              setCanvasMode(canvasMode === "drawio" ? "freehand" : "drawio")
            }
            className="btn btn-secondary"
            style={{
              marginLeft: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title={`Current mode: ${canvasMode === "drawio" ? "Architecture" : "Freehand"} (Click to toggle)`}
          >
            <i
              className={
                canvasMode === "drawio"
                  ? "fa-solid fa-diagram-project"
                  : "fa-solid fa-pen-nib"
              }
              style={{
                fontSize: "13px",
                color: canvasMode === "drawio" ? "#818cf8" : "#38bdf8",
              }}
            />
            <span>{canvasMode === "drawio" ? "Architecture" : "Freehand"}</span>
          </button>
        ) : (
          <div
            style={{
              marginLeft: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              borderRadius: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "12px",
              fontWeight: "600",
              color: "#cbd5e1",
            }}
            title="Board canvas mode set by owner"
          >
            <i
              className={
                canvasMode === "drawio"
                  ? "fa-solid fa-diagram-project"
                  : "fa-solid fa-pen-nib"
              }
              style={{
                fontSize: "12px",
                color: canvasMode === "drawio" ? "#818cf8" : "#38bdf8",
              }}
            />
            <span>
              {canvasMode === "drawio" ? "Architecture Mode" : "Freehand Mode"}
            </span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Collaboration User Presence Avatars */}
        <div
          className="avatar-group"
          title={`${roomUsers.length} collaborator(s) online`}
        >
          {roomUsers.map((u, i) => {
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id || i}
                className={`avatar ${isSelf ? "avatar-self" : ""}`}
                style={{
                  backgroundColor: u.color,
                  cursor: isSelf ? "pointer" : "default",
                  border: isSelf
                    ? "2px solid var(--color-accent)"
                    : "2px solid white",
                }}
                title={isSelf ? `${u.name} (You) - Click to rename` : u.name}
                onClick={isSelf ? onRenameUser : undefined}
              >
                {getInitials(u.name)}
              </div>
            );
          })}
        </div>

        {savedId && boardMeta.owner === currentUser.dbUserId && (
          <button
            onClick={onOpenPermissionsPanel}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            title="Manage collaborator permissions"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            Permissions
          </button>
        )}

        {!isReadOnly && (
          <>
            <button onClick={handleShare} className="btn btn-secondary">
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 10.742l4.632-2.316m0 0a3 3 0 10-4.632-2.316 3 3 0 004.632 2.316zm0 0l-4.632 2.316m0 0a3 3 0 104.632 2.316 3 3 0 00-4.632-2.316zm0 0l4.632 2.316m0 0a3 3 0 104.632 2.316 3 3 0 00-4.632-2.316zm0 0l4.632 2.316m0 0a3 3 0 104.632 2.316 3 3 0 00-4.632-2.316z"
                ></path>
              </svg>
              Share
            </button>

            {canvasMode === "freehand" && (
              <button onClick={onExport} className="btn btn-secondary">
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  ></path>
                </svg>
                Export
              </button>
            )}

            {canvasMode === "freehand" && (
              <>
                <button
                  onClick={onClearPage}
                  className="btn btn-secondary btn-danger-hover"
                  title="Clear all elements from current page"
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                  <span>Clear</span>
                </button>

                <button
                  onClick={onCleanup}
                  className="btn btn-secondary btn-ai"
                  disabled={isCleanupLoading}
                >
                  {isCleanupLoading ? (
                    <span className="spinner-ai"></span>
                  ) : (
                    <>
                      <i
                        className="fa-solid fa-wand-magic-sparkles"
                        style={{ marginRight: "6px" }}
                      ></i>
                      <span>Cleanup</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button onClick={onSave} className="btn btn-primary">
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                ></path>
              </svg>
              Save
            </button>

            <button onClick={onLoad} className="btn btn-secondary">
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                ></path>
              </svg>
              Load
            </button>
          </>
        )}
      </div>
    </header>
  );
}
