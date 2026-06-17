import React, { useState, useEffect, useRef } from 'react'

export default function PageStrip({
  pages = [],
  activePageId,
  onSwitchPage,
  onAddPage,
  onDeletePage,
  onDuplicatePage,
  onRenamePage,
  onReorderPage,
  onSharePage,
  canManagePages = false
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [contextMenu, setContextMenu] = useState(null)
  const [draggedPageId, setDraggedPageId] = useState(null)
  const [dragOverPageId, setDragOverPageId] = useState(null)
  const [dragPosition, setDragPosition] = useState(null) // 'top' or 'bottom'
  const contextMenuRef = useRef(null)

  // Close context menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu(null)
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleContextMenu = (e, pageId) => {
    if (!canManagePages) return
    e.preventDefault()
    setContextMenu({
      pageId,
      x: e.clientX,
      y: e.clientY
    })
  }

  const triggerRename = (pageId, currentTitle) => {
    const newTitle = prompt('Rename Page:', currentTitle)
    if (newTitle && newTitle.trim()) {
      onRenamePage(pageId, newTitle.trim())
    }
    setContextMenu(null)
  }

  // --- Drag and Drop Handlers ---
  const onDragStart = (e, pageId) => {
    if (!canManagePages) return
    setDraggedPageId(pageId)
    e.dataTransfer.setData('pageId', pageId)
    e.dataTransfer.effectAllowed = 'move'
    
    // Create a ghost image if needed, but default is usually fine
  }

  const onDragOver = (e, pageId) => {
    if (!canManagePages || draggedPageId === pageId) return
    e.preventDefault()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const offset = e.clientY - rect.top
    const position = offset < rect.height / 2 ? 'top' : 'bottom'
    
    setDragOverPageId(pageId)
    setDragPosition(position)
  }

  const onDragLeave = () => {
    setDragOverPageId(null)
    setDragPosition(null)
  }

  const onDrop = (e, targetPageId) => {
    if (!canManagePages || draggedPageId === null || draggedPageId === targetPageId) {
      setDraggedPageId(null)
      setDragOverPageId(null)
      setDragPosition(null)
      return
    }
    e.preventDefault()

    const fromIndex = pages.findIndex(p => p.page_id === draggedPageId)
    let toIndex = pages.findIndex(p => p.page_id === targetPageId)

    // Adjust toIndex based on drop position
    if (dragPosition === 'bottom' && fromIndex > toIndex) {
      toIndex += 1
    } else if (dragPosition === 'top' && fromIndex < toIndex) {
      toIndex -= 1
    }

    if (fromIndex !== toIndex) {
      onReorderPage(draggedPageId, toIndex)
    }

    setDraggedPageId(null)
    setDragOverPageId(null)
    setDragPosition(null)
  }

  const onDragEnd = () => {
    setDraggedPageId(null)
    setDragOverPageId(null)
    setDragPosition(null)
  }

  return (
    <>
      {/* Sidebar PageStrip Panel */}
      <aside className={`page-strip ${isOpen ? 'open' : 'collapsed'}`}>
        <div className="strip-header">
          <span className="strip-title">Pages</span>
          <button 
            className="collapse-toggle-btn"
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              )}
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="strip-body">
            <div className="thumbnail-list">
              {pages.map((page, index) => {
                const isActive = page.page_id === activePageId
                const isDragging = page.page_id === draggedPageId
                const isDragOver = page.page_id === dragOverPageId
                const objectsCount = page.canvas_state?.objects?.length || 0

                return (
                  <div
                    key={page.page_id}
                    className={`thumbnail-card ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver && dragPosition === 'top' ? 'drag-over' : ''} ${isDragOver && dragPosition === 'bottom' ? 'drag-over-bottom' : ''}`}
                    onClick={() => onSwitchPage(page.page_id)}
                    onContextMenu={(e) => handleContextMenu(e, page.page_id)}
                    draggable={canManagePages}
                    onDragStart={(e) => onDragStart(e, page.page_id)}
                    onDragOver={(e) => onDragOver(e, page.page_id)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, page.page_id)}
                    onDragEnd={onDragEnd}
                    title={canManagePages ? "Drag to reorder, Right-click for options" : ""}
                  >
                    <div className="thumbnail-preview-container">
                      {page.thumbnail ? (
                        <img 
                          src={page.thumbnail} 
                          alt={page.title} 
                          className="thumbnail-img"
                        />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        </div>
                      )}
                      <div className="thumbnail-badge">{objectsCount} shapes</div>
                    </div>
                    <div className="thumbnail-info">
                      <span className="thumbnail-index">{index + 1}</span>
                      <span className="thumbnail-title">{page.title || `Page ${index + 1}`}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {canManagePages && (
              <div className="strip-footer">
                <button onClick={onAddPage} className="btn btn-secondary btn-full add-page-btn">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Page
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Expand trigger button when collapsed */}
      {!isOpen && (
        <button 
          className="strip-expand-trigger"
          onClick={() => setIsOpen(true)}
          title="Expand Pages Sidebar"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Styled Custom Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="custom-context-menu"
          style={{
            position: 'absolute',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 10000
          }}
        >
          {canManagePages && (
            <>
              <button
                onClick={() => {
                  const page = pages.find((p) => p.page_id === contextMenu.pageId)
                  if (page) triggerRename(contextMenu.pageId, page.title)
                }}
                className="context-menu-item"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Rename
              </button>
              <button
                onClick={() => {
                  onDuplicatePage(contextMenu.pageId)
                  setContextMenu(null)
                }}
                className="context-menu-item"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75a8.965 8.965 0 00-3.75 4.5m7.5 0v-4.5m-7.5 4.5v-4.5m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Duplicate
              </button>
              <div className="context-menu-divider"></div>
            </>
          )}
          <button
            onClick={() => {
              onSharePage(contextMenu.pageId)
              setContextMenu(null)
            }}
            className="context-menu-item"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Share Page
          </button>
          {canManagePages && (
            <>
              <div className="context-menu-divider"></div>
              <button
                onClick={() => {
                  onDeletePage(contextMenu.pageId)
                  setContextMenu(null)
                }}
                className="context-menu-item text-danger"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9 9m-4.788-3L5.67 19.88A2.25 2.25 0 007.88 22h8.24a2.25 2.25 0 002.228-2.08L18.75 6m-13.8 0h12.58M9 3h4.14M6.75 6h10.5" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
