import React, { useState, useRef, useEffect } from 'react'

export default function Toolbar({ 
  activeTool, 
  setActiveTool, 
  drawType, 
  setDrawType, 
  isReadOnly = false 
}) {
  const [position, setPosition] = useState({ x: 20, y: 150 })
  const [isDragging, setIsDragging] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState(null)
  const offsetRef = useRef({ x: 0, y: 0 })

  const toolGroups = [
    {
      id: 'selection',
      defaultIcon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
          <path d="M10 10l5 5-2 1.5 3 3.5-1.5 1.2-3-3.5-2 2z" fill="currentColor" stroke="none" />
        </svg>
      ),
      tools: [
        { 
          id: 'square-select', 
          label: 'Square Select (V)',
          icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
            </svg>
          )
        },
        { 
          id: 'circle-select', 
          label: 'Circular Select (C)',
          icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
            </svg>
          )
        },
        { 
          id: 'lasso-select', 
          label: 'Lasso Select (L)',
          icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M7 22a5 5 0 0 1-2-4" strokeLinecap="round" />
              <path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1" strokeLinecap="round" strokeDasharray="3 3" />
              <circle cx="5" cy="18" r="2" fill="currentColor" stroke="none" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'drawing',
      defaultIcon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      ),
      tools: [
        { 
          id: 'draw', 
          label: 'Pen (P)', 
          type: 'pen',
          icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )
        },
        { 
          id: 'eraser', 
          label: 'Eraser (E)', 
          type: 'eraser',
          icon: (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M20 20H7L3 16C2 15 2 13.5 3 12.5L12.5 3C13.5 2 15 2 16 3L21 8C22 9 22 10.5 21 11.5L12 20.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 7L12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'shapes',
      defaultIcon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="4" y="5" width="16" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      tools: [
        { 
          id: 'rect', 
          label: 'Rectangle (R)',
          icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" /></svg>
        },
        { 
          id: 'circle', 
          label: 'Circle (O)',
          icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>
        },
        { 
          id: 'diamond', 
          label: 'Diamond (D)',
          icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3l9 9-9 9-9-9 9-9z" /></svg>
        }
      ]
    },
    {
      id: 'connectors',
      defaultIcon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      ),
      tools: [
        { 
          id: 'arrow', 
          label: 'Arrow (A)',
          icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        },
        { 
          id: 'line', 
          label: 'Line (S)',
          icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12h14" /></svg>
        }
      ]
    }
  ]

  // Handlers for dragging
  const onPointerDown = (e) => {
    if (e.target.closest('.toolbar-handle')) {
      setIsDragging(true)
      offsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      }
    }
  }

  useEffect(() => {
    const onPointerMove = (e) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y
      })
    }
    const onPointerUp = () => setIsDragging(false)

    if (isDragging) {
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isDragging])

  // Get current icon for a group based on active selection
  const getCurrentGroupIcon = (group) => {
    const activeToolInGroup = group.tools.find(t => {
      if (group.id === 'drawing') {
        return activeTool === 'draw' && drawType === t.type
      }
      return activeTool === t.id
    })
    return activeToolInGroup ? activeToolInGroup.icon : group.defaultIcon
  }

  return (
    <div 
      className="toolbar" 
      style={{ left: `${position.x}px`, top: `${position.y}px`, transform: 'none' }}
      onPointerDown={onPointerDown}
    >
      <div className="toolbar-handle" title="Drag to move"></div>
      
      {toolGroups.map(group => {
        const isGroupActive = group.tools.some(t => {
          if (group.id === 'drawing') {
            return activeTool === 'draw' && drawType === t.type
          }
          return activeTool === t.id
        })
        
        return (
          <div key={group.id} className="tool-group-wrapper">
            <button
              className={`tool-btn has-submenu ${isGroupActive ? 'active' : ''}`}
              onClick={() => setOpenSubmenu(openSubmenu === group.id ? null : group.id)}
              title={group.id.charAt(0).toUpperCase() + group.id.slice(1)}
            >
              {getCurrentGroupIcon(group)}
            </button>

            {openSubmenu === group.id && (
              <div className="tool-submenu">
                {group.tools.map(tool => {
                  const isActive = group.id === 'drawing' 
                    ? activeTool === 'draw' && drawType === tool.type
                    : activeTool === tool.id

                  return (
                    <button
                      key={tool.id}
                      className={`submenu-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (group.id === 'drawing') {
                          setActiveTool('draw')
                          setDrawType(tool.type)
                        } else {
                          setActiveTool(tool.id)
                        }
                        setOpenSubmenu(null)
                      }}
                      title={tool.label}
                    >
                      {tool.icon}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div className="context-menu-divider" style={{ margin: '4px 0' }}></div>

      {/* Standalone Text Tool Section */}
      <button
        className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`}
        onClick={() => { setActiveTool('text'); setOpenSubmenu(null); }}
        title="Text (T)"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 6v4m16-4v4m-8-4v14m0 0h-3m3 0h3" />
        </svg>
      </button>

      {/* Primary Pan Tool */}
      <button
        className={`tool-btn ${activeTool === 'pan' ? 'active' : ''}`}
        onClick={() => { setActiveTool('pan'); setOpenSubmenu(null); }}
        title="Pan (H)"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 118 0v3M8 12V7a4 4 0 118 0v5m-8 2v-6a4 4 0 118 0v6m-8 2H6M16 16h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2m-8 7H4a2 2 0 01-2-2v-3a2 2 0 012-2h2m0 7V9" />
        </svg>
      </button>
    </div>
  )
}
