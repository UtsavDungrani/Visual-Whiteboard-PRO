import React from 'react'

export default function CanvasControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  snapToGrid,
  onToggleSnapToGrid,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isReadOnly = false
}) {
  const zoomPercentage = Math.round(zoom * 100)

  return (
    <div className="canvas-controls">
      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        className="ctrl-btn"
        title="Zoom Out (Ctrl+-)"
        disabled={zoom <= 0.25}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6"></path>
        </svg>
      </button>

      {/* Zoom Level Indicator & Reset */}
      <button
        onClick={onZoomReset}
        className="zoom-indicator ctrl-btn"
        title="Reset Zoom (Ctrl+0)"
        style={{ width: 'auto', padding: '0 8px' }}
      >
        {zoomPercentage}%
      </button>

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        className="ctrl-btn"
        title="Zoom In (Ctrl++)"
        disabled={zoom >= 4.0}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6"></path>
        </svg>
      </button>

      {!isReadOnly && (
        <>
          <div className="control-divider"></div>

          {/* Snap to Grid */}
          <button
            onClick={onToggleSnapToGrid}
            className={`ctrl-btn ${snapToGrid ? 'active' : ''}`}
            title="Toggle Snap-to-Grid (G)"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-12-10.5h18m-18 6h18"></path>
            </svg>
          </button>

          <div className="control-divider"></div>

          {/* Undo */}
          <button
            onClick={onUndo}
            className="ctrl-btn"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"></path>
            </svg>
          </button>

          {/* Redo */}
          <button
            onClick={onRedo}
            className="ctrl-btn"
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15L21 9m0 0l-6-6M21 9h-12a6 6 0 000 12h3"></path>
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
