import React, { useState } from "react";

export default function DashboardPage({
  user,
  whiteboardsList = [],
  searchQuery,
  setSearchQuery,
  handleCreateBoard,
  handleOpenBoard,
  shareBoard,
  deleteBoard,
  handleLogout,
  showJoinModal,
  setShowJoinModal,
  joinBoardId,
  setJoinBoardId,
  joinModalLoading,
  joinModalError,
  setJoinModalError,
  handleJoinBoard,
}) {
  const [filterType, setFilterType] = useState("all"); // 'all' | 'owned' | 'shared' | 'public'
  const [shareTargetBoard, setShareTargetBoard] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const currentUserId = user?.id || user?._id;

  // Filter boards based on search query and filter tab
  const filteredBoards = whiteboardsList.filter((board) => {
    const matchesSearch = board.title
      .toLowerCase()
      .includes((searchQuery || "").toLowerCase());
    if (!matchesSearch) return false;

    const isOwner =
      board.owner &&
      (board.owner._id === currentUserId || board.owner === currentUserId);

    if (filterType === "owned") return isOwner;
    if (filterType === "shared") return !isOwner;
    if (filterType === "public") return board.isPublic;
    return true;
  });

  const ownedCount = whiteboardsList.filter((b) => {
    return (
      b.owner && (b.owner._id === currentUserId || b.owner === currentUserId)
    );
  }).length;
  const sharedCount = whiteboardsList.length - ownedCount;
  const publicCount = whiteboardsList.filter((b) => b.isPublic).length;

  const handleQuickTemplate = (templateTitle) => {
    if (handleCreateBoard) {
      handleCreateBoard(templateTitle);
    }
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!shareTargetBoard || !shareEmail.trim()) return;
    setShareLoading(true);
    setShareError("");
    try {
      await shareBoard(shareTargetBoard._id, false, shareEmail.trim());
      setShareTargetBoard(null);
      setShareEmail("");
    } catch (err) {
      console.error(err);
      // Previously swallowed: the modal just sat there with no feedback.
      setShareError(
        err?.message ||
          "Couldn't share the board. Check the email and try again.",
      );
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="dashboard-3d-root">
      {/* Ambient Glowing Background Orbs */}
      <div className="ambient-glow orb-1"></div>
      <div className="ambient-glow orb-2"></div>

      {/* Top Header */}
      <header className="dashboard-3d-header">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-badge-3d">
              <span>W</span>
            </div>
            <div className="logo-title-group">
              <span className="logo-main">Visual Whiteboard</span>
              <span className="logo-tag">PRO</span>
            </div>
          </div>

          <div className="dashboard-header-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowJoinModal(true)}
            >
              <i
                className="fa-solid fa-link"
                style={{ marginRight: "6px" }}
              ></i>
              <span>Join by ID</span>
            </button>

            <button
              className="btn btn-primary btn-sm btn-glow"
              onClick={() => {
                setNewBoardTitle("");
                setShowCreateModal(true);
              }}
            >
              <i
                className="fa-solid fa-plus"
                style={{ marginRight: "6px" }}
              ></i>
              <span>New Board</span>
            </button>

            {/* User Profile Pill */}
            <div className="user-profile-pill">
              <div
                className="user-avatar-badge"
                style={{ backgroundColor: user?.color || "#3B82F6" }}
              >
                {getInitials(user?.name)}
              </div>
              <div className="user-info-text">
                <span className="user-display-name">
                  {user?.name || "User"}
                </span>
                <span className="user-display-email">{user?.email}</span>
              </div>
              <button
                className="btn-logout-icon"
                onClick={handleLogout}
                title="Log Out of Account"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-main-content">
        {/* Welcome Banner & Quick Stats */}
        <section className="dashboard-welcome-banner">
          <div className="welcome-text">
            <h2>Welcome back, {user?.name?.split(" ")[0] || "Architect"}</h2>
            <p>
              Manage your architectural blueprints, collaborative system
              diagrams, and design workspaces in real-time.
            </p>
          </div>

          <div className="dashboard-stats-strip">
            <div className="dashboard-stat-card">
              <span className="stat-number">{whiteboardsList.length}</span>
              <span className="stat-label">Total Boards</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="stat-number">{ownedCount}</span>
              <span className="stat-label">Created by Me</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="stat-number">{sharedCount}</span>
              <span className="stat-label">Shared with Me</span>
            </div>
            <div className="dashboard-stat-card">
              <span className="stat-number">{publicCount}</span>
              <span className="stat-label">Public Access</span>
            </div>
          </div>
        </section>

        {/* Quick Template Starters Row */}
        <section className="dashboard-templates-section">
          <div className="section-label-row">
            <span className="label-title">
              <i
                className="fa-solid fa-bolt-lightning"
                style={{ marginRight: "6px", color: "#60A5FA" }}
              ></i>
              Start from a Blueprint
            </span>
          </div>

          <div className="templates-grid">
            <div
              className="template-card card-blank"
              onClick={() => handleQuickTemplate("Blank Canvas")}
            >
              <div className="template-icon bg-blue">
                <i className="fa-solid fa-plus"></i>
              </div>
              <div className="template-info">
                <strong>Blank Canvas</strong>
                <span>Empty workspace for freeform design</span>
              </div>
            </div>

            <div
              className="template-card"
              onClick={() => handleQuickTemplate("System Architecture Diagram")}
            >
              <div className="template-icon bg-emerald">
                <i className="fa-solid fa-compass-drafting"></i>
              </div>
              <div className="template-info">
                <strong>System Architecture</strong>
                <span>Client, API Gateway, DB & Redis nodes</span>
              </div>
            </div>

            <div
              className="template-card"
              onClick={() => handleQuickTemplate("Microservices Flowchart")}
            >
              <div className="template-icon bg-purple">
                <i className="fa-solid fa-diagram-project"></i>
              </div>
              <div className="template-info">
                <strong>Microservices Flow</strong>
                <span>Asynchronous queues & event streaming</span>
              </div>
            </div>

            <div
              className="template-card"
              onClick={() => handleQuickTemplate("Sprint Brainstorm & Notes")}
            >
              <div className="template-icon bg-amber">
                <i className="fa-solid fa-lightbulb"></i>
              </div>
              <div className="template-info">
                <strong>Sprint Brainstorm</strong>
                <span>Sticky notes & ideas layout</span>
              </div>
            </div>
          </div>
        </section>

        {/* Search Bar & Filter Tabs */}
        <section className="dashboard-filter-toolbar">
          <div className="filter-search-wrapper">
            <i className="search-icon fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="dashboard-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces by title..."
            />
            {searchQuery && (
              <button
                className="btn-clear-search"
                onClick={() => setSearchQuery("")}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <div className="filter-pill-tabs">
            <button
              className={`filter-pill ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              All ({whiteboardsList.length})
            </button>
            <button
              className={`filter-pill ${filterType === "owned" ? "active" : ""}`}
              onClick={() => setFilterType("owned")}
            >
              Created by Me ({ownedCount})
            </button>
            <button
              className={`filter-pill ${filterType === "shared" ? "active" : ""}`}
              onClick={() => setFilterType("shared")}
            >
              Shared ({sharedCount})
            </button>
            <button
              className={`filter-pill ${filterType === "public" ? "active" : ""}`}
              onClick={() => setFilterType("public")}
            >
              Public ({publicCount})
            </button>
          </div>
        </section>

        {/* Workspaces Grid */}
        {filteredBoards.length === 0 ? (
          <div className="dashboard-empty-glass">
            <div className="empty-icon-3d">
              <i
                className="fa-solid fa-folder-open"
                style={{ color: "#60A5FA" }}
              ></i>
            </div>
            <h3>No Whiteboard Workspaces Found</h3>
            <p>
              {searchQuery
                ? `No whiteboards match your search "${searchQuery}".`
                : "Create your first whiteboard workspace to begin designing and collaborating!"}
            </p>
            {!searchQuery && (
              <button
                className="btn btn-primary btn-glow"
                onClick={() => {
                  setNewBoardTitle("");
                  setShowCreateModal(true);
                }}
                style={{ marginTop: "16px" }}
              >
                <span>Create New Whiteboard</span>
                <i
                  className="fa-solid fa-arrow-right"
                  style={{ marginLeft: "8px" }}
                ></i>
              </button>
            )}
          </div>
        ) : (
          <div className="dashboard-cards-grid">
            {filteredBoards.map((board) => {
              const isOwner =
                board.owner &&
                (board.owner._id === currentUserId ||
                  board.owner === currentUserId);
              const pageCount = board.pages?.length || 1;

              return (
                <div
                  key={board._id}
                  className="board-3d-card"
                  onClick={() => handleOpenBoard(board._id)}
                >
                  {/* Card Thumbnail Preview Area */}
                  <div className="board-card-preview-stage">
                    <div className="preview-grid-pattern"></div>
                    <div className="preview-badge-status">
                      <span
                        className={`status-pill ${board.isPublic ? "public-pill" : "private-pill"}`}
                      >
                        <i
                          className={`fa-solid ${board.isPublic ? "fa-globe" : "fa-lock"}`}
                          style={{ marginRight: "5px" }}
                        ></i>
                        {board.isPublic ? "Public" : "Private"}
                      </span>
                      <span className="pages-count-pill">
                        <i
                          className="fa-solid fa-file-lines"
                          style={{ marginRight: "5px" }}
                        ></i>
                        {pageCount} {pageCount === 1 ? "page" : "pages"}
                      </span>
                    </div>

                    <div className="preview-center-action">
                      <span className="btn btn-primary btn-sm btn-glow">
                        <span>Open Workspace</span>
                        <i
                          className="fa-solid fa-arrow-right"
                          style={{ marginLeft: "6px" }}
                        ></i>
                      </span>
                    </div>
                  </div>

                  {/* Card Info & Details */}
                  <div
                    className="board-card-content"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="board-card-header-row">
                      <h4 className="board-title-heading" title={board.title}>
                        {board.title}
                      </h4>
                    </div>

                    <div className="board-meta-info-row">
                      <span className="board-ownership-tag">
                        {isOwner ? (
                          <>
                            <i
                              className="fa-solid fa-crown"
                              style={{ marginRight: "4px", color: "#F59E0B" }}
                            ></i>
                            Owner
                          </>
                        ) : (
                          <>Shared by {board.owner?.name || "Collaborator"}</>
                        )}
                      </span>
                      <span className="board-timestamp">
                        {new Date(board.updatedAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </div>

                    {/* Quick Action Toolbar */}
                    <div className="board-actions-toolbar">
                      <button
                        className="btn-action-tool"
                        onClick={() => setShareTargetBoard(board)}
                        disabled={!isOwner}
                        title={
                          isOwner
                            ? "Share whiteboard with teammates"
                            : "Only owner can manage sharing"
                        }
                      >
                        <i className="fa-solid fa-user-plus"></i>
                        <span>Share</span>
                      </button>

                      <button
                        className="btn-action-tool"
                        onClick={() => shareBoard(board._id, true, null)}
                        disabled={!isOwner}
                        title={
                          isOwner
                            ? "Toggle public link access"
                            : "Only owner can change visibility"
                        }
                      >
                        <i
                          className={`fa-solid ${board.isPublic ? "fa-lock" : "fa-globe"}`}
                        ></i>
                        <span>
                          {board.isPublic ? "Make Private" : "Make Public"}
                        </span>
                      </button>

                      <button
                        className="btn-action-tool btn-danger-action"
                        onClick={() => deleteBoard(board._id, board.title)}
                        disabled={!isOwner}
                        title={
                          isOwner
                            ? "Delete whiteboard permanently"
                            : "Only owner can delete"
                        }
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Glassmorphic Create New Whiteboard Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay-glass"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="modal-glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-glass-header">
              <div className="modal-title-group">
                <i
                  className="fa-solid fa-layer-group modal-icon"
                  style={{ color: "#60A5FA" }}
                ></i>
                <h3>Create New Whiteboard</h3>
              </div>
              <button
                className="btn-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowCreateModal(false);
                handleCreateBoard(
                  newBoardTitle.trim() || "My Architecture Board",
                );
              }}
              className="modal-glass-form"
            >
              <div className="form-field-group">
                <label>Whiteboard Title</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Microservices Topology, Sprint Planning..."
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  autoFocus
                />
                <span className="field-hint">
                  Give your workspace a descriptive name. You can rename it
                  anytime.
                </span>
              </div>

              <div className="form-field-group">
                <label style={{ fontSize: "11px", color: "#94A3B8" }}>
                  Quick Inspirations:
                </label>
                <div className="modal-presets-row">
                  {[
                    "Microservices Topology",
                    "System Architecture",
                    "Sprint Planning & Retro",
                    "Product Roadmap",
                    "Database Schema Design",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="preset-suggestion-pill"
                      onClick={() => setNewBoardTitle(preset)}
                    >
                      <i
                        className="fa-solid fa-wand-magic-sparkles"
                        style={{ fontSize: "10px", color: "#60A5FA" }}
                      ></i>
                      <span>{preset}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-glow">
                  <i
                    className="fa-solid fa-plus"
                    style={{ marginRight: "6px" }}
                  ></i>
                  <span>Create Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glassmorphic Join Board by ID Modal */}
      {showJoinModal && (
        <div
          className="modal-overlay-glass"
          onClick={() => {
            setShowJoinModal(false);
            setJoinBoardId("");
            setJoinModalError("");
          }}
        >
          <div
            className="modal-glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-glass-header">
              <div className="modal-title-group">
                <i
                  className="fa-solid fa-link modal-icon"
                  style={{ color: "#60A5FA" }}
                ></i>
                <h3>Join Whiteboard by ID</h3>
              </div>
              <button
                className="btn-modal-close"
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinBoardId("");
                  setJoinModalError("");
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleJoinBoard} className="modal-glass-form">
              {joinModalError && (
                <div className="modal-error-alert">
                  <i
                    className="fa-solid fa-triangle-exclamation"
                    style={{ marginRight: "6px" }}
                  ></i>
                  <span>{joinModalError}</span>
                </div>
              )}

              <div className="form-field-group">
                <label>Board ID (24-character hexadecimal)</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. 667f8c47b512a34567890123"
                  value={joinBoardId}
                  onChange={(e) => setJoinBoardId(e.target.value)}
                  disabled={joinModalLoading}
                  autoFocus
                />
                <span className="field-hint">
                  Ask the board owner to share their board ID with you.
                </span>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinBoardId("");
                    setJoinModalError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-glow"
                  disabled={joinModalLoading || !joinBoardId.trim()}
                >
                  {joinModalLoading ? (
                    <>
                      <i
                        className="fa-solid fa-circle-notch fa-spin"
                        style={{ marginRight: "6px" }}
                      ></i>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Workspace</span>
                      <i
                        className="fa-solid fa-arrow-right"
                        style={{ marginLeft: "6px" }}
                      ></i>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Glassmorphic Share Board Modal */}
      {shareTargetBoard && (
        <div
          className="modal-overlay-glass"
          onClick={() => {
            setShareTargetBoard(null);
            setShareEmail("");
          }}
        >
          <div
            className="modal-glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-glass-header">
              <div className="modal-title-group">
                <i
                  className="fa-solid fa-user-group modal-icon"
                  style={{ color: "#60A5FA" }}
                ></i>
                <h3>Share "{shareTargetBoard.title}"</h3>
              </div>
              <button
                className="btn-modal-close"
                onClick={() => {
                  setShareTargetBoard(null);
                  setShareEmail("");
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleShareSubmit} className="modal-glass-form">
              <div className="form-field-group">
                <label>Collaborator Email Address</label>
                <input
                  type="email"
                  className="modal-input"
                  placeholder="teammate@company.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  required
                  autoFocus
                />
                <span className="field-hint">
                  The user will be granted real-time collaboration access to
                  this board.
                </span>
                {shareError && (
                  <span
                    className="field-hint"
                    style={{ color: "#EF4444", marginTop: "6px" }}
                  >
                    {shareError}
                  </span>
                )}
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShareTargetBoard(null);
                    setShareEmail("");
                    setShareError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-glow"
                  disabled={shareLoading || !shareEmail.trim()}
                >
                  {shareLoading ? (
                    <>
                      <i
                        className="fa-solid fa-circle-notch fa-spin"
                        style={{ marginRight: "6px" }}
                      ></i>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <i
                        className="fa-solid fa-user-plus"
                        style={{ marginRight: "6px" }}
                      ></i>
                      <span>Add Collaborator</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
