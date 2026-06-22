import React from 'react'

export default function Topbar({
  title,
  setTitle,
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
  boardMeta = { owner: null, collaborators: [], isPublic: false }
}) {
  const handleShare = () => {
    if (savedId) {
      const shareUrl = `${window.location.origin}?board=${savedId}`
      navigator.clipboard.writeText(shareUrl)
      alert('Share link copied to clipboard: ' + shareUrl)
    } else {
      alert('Please save the board first to generate a shareable link!')
    }
  }

  // Get initials from user name
  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onExit && (
          <button onClick={onExit} className="btn btn-secondary btn-back" title="Back to Dashboard" style={{ marginRight: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            <span>Exit</span>
          </button>
        )}
        <div className="logo-container" style={{ cursor: onExit ? 'pointer' : 'default' }} onClick={onExit}>
          <div className="logo-icon">W</div>
          <span className="logo-text">Whiteboard Pro</span>
        </div>
        
        <div className="board-title-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <span className="badge badge-view-only" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
              View Only
            </span>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* Collaboration User Presence Avatars */}
        <div className="avatar-group" title={`${roomUsers.length} collaborator(s) online`}>
          {roomUsers.map((u, i) => {
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id || i}
                className={`avatar ${isSelf ? 'avatar-self' : ''}`}
                style={{
                  backgroundColor: u.color,
                  cursor: isSelf ? 'pointer' : 'default',
                  border: isSelf ? '2px solid var(--color-accent)' : '2px solid white'
                }}
                title={isSelf ? `${u.name} (You) - Click to rename` : u.name}
                onClick={isSelf ? onRenameUser : undefined}
              >
                {getInitials(u.name)}
              </div>
            )
          })}
        </div>

        {savedId && boardMeta.owner === currentUser.dbUserId && (
          <button onClick={onOpenPermissionsPanel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Manage collaborator permissions">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Permissions
          </button>
        )}

        {!isReadOnly && (
          <>
            <button onClick={handleShare} className="btn btn-secondary">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l4.632-2.316m0 0a3 3 0 10-4.632-2.316 3 3 0 004.632 2.316zm0 0l-4.632 2.316m0 0a3 3 0 104.632 2.316 3 3 0 00-4.632-2.316zm0 0l4.632 2.316m0 0a3 3 0 104.632 2.316 3 3 0 00-4.632-2.316zm0 0l4.632 2.316m0 0a3 3 0 104.632 2.316 3 3 0 00-4.632-2.316z"></path>
              </svg>
              Share
            </button>

            <button onClick={onExport} className="btn btn-secondary">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Export
            </button>

            <button onClick={onClearPage} className="btn btn-secondary btn-danger-hover" title="Clear all elements from current page">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              <span>Clear</span>
            </button>

            <button onClick={onCleanup} className="btn btn-secondary btn-ai" disabled={isCleanupLoading}>
              {isCleanupLoading ? (
                <span className="spinner-ai"></span>
              ) : (
                <>
                  <span>🧹 Cleanup</span>
                </>
              )}
            </button>

            <button onClick={onAssist} className="btn btn-secondary btn-ai" disabled={isAssistLoading}>
              {isAssistLoading ? (
                <span className="spinner-ai"></span>
              ) : (
                <>
                  <span>🤖 Assist</span>
                </>
              )}
            </button>

            <button onClick={onSave} className="btn btn-primary">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
              </svg>
              Save
            </button>

            <button onClick={onLoad} className="btn btn-secondary">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              Load
            </button>
          </>
        )}
      </div>
    </header>
  )
}
