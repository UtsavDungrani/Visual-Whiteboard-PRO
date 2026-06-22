import React, { useState, useEffect } from 'react'

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'sql', label: 'SQL' },
  { value: 'css', label: 'CSS' },
  { value: 'plaintext', label: 'Plain Text' }
]

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export default function ContextPanel({
  isOpen,
  onClose,
  whiteboardId,
  elementId,
  elementName,
  onContextUpdated, // callback to let App know context changed (for badges)
  isReadOnly = false
}) {
  const [activeTab, setActiveTab] = useState('notes')
  const [notes, setNotes] = useState('')
  const [links, setLinks] = useState([])
  const [codeSnippet, setCodeSnippet] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('javascript')
  const [files, setFiles] = useState([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isNotesPreview, setIsNotesPreview] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' })

  // Load context on mount / element change
  useEffect(() => {
    if (!whiteboardId || !elementId || !isOpen) return

    const fetchContext = async () => {
      setIsLoading(true)
      setStatusMessage({ type: '', text: '' })
      try {
        const token = localStorage.getItem('wb_token')
        const headers = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`${API_BASE_URL}/api/context/${whiteboardId}/${elementId}`, { headers })
        if (!res.ok) throw new Error('Failed to load element details')
        const data = await res.json()
        setNotes(data.notes || '')
        setLinks(data.links || [])
        setCodeSnippet(data.code_snippet || '')
        setCodeLanguage(data.code_language || 'javascript')
        setFiles(data.files || [])
        if (isReadOnly) {
          setIsNotesPreview(true)
        }
      } catch (err) {
        console.error('Error fetching context:', err)
        setStatusMessage({ type: 'error', text: 'Failed to load element details' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchContext()
  }, [whiteboardId, elementId, isOpen])

  // Save text-based context (notes, links, code)
  const handleSave = async () => {
    if (!whiteboardId || !elementId) return
    setIsSaving(true)
    setStatusMessage({ type: '', text: '' })

    try {
      const token = localStorage.getItem('wb_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE_URL}/api/context/${whiteboardId}/${elementId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          notes,
          links,
          code_snippet: codeSnippet,
          code_language: codeLanguage
        })
      })

      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      
      setStatusMessage({ type: 'success', text: 'Context saved successfully!' })
      if (onContextUpdated) {
        onContextUpdated(elementId, true)
      }
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000)
    } catch (err) {
      console.error('Save error:', err)
      setStatusMessage({ type: 'error', text: 'Failed to save context' })
    } finally {
      setIsSaving(false)
    }
  }

  // Link modification functions
  const handleAddLink = () => {
    setLinks([...links, { label: '', url: '' }])
  }

  const handleLinkChange = (index, field, value) => {
    const updated = [...links]
    updated[index][field] = value
    setLinks(updated)
  }

  const handleRemoveLink = (index) => {
    setLinks(links.filter((_, idx) => idx !== index))
  }

  // File Upload Handlers
  const handleFileUpload = async (file) => {
    if (!file) return
    setIsLoading(true)
    setStatusMessage({ type: '', text: '' })

    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = localStorage.getItem('wb_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE_URL}/api/context/${whiteboardId}/${elementId}/upload`, {
        method: 'POST',
        headers,
        body: formData
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setFiles(data.files || [])
      setStatusMessage({ type: 'success', text: `Uploaded ${file.name} successfully!` })
      if (onContextUpdated) {
        onContextUpdated(elementId, true)
      }
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000)
    } catch (err) {
      console.error('File upload error:', err)
      setStatusMessage({ type: 'error', text: 'File upload failed' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleRemoveFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file attachment?')) return
    setIsLoading(true)
    setStatusMessage({ type: '', text: '' })

    try {
      const token = localStorage.getItem('wb_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE_URL}/api/context/${whiteboardId}/${elementId}/files/${fileId}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) throw new Error('Delete failed')
      const data = await res.json()
      setFiles(data.files || [])
      setStatusMessage({ type: 'success', text: 'Attachment removed' })
      
      // If no files, notes, code, or links are active, we might clear badge. Let App handle it.
      if (onContextUpdated) {
        const hasContent = notes.trim() !== '' || links.some(l => l.url) || codeSnippet.trim() !== '' || (data.files && data.files.length > 0)
        onContextUpdated(elementId, hasContent)
      }
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000)
    } catch (err) {
      console.error('Delete attachment error:', err)
      setStatusMessage({ type: 'error', text: 'Failed to delete attachment' })
    } finally {
      setIsLoading(false)
    }
  }

  // Custom visual components
  const parseMarkdown = (text) => {
    if (!text) return '<p class="empty-preview">No notes written yet. Switch to Edit mode to write notes.</p>'
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks (inline)
    html = html.replace(/`(.*?)`/g, '<code>$1</code>')

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1 ↗</a>')
    
    // Lines
    html = html.split('\n').map(line => {
      if (line.startsWith('<h3>') || line.startsWith('<h2>') || line.startsWith('<h1>') || line.startsWith('<ul>') || line.startsWith('<li>')) {
        return line
      }
      if (line.trim().startsWith('- ')) {
        return `<li>${line.substring(2)}</li>`
      }
      return line ? `<p>${line}</p>` : ''
    }).join('')

    return html
  }

  const highlightCode = (code, language) => {
    if (!code) return ''
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const keywords = {
      javascript: /\b(const|let|var|function|return|import|export|from|default|class|extends|if|else|for|while|try|catch|new|this|async|await)\b/g,
      python: /\b(def|class|return|import|from|if|elif|else|for|while|try|except|as|with|in|is|not|and|or|lambda|self)\b/g,
      html: /(&lt;\/?[a-zA-Z0-9\-]+&gt;)/g,
      sql: /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|JOIN|LEFT|RIGHT|ON|GROUP|BY|ORDER|HAVING|INDEX)\b/gi,
      css: /\b(color|background|margin|padding|width|height|border|display|flex|position|top|left|right|bottom)\b/g
    }

    const regex = keywords[language.toLowerCase()]
    if (regex) {
      if (language.toLowerCase() === 'html') {
        highlighted = highlighted.replace(regex, '<span class="code-html-tag">$1</span>')
      } else if (language.toLowerCase() === 'css') {
        highlighted = highlighted.replace(regex, '<span class="code-css-prop">$1</span>')
      } else {
        highlighted = highlighted.replace(regex, '<span class="code-keyword">$1</span>')
      }
    }

    // Strings
    highlighted = highlighted.replace(/(["'`])(.*?)\1/g, '<span class="code-string">$1$2$1</span>')
    // Comments
    highlighted = highlighted.replace(/(\/\/.*|#.*)/g, '<span class="code-comment">$1</span>')

    return highlighted
  }

  if (!isOpen) return null

  return (
    <div className={`context-panel-drawer ${isOpen ? 'open' : ''}`}>
      <div className="context-panel-header">
        <div className="header-info">
          <h3>Context Details</h3>
          <span className="element-badge">{elementName || 'Selected Shape'}</span>
        </div>
        <button className="btn-close" onClick={onClose} title="Close Context Inspector">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {statusMessage.text && (
        <div className={`context-status-bar ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {isLoading && (
        <div className="context-loading-overlay">
          <div className="loader"></div>
          <span>Loading attachment details...</span>
        </div>
      )}

      <div className="context-panel-tabs">
        <button 
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
        <button 
          className={`tab-btn ${activeTab === 'links' ? 'active' : ''}`}
          onClick={() => setActiveTab('links')}
        >
          Links
        </button>
        <button 
          className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
        <button 
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
      </div>

      <div className="context-panel-body">
        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="tab-pane notes-pane">
            <div className="pane-header-actions">
              <span className="pane-hint">Supports Markdown syntax</span>
              {!isReadOnly && (
                <button 
                  className="btn btn-secondary btn-xs"
                  onClick={() => setIsNotesPreview(!isNotesPreview)}
                >
                  {isNotesPreview ? 'Edit Notes' : 'Preview Notes'}
                </button>
              )}
            </div>
            
            {isNotesPreview ? (
              <div 
                className="markdown-preview-container"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(notes) }}
              />
            ) : (
              <textarea
                className="notes-textarea"
                placeholder="Write markdown notes for this element here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}
          </div>
        )}

        {/* LINKS TAB */}
        {activeTab === 'links' && (
          <div className="tab-pane links-pane">
            <div className="pane-header-actions">
              <span className="pane-hint">Attach web hyperlinks</span>
              {!isReadOnly && (
                <button className="btn btn-secondary btn-xs" onClick={handleAddLink}>
                  + Add Link
                </button>
              )}
            </div>

            <div className="links-list">
              {links.length === 0 ? (
                <div className="empty-tab-state">
                  <p>No web links added yet.</p>
                </div>
              ) : (
                links.map((link, index) => (
                  <div key={index} className="link-item-card">
                    <input
                      type="text"
                      placeholder="Link Label (e.g. API Docs)"
                      className="link-input label-input"
                      value={link.label}
                      onChange={(e) => handleLinkChange(index, 'label', e.target.value)}
                      disabled={isReadOnly}
                    />
                    <div className="link-row">
                      <input
                        type="url"
                        placeholder="https://example.com"
                        className="link-input url-input"
                        value={link.url}
                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                        disabled={isReadOnly}
                      />
                      {!isReadOnly && (
                        <button className="btn-icon btn-danger-icon" onClick={() => handleRemoveLink(index)}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {link.url && (
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="link-test-btn"
                      >
                        Test Link ↗
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CODE TAB */}
        {activeTab === 'code' && (
          <div className="tab-pane code-pane">
            <div className="pane-header-actions">
              <span className="pane-hint">Attach code snippets</span>
              {!isReadOnly && (
                <select 
                  className="language-dropdown"
                  value={codeLanguage} 
                  onChange={(e) => setCodeLanguage(e.target.value)}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              )}
            </div>

            {!isReadOnly ? (
              <textarea
                className="code-textarea"
                placeholder="Paste or write your code snippet here..."
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
              />
            ) : (
              !codeSnippet && (
                <div className="empty-tab-state">
                  <p>No code snippet attached yet.</p>
                </div>
              )
            )}

            {codeSnippet && (
              <div className="code-highlight-preview">
                <span className="preview-label">Highlighted Preview:</span>
                <pre className="code-snippet-box">
                  <code dangerouslySetInnerHTML={{ __html: highlightCode(codeSnippet, codeLanguage) }} />
                </pre>
              </div>
            )}
          </div>
        )}

        {/* FILES TAB */}
        {activeTab === 'files' && (
          <div className="tab-pane files-pane">
            {!isReadOnly && (
              <div 
                className={`file-dropzone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload-input"
                  className="hidden-file-input"
                  onChange={handleFileChange}
                />
                <label htmlFor="file-upload-input" className="file-dropzone-label">
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span>Drag & drop files or click to upload</span>
                  <span className="file-size-limit">Supported text, image, PDF, up to 10MB</span>
                </label>
              </div>
            )}

            <div className="attachments-list">
              <h4 className="attachments-title">Attachments ({files.length})</h4>
              {files.length === 0 ? (
                <p className="no-attachments">No files attached yet.</p>
              ) : (
                files.map((file) => (
                  <div key={file._id} className="attachment-item-card">
                    <div className="attachment-info">
                      <span className="file-icon">
                        {file.mimetype?.includes('image') ? '🖼️' : file.mimetype?.includes('pdf') ? '📄' : '📁'}
                      </span>
                      <div className="file-meta">
                        <span className="file-name" title={file.name}>{file.name}</span>
                        <a 
                          href={`${API_BASE_URL}${file.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="file-download-link"
                          download={file.name}
                        >
                          Download file
                        </a>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <button 
                        className="btn-icon btn-danger-icon"
                        onClick={() => handleRemoveFile(file._id)}
                        title="Delete file"
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {!isReadOnly && (
        <div className="context-panel-footer">
          <button 
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving Context...' : 'Save Context'}
          </button>
        </div>
      )}
    </div>
  )
}
