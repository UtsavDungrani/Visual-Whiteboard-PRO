import React from 'react'

export default function PropertiesPanel({
  selectedObject,
  properties,
  onChangeProperty,
  onBringToFront,
  onSendToBack,
  onDelete,
  onEditContext,
  isReadOnly = false,
  activeTool = 'select',
  drawType = 'pencil',
  setDrawType = () => {},
  drawSizes = { pencil: 2, pen: 6, highlighter: 20, eraser: 20 },
  onChangeDrawSize = () => {}
}) {
  const strokeColors = [
    '#1E3A5F', // Primary Blue
    '#2E86AB', // Accent Teal
    '#10B981', // Success Green
    '#F59E0B', // Warning Amber
    '#EF4444', // Danger Red
    '#111827', // Dark Charcoal
  ]

  const fillColors = [
    '#FFFFFF', // Clean White
    '#F3F4F6', // Light Gray
    '#E0F2FE', // Ice Blue
    '#D1FAE5', // Mint Green
    '#FEF3C7', // Pastel Yellow
    '#FEE2E2', // Pastel Red
    'transparent' // No Fill
  ]

  if (activeTool === 'draw') {
    const brushTypes = [
      { id: 'pencil', label: 'Pencil', icon: '✏️', desc: 'Fine line drawing' },
      { id: 'pen', label: 'Felt Pen', icon: '🖊️', desc: 'Thicker annotation lines' },
      { id: 'highlighter', label: 'Highlighter', icon: '🖍️', desc: 'Semi-transparent highlighting' },
      { id: 'eraser', label: 'Eraser', icon: '🧹', desc: 'Erase drawings and paths' },
    ]

    return (
      <aside className="properties-panel">
        <div className="panel-header">
          <span className="panel-title">Brush Settings</span>
        </div>
        <div className="panel-body">
          {/* Brush Type */}
          <div className="property-group">
            <h3 className="section-title">Brush Type</h3>
            <div className="brush-type-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {brushTypes.map((t) => (
                <button
                  key={t.id}
                  className={`btn ${drawType === t.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setDrawType(t.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px 8px',
                    gap: '6px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: drawType === t.id ? 'var(--color-primary)' : 'rgba(243, 244, 246, 0.8)',
                    color: drawType === t.id ? 'white' : 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)'
                  }}
                  title={t.desc}
                >
                  <span style={{ fontSize: '20px' }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brush Color (hidden for Eraser) */}
          {drawType !== 'eraser' && (
            <div className="property-group">
              <h3 className="section-title">Brush Color</h3>
              <div className="color-grid">
                {strokeColors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${properties.stroke === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => onChangeProperty('stroke', color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Eraser size controls */}
          {drawType === 'eraser' && (
            <div className="property-group">
              <h3 className="section-title">Eraser Size</h3>
              <div className="brush-size-control">
                <button
                  type="button"
                  className="brush-size-btn"
                  onClick={() => onChangeDrawSize('eraser', drawSizes.eraser - 4)}
                  title="Decrease eraser size"
                  aria-label="Decrease eraser size"
                >
                  −
                </button>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={drawSizes.eraser}
                  onChange={(e) => onChangeDrawSize('eraser', parseInt(e.target.value, 10))}
                  className="brush-size-slider"
                />
                <button
                  type="button"
                  className="brush-size-btn"
                  onClick={() => onChangeDrawSize('eraser', drawSizes.eraser + 4)}
                  title="Increase eraser size"
                  aria-label="Increase eraser size"
                >
                  +
                </button>
              </div>
              <span className="slider-value">{drawSizes.eraser}px</span>
            </div>
          )}

          <div className="property-group brush-preview-group" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
              {drawType === 'eraser' ? 'Eraser Preview' : 'Stroke Preview'}
            </span>
            <div
              style={{
                width: '80%',
                height: drawType === 'eraser' ? '72px' : '28px',
                borderRadius: drawType === 'eraser' ? '12px' : '14px',
                border: '1px solid var(--color-border)',
                background: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {drawType === 'eraser' ? (
                <div
                  style={{
                    width: `${Math.min(drawSizes.eraser * 2, 56)}px`,
                    height: `${Math.min(drawSizes.eraser * 2, 56)}px`,
                    borderRadius: '50%',
                    border: '2px solid #2E86AB',
                    background: 'rgba(46, 134, 171, 0.1)',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '60%',
                    height: drawType === 'pencil' ? '2px' : drawType === 'pen' ? '6px' : '12px',
                    backgroundColor: properties.stroke || '#1E3A5F',
                    opacity: drawType === 'highlighter' ? 0.4 : 1,
                    borderRadius: '9999px'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </aside>
    )
  }

  if (!selectedObject) {
    return (
      <aside className="properties-panel">
        <div className="panel-header">
          <span className="panel-title">Inspector</span>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 9.152c.582.448 1.148.89 1.676 1.345m-7.708-.415L3 16.2m10.158-1.579l-4.52-4.519M21 21l-6-6m6-6V3m0 0h-6m6 0l-6 6M4.5 9a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"></path>
            </svg>
            <p>Select a shape or text to modify its properties.</p>
          </div>
        </div>
      </aside>
    )
  }

  const isText = selectedObject.type === 'i-text' || selectedObject.type === 'text'

  return (
    <aside className="properties-panel">
      <div className="panel-header">
        <span className="panel-title">Properties</span>
      </div>

      <div className="panel-body">
        {/* Stroke / Border Color */}
        {!isReadOnly && (
          <div className="property-group">
            <h3 className="section-title">Stroke Color</h3>
            <div className="color-grid">
              {strokeColors.map((color) => (
                <button
                  key={color}
                  className={`color-option ${properties.stroke === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onChangeProperty('stroke', color)}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Fill / Background Color (Hidden for Text elements) */}
        {!isText && !isReadOnly && (
          <div className="property-group">
            <h3 className="section-title">Fill Color</h3>
            <div className="color-grid">
              {fillColors.map((color) => (
                <button
                  key={color}
                  className={`color-option ${properties.fill === color ? 'active' : ''} ${color === 'transparent' ? 'transparent-color' : ''}`}
                  style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                  onClick={() => onChangeProperty('fill', color)}
                  title={color === 'transparent' ? 'Transparent' : color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stroke Width / Border Thickness (Hidden for Text elements) */}
        {!isText && !isReadOnly && (
          <div className="property-group">
            <h3 className="section-title">Stroke Width</h3>
            <div className="slider-container">
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={properties.strokeWidth || 2}
                onChange={(e) => onChangeProperty('strokeWidth', parseInt(e.target.value, 10))}
              />
              <span className="slider-value">{properties.strokeWidth || 2}px</span>
            </div>
          </div>
        )}

        {/* Opacity */}
        {!isReadOnly && (
          <div className="property-group">
            <h3 className="section-title">Opacity</h3>
            <div className="slider-container">
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={properties.opacity === undefined ? 1 : properties.opacity}
                onChange={(e) => onChangeProperty('opacity', parseFloat(e.target.value))}
              />
              <span className="slider-value">{Math.round((properties.opacity === undefined ? 1 : properties.opacity) * 100)}%</span>
            </div>
          </div>
        )}

        {/* Context Layer */}
        <div className="property-group">
          <h3 className="section-title">Context Layer</h3>
          <button onClick={onEditContext} className="btn btn-primary btn-full">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '6px' }} xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            {isReadOnly ? 'View Notes / Files' : 'Attach Notes / Files'}
          </button>
        </div>

        {/* Arrangement / Layering Controls */}
        {!isReadOnly && (
          <div className="property-group">
            <h3 className="section-title">Arrange Layers</h3>
            <div className="action-row">
              <button onClick={onBringToFront} className="btn btn-secondary" title="Bring to Front">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7"></path>
                </svg>
                Bring Front
              </button>
              <button onClick={onSendToBack} className="btn btn-secondary" title="Send to Back">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"></path>
                </svg>
                Send Back
              </button>
            </div>
          </div>
        )}

        {/* Delete Action */}
        {!isReadOnly && (
          <div className="property-group" style={{ marginTop: 'auto' }}>
            <button onClick={onDelete} className="btn btn-danger btn-full">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Delete Element
            </button>
          </div>
        )}

        {isReadOnly && (
          <div className="property-group view-only-notice" style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(30, 58, 95, 0.05)', border: '1px dashed var(--color-border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', textAlign: 'center' }}>
              🔒 Shapes properties locked in View Only room.
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
