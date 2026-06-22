import React from 'react'

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
  activeTool = 'select',
  drawType = 'pencil',
  setDrawType = () => {},
  drawSizes = { pencil: 2, pen: 6, highlighter: 20, eraser: 20 },
  onChangeDrawSize = () => {},
  isCollapsed = false,
  onToggleCollapse
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
      { 
        id: 'pencil', 
        label: 'Pencil', 
        icon: (
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        ), 
        desc: 'Fine line drawing' 
      },
      { 
        id: 'pen', 
        label: 'Felt Pen', 
        icon: (
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L15.5 3.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l3 3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 10l3 3" />
          </svg>
        ), 
        desc: 'Thicker annotation lines' 
      },
      { 
        id: 'highlighter', 
        label: 'Highlighter', 
        icon: (
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l.5 5.5L3 21l1.5-5.5.5-4.5h4z" />
            <rect x="7" y="10" width="12" height="6" transform="rotate(-45 7 10)" fill="currentColor" opacity="0.3" stroke="none" />
          </svg>
        ), 
        desc: 'Semi-transparent highlighting' 
      },
      { 
        id: 'eraser', 
        label: 'Eraser', 
        icon: (
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20 20H7L3 16C2 15 2 13.5 3 12.5L12.5 3C13.5 2 15 2 16 3L21 8C22 9 22 10.5 21 11.5L12 20.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 7L12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ), 
        desc: 'Erase drawings and paths' 
      },
    ]

    return (
      <aside className={`properties-panel ${isCollapsed ? 'collapsed' : 'open'}`}>
        <div className="panel-header">
          <span className="panel-title">Brush Settings</span>
          <button 
            className="collapse-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Inspector" : "Collapse Inspector"}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              )}
            </svg>
          </button>
        </div>
        {!isCollapsed && (
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
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.icon}</span>
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
                  <div 
                    className={`color-option custom-color-btn ${!strokeColors.includes(properties.stroke) ? 'active' : ''}`} 
                    title="Choose custom brush color"
                    style={{ backgroundColor: !strokeColors.includes(properties.stroke) ? properties.stroke : undefined }}
                  >
                    <input 
                      type="color" 
                      value={properties.stroke || '#000000'} 
                      onChange={(e) => onChangeProperty('stroke', e.target.value)} 
                      style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    />
                    <span style={{ position: 'absolute', pointerEvents: 'none', fontSize: '14px', color: !strokeColors.includes(properties.stroke) ? 'white' : 'inherit' }}>+</span>
                  </div>
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
                  height: '80px',
                  borderRadius: '12px',
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
                      width: `${drawSizes.eraser}px`,
                      height: `${drawSizes.eraser}px`,
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
        )}
      </aside>
    )
  }

  if (!selectedObject) {
    return (
      <aside className={`properties-panel ${isCollapsed ? 'collapsed' : 'open'}`}>
        <div className="panel-header">
          <span className="panel-title">Inspector</span>
          <button 
            className="collapse-toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Inspector" : "Collapse Inspector"}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              )}
            </svg>
          </button>
        </div>
        {!isCollapsed && (
          <div className="panel-body">
            <div className="empty-state">
              <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 9.152c.582.448 1.148.89 1.676 1.345m-7.708-.415L3 16.2m10.158-1.579l-4.52-4.519M21 21l-6-6m6-6V3m0 0h-6m6 0l-6 6M4.5 9a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"></path>
              </svg>
              <p>Select a shape or text to modify its properties.</p>
            </div>
          </div>
        )}
      </aside>
    )
  }

  const isText = selectedObject.type === 'i-text' || selectedObject.type === 'text'
  const isConnector = selectedObject.customType === 'line' || selectedObject.customType === 'arrow'

  return (
    <aside className={`properties-panel ${isCollapsed ? 'collapsed' : 'open'}`}>
      <div className="panel-header">
        <span className="panel-title">Properties</span>
        <button 
          className="collapse-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand Inspector" : "Collapse Inspector"}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            )}
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="panel-body">
        {/* Stroke / Border Color (Hidden for Text elements) */}
        {!isReadOnly && !isText && (
          <div className="property-group">
            <h3 className="section-title">Stroke Color</h3>
            <div className="color-grid">
              {[...strokeColors, 'transparent'].map((color) => (
                <button
                  key={color}
                  className={`color-option ${properties.stroke === color ? 'active' : ''} ${color === 'transparent' ? 'transparent-color' : ''}`}
                  style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                  onClick={() => onChangeProperty('stroke', color)}
                  title={color === 'transparent' ? 'Transparent' : color}
                />
              ))}
              <div 
                className={`color-option custom-color-btn ${properties.stroke !== 'transparent' && !strokeColors.includes(properties.stroke) ? 'active' : ''}`} 
                title="Choose custom color"
                style={{ backgroundColor: properties.stroke !== 'transparent' && !strokeColors.includes(properties.stroke) ? properties.stroke : undefined }}
              >
                <input 
                  type="color" 
                  value={properties.stroke && properties.stroke !== 'transparent' ? properties.stroke : '#000000'} 
                  onChange={(e) => onChangeProperty('stroke', e.target.value)} 
                  style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
                <span style={{ position: 'absolute', pointerEvents: 'none', fontSize: '14px', color: properties.stroke !== 'transparent' && !strokeColors.includes(properties.stroke) ? 'white' : 'inherit' }}>+</span>
              </div>
            </div>
          </div>
        )}

        {/* Fill / Background Color (Hidden for Text elements and Connectors) */}
        {!isText && !isConnector && !isReadOnly && (
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
              <div 
                className={`color-option custom-color-btn ${properties.fill !== 'transparent' && !fillColors.includes(properties.fill) ? 'active' : ''}`} 
                title="Choose custom fill color"
                style={{ backgroundColor: properties.fill !== 'transparent' && !fillColors.includes(properties.fill) ? properties.fill : undefined }}
              >
                <input 
                  type="color" 
                  value={properties.fill && properties.fill !== 'transparent' ? properties.fill : '#ffffff'} 
                  onChange={(e) => onChangeProperty('fill', e.target.value)} 
                  style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
                <span style={{ position: 'absolute', pointerEvents: 'none', fontSize: '14px', color: properties.fill !== 'transparent' && !fillColors.includes(properties.fill) ? 'white' : 'inherit' }}>+</span>
              </div>
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

        {/* Corner Roundness (Rectangles only) */}
        {selectedObject.type === 'rect' && !isReadOnly && (
          <div className="property-group">
            <h3 className="section-title">Corner Roundness</h3>
            <div className="slider-container">
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={properties.rx || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  onChangeProperty('rx', val)
                  onChangeProperty('ry', val)
                }}
              />
              <span className="slider-value">{properties.rx || 0}px</span>
            </div>
          </div>
        )}

        {/* Text Settings Panel (Visible only for Text/iText elements) */}
        {isText && !isReadOnly && (
          <>
            {/* Text Color */}
            <div className="property-group">
              <h3 className="section-title">Text Color</h3>
              <div className="color-grid">
                {strokeColors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${properties.fill === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => onChangeProperty('fill', color)}
                    title={color}
                  />
                ))}
                <div 
                  className={`color-option custom-color-btn ${!strokeColors.includes(properties.fill) ? 'active' : ''}`} 
                  title="Choose custom text color"
                  style={{ backgroundColor: !strokeColors.includes(properties.fill) ? properties.fill : undefined }}
                >
                  <input 
                    type="color" 
                    value={properties.fill || '#000000'} 
                    onChange={(e) => onChangeProperty('fill', e.target.value)} 
                    style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                  <span style={{ position: 'absolute', pointerEvents: 'none', fontSize: '14px', color: !strokeColors.includes(properties.fill) ? 'white' : 'inherit' }}>+</span>
                </div>
              </div>
            </div>

            {/* Font Family */}
            <div className="property-group">
              <h3 className="section-title">Font Family</h3>
              <select
                value={properties.fontFamily || 'Inter'}
                onChange={(e) => onChangeProperty('fontFamily', e.target.value)}
                className="btn btn-secondary btn-full"
                style={{ textAlign: 'left', padding: '8px 12px', width: '100%', borderRadius: '8px', cursor: 'pointer' }}
              >
                <option value="Inter">Inter (Sans-serif)</option>
                <option value="Outfit">Outfit (Modern)</option>
                <option value="Georgia">Georgia (Serif)</option>
                <option value="Courier New">Courier New (Monospace)</option>
                <option value="Comic Sans MS">Comic Sans MS (Handwritten)</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="property-group">
              <h3 className="section-title">Font Size</h3>
              <div className="slider-container">
                <input
                  type="range"
                  min="12"
                  max="120"
                  step="1"
                  value={properties.fontSize || 24}
                  onChange={(e) => onChangeProperty('fontSize', parseInt(e.target.value, 10))}
                />
                <span className="slider-value">{properties.fontSize || 24}px</span>
              </div>
            </div>

            {/* Text Styling Options */}
            <div className="property-group">
              <h3 className="section-title">Text Style</h3>
              <div className="action-row" style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn btn-secondary ${properties.fontWeight === 'bold' ? 'active' : ''}`}
                  onClick={() => onChangeProperty('fontWeight', properties.fontWeight === 'bold' ? 'normal' : 'bold')}
                  style={{ flex: 1, fontWeight: 'bold' }}
                  title="Toggle Bold"
                >
                  B
                </button>
                <button
                  className={`btn btn-secondary ${properties.fontStyle === 'italic' ? 'active' : ''}`}
                  onClick={() => onChangeProperty('fontStyle', properties.fontStyle === 'italic' ? 'normal' : 'italic')}
                  style={{ flex: 1, fontStyle: 'italic' }}
                  title="Toggle Italic"
                >
                  I
                </button>
                <button
                  className={`btn btn-secondary ${properties.underline ? 'active' : ''}`}
                  onClick={() => onChangeProperty('underline', !properties.underline)}
                  style={{ flex: 1, textDecoration: 'underline' }}
                  title="Toggle Underline"
                >
                  U
                </button>
              </div>
            </div>

            {/* Text Background Color */}
            <div className="property-group">
              <h3 className="section-title">Background Color</h3>
              <div className="color-grid">
                {fillColors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${properties.backgroundColor === color ? 'active' : ''} ${color === 'transparent' ? 'transparent-color' : ''}`}
                    style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                    onClick={() => onChangeProperty('backgroundColor', color)}
                    title={color === 'transparent' ? 'Transparent' : color}
                  />
                ))}
                <div 
                  className={`color-option custom-color-btn ${properties.backgroundColor !== 'transparent' && !fillColors.includes(properties.backgroundColor) ? 'active' : ''}`} 
                  title="Choose custom background color"
                  style={{ backgroundColor: properties.backgroundColor !== 'transparent' && !fillColors.includes(properties.backgroundColor) ? properties.backgroundColor : undefined }}
                >
                  <input 
                    type="color" 
                    value={properties.backgroundColor && properties.backgroundColor !== 'transparent' ? properties.backgroundColor : '#ffffff'} 
                    onChange={(e) => onChangeProperty('backgroundColor', e.target.value)} 
                    style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                  <span style={{ position: 'absolute', pointerEvents: 'none', fontSize: '14px', color: properties.backgroundColor !== 'transparent' && !fillColors.includes(properties.backgroundColor) ? 'white' : 'inherit' }}>+</span>
                </div>
              </div>
            </div>

            {/* Text Outline Color */}
            <div className="property-group">
              <h3 className="section-title">Outline Color</h3>
              <div className="color-grid">
                {[...strokeColors, 'transparent'].map((color) => (
                  <button
                    key={color}
                    className={`color-option ${properties.stroke === color ? 'active' : ''} ${color === 'transparent' ? 'transparent-color' : ''}`}
                    style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                    onClick={() => onChangeProperty('stroke', color)}
                    title={color === 'transparent' ? 'Transparent' : color}
                  />
                ))}
                <div 
                  className={`color-option custom-color-btn ${properties.stroke !== 'transparent' && !strokeColors.includes(properties.stroke) ? 'active' : ''}`} 
                  title="Choose custom outline color"
                  style={{ backgroundColor: properties.stroke !== 'transparent' && !strokeColors.includes(properties.stroke) ? properties.stroke : undefined }}
                >
                  <input 
                    type="color" 
                    value={properties.stroke && properties.stroke !== 'transparent' ? properties.stroke : '#000000'} 
                    onChange={(e) => onChangeProperty('stroke', e.target.value)} 
                    style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                  <span style={{ position: 'absolute', pointerEvents: 'none', fontSize: '14px', color: properties.stroke !== 'transparent' && !strokeColors.includes(properties.stroke) ? 'white' : 'inherit' }}>+</span>
                </div>
              </div>
            </div>

            {/* Text Outline Width */}
            <div className="property-group">
              <h3 className="section-title">Outline Width</h3>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.5"
                  value={properties.strokeWidth || 0}
                  onChange={(e) => onChangeProperty('strokeWidth', parseFloat(e.target.value))}
                />
                <span className="slider-value">{properties.strokeWidth || 0}px</span>
              </div>
            </div>

            {/* Text Box Border Color */}
            <div className="property-group">
              <h3 className="section-title">Box Border Color</h3>
              <div className="color-grid">
                {fillColors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${properties.boxStroke === color ? 'active' : ''} ${color === 'transparent' ? 'transparent-color' : ''}`}
                    style={{ backgroundColor: color === 'transparent' ? undefined : color }}
                    onClick={() => onChangeProperty('boxStroke', color)}
                    title={color === 'transparent' ? 'Transparent' : color}
                  />
                ))}
                <div 
                  className={`color-option custom-color-btn ${properties.boxStroke !== 'transparent' && !fillColors.includes(properties.boxStroke) ? 'active' : ''}`} 
                  title="Choose custom box border color"
                  style={{ backgroundColor: properties.boxStroke !== 'transparent' && !fillColors.includes(properties.boxStroke) ? properties.boxStroke : undefined }}
                >
                  <input 
                    type="color" 
                    value={properties.boxStroke && properties.boxStroke !== 'transparent' ? properties.boxStroke : '#ffffff'} 
                    onChange={(e) => onChangeProperty('boxStroke', e.target.value)} 
                    style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                  <span style={{ position: 'absolute', pointerEvents: 'none', fontSize: '14px', color: properties.boxStroke !== 'transparent' && !fillColors.includes(properties.boxStroke) ? 'white' : 'inherit' }}>+</span>
                </div>
              </div>
            </div>

            {/* Text Box Border Width */}
            <div className="property-group">
              <h3 className="section-title">Box Border Width</h3>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={properties.boxStrokeWidth || 0}
                  onChange={(e) => onChangeProperty('boxStrokeWidth', parseInt(e.target.value, 10))}
                />
                <span className="slider-value">{properties.boxStrokeWidth || 0}px</span>
              </div>
            </div>

            {/* Corner Roundness */}
            <div className="property-group">
              <h3 className="section-title">Box Corner Roundness</h3>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={properties.rx || 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    onChangeProperty('rx', val)
                    onChangeProperty('ry', val)
                  }}
                />
                <span className="slider-value">{properties.rx || 0}px</span>
              </div>
            </div>

            {/* Padding */}
            <div className="property-group">
              <h3 className="section-title">Box Padding</h3>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={properties.padding || 0}
                  onChange={(e) => onChangeProperty('padding', parseInt(e.target.value, 10))}
                />
                <span className="slider-value">{properties.padding || 0}px</span>
              </div>
            </div>
          </>
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

        {/* Selection Logic: Group/Lock */}
        {!isReadOnly && (
          <div className="property-group">
            <h3 className="section-title">Selection Actions</h3>
            {(selectedObject.type === 'activeSelection' || selectedObject.type === 'group') && (
              <div className="action-row" style={{ marginBottom: '8px' }}>
                <button 
                  onClick={onGroup} 
                  className="btn btn-secondary" 
                  title="Group selected elements (Ctrl+G)"
                  disabled={selectedObject.type !== 'activeSelection'}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  Group
                </button>
                <button 
                  onClick={onUngroup} 
                  className="btn btn-secondary" 
                  title="Ungroup selected group (Ctrl+Shift+G)"
                  disabled={selectedObject.type !== 'group'}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l5.25 5.25M4.5 4.5l5.25 5.25m7.5-5.25L12 9.75M9 15l-5.25 5.25" />
                  </svg>
                  Ungroup
                </button>
              </div>
            )}
            <button 
              onClick={onToggleLock} 
              className={`btn btn-full ${selectedObject.lockMovementX ? 'btn-danger' : 'btn-secondary'}`}
              title="Lock element in place (Ctrl+L)"
            >
              {selectedObject.lockMovementX ? (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '6px' }} xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Unlock Element
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ marginRight: '6px' }} xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Lock in Place
                </>
              )}
            </button>
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
      )}
    </aside>
  )
}
