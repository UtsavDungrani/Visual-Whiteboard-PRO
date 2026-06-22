import React, { useState } from 'react'

export default function PermissionsPanel({
  isOpen,
  onClose,
  whiteboardId,
  roomUsers = [],
  boardMeta = { owner: null, collaborators: [], isPublic: false },
  onTogglePermission
}) {
  const [loadingUserId, setLoadingUserId] = useState(null)

  const handleToggle = async (user) => {
    const isOwner = !!(user.dbUserId && boardMeta.owner && user.dbUserId === boardMeta.owner)
    if (isOwner) return
    const isCollaborator = user.dbUserId && boardMeta.collaborators.includes(user.dbUserId)
    const currentAccess = user.sessionAccess 
      ? user.sessionAccess 
      : (isCollaborator ? 'full' : 'view')
    const newAccess = currentAccess === 'full' ? 'view' : 'full'
    
    setLoadingUserId(user.id)
    try {
      await onTogglePermission(user.id, user.dbUserId, newAccess)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingUserId(null)
    }
  }

  // Sort roomUsers so the owner appears first in the list
  const usersToManage = [...roomUsers].sort((a, b) => {
    const aIsOwner = !!(a.dbUserId && boardMeta.owner && a.dbUserId === boardMeta.owner)
    const bIsOwner = !!(b.dbUserId && boardMeta.owner && b.dbUserId === boardMeta.owner)
    if (aIsOwner && !bIsOwner) return -1
    if (!aIsOwner && bIsOwner) return 1
    return 0
  })

  return (
    <div className={`context-panel-drawer ${isOpen ? 'open' : ''}`} style={{ zIndex: 30 }}>
      <div className="context-panel-header">
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Collaborator Access</h3>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Manage live user write permissions</span>
        </div>
        <button 
          className="modal-close-btn" 
          onClick={onClose}
          style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}
        >
          &times;
        </button>
      </div>

      <div className="context-panel-body" style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Board Share Settings
          </div>
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            backgroundColor: 'var(--color-bg)', 
            border: '1px solid var(--color-border)',
            fontSize: '13px',
            color: 'var(--color-text-primary)'
          }}>
            <div>
              <strong>Visibility:</strong> {boardMeta.isPublic ? 'Public (View-Only by default)' : 'Private (Invite only)'}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
            Active Users ({usersToManage.length})
          </div>

          {usersToManage.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px 12px', 
              color: 'var(--color-text-secondary)',
              fontSize: '13px'
            }}>
              No other active collaborators online.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {usersToManage.map((u) => {
                const isOwner = !!(u.dbUserId && boardMeta.owner && u.dbUserId === boardMeta.owner)
                const isCollaborator = u.dbUserId && boardMeta.collaborators.includes(u.dbUserId)
                const isLoading = loadingUserId === u.id
                const currentAccess = u.sessionAccess 
                  ? u.sessionAccess 
                  : (isOwner || isCollaborator ? 'full' : 'view')

                return (
                  <div 
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div 
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: u.color || '#6B7280',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '11px'
                        }}
                      >
                        {u.name ? u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
                          {u.name} {isOwner && <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 'bold' }}>(You)</span>}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {isOwner ? 'Board Owner' : (u.isGuest ? 'Guest User' : 'Registered User')}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isOwner ? (
                        <span 
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '12px', 
                            fontWeight: '600', 
                            color: 'var(--color-success)', 
                            backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '4px',
                            display: 'inline-block',
                            textAlign: 'center',
                            minWidth: '85px'
                          }}
                        >
                          Owner
                        </span>
                      ) : (
                        <button
                          className={`btn btn-sm ${currentAccess === 'full' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => handleToggle(u)}
                          disabled={isLoading}
                          style={{ padding: '4px 8px', fontSize: '12px', minWidth: '85px' }}
                        >
                          {isLoading ? 'Saving...' : (currentAccess === 'full' ? 'Full Access' : 'View-Only')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
