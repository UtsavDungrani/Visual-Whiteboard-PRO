import React from "react";

export default function PropertiesPanel({
  selectedObject,
  properties,
  onChangeProperty,
  onBringToFront,
  onSendToBack,
  onDelete,
  onGroup,
  onUngroup,
  onToggleLock,
  onEditContext,
  isReadOnly = false,
  activeTool = "select",
  drawType = "pencil",
  setDrawType = () => {},
  drawSizes = { pencil: 2, pen: 6, highlighter: 20, eraser: 20 },
  onChangeDrawSize = () => {},
  isCollapsed = false,
  onToggleCollapse,
  pageMode = "infinite",
  onChangePageMode,
  zoom = 1,
  onZoom,
  onZoomReset,
  totalObjects = 0,
}) {
  const strokeColors = [
    { name: "Primary Blue", hex: "#1E3A5F" },
    { name: "Accent Teal", hex: "#2E86AB" },
    { name: "Emerald Green", hex: "#10B981" },
    { name: "Warning Amber", hex: "#F59E0B" },
    { name: "Danger Red", hex: "#EF4444" },
    { name: "Purple", hex: "#8B5CF6" },
    { name: "Dark Charcoal", hex: "#111827" },
    { name: "Transparent", hex: "transparent" },
  ];

  const fillColors = [
    { name: "Clean White", hex: "#FFFFFF" },
    { name: "Light Gray", hex: "#F3F4F6" },
    { name: "Ice Blue", hex: "#E0F2FE" },
    { name: "Mint Green", hex: "#D1FAE5" },
    { name: "Pastel Yellow", hex: "#FEF3C7" },
    { name: "Pastel Red", hex: "#FEE2E2" },
    { name: "Light Purple", hex: "#EDE9FE" },
    { name: "No Fill", hex: "transparent" },
  ];

  // =========================================================================
  // 1. DRAWING / BRUSH MODE
  // =========================================================================
  if (activeTool === "draw") {
    const brushTypes = [
      {
        id: "pencil",
        label: "Pencil",
        icon: "fa-pencil",
        desc: "Fine line sketching",
      },
      {
        id: "pen",
        label: "Felt Pen",
        icon: "fa-pen-nib",
        desc: "Thicker annotation lines",
      },
      {
        id: "highlighter",
        label: "Highlighter",
        icon: "fa-highlighter",
        desc: "Semi-transparent marker",
      },
      {
        id: "eraser",
        label: "Eraser",
        icon: "fa-eraser",
        desc: "Erase strokes and shapes",
      },
    ];

    return (
      <aside
        className={`properties-panel ${isCollapsed ? "collapsed" : "open"}`}
      >
        <div className="panel-header">
          <div className="panel-header-title">
            <i className="fa-solid fa-paintbrush header-icon"></i>
            <span>Brush Studio</span>
          </div>
          <button
            className="collapse-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Inspector" : "Collapse Inspector"}
          >
            <i
              className={`fa-solid fa-chevron-${isCollapsed ? "left" : "right"}`}
            ></i>
          </button>
        </div>

        {!isCollapsed && (
          <div className="panel-body">
            {/* Brush Type Selector */}
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Brush Tool</span>
                <span className="property-badge">{drawType.toUpperCase()}</span>
              </div>
              <div className="brush-grid">
                {brushTypes.map((t) => (
                  <button
                    key={t.id}
                    className={`brush-card-btn ${drawType === t.id ? "active" : ""}`}
                    onClick={() => setDrawType(t.id)}
                    title={t.desc}
                  >
                    <i className={`fa-solid ${t.icon}`}></i>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brush Stroke Color */}
            {drawType !== "eraser" && (
              <div className="property-card">
                <div className="property-card-header">
                  <span className="property-name">Stroke Color</span>
                  <span className="property-value-pill">
                    {properties.stroke || "#1E3A5F"}
                  </span>
                </div>
                <div className="color-swatch-grid">
                  {strokeColors
                    .filter((c) => c.hex !== "transparent")
                    .map((c) => (
                      <button
                        key={c.hex}
                        className={`color-swatch ${properties.stroke === c.hex ? "active" : ""}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => onChangeProperty("stroke", c.hex)}
                        title={c.name}
                      />
                    ))}
                  <div
                    className="color-swatch custom-picker-btn"
                    title="Choose custom color"
                    style={{
                      backgroundColor: properties.stroke || "#1E3A5F",
                    }}
                  >
                    <input
                      type="color"
                      value={properties.stroke || "#1E3A5F"}
                      onChange={(e) =>
                        onChangeProperty("stroke", e.target.value)
                      }
                    />
                    <span className="custom-plus">+</span>
                  </div>
                </div>
              </div>
            )}

            {/* Brush / Eraser Size */}
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">
                  {drawType === "eraser" ? "Eraser Size" : "Line Thickness"}
                </span>
                <span className="property-value-pill">
                  {drawType === "eraser"
                    ? drawSizes.eraser
                    : drawSizes[drawType]}
                  px
                </span>
              </div>
              <div className="range-control-row">
                <input
                  type="range"
                  min={drawType === "eraser" ? 5 : 1}
                  max={drawType === "eraser" ? 60 : 30}
                  step="1"
                  value={
                    drawType === "eraser"
                      ? drawSizes.eraser
                      : drawSizes[drawType]
                  }
                  onChange={(e) =>
                    onChangeDrawSize(
                      drawType === "eraser" ? "eraser" : drawType,
                      parseInt(e.target.value, 10),
                    )
                  }
                />
              </div>
            </div>

            {/* Visual Stroke Preview */}
            <div className="property-card preview-card">
              <span className="preview-label">Live Stroke Preview</span>
              <div className="stroke-preview-box">
                {drawType === "eraser" ? (
                  <div
                    style={{
                      width: `${drawSizes.eraser}px`,
                      height: `${drawSizes.eraser}px`,
                      borderRadius: "50%",
                      border: "2px dashed #2E86AB",
                      backgroundColor: "rgba(46, 134, 171, 0.1)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "70%",
                      height: `${Math.min(drawSizes[drawType] || 2, 20)}px`,
                      backgroundColor: properties.stroke || "#1E3A5F",
                      opacity: drawType === "highlighter" ? 0.4 : 1,
                      borderRadius: "9999px",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // =========================================================================
  // 2. CANVAS / BOARD DEFAULT INSPECTOR (WHEN NOTHING IS SELECTED)
  // =========================================================================
  if (!selectedObject) {
    return (
      <aside
        className={`properties-panel ${isCollapsed ? "collapsed" : "open"}`}
      >
        <div className="panel-header">
          <div className="panel-header-title">
            <i className="fa-solid fa-sliders header-icon"></i>
            <span>Board Settings</span>
          </div>
          <button
            className="collapse-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Inspector" : "Collapse Inspector"}
          >
            <i
              className={`fa-solid fa-chevron-${isCollapsed ? "left" : "right"}`}
            ></i>
          </button>
        </div>

        {!isCollapsed && (
          <div className="panel-body">
            {/* Canvas Layout Mode */}
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Document Page Mode</span>
                <span className="property-value-pill">
                  {pageMode === "infinite" ? "Infinite" : "Fixed Boundary"}
                </span>
              </div>
              <div className="segmented-button-row">
                <button
                  className={`segmented-btn ${pageMode === "infinite" ? "active" : ""}`}
                  onClick={() =>
                    onChangePageMode && onChangePageMode("infinite")
                  }
                >
                  <i
                    className="fa-solid fa-infinity"
                    style={{ marginRight: "6px" }}
                  ></i>
                  <span>Infinite</span>
                </button>
                <button
                  className={`segmented-btn ${pageMode === "fixed" ? "active" : ""}`}
                  onClick={() => onChangePageMode && onChangePageMode("fixed")}
                >
                  <i
                    className="fa-solid fa-file-powerpoint"
                    style={{ marginRight: "6px" }}
                  ></i>
                  <span>Presentation</span>
                </button>
              </div>
            </div>

            {/* Viewport Zoom Controls */}
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Viewport Zoom</span>
                <span className="property-value-pill">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="segmented-button-row">
                <button
                  className="segmented-btn"
                  onClick={() => onZoom && onZoom(zoom * 0.85)}
                  title="Zoom Out"
                >
                  <i className="fa-solid fa-minus"></i>
                </button>
                <button
                  className="segmented-btn"
                  onClick={() => onZoomReset && onZoomReset()}
                  title="Reset to 100%"
                >
                  <span>100%</span>
                </button>
                <button
                  className="segmented-btn"
                  onClick={() => onZoom && onZoom(zoom * 1.15)}
                  title="Zoom In"
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>

            {/* Selection Guidance */}
            <div className="guidance-card">
              <div className="guidance-icon-wrap">
                <i className="fa-solid fa-arrow-pointer"></i>
              </div>
              <h4>No Element Selected</h4>
              <p>
                Click any shape, text box, or connector on the canvas to
                customize its colors, borders, typography, and layering.
              </p>
            </div>

            {/* Keyboard Shortcuts Quick Reference */}
            <div className="property-card shortcuts-card">
              <div className="property-card-header">
                <span className="property-name">Shortcuts Cheat Sheet</span>
              </div>
              <div className="shortcut-list">
                <div className="shortcut-item">
                  <span className="shortcut-desc">Select Tool</span>
                  <kbd>V</kbd>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-desc">Draw Brush</span>
                  <kbd>D</kbd>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-desc">Rectangle</span>
                  <kbd>R</kbd>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-desc">Circle / Oval</span>
                  <kbd>C</kbd>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-desc">Text Element</span>
                  <kbd>T</kbd>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-desc">Connector Line</span>
                  <kbd>L</kbd>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-desc">Group Selection</span>
                  <kbd>Ctrl+G</kbd>
                </div>
                <div className="shortcut-item">
                  <span className="shortcut-desc">Lock Element</span>
                  <kbd>Ctrl+L</kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // =========================================================================
  // 3. OBJECT SELECTED - DETAILED FORMAT INSPECTOR
  // =========================================================================
  const isText =
    selectedObject.type === "i-text" || selectedObject.type === "text";
  const isConnector =
    selectedObject.customType === "line" ||
    selectedObject.customType === "arrow";
  const isGroup =
    selectedObject.type === "group" ||
    selectedObject.type === "activeSelection";

  const getObjectTypeLabel = () => {
    if (isText) return "Text Box";
    if (isConnector) return "Connector Line";
    if (isGroup)
      return `Group (${selectedObject._objects ? selectedObject._objects.length : "Multi"} Items)`;
    if (selectedObject.shapeName) return selectedObject.shapeName;
    if (selectedObject.type === "rect") return "Rectangle";
    if (selectedObject.type === "circle") return "Circle";
    if (selectedObject.type === "polygon") return "Polygon Shape";
    if (selectedObject.type === "path") return "Vector Stencil";
    return "Canvas Object";
  };

  return (
    <aside className={`properties-panel ${isCollapsed ? "collapsed" : "open"}`}>
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-title">
          <i className="fa-solid fa-shapes header-icon"></i>
          <div>
            <span className="panel-main-title">{getObjectTypeLabel()}</span>
            <span className="panel-sub-title">Format & Styling</span>
          </div>
        </div>
        <button
          className="collapse-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand Inspector" : "Collapse Inspector"}
        >
          <i
            className={`fa-solid fa-chevron-${isCollapsed ? "left" : "right"}`}
          ></i>
        </button>
      </div>

      {!isCollapsed && (
        <div className="panel-body">
          {/* ================= STROKE & BORDER COLOR ================= */}
          {!isReadOnly && !isText && (
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Stroke / Border Color</span>
                <span className="property-value-pill">
                  {properties.stroke === "transparent"
                    ? "Transparent"
                    : properties.stroke || "#1E3A5F"}
                </span>
              </div>
              <div className="color-swatch-grid">
                {strokeColors.map((c) => (
                  <button
                    key={c.hex}
                    className={`color-swatch ${properties.stroke === c.hex ? "active" : ""} ${c.hex === "transparent" ? "transparent-swatch" : ""}`}
                    style={{
                      backgroundColor:
                        c.hex === "transparent" ? undefined : c.hex,
                    }}
                    onClick={() => onChangeProperty("stroke", c.hex)}
                    title={c.name}
                  />
                ))}
                <div
                  className={`color-swatch custom-picker-btn ${properties.stroke !== "transparent" && !strokeColors.some((c) => c.hex === properties.stroke) ? "active" : ""}`}
                  title="Choose custom color"
                  style={{
                    backgroundColor:
                      properties.stroke !== "transparent"
                        ? properties.stroke
                        : undefined,
                  }}
                >
                  <input
                    type="color"
                    value={
                      properties.stroke && properties.stroke !== "transparent"
                        ? properties.stroke
                        : "#1E3A5F"
                    }
                    onChange={(e) => onChangeProperty("stroke", e.target.value)}
                  />
                  <span className="custom-plus">+</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= FILL / BACKGROUND COLOR ================= */}
          {!isText && !isConnector && !isReadOnly && (
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Fill Color</span>
                <span className="property-value-pill">
                  {properties.fill === "transparent"
                    ? "No Fill"
                    : properties.fill || "#FFFFFF"}
                </span>
              </div>
              <div className="color-swatch-grid">
                {fillColors.map((c) => (
                  <button
                    key={c.hex}
                    className={`color-swatch ${properties.fill === c.hex ? "active" : ""} ${c.hex === "transparent" ? "transparent-swatch" : ""}`}
                    style={{
                      backgroundColor:
                        c.hex === "transparent" ? undefined : c.hex,
                    }}
                    onClick={() => onChangeProperty("fill", c.hex)}
                    title={c.name}
                  />
                ))}
                <div
                  className={`color-swatch custom-picker-btn ${properties.fill !== "transparent" && !fillColors.some((c) => c.hex === properties.fill) ? "active" : ""}`}
                  title="Choose custom fill"
                  style={{
                    backgroundColor:
                      properties.fill !== "transparent"
                        ? properties.fill
                        : undefined,
                  }}
                >
                  <input
                    type="color"
                    value={
                      properties.fill && properties.fill !== "transparent"
                        ? properties.fill
                        : "#FFFFFF"
                    }
                    onChange={(e) => onChangeProperty("fill", e.target.value)}
                  />
                  <span className="custom-plus">+</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STROKE WIDTH ================= */}
          {!isText && !isReadOnly && (
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Stroke Thickness</span>
                <span className="property-value-pill">
                  {properties.strokeWidth || 2}px
                </span>
              </div>
              <div className="range-control-row">
                <input
                  type="range"
                  min="1"
                  max="16"
                  step="1"
                  value={properties.strokeWidth || 2}
                  onChange={(e) =>
                    onChangeProperty(
                      "strokeWidth",
                      parseInt(e.target.value, 10),
                    )
                  }
                />
              </div>
              <div className="preset-pill-row">
                {[1, 2, 4, 8].map((w) => (
                  <button
                    key={w}
                    className={`preset-pill ${(properties.strokeWidth || 2) === w ? "active" : ""}`}
                    onClick={() => onChangeProperty("strokeWidth", w)}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= CORNER ROUNDNESS (RECTANGLES) ================= */}
          {selectedObject.type === "rect" && !isReadOnly && (
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Corner Roundness</span>
                <span className="property-value-pill">
                  {properties.rx || 0}px
                </span>
              </div>
              <div className="range-control-row">
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={properties.rx || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeProperty("rx", val);
                    onChangeProperty("ry", val);
                  }}
                />
              </div>
              <div className="preset-pill-row">
                {[
                  { label: "Sharp", val: 0 },
                  { label: "Smooth", val: 8 },
                  { label: "Rounded", val: 16 },
                  { label: "Pill", val: 32 },
                ].map((item) => (
                  <button
                    key={item.label}
                    className={`preset-pill ${(properties.rx || 0) === item.val ? "active" : ""}`}
                    onClick={() => {
                      onChangeProperty("rx", item.val);
                      onChangeProperty("ry", item.val);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= OPACITY ================= */}
          {!isReadOnly && (
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Opacity</span>
                <span className="property-value-pill">
                  {Math.round(
                    (properties.opacity === undefined
                      ? 1
                      : properties.opacity) * 100,
                  )}
                  %
                </span>
              </div>
              <div className="range-control-row">
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={
                    properties.opacity === undefined ? 1 : properties.opacity
                  }
                  onChange={(e) =>
                    onChangeProperty("opacity", parseFloat(e.target.value))
                  }
                />
              </div>
            </div>
          )}

          {/* ================= TEXT FORMATTING (FOR TEXT OBJECTS) ================= */}
          {isText && !isReadOnly && (
            <>
              {/* Text Color */}
              <div className="property-card">
                <div className="property-card-header">
                  <span className="property-name">Text Color</span>
                  <span className="property-value-pill">
                    {properties.fill || "#111827"}
                  </span>
                </div>
                <div className="color-swatch-grid">
                  {strokeColors
                    .filter((c) => c.hex !== "transparent")
                    .map((c) => (
                      <button
                        key={c.hex}
                        className={`color-swatch ${properties.fill === c.hex ? "active" : ""}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => onChangeProperty("fill", c.hex)}
                        title={c.name}
                      />
                    ))}
                </div>
              </div>

              {/* Font Family */}
              <div className="property-card">
                <div className="property-card-header">
                  <span className="property-name">Font Family</span>
                </div>
                <select
                  value={properties.fontFamily || "Inter"}
                  onChange={(e) =>
                    onChangeProperty("fontFamily", e.target.value)
                  }
                  className="font-select-input"
                >
                  <option value="Inter">Inter (Sans-Serif)</option>
                  <option value="Fira Code">Fira Code (Monospace)</option>
                  <option value="Outfit">Outfit (Display)</option>
                  <option value="Georgia">Georgia (Serif)</option>
                  <option value="Comic Sans MS">Handwritten / Casual</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="property-card">
                <div className="property-card-header">
                  <span className="property-name">Font Size</span>
                  <span className="property-value-pill">
                    {properties.fontSize || 24}px
                  </span>
                </div>
                <div className="range-control-row">
                  <input
                    type="range"
                    min="12"
                    max="96"
                    step="1"
                    value={properties.fontSize || 24}
                    onChange={(e) =>
                      onChangeProperty("fontSize", parseInt(e.target.value, 10))
                    }
                  />
                </div>
              </div>

              {/* Text Styling Options */}
              <div className="property-card">
                <div className="property-card-header">
                  <span className="property-name">Typography Style</span>
                </div>
                <div className="segmented-button-row">
                  <button
                    className={`segmented-btn ${properties.fontWeight === "bold" ? "active" : ""}`}
                    onClick={() =>
                      onChangeProperty(
                        "fontWeight",
                        properties.fontWeight === "bold" ? "normal" : "bold",
                      )
                    }
                    title="Bold"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    className={`segmented-btn ${properties.fontStyle === "italic" ? "active" : ""}`}
                    onClick={() =>
                      onChangeProperty(
                        "fontStyle",
                        properties.fontStyle === "italic" ? "normal" : "italic",
                      )
                    }
                    title="Italic"
                  >
                    <em>I</em>
                  </button>
                  <button
                    className={`segmented-btn ${properties.underline ? "active" : ""}`}
                    onClick={() =>
                      onChangeProperty("underline", !properties.underline)
                    }
                    title="Underline"
                  >
                    <u>U</u>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ================= ARRANGE & LAYERING ================= */}
          {!isReadOnly && (
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Layer Arrangement</span>
              </div>
              <div className="segmented-button-row">
                <button
                  onClick={onBringToFront}
                  className="segmented-btn"
                  title="Bring to Front"
                >
                  <i
                    className="fa-solid fa-angles-up"
                    style={{ marginRight: "4px" }}
                  ></i>
                  <span>Front</span>
                </button>
                <button
                  onClick={onSendToBack}
                  className="segmented-btn"
                  title="Send to Back"
                >
                  <i
                    className="fa-solid fa-angles-down"
                    style={{ marginRight: "4px" }}
                  ></i>
                  <span>Back</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= GROUPING & LOCKING ================= */}
          {!isReadOnly && (
            <div className="property-card">
              <div className="property-card-header">
                <span className="property-name">Selection Actions</span>
              </div>

              {(selectedObject.type === "activeSelection" ||
                selectedObject.type === "group") && (
                <div
                  className="segmented-button-row"
                  style={{ marginBottom: "8px" }}
                >
                  <button
                    onClick={onGroup}
                    className="segmented-btn"
                    disabled={selectedObject.type !== "activeSelection"}
                    title="Group items"
                  >
                    <i
                      className="fa-solid fa-object-group"
                      style={{ marginRight: "4px" }}
                    ></i>
                    <span>Group</span>
                  </button>
                  <button
                    onClick={onUngroup}
                    className="segmented-btn"
                    disabled={selectedObject.type !== "group"}
                    title="Ungroup items"
                  >
                    <i
                      className="fa-solid fa-object-ungroup"
                      style={{ marginRight: "4px" }}
                    ></i>
                    <span>Ungroup</span>
                  </button>
                </div>
              )}

              <button
                onClick={onToggleLock}
                className={`btn btn-full ${selectedObject.lockMovementX ? "btn-danger" : "btn-secondary"}`}
                style={{ fontSize: "12px", padding: "8px 12px" }}
              >
                <i
                  className={`fa-solid ${selectedObject.lockMovementX ? "fa-lock-open" : "fa-lock"}`}
                  style={{ marginRight: "6px" }}
                ></i>
                <span>
                  {selectedObject.lockMovementX
                    ? "Unlock Element"
                    : "Lock in Place"}
                </span>
              </button>
            </div>
          )}

          {/* ================= CONTEXT NOTES & DOCS ================= */}
          <div className="property-card">
            <div className="property-card-header">
              <span className="property-name">Architecture Specs</span>
            </div>
            <button
              onClick={onEditContext}
              className="btn btn-primary btn-full"
              style={{ fontSize: "12px", padding: "8px 12px" }}
            >
              <i
                className="fa-solid fa-file-code"
                style={{ marginRight: "6px" }}
              ></i>
              <span>
                {isReadOnly ? "View Notes & Specs" : "Attach Specs / Docs"}
              </span>
            </button>
          </div>

          {/* ================= DELETE ACTION ================= */}
          {!isReadOnly && (
            <div style={{ marginTop: "auto", paddingTop: "8px" }}>
              <button
                onClick={onDelete}
                className="btn btn-danger btn-full"
                style={{ fontSize: "12px", padding: "8px 12px" }}
              >
                <i
                  className="fa-solid fa-trash-can"
                  style={{ marginRight: "6px" }}
                ></i>
                <span>Delete Element</span>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
