import React from 'react'

export default function Toolbar({ activeTool, setActiveTool, isReadOnly = false }) {
  const allTools = [
    {
      id: 'square-select',
      label: 'Square Select (V)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="3 3" />
          <path d="M10 10l5 5-2 1.5 3 3.5-1.5 1.2-3-3.5-2 2z" fill="currentColor" stroke="none" />
        </svg>
      )
    },
    {
      id: 'circle-select',
      label: 'Circular Select (C)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
          <path d="M10 10l5 5-2 1.5 3 3.5-1.5 1.2-3-3.5-2 2z" fill="currentColor" stroke="none" />
        </svg>
      )
    },
    {
      id: 'lasso-select',
      label: 'Lasso Select (L)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 16c-1.5-1.5-2-4-2-6 0-4.5 4-8 8-8s8 3.5 8 8-4 8-8 8c-2.5 0-4.5-1-6-2z" strokeDasharray="3 3" strokeLinecap="round" />
          <path d="M12 12l5 5-2 1.5 3 3.5-1.5 1.2-3-3.5-2 2z" fill="currentColor" stroke="none" />
        </svg>
      )
    },
    {
      id: 'pan',
      label: 'Pan (H)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 118 0v3M8 12V7a4 4 0 118 0v5m-8 2v-6a4 4 0 118 0v6m-8 2H6M16 16h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2m-8 7H4a2 2 0 01-2-2v-3a2 2 0 012-2h2m0 7V9"></path>
        </svg>
      )
    },
    {
      id: 'draw',
      label: 'Free Draw (P)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
        </svg>
      )
    },
    {
      id: 'rect',
      label: 'Rectangle (R)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="5" width="16" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"></rect>
        </svg>
      )
    },
    {
      id: 'circle',
      label: 'Circle (O)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" strokeLinecap="round" strokeLinejoin="round"></circle>
        </svg>
      )
    },
    {
      id: 'diamond',
      label: 'Diamond (D)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 9-9 9-9-9 9-9z"></path>
        </svg>
      )
    },
    {
      id: 'text',
      label: 'Text (T)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 6v4m16-4v4m-8-4v14m0 0h-3m3 0h3"></path>
        </svg>
      )
    },
    {
      id: 'arrow',
      label: 'Arrow Connector (A)',
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
        </svg>
      )
    }
  ]

  const tools = isReadOnly ? allTools.filter(t => ['square-select', 'circle-select', 'lasso-select', 'pan'].includes(t.id)) : allTools

  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
          onClick={() => setActiveTool(tool.id)}
          title={tool.label}
        >
          {tool.icon}
          <span className="tooltip">{tool.label}</span>
        </button>
      ))}
    </div>
  )
}
