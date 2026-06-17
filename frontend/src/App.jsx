import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import Topbar from './components/Topbar'
import Toolbar from './components/Toolbar'
import PropertiesPanel from './components/PropertiesPanel'
import CanvasControls from './components/CanvasControls'
import PageStrip from './components/PageStrip'
import ExportModal from './components/ExportModal'
import ContextPanel from './components/ContextPanel'
import AssistPanel from './components/AssistPanel'
import './fabric-eraser'
import {
  isPointInPolygon,
  getPathSelectionMode,
  splitPathWithLasso,
} from './pathLassoSplit'

export default function App() {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const socketRef = useRef(null)

  // Screen and Authentication state
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const boardId = params.get('board')
    if (boardId) {
      return 'editor'
    }
    const token = localStorage.getItem('wb_token')
    return token ? 'dashboard' : 'landing'
  })
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [whiteboardsList, setWhiteboardsList] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [boardMeta, setBoardMeta] = useState({ owner: null, collaborators: [], isPublic: false })

  // State variables
  const [title, setTitle] = useState('My Whiteboard')
  const [savedId, setSavedId] = useState(null)
  const [activeTool, setActiveTool] = useState('square-select') // square-select, circle-select, lasso-select, pan, draw, rect, circle, diamond, text, arrow
  const [drawType, setDrawType] = useState('pencil') // pencil, pen, highlighter, eraser
  const [drawSizes, setDrawSizes] = useState({
    pencil: 2,
    pen: 6,
    highlighter: 20,
    eraser: 20,
  })
  const [selectedObject, setSelectedObject] = useState(null)
  const [properties, setProperties] = useState({
    stroke: '#1E3A5F',
    fill: '#FFFFFF',
    strokeWidth: 2,
    opacity: 1
  })
  const [zoom, setZoom] = useState(1.0)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [contextMap, setContextMap] = useState({})
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false)
  const [isAssistPanelOpen, setIsAssistPanelOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [isCleanupLoading, setIsCleanupLoading] = useState(false)
  const [isAssistLoading, setIsAssistLoading] = useState(false)
  const clipboardRef = useRef(null)
  const isCreatingShapeRef = useRef(false)
  const tempCreationShapeRef = useRef(null)

  // --- Canvas Management & Clipboard ---
  const handleClearPage = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (!window.confirm('Are you sure you want to clear this entire page? This can be undone.')) return

    // Keep page boundary if it exists
    const objects = canvas.getObjects()
    objects.forEach(obj => {
      if (obj.id !== 'page-boundary') {
        canvas.remove(obj)
      }
    })

    canvas.requestRenderAll()
    saveHistory()
    sendCanvasUpdate()
  }

  const handleCopy = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObj = canvas.getActiveObject()
    if (!activeObj) return

    activeObj.clone((cloned) => {
      clipboardRef.current = cloned
    }, ['id', 'isLocked']) // include custom properties
  }

  const handleCut = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObj = canvas.getActiveObject()
    if (!activeObj) return

    activeObj.clone((cloned) => {
      clipboardRef.current = cloned
      // Remove original objects
      if (activeObj.type === 'activeSelection') {
        activeObj.forEachObject((obj) => {
          canvas.remove(obj)
        })
      } else {
        canvas.remove(activeObj)
      }
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      saveHistory()
      sendCanvasUpdate()
    }, ['id', 'isLocked'])
  }

  const handlePaste = () => {
    const canvas = fabricRef.current
    if (!canvas || !clipboardRef.current) return

    clipboardRef.current.clone((clonedObj) => {
      canvas.discardActiveObject()
      
      // Offset pasted items so they don't land exactly on top
      clonedObj.set({
        left: clonedObj.left + 20,
        top: clonedObj.top + 20,
        evented: true,
      })

      if (clonedObj.type === 'activeSelection') {
        // activeSelection needs to be added to canvas item by item
        clonedObj.canvas = canvas
        clonedObj.forEachObject((obj) => {
          const newId = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)
          obj.set('id', newId)
          canvas.add(obj)
        })
        clonedObj.setCoords()
      } else {
        const newId = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)
        clonedObj.set('id', newId)
        canvas.add(clonedObj)
      }

      // Update clipboard for next paste (cumulative offset)
      clipboardRef.current.top += 20
      clipboardRef.current.left += 20

      canvas.setActiveObject(clonedObj)
      canvas.requestRenderAll()
      saveHistory()
      sendCanvasUpdate()
    }, ['id', 'isLocked'])
  }

  // Real-time Collaboration States
  const [roomUsers, setRoomUsers] = useState([])
  const [remoteCursors, setRemoteCursors] = useState({})
  const [user, setUser] = useState(() => {
    const avatarColors = ['#1E3A5F', '#2E86AB', '#10B981', '#F59E0B', '#EF4444']
    const savedName = localStorage.getItem('wb_username')
    const savedColor = localStorage.getItem('wb_usercolor') || avatarColors[Math.floor(Math.random() * avatarColors.length)]

    if (savedName) {
      return { name: savedName, color: savedColor }
    }

    const ADJECTIVES = ['Creative', 'Sleek', 'Agile', 'Smart', 'Logical', 'Dynamic', 'Robust']
    const NOUNS = ['Architect', 'Coder', 'Developer', 'Designer', 'Engineer', 'Guru', 'Builder']
    const name = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`

    localStorage.setItem('wb_username', name)
    localStorage.setItem('wb_usercolor', savedColor)
    return { name, color: savedColor }
  })

  // Multi-page and Export States
  const [pages, setPages] = useState([
    {
      page_id: 'page-1',
      title: 'Page 1',
      order: 0,
      canvas_state: { objects: [] },
      thumbnail: null
    }
  ])
  const [activePageId, setActivePageId] = useState('page-1')
  const [pageMode, setPageMode] = useState('infinite') // infinite, fixed
  const [pageSize, setPageSize] = useState({ w: 1024, h: 576 }) // default 16:9 Presentation Slide size
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Refs for callbacks & listeners to avoid stale states
  const activeToolRef = useRef(activeTool)
  const snapToGridRef = useRef(snapToGrid)
  const propertiesRef = useRef(properties)
  const savedIdRef = useRef(savedId)
  const applyingRemoteRef = useRef(false)
  const interactingRef = useRef(false)
  const pendingRemoteJsonRef = useRef(null)

  const activePageIdRef = useRef(activePageId)
  const pagesRef = useRef(pages)
  const pageModeRef = useRef(pageMode)
  const pageSizeRef = useRef(pageSize)

  // Undo / Redo History Stack Refs
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Refs for custom selection drawing
  const isDrawingSelectionRef = useRef(false)
  const selectionPointsRef = useRef([])
  const tempSelectionShapeRef = useRef(null)
  const selectionStartRef = useRef({ x: 0, y: 0 })
  const lassoClickTargetRef = useRef(null)
  const drawTypeRef = useRef(drawType)
  const drawSizesRef = useRef(drawSizes)
  const zoomRef = useRef(zoom)
  const eraserCursorElRef = useRef(null)

  // Keep refs in sync with React state
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { drawTypeRef.current = drawType }, [drawType])
  useEffect(() => { drawSizesRef.current = drawSizes }, [drawSizes])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { snapToGridRef.current = snapToGrid }, [snapToGrid])
  useEffect(() => { propertiesRef.current = properties }, [properties])
  useEffect(() => { savedIdRef.current = savedId }, [savedId])

  useEffect(() => { activePageIdRef.current = activePageId }, [activePageId])
  useEffect(() => { pagesRef.current = pages }, [pages])
  useEffect(() => { pageModeRef.current = pageMode }, [pageMode])
  useEffect(() => { pageSizeRef.current = pageSize }, [pageSize])

  // Derived read-only permission check
  const isReadOnly = savedId ? (
    boardMeta.owner !== user.id &&
    !boardMeta.collaborators.includes(user.id)
  ) : false
  const isReadOnlyRef = useRef(isReadOnly)
  useEffect(() => { isReadOnlyRef.current = isReadOnly }, [isReadOnly])

  // Auto-login verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('wb_token')
    if (token) {
      fetch('http://localhost:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) {
            localStorage.removeItem('wb_token')
            setScreen('landing')
            return
          }
          return res.json()
        })
        .then(data => {
          if (data) {
            setUser(data)
          }
        })
        .catch(err => console.error('Auto-login error:', err))
    }
  }, [])

  // Lock canvas shapes if read-only view (tool effect restores interactivity when editable)
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !isReadOnly) return

    canvas.forEachObject((obj) => {
      if (obj.id !== 'page-boundary') {
        obj.selectable = false
        obj.evented = false
      }
    })
    canvas.discardActiveObject()
    canvas.selection = false
    canvas.defaultCursor = 'default'
    canvas.requestRenderAll()
  }, [isReadOnly])

  // Load whiteboards when screen is dashboard
  useEffect(() => {
    if (screen === 'dashboard') {
      fetchWhiteboards()
    }
  }, [screen])

  // Handle initial direct URL load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const boardId = params.get('board')
    if (boardId) {
      loadBoardById(boardId)
    }
  }, [])

  // Clean up remote cursors for users who left the room
  useEffect(() => {
    const userIds = new Set(roomUsers.map((u) => u.id))
    setRemoteCursors((prev) => {
      const next = { ...prev }
      let changed = false
      for (const id in next) {
        if (!userIds.has(id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [roomUsers])

  // Reset canvas drawing contexts after eraser use (EraserBrush leaves destination-out on main ctx)
  const resetDrawingContexts = (canvas) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.globalCompositeOperation = 'source-over'
    if (canvas.contextTop) canvas.clearContext(canvas.contextTop)
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush._isErasing = false
    }
  }

  const updateEraserCursor = (canvas, e) => {
    const el = eraserCursorElRef.current
    if (!el || !canvas) return

    if (activeToolRef.current !== 'draw' || drawTypeRef.current !== 'eraser') {
      el.style.display = 'none'
      return
    }

    const F = window.fabric
    if (!F || !e) {
      el.style.display = 'none'
      return
    }

    const pointer = canvas.getPointer(e)
    const screenPt = F.util.transformPoint(
      new F.Point(pointer.x, pointer.y),
      canvas.viewportTransform
    )
    const size = drawSizesRef.current.eraser * zoomRef.current

    el.style.display = 'block'
    el.style.left = `${screenPt.x}px`
    el.style.top = `${screenPt.y}px`
    el.style.width = `${size}px`
    el.style.height = `${size}px`
  }

  const hideEraserCursor = () => {
    if (eraserCursorElRef.current) {
      eraserCursorElRef.current.style.display = 'none'
    }
  }

  const handleChangeDrawSize = (type, size) => {
    setDrawSizes((prev) => ({
      ...prev,
      [type]: Math.min(60, Math.max(type === 'eraser' ? 5 : 1, size)),
    }))
  }

  const getCanvasJson = () => {
    if (!fabricRef.current) return { objects: [] }
    const json = fabricRef.current.toJSON(['selectable', 'id', 'globalCompositeOperation', 'erasable', 'eraser', 'customType'])
    if (json && json.objects) {
      json.objects = json.objects.filter(obj => obj.id !== 'page-boundary')
    }
    return json
  }

  // Helper: Draw page boundaries for Fixed Page Mode
  const renderPageBoundary = (canvas, mode, size) => {
    if (!canvas) return
    const existing = canvas.getObjects().find(o => o.id === 'page-boundary')
    if (existing) canvas.remove(existing)

    if (mode === 'fixed') {
      const F = window.fabric
      const boundary = new F.Rect({
        id: 'page-boundary',
        left: canvas.getWidth() / 2 - size.w / 2,
        top: canvas.getHeight() / 2 - size.h / 2,
        width: size.w,
        height: size.h,
        fill: '#FFFFFF',
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        erasable: false,
        shadow: new F.Shadow({
          color: 'rgba(0, 0, 0, 0.1)',
          blur: 15,
          offsetX: 0,
          offsetY: 4
        })
      })
      canvas.insertAt(boundary, 0)
    }
  }

  // Page Operations
  const switchPage = (targetPageId) => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    // Save current canvas snapshot and state
    const currentJson = getCanvasJson()
    const currentThumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.1, multiplier: 0.1 })

    const updatedPages = pagesRef.current.map(p =>
      p.page_id === activePageIdRef.current
        ? { ...p, canvas_state: currentJson, thumbnail: currentThumbnail }
        : p
    )

    const targetPage = updatedPages.find(p => p.page_id === targetPageId)
    if (!targetPage) return

    setPages(updatedPages)
    setActivePageId(targetPageId)

    // Load target canvas JSON
    applyingRemoteRef.current = true
    canvas.discardActiveObject()
    canvas.loadFromJSON(targetPage.canvas_state, () => {
      canvas.getObjects().forEach((obj) => obj.setCoords())
      renderPageBoundary(canvas, pageModeRef.current, pageSizeRef.current)
      canvas.requestRenderAll()
      applyingRemoteRef.current = false

      // Reset history reference stack
      historyRef.current = [targetPage.canvas_state]
      historyIndexRef.current = 0
      setCanUndo(false)
      setCanRedo(false)
    })

    // Broadcast page switch to other clients
    if (socketRef.current) {
      socketRef.current.emit('page-switch', { roomId: savedIdRef.current || 'global', pageId: targetPageId })
    }
  }

  const addPage = () => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    // Save current page state and snapshot
    const currentJson = getCanvasJson()
    const currentThumbnail = canvas.toDataURL({ format: 'jpeg', quality: 0.1, multiplier: 0.1 })

    const updatedPages = pagesRef.current.map(p =>
      p.page_id === activePageIdRef.current
        ? { ...p, canvas_state: currentJson, thumbnail: currentThumbnail }
        : p
    )

    const newPageId = 'page-' + Date.now()
    const newPage = {
      page_id: newPageId,
      title: `Page ${updatedPages.length + 1}`,
      order: updatedPages.length,
      canvas_state: { objects: [] },
      thumbnail: null
    }

    const nextPages = [...updatedPages, newPage]
    setPages(nextPages)
    setActivePageId(newPageId)

    applyingRemoteRef.current = true
    canvas.discardActiveObject()
    canvas.clear()

    renderPageBoundary(canvas, pageModeRef.current, pageSizeRef.current)
    canvas.requestRenderAll()
    applyingRemoteRef.current = false

    historyRef.current = [{ objects: [] }]
    historyIndexRef.current = 0
    setCanUndo(false)
    setCanRedo(false)

    // Notify other users
    sendStructureUpdate(nextPages)
    sendCanvasUpdate()
  }

  const deletePage = (targetPageId) => {
    if (pagesRef.current.length <= 1) {
      alert('A whiteboard must contain at least one page!')
      return
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this page?')
    if (!confirmDelete) return

    const updatedPages = pagesRef.current.filter(p => p.page_id !== targetPageId)

    if (activePageIdRef.current === targetPageId) {
      const remainingPage = updatedPages[0]
      setActivePageId(remainingPage.page_id)

      applyingRemoteRef.current = true
      const canvas = fabricRef.current
      canvas.discardActiveObject()
      canvas.loadFromJSON(remainingPage.canvas_state, () => {
        canvas.getObjects().forEach((obj) => obj.setCoords())
        renderPageBoundary(canvas, pageModeRef.current, pageSizeRef.current)
        canvas.requestRenderAll()
        applyingRemoteRef.current = false

        historyRef.current = [remainingPage.canvas_state]
        historyIndexRef.current = 0
        setCanUndo(false)
        setCanRedo(false)
      })
    }

    setPages(updatedPages)
    sendStructureUpdate(updatedPages)
    sendCanvasUpdate()
  }

  const duplicatePage = (targetPageId) => {
    const target = pagesRef.current.find(p => p.page_id === targetPageId)
    if (!target) return

    let canvasState = target.canvas_state
    if (activePageIdRef.current === targetPageId && fabricRef.current) {
      canvasState = getCanvasJson()
    }

    const newPageId = 'page-' + Date.now()
    const newPage = {
      page_id: newPageId,
      title: `${target.title} (Copy)`,
      order: pagesRef.current.length,
      canvas_state: JSON.parse(JSON.stringify(canvasState)),
      thumbnail: target.thumbnail
    }

    const targetIndex = pagesRef.current.findIndex(p => p.page_id === targetPageId)
    const nextPages = [...pagesRef.current]
    nextPages.splice(targetIndex + 1, 0, newPage)

    const orderedPages = nextPages.map((p, idx) => ({ ...p, order: idx }))
    setPages(orderedPages)
    setActivePageId(newPageId)

    applyingRemoteRef.current = true
    const canvas = fabricRef.current
    canvas.discardActiveObject()
    canvas.loadFromJSON(newPage.canvas_state, () => {
      canvas.getObjects().forEach((obj) => obj.setCoords())
      renderPageBoundary(canvas, pageModeRef.current, pageSizeRef.current)
      canvas.requestRenderAll()
      applyingRemoteRef.current = false

      historyRef.current = [newPage.canvas_state]
      historyIndexRef.current = 0
      setCanUndo(false)
      setCanRedo(false)
    })

    sendStructureUpdate(orderedPages)
    sendCanvasUpdate()
  }

  const renamePage = (targetPageId, newTitle) => {
    if (!newTitle || !newTitle.trim()) return
    const updatedPages = pagesRef.current.map(p =>
      p.page_id === targetPageId
        ? { ...p, title: newTitle.trim() }
        : p
    )
    setPages(updatedPages)
    sendStructureUpdate(updatedPages)
  }

  const reorderPage = (pageId, targetIndexOrDirection) => {
    const fromIndex = pagesRef.current.findIndex(p => p.page_id === pageId)
    if (fromIndex === -1) return

    const newPages = [...pagesRef.current]
    const item = newPages.splice(fromIndex, 1)[0]

    if (typeof targetIndexOrDirection === 'number') {
      newPages.splice(targetIndexOrDirection, 0, item)
    } else {
      // Legacy direction support (up/down)
      const targetIndex = targetIndexOrDirection === 'up' ? fromIndex - 1 : fromIndex + 1
      if (targetIndex < 0 || targetIndex >= pagesRef.current.length) return
      newPages.splice(targetIndex, 0, item)
    }

    const orderedPages = newPages.map((p, idx) => ({ ...p, order: idx }))
    setPages(orderedPages)
    sendStructureUpdate(orderedPages)
  }

  const sharePage = (pageId) => {
    const page = pagesRef.current.find(p => p.page_id === pageId)
    if (!page) return

    // Create a shareable payload for just this page
    const sharePayload = {
      type: 'vwp_page_share',
      version: '1.0',
      timestamp: Date.now(),
      board_title: title,
      page: {
        title: page.title,
        canvas_state: page.page_id === activePageIdRef.current ? getCanvasJson() : page.canvas_state
      }
    }

    const jsonStr = JSON.stringify(sharePayload, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}-${page.title}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    alert(`Page "${page.title}" exported as JSON for sharing.`)
  }

  const sendStructureUpdate = (updatedPages = pagesRef.current) => {
    if (!socketRef.current) return
    socketRef.current.emit('board:structure-update', {
      roomId: savedIdRef.current || 'global',
      pages: updatedPages,
      mode: pageModeRef.current,
      pageSize: pageSizeRef.current
    })
  }

  const handleRenameUser = () => {
    const newName = prompt('Enter your name:', user.name)
    if (newName && newName.trim()) {
      const updatedUser = { ...user, name: newName.trim() }
      setUser(updatedUser)
      localStorage.setItem('wb_username', updatedUser.name)
      if (socketRef.current) {
        socketRef.current.emit('join', { roomId: savedId || 'global', user: updatedUser })
      }
    }
  }

  const fetchWhiteboards = async () => {
    try {
      const token = localStorage.getItem('wb_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('http://localhost:4000/api/whiteboards', { headers })
      if (!res.ok) throw new Error('Failed to fetch whiteboards')
      const data = await res.json()
      setWhiteboardsList(data)
    } catch (err) {
      console.error(err)
    }
  }

  const deleteBoard = async (id) => {
    if (!window.confirm('Are you sure you want to delete this whiteboard?')) return
    try {
      const token = localStorage.getItem('wb_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`http://localhost:4000/api/whiteboards/${id}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to delete whiteboard')
      }
      fetchWhiteboards()
    } catch (err) {
      alert(err.message)
    }
  }

  const shareBoard = async (id, isPublicToggle, email) => {
    try {
      const token = localStorage.getItem('wb_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const body = {}
      if (email) body.email = email

      const res = await fetch(`http://localhost:4000/api/whiteboards/${id}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to share whiteboard')
      }
      const data = await res.json()
      if (email) {
        alert(`Collaborator ${email} added successfully!`)
      } else {
        alert(`Board visibility updated. Public: ${data.isPublic}`)
      }
      fetchWhiteboards()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'registration_failed')
      }
      localStorage.setItem('wb_token', data.token)
      setUser(data.user)
      setScreen('dashboard')
    } catch (err) {
      console.error(err)
      setAuthError(err.message === 'email_already_registered' ? 'Email is already registered' : 'Registration failed. Try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password
        })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'login_failed')
      }
      localStorage.setItem('wb_token', data.token)
      setUser(data.user)
      setScreen('dashboard')
    } catch (err) {
      console.error(err)
      setAuthError(err.message === 'invalid_credentials' ? 'Invalid email or password' : 'Login failed. Try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('wb_token')
    setUser({ name: 'Guest Collaborator', color: '#6B7280' })
    setScreen('landing')
  }

  const handleCreateBoard = async () => {
    let boardTitle = prompt('Enter a title for the new whiteboard:', 'My Design Board')
    if (boardTitle === null && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      boardTitle = 'Test Drawing Board'
    }
    if (!boardTitle || !boardTitle.trim()) return

    const token = localStorage.getItem('wb_token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const initialPages = [
      {
        page_id: 'page-1',
        title: 'Page 1',
        order: 0,
        canvas_state: { objects: [] },
        thumbnail: null
      }
    ]

    const payload = {
      title: boardTitle.trim(),
      mode: 'infinite',
      pageSize: { w: 1024, h: 576 },
      pages: initialPages
    }

    try {
      const res = await fetch('http://localhost:4000/api/whiteboards', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to create board')
      const data = await res.json()

      setSavedId(data.id)
      setTitle(boardTitle.trim())
      setPages(initialPages)
      setActivePageId('page-1')
      setPageMode('infinite')
      setBoardMeta({
        owner: user.id || user._id || null,
        collaborators: [],
        isPublic: false
      })

      const newUrl = `${window.location.origin}${window.location.pathname}?board=${data.id}`
      window.history.pushState({ path: newUrl }, '', newUrl)

      setScreen('editor')
    } catch (err) {
      console.error(err)
      alert('Failed to create board: ' + err.message)
    }
  }

  const handleOpenBoard = (boardId) => {
    loadBoardById(boardId)
    setScreen('editor')
  }

  const handleExitEditor = () => {
    if (fabricRef.current) {
      fabricRef.current.discardActiveObject()
      fabricRef.current.clear()
    }
    const newUrl = `${window.location.origin}${window.location.pathname}`
    window.history.pushState({ path: newUrl }, '', newUrl)

    setSavedId(null)
    setTitle('My Whiteboard')
    setPages([
      {
        page_id: 'page-1',
        title: 'Page 1',
        order: 0,
        canvas_state: { objects: [] },
        thumbnail: null
      }
    ])
    setActivePageId('page-1')
    setScreen(localStorage.getItem('wb_token') ? 'dashboard' : 'landing')
  }

  // Simple debounce helper
  function debounce(fn, wait) {
    let t
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...args), wait)
    }
  }

  // Simple throttle helper
  function throttle(fn, limit) {
    let inThrottle
    return (...args) => {
      if (!inThrottle) {
        fn(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  // Ref for throttled mouse position cursor broadcast
  const broadcastCursorRef = useRef(
    throttle((x, y) => {
      if (socketRef.current) {
        const room = savedIdRef.current || 'global'
        socketRef.current.emit('cursor:move', {
          roomId: room,
          pageId: activePageIdRef.current,
          x,
          y
        })
      }
    }, 50)
  )

  // Push canvas state to Undo History
  const saveHistory = () => {
    if (!fabricRef.current || applyingRemoteRef.current) return
    try {
      const json = getCanvasJson()

      // Truncate redo stack if we were in middle of history
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
      newHistory.push(json)

      // Limit history stack size to conserve memory
      if (newHistory.length > 50) {
        newHistory.shift()
      }

      historyRef.current = newHistory
      historyIndexRef.current = newHistory.length - 1

      setCanUndo(historyIndexRef.current > 0)
      setCanRedo(false)
    } catch (e) {
      console.error('Failed to save history state', e)
    }
  }

  const undo = () => {
    if (historyIndexRef.current > 0 && fabricRef.current) {
      historyIndexRef.current -= 1
      const state = historyRef.current[historyIndexRef.current]
      applyingRemoteRef.current = true

      fabricRef.current.discardActiveObject()
      fabricRef.current.loadFromJSON(state, () => {
        fabricRef.current.getObjects().forEach((obj) => obj.setCoords())
        fabricRef.current.requestRenderAll()
        applyingRemoteRef.current = false
        setCanUndo(historyIndexRef.current > 0)
        setCanRedo(true)
        sendCanvasUpdate()
      })
    }
  }

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1 && fabricRef.current) {
      historyIndexRef.current += 1
      const state = historyRef.current[historyIndexRef.current]
      applyingRemoteRef.current = true

      fabricRef.current.discardActiveObject()
      fabricRef.current.loadFromJSON(state, () => {
        fabricRef.current.getObjects().forEach((obj) => obj.setCoords())
        fabricRef.current.requestRenderAll()
        applyingRemoteRef.current = false
        setCanUndo(true)
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
        sendCanvasUpdate()
      })
    }
  }

  // Apply remote updates via websocket
  function applyRemoteCanvas(json) {
    if (!fabricRef.current) return
    if (interactingRef.current) {
      pendingRemoteJsonRef.current = json
      return
    }

    applyingRemoteRef.current = true
    const canvas = fabricRef.current
    canvas.discardActiveObject()
    canvas.loadFromJSON(json, () => {
      canvas.getObjects().forEach((obj) => obj.setCoords())
      canvas.calcOffset()
      canvas.requestRenderAll()
      applyingRemoteRef.current = false

      // Update history reference silently to match remote sync
      historyRef.current = [json]
      historyIndexRef.current = 0
      setCanUndo(false)
      setCanRedo(false)
    })
  }

  function flushPendingRemoteCanvas() {
    if (!pendingRemoteJsonRef.current || !fabricRef.current) return
    const json = pendingRemoteJsonRef.current
    pendingRemoteJsonRef.current = null
    applyRemoteCanvas(json)
  }

  // Manage selection & properties state when items are selected
  function updateInspectorProperties(target) {
    if (!target) {
      setSelectedObject(null)
      setIsContextPanelOpen(false)
      return
    }
    if (target.id === 'page-boundary') {
      setSelectedObject(null)
      setIsContextPanelOpen(false)
      return
    }
    if (!target.id) {
      target.id = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)
    }
    setSelectedObject(target)
    setProperties({
      stroke: target.stroke || '#1E3A5F',
      fill: target.fill || '#FFFFFF',
      strokeWidth: target.strokeWidth || 2,
      opacity: target.opacity || 1
    })
  }

  function attachFabricListeners(canvas) {
    const onMouseDown = (opt) => {
      const activeTool = activeToolRef.current
      const selectionTools = ['lasso-select', 'square-select', 'circle-select']
      
      // Panning logic on drag
      if (activeTool === 'pan') {
        canvas.isDragging = true
        canvas.selection = false
        canvas.lastPosX = opt.e.clientX
        canvas.lastPosY = opt.e.clientY
        return
      }
      
      interactingRef.current = true

      // Custom selection tool drawing logic
      if (selectionTools.includes(activeTool) && !isReadOnlyRef.current) {
        const target = canvas.findTarget(opt.e)

        // Square/circle: click an object to select it directly
        if (activeTool !== 'lasso-select' && target && target.id !== 'page-boundary') {
          canvas.setActiveObject(target)
          updateInspectorProperties(target)
          canvas.requestRenderAll()
          return
        }

        const pointer = canvas.getPointer(opt.e)
        isDrawingSelectionRef.current = true
        selectionStartRef.current = { x: pointer.x, y: pointer.y }
        selectionPointsRef.current = [{ x: pointer.x, y: pointer.y }]
        lassoClickTargetRef.current =
          activeTool === 'lasso-select' && target && target.id !== 'page-boundary'
            ? target
            : null
        
        const F = window.fabric
        
        if (tempSelectionShapeRef.current) {
          canvas.remove(tempSelectionShapeRef.current)
          tempSelectionShapeRef.current = null
        }
        
        if (activeTool === 'square-select') {
          tempSelectionShapeRef.current = new F.Rect({
            id: 'temp-selection-shape',
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: 'rgba(46, 134, 171, 0.15)',
            stroke: '#2E86AB',
            strokeWidth: 1.5,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false
          })
          canvas.add(tempSelectionShapeRef.current)
        } else if (activeTool === 'circle-select') {
          tempSelectionShapeRef.current = new F.Circle({
            id: 'temp-selection-shape',
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: 'rgba(46, 134, 171, 0.15)',
            stroke: '#2E86AB',
            strokeWidth: 1.5,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false
          })
          canvas.add(tempSelectionShapeRef.current)
        } else if (activeTool === 'lasso-select') {
          tempSelectionShapeRef.current = new F.Polyline(selectionPointsRef.current, {
            id: 'temp-selection-shape',
            fill: 'rgba(46, 134, 171, 0.15)',
            stroke: '#2E86AB',
            strokeWidth: 1.5,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false
          })
          canvas.add(tempSelectionShapeRef.current)
        }
        canvas.requestRenderAll()
      } else if (['rect', 'circle', 'diamond', 'arrow', 'line'].includes(activeTool) && !isReadOnlyRef.current) {
        const pointer = canvas.getPointer(opt.e)
        selectionStartRef.current = { x: pointer.x, y: pointer.y }
        isCreatingShapeRef.current = true

        const F = window.fabric
        const stroke = propertiesRef.current.stroke
        const strokeWidth = propertiesRef.current.strokeWidth
        const fill = propertiesRef.current.fill

        if (activeTool === 'rect') {
          tempCreationShapeRef.current = new F.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 1,
            height: 1,
            fill: 'rgba(46, 134, 171, 0.1)',
            stroke: stroke,
            strokeWidth: strokeWidth,
            strokeDashArray: [5, 5],
            strokeUniform: true,
            selectable: false,
            evented: false
          })
        } else if (activeTool === 'circle') {
          tempCreationShapeRef.current = new F.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 1,
            fill: 'rgba(46, 134, 171, 0.1)',
            stroke: stroke,
            strokeWidth: strokeWidth,
            strokeDashArray: [5, 5],
            strokeUniform: true,
            selectable: false,
            evented: false
          })
        } else if (activeTool === 'diamond') {
          // Initialize a standard 100x100 diamond. We will scale it during mousemove.
          tempCreationShapeRef.current = new F.Polygon([
            { x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }
          ], {
            left: pointer.x,
            top: pointer.y,
            fill: 'rgba(46, 134, 171, 0.1)',
            stroke: stroke,
            strokeWidth: strokeWidth,
            strokeDashArray: [5, 5],
            strokeUniform: true,
            selectable: false,
            evented: false,
            scaleX: 0.01, // Start tiny
            scaleY: 0.01
          })
        } else if (activeTool === 'arrow' || activeTool === 'line') {
          tempCreationShapeRef.current = new F.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: stroke,
            strokeWidth: strokeWidth,
            selectable: false,
            evented: false,
            strokeLineCap: 'round',
            strokeDashArray: [5, 5]
          })
        }


        if (tempCreationShapeRef.current) {
          canvas.add(tempCreationShapeRef.current)
        }
        canvas.requestRenderAll()
      }
    }

    const onMouseMove = (opt) => {
      const activeTool = activeToolRef.current
      
      if (canvas.isDragging && activeTool === 'pan') {
        const e = opt.e
        const vpt = canvas.viewportTransform
        vpt[4] += e.clientX - canvas.lastPosX
        vpt[5] += e.clientY - canvas.lastPosY
        canvas.requestRenderAll()
        canvas.lastPosX = e.clientX
        canvas.lastPosY = e.clientY
        return
      }

      if (opt.e) {
        const pointer = canvas.getPointer(opt.e)
        broadcastCursorRef.current(pointer.x, pointer.y)
        updateEraserCursor(canvas, opt.e)
        
        // Update selection shape dimensions as cursor moves
        if (isDrawingSelectionRef.current && tempSelectionShapeRef.current) {
          const startX = selectionStartRef.current.x
          const startY = selectionStartRef.current.y
          
          if (activeTool === 'square-select') {
            const left = Math.min(startX, pointer.x)
            const top = Math.min(startY, pointer.y)
            const width = Math.abs(startX - pointer.x)
            const height = Math.abs(startY - pointer.y)
            tempSelectionShapeRef.current.set({ left, top, width, height })
          } else if (activeTool === 'circle-select') {
            const dx = pointer.x - startX
            const dy = pointer.y - startY
            const radius = Math.sqrt(dx * dx + dy * dy)
            tempSelectionShapeRef.current.set({
              left: startX - radius,
              top: startY - radius,
              radius: radius
            })
          } else if (activeTool === 'lasso-select') {
            selectionPointsRef.current.push({ x: pointer.x, y: pointer.y })
            canvas.remove(tempSelectionShapeRef.current)
            const F = window.fabric
            tempSelectionShapeRef.current = new F.Polyline(selectionPointsRef.current, {
              id: 'temp-selection-shape',
              fill: 'rgba(46, 134, 171, 0.15)',
              stroke: '#2E86AB',
              strokeWidth: 1.5,
              strokeDashArray: [5, 5],
              selectable: false,
              evented: false
            })
            canvas.add(tempSelectionShapeRef.current)
          }
          canvas.requestRenderAll()
        }

        // Update creation shape dimensions
        if (isCreatingShapeRef.current && tempCreationShapeRef.current) {
          const startX = selectionStartRef.current.x
          const startY = selectionStartRef.current.y

          if (activeTool === 'rect') {
            const left = Math.min(startX, pointer.x)
            const top = Math.min(startY, pointer.y)
            const width = Math.abs(startX - pointer.x)
            const height = Math.abs(startY - pointer.y)
            tempCreationShapeRef.current.set({ left, top, width, height })
          } else if (activeTool === 'circle') {
            const dx = pointer.x - startX
            const dy = pointer.y - startY
            const radius = Math.sqrt(dx * dx + dy * dy)
            tempCreationShapeRef.current.set({
              left: startX - radius,
              top: startY - radius,
              radius: radius
            })
          } else if (activeTool === 'diamond') {
            const left = Math.min(startX, pointer.x)
            const top = Math.min(startY, pointer.y)
            const width = Math.abs(startX - pointer.x)
            const height = Math.abs(startY - pointer.y)

            // For Polygons in FabricJS, resetting points doesn't automatically recalculate width/height/pathOffset properly during a live render.
            // We use standard scaling of a base shape instead of changing points dynamically.
            if (width > 0 && height > 0) {
              tempCreationShapeRef.current.set({
                left,
                top,
                scaleX: width / 100, // scale relative to 100x100 base shape
                scaleY: height / 100
              })
            }
          } else if (activeTool === 'arrow' || activeTool === 'line') {
            tempCreationShapeRef.current.set({
              x2: pointer.x,
              y2: pointer.y
            })
          }
          canvas.requestRenderAll()
        }
      }
    }

    const onMouseUp = (opt) => {
      canvas.isDragging = false
      interactingRef.current = false
      flushPendingRemoteCanvas()
      
      const pointer = canvas.getPointer(opt.e)
      const startX = selectionStartRef.current.x
      const startY = selectionStartRef.current.y

      // Finalize Shape Creation
      if (isCreatingShapeRef.current) {
        isCreatingShapeRef.current = false
        const activeTool = activeToolRef.current
        const F = window.fabric
        
        if (tempCreationShapeRef.current) {
          canvas.remove(tempCreationShapeRef.current)
        }

        const width = Math.abs(startX - pointer.x)
        const height = Math.abs(startY - pointer.y)

        // Ignore tiny clicks (min 5px)
        if (width < 5 && height < 5 && activeTool !== 'arrow' && activeTool !== 'line') {
          tempCreationShapeRef.current = null
          canvas.requestRenderAll()
        } else {
          const elementId = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)
          const stroke = propertiesRef.current.stroke
          const strokeWidth = propertiesRef.current.strokeWidth
          const fill = propertiesRef.current.fill
          
          let finalShape
          if (activeTool === 'rect') {
            finalShape = new F.Rect({
              id: elementId,
              left: Math.min(startX, pointer.x),
              top: Math.min(startY, pointer.y),
              width: width,
              height: height,
              fill: fill,
              stroke: stroke,
              strokeWidth: strokeWidth,
              strokeUniform: true,
              selectable: true,
              evented: true
            })
          } else if (activeTool === 'circle') {
            const dx = pointer.x - startX
            const dy = pointer.y - startY
            const radius = Math.sqrt(dx * dx + dy * dy)
            finalShape = new F.Circle({
              id: elementId,
              left: startX - radius,
              top: startY - radius,
              radius: radius,
              fill: fill,
              stroke: stroke,
              strokeWidth: strokeWidth,
              strokeUniform: true,
              selectable: true,
              evented: true
            })
          } else if (activeTool === 'diamond') {
            finalShape = new F.Polygon([
              { x: width / 2, y: 0 },
              { x: width, y: height / 2 },
              { x: width / 2, y: height },
              { x: 0, y: height / 2 }
            ], {
              id: elementId,
              left: Math.min(startX, pointer.x),
              top: Math.min(startY, pointer.y),
              fill: fill,
              stroke: stroke,
              strokeWidth: strokeWidth,
              selectable: true,
              evented: true
            })
          } else if (activeTool === 'line') {
            finalShape = new F.Line([startX, startY, pointer.x, pointer.y], {
              id: elementId,
              customType: 'line',
              stroke: stroke,
              strokeWidth: strokeWidth,
              strokeUniform: true,
              strokeLineCap: 'round',
              selectable: true,
              evented: true
            })
          } else if (activeTool === 'arrow') {
            const dx = pointer.x - startX
            const dy = pointer.y - startY
            const angle = Math.atan2(dy, dx)
            const headLength = 10 + (strokeWidth * 0.8)
            
            // Calculate head points for unified path
            const headX1 = pointer.x - headLength * Math.cos(angle - Math.PI / 6)
            const headY1 = pointer.y - headLength * Math.sin(angle - Math.PI / 6)
            const headX2 = pointer.x - headLength * Math.cos(angle + Math.PI / 6)
            const headY2 = pointer.y - headLength * Math.sin(angle + Math.PI / 6)

            // Single path: Line to end, then triangle head, then back to end
            const pathData = `M ${startX} ${startY} L ${pointer.x} ${pointer.y} M ${pointer.x} ${pointer.y} L ${headX1} ${headY1} L ${headX2} ${headY2} Z`
            
            finalShape = new F.Path(pathData, {
              id: elementId,
              customType: 'arrow',
              stroke: stroke,
              strokeWidth: strokeWidth,
              fill: stroke, // Head is filled with stroke color
              strokeUniform: true,
              strokeLineCap: 'round',
              strokeLineJoin: 'round',
              selectable: true,
              evented: true
            })
          }

          if (finalShape) {
            canvas.add(finalShape)
            canvas.setActiveObject(finalShape)
            saveHistory()
            sendCanvasUpdate()
          }
          tempCreationShapeRef.current = null
        }
      }

      if (isDrawingSelectionRef.current) {
        isDrawingSelectionRef.current = false
        const activeTool = activeToolRef.current
        const F = window.fabric
        
        if (tempSelectionShapeRef.current) {
          canvas.remove(tempSelectionShapeRef.current)
        }
        
        const pointer = canvas.getPointer(opt.e)
        const startX = selectionStartRef.current.x
        const startY = selectionStartRef.current.y
        
        let selectedObjects = []
        const candidates = canvas.getObjects().filter(
          obj => obj.id !== 'page-boundary' && obj.id !== 'temp-selection-shape'
        )
        
        if (activeTool === 'square-select') {
          const left = Math.min(startX, pointer.x)
          const top = Math.min(startY, pointer.y)
          const width = Math.abs(startX - pointer.x)
          const height = Math.abs(startY - pointer.y)
          
          selectedObjects = candidates.filter(obj => {
            obj.setCoords()
            const r = obj.getBoundingRect(true, true)
            return !(
              r.left > left + width ||
              r.left + r.width < left ||
              r.top > top + height ||
              r.top + r.height < top
            )
          })
        } else if (activeTool === 'circle-select') {
          const dx = pointer.x - startX
          const dy = pointer.y - startY
          const radius = Math.sqrt(dx * dx + dy * dy)
          
          selectedObjects = candidates.filter(obj => {
            obj.setCoords()
            const r = obj.getBoundingRect(true, true)
            const corners = [
              { x: r.left, y: r.top },
              { x: r.left + r.width, y: r.top },
              { x: r.left, y: r.top + r.height },
              { x: r.left + r.width, y: r.top + r.height },
              { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            ]
            return corners.some(p => {
              const cx = p.x - startX
              const cy = p.y - startY
              return (cx * cx + cy * cy) <= radius * radius
            })
          })
        } else if (activeTool === 'lasso-select') {
          const pts = selectionPointsRef.current
          const finalizeLassoSelection = async () => {
            const picked = []
            const endPointer = canvas.getPointer(opt.e)
            const dragDist = Math.hypot(
              endPointer.x - startX,
              endPointer.y - startY
            )

            // Short click without drag — select object under cursor
            if (dragDist < 5 && lassoClickTargetRef.current) {
              picked.push(lassoClickTargetRef.current)
            } else if (pts.length >= 2) {
              // Close the lasso (2-point drag becomes a thin rectangle)
              const lassoPoly =
                pts.length >= 3
                  ? pts
                  : [
                      pts[0],
                      { x: pts[1].x, y: pts[0].y },
                      pts[1],
                      { x: pts[0].x, y: pts[1].y },
                    ]

              for (const obj of candidates) {
                if (obj.type === 'path') {
                  const mode = getPathSelectionMode(obj, lassoPoly)
                  if (mode === 'partial') {
                    const part = await splitPathWithLasso(canvas, obj, lassoPoly)
                    picked.push(part || obj)
                  } else if (mode === 'full') {
                    picked.push(obj)
                  }
                  continue
                }

                obj.setCoords()
                const r = obj.getBoundingRect(true, true)
                const corners = [
                  { x: r.left, y: r.top },
                  { x: r.left + r.width, y: r.top },
                  { x: r.left, y: r.top + r.height },
                  { x: r.left + r.width, y: r.top + r.height },
                  { x: r.left + r.width / 2, y: r.top + r.height / 2 },
                ]
                if (corners.some((p) => isPointInPolygon(p, lassoPoly))) {
                  picked.push(obj)
                }
              }
            }

            lassoClickTargetRef.current = null
            canvas.discardActiveObject()
            if (picked.length > 0) {
              if (picked.length === 1) {
                canvas.setActiveObject(picked[0])
                updateInspectorProperties(picked[0])
              } else {
                const activeSel = new F.ActiveSelection(picked, { canvas })
                canvas.setActiveObject(activeSel)
                updateInspectorProperties(picked[0])
              }
            }
            tempSelectionShapeRef.current = null
            canvas.requestRenderAll()
          }

          finalizeLassoSelection()
          return
        }

        canvas.discardActiveObject()
        if (selectedObjects.length > 0) {
          if (selectedObjects.length === 1) {
            canvas.setActiveObject(selectedObjects[0])
          } else {
            const activeSel = new F.ActiveSelection(selectedObjects, { canvas })
            canvas.setActiveObject(activeSel)
          }
        }
        tempSelectionShapeRef.current = null
        canvas.requestRenderAll()
      }
    }

    const onSelectionCreated = (e) => {
      updateInspectorProperties(canvas.getActiveObject() || e.selected[0])
    }

    const onSelectionUpdated = (e) => {
      updateInspectorProperties(canvas.getActiveObject() || e.selected[0])
    }

    const onSelectionCleared = () => {
      setSelectedObject(null)
    }

    const onObjectMoving = (options) => {
      interactingRef.current = true
      // Snap to Grid (20px spacing)
      if (snapToGridRef.current && options.target) {
        options.target.set({
          left: Math.round(options.target.left / 20) * 20,
          top: Math.round(options.target.top / 20) * 20
        })
      }
    }

    const onObjectModified = () => {
      if (applyingRemoteRef.current) return
      saveHistory()
      sendCanvasUpdate()
    }

    const onObjectAdded = (options) => {
      if (applyingRemoteRef.current) return
      const obj = options?.target
      if (obj) {
        if (!obj.id) {
          obj.id = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)
        }
        if (obj.type === 'path') {
          obj.erasable = true
        }

        // Keep free-draw strokes non-interactive until a selection tool is chosen
        if (activeToolRef.current === 'draw') {
          obj.selectable = false
          obj.evented = false
        } else {
          const selectionTools = ['lasso-select', 'square-select', 'circle-select']
          const isSelectionTool = selectionTools.includes(activeToolRef.current)
          obj.selectable = isSelectionTool && !isReadOnly
          obj.evented = isSelectionTool && !isReadOnly
        }
      }
      saveHistory()
      sendCanvasUpdate()
    }

    const onObjectRemoved = () => {
      if (applyingRemoteRef.current) return
      saveHistory()
      sendCanvasUpdate()
    }

    const onPathCreated = (e) => {
      const path = e?.path
      if (!path) return

      // EraserBrush emits path:created but must not leave a stroke object on the canvas
      if (canvas.freeDrawingBrush?.type === 'eraser') {
        if (canvas.getObjects().includes(path)) {
          canvas.remove(path)
        }
        canvas.discardActiveObject()
        resetDrawingContexts(canvas)
        if (activeToolRef.current === 'draw') {
          canvas.isDrawingMode = true
        }
        canvas.requestRenderAll()
        return
      }

      if (!path.id) {
        path.id = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)
      }
      path.erasable = true
      path.selectable = false
      path.evented = false
      canvas.discardActiveObject()
      canvas.requestRenderAll()
    }

    const onErasingEnd = () => {
      resetDrawingContexts(canvas)
      if (activeToolRef.current === 'draw') {
        canvas.isDrawingMode = true
        canvas.requestRenderAll()
      }
      if (applyingRemoteRef.current) return
      saveHistory()
      sendCanvasUpdate()
    }

    const onMouseOut = () => {
      hideEraserCursor()
    }

    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)
    canvas.on('mouse:out', onMouseOut)
    canvas.on('path:created', onPathCreated)
    canvas.on('selection:created', onSelectionCreated)
    canvas.on('selection:updated', onSelectionUpdated)
    canvas.on('selection:cleared', onSelectionCleared)
    canvas.on('object:moving', onObjectMoving)
    canvas.on('object:scaling', () => { interactingRef.current = true })
    canvas.on('object:rotating', () => { interactingRef.current = true })
    canvas.on('object:modified', onObjectModified)
    canvas.on('object:added', onObjectAdded)
    canvas.on('object:removed', onObjectRemoved)
    canvas.on('erasing:end', onErasingEnd)

    return () => {
      canvas.off('mouse:down', onMouseDown)
      canvas.off('mouse:move', onMouseMove)
      canvas.off('mouse:up', onMouseUp)
      canvas.off('mouse:out', onMouseOut)
      canvas.off('path:created', onPathCreated)
      canvas.off('selection:created', onSelectionCreated)
      canvas.off('selection:updated', onSelectionUpdated)
      canvas.off('selection:cleared', onSelectionCleared)
      canvas.off('object:moving', onObjectMoving)
      canvas.off('object:modified', onObjectModified)
      canvas.off('object:added', onObjectAdded)
      canvas.off('object:removed', onObjectRemoved)
      canvas.off('erasing:end', onErasingEnd)
    }
  }

  // Hook toolbar tool changes
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.discardActiveObject()
    canvas.requestRenderAll()

    // Disable drawing mode by default
    canvas.isDrawingMode = false

    const selectionTools = ['lasso-select', 'square-select', 'circle-select']
    const isSelectionTool = selectionTools.includes(activeTool)

    if (activeTool === 'pan') {
      hideEraserCursor()
      canvas.selection = false
      canvas.defaultCursor = 'grab'
      canvas.forEachObject((obj) => {
        obj.selectable = false
        obj.evented = false
      })
    } else if (activeTool === 'draw') {
      canvas.isDrawingMode = true
      canvas.selection = false
      canvas.defaultCursor = drawTypeRef.current === 'eraser' ? 'none' : 'crosshair'
      canvas.forEachObject((obj) => {
        obj.selectable = false
        obj.evented = false
      })
      if (drawTypeRef.current !== 'eraser') {
        hideEraserCursor()
      }
    } else if (isSelectionTool) {
      hideEraserCursor()
      canvas.selection = false // We handle selection drawing manually
      canvas.defaultCursor = 'default'
      canvas.forEachObject((obj) => {
        if (obj.id !== 'page-boundary') {
          obj.selectable = !isReadOnly
          obj.evented = !isReadOnly
        }
      })
    } else {
      hideEraserCursor()
      canvas.selection = false
      
      const isShapeTool = ['rect', 'circle', 'diamond', 'arrow', 'line'].includes(activeTool)
      canvas.defaultCursor = isShapeTool ? 'crosshair' : 'default'

      canvas.forEachObject((obj) => {
        obj.selectable = false
        obj.evented = false
      })

      // If text tool is selected, we still use click-to-drop or a simple placement logic
      if (activeTool === 'text') {
        addNewElement('text')
        setActiveTool('square-select')
      }
    }
  }, [activeTool, isReadOnly, drawType])

  // Helper: Convert hex color to rgba format with custom alpha
  const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(30, 58, 95, ${alpha})`
    let cleanHex = hex.replace('#', '')
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('')
    }
    const r = parseInt(cleanHex.substring(0, 2), 16)
    const g = parseInt(cleanHex.substring(2, 4), 16)
    const b = parseInt(cleanHex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Configure free drawing brush properties
  useEffect(() => {
    const canvas = fabricRef.current
    const F = window.fabric
    if (!canvas || !F || screen !== 'editor') return

    const color = properties.stroke || '#1E3A5F'

    if (activeTool === 'draw') {
      canvas.isDrawingMode = true
      canvas.selection = false
      canvas.defaultCursor = drawType === 'eraser' ? 'none' : 'crosshair'
      resetDrawingContexts(canvas)
    }

    // Always recreate brush on type change so eraser state never leaks into pencil/pen
    if (drawType === 'eraser') {
      if (F.EraserBrush) {
        canvas.freeDrawingBrush = new F.EraserBrush(canvas)
        canvas.freeDrawingBrush.width = drawSizes.eraser
      } else {
        canvas.freeDrawingBrush = new F.PencilBrush(canvas)
        const brush = canvas.freeDrawingBrush
        brush.width = drawSizes.eraser
        brush.color = '#000000'
        brush.globalCompositeOperation = 'destination-out'
      }
    } else {
      canvas.freeDrawingBrush = new F.PencilBrush(canvas)
      const brush = canvas.freeDrawingBrush
      brush.globalCompositeOperation = 'source-over'
      if (drawType === 'pencil') {
        brush.width = drawSizes.pencil
        brush.color = color
      } else if (drawType === 'pen') {
        brush.width = drawSizes.pen
        brush.color = color
      } else if (drawType === 'highlighter') {
        brush.width = drawSizes.highlighter
        brush.color = hexToRgba(color, 0.4)
      }
    }

    if (drawType !== 'eraser') {
      hideEraserCursor()
    } else if (activeTool === 'draw') {
      // Refresh cursor ring size when eraser size changes
      const el = eraserCursorElRef.current
      if (el && el.style.display !== 'none') {
        const size = drawSizes.eraser * zoomRef.current
        el.style.width = `${size}px`
        el.style.height = `${size}px`
      }
    }
  }, [drawType, drawSizes, properties.stroke, activeTool, screen, zoom])

  // Element Creation Factory
  function addNewElement(type) {
    const F = window.fabric
    const canvas = fabricRef.current
    if (!F || !canvas) return

    // Calculate canvas center point taking zoom/pan into account
    const vpt = canvas.viewportTransform
    const centerX = (-vpt[4] + canvas.getWidth() / 2) / zoom
    const centerY = (-vpt[5] + canvas.getHeight() / 2) / zoom

    const elementId = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)
    let shape
    const stroke = propertiesRef.current.stroke || '#1E3A5F'
    const fill = propertiesRef.current.fill || '#FFFFFF'
    const strokeWidth = propertiesRef.current.strokeWidth || 2

    if (type === 'text') {
      shape = new F.IText('Double-click to edit', {
        id: elementId,
        left: centerX,
        top: centerY,
        fontFamily: 'Inter, system-ui, Arial',
        fontSize: 24,
        fill: stroke,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true
      })
    } else if (type === 'rect') {
      shape = new F.Rect({
        id: elementId,
        left: centerX - 50,
        top: centerY - 50,
        width: 100,
        height: 100,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        selectable: true,
        evented: true
      })
    } else if (type === 'circle') {
      shape = new F.Circle({
        id: elementId,
        left: centerX - 50,
        top: centerY - 50,
        radius: 50,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        selectable: true,
        evented: true
      })
    } else if (type === 'line') {
      shape = new F.Line([centerX - 50, centerY, centerX + 50, centerY], {
        id: elementId,
        customType: 'line',
        stroke: stroke,
        strokeWidth: strokeWidth,
        strokeUniform: true,
        strokeLineCap: 'round',
        selectable: true,
        evented: true
      })
    } else if (type === 'arrow') {
      const headLength = 10 + (strokeWidth * 0.8)
      // M 0 0 L 100 0 (Line) M 100 0 L 85 -7.5 L 85 7.5 Z (Head)
      const pathData = `M ${centerX - 50} ${centerY} L ${centerX + 50} ${centerY} M ${centerX + 50} ${centerY} L ${centerX + 50 - headLength} ${centerY - headLength/2} L ${centerX + 50 - headLength} ${centerY + headLength/2} Z`
      
      shape = new F.Path(pathData, {
        id: elementId,
        customType: 'arrow',
        stroke: stroke,
        strokeWidth: strokeWidth,
        fill: stroke,
        strokeUniform: true,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        selectable: true,
        evented: true
      })
    }

    if (shape) {
      canvas.add(shape)
      canvas.setActiveObject(shape)
      saveHistory()
      sendCanvasUpdate()
    }
  }

  // Property Changes from sidebar panel
  const handleChangeProperty = (name, value) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObject = canvas.getActiveObject()

    setProperties((prev) => ({ ...prev, [name]: value }))

    // Sync drawing brush color immediately
    if (name === 'stroke' && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = value
    }

    if (activeObject) {
      if (activeObject.type === 'activeSelection') {
        activeObject.forEachObject((obj) => {
          obj.set(name, value)
          if (obj.customType === 'arrow' && name === 'stroke') {
            obj.set('fill', value) // Keep head filled with stroke color
          }
        })
      } else {
        activeObject.set(name, value)
        if (activeObject.customType === 'arrow' && name === 'stroke') {
          activeObject.set('fill', value)
        }
      }
      canvas.requestRenderAll()
      saveHistory()
      sendCanvasUpdate()
    }
  }

  const handleBringToFront = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.bringToFront(activeObject)
      canvas.requestRenderAll()
      saveHistory()
      sendCanvasUpdate()
    }
  }

  const handleSendToBack = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.sendToBack(activeObject)
      canvas.requestRenderAll()
      saveHistory()
      sendCanvasUpdate()
    }
  }

  const handleDeleteElement = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      if (activeObject.type === 'activeSelection') {
        activeObject.forEachObject((obj) => canvas.remove(obj))
        canvas.discardActiveObject()
      } else {
        canvas.remove(activeObject)
        canvas.discardActiveObject()
      }
      canvas.requestRenderAll()
      setSelectedObject(null)
    }
  }

  // Zoom Controls
  const handleZoom = (factor) => {
    const canvas = fabricRef.current
    if (!canvas) return
    const newZoom = Math.min(Math.max(factor, 0.25), 4.0)

    // Zoom centered in the canvas viewport
    canvas.zoomToPoint(new window.fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2), newZoom)
    setZoom(newZoom)
  }

  const handleZoomReset = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.setZoom(1.0)
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0]
    canvas.requestRenderAll()
    setZoom(1.0)
  }

  // --- Grouping & Locking ---
  const handleGroup = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObj = canvas.getActiveObject()
    if (!activeObj || activeObj.type !== 'activeSelection') return

    activeObj.toGroup()
    const newGroup = canvas.getActiveObject()
    if (newGroup) {
      newGroup.set({
        id: 'group-' + Date.now() + '-' + Math.round(Math.random() * 1e9),
        subTargetCheck: true // allows selecting inner elements if needed
      })
      canvas.requestRenderAll()
      updateInspectorProperties(newGroup)
      saveHistory()
      sendCanvasUpdate()
    }
  }

  const handleUngroup = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObj = canvas.getActiveObject()
    if (!activeObj || activeObj.type !== 'group') return

    activeObj.toActiveSelection()
    canvas.requestRenderAll()
    updateInspectorProperties(canvas.getActiveObject())
    saveHistory()
    sendCanvasUpdate()
  }

  const handleToggleLock = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObj = canvas.getActiveObject()
    if (!activeObj) return

    const isLocked = !activeObj.lockMovementX
    activeObj.set({
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked,
      lockRotation: isLocked,
      hasControls: !isLocked,
      editable: !isLocked,
      hoverCursor: isLocked ? 'default' : 'move'
    })

    canvas.requestRenderAll()
    // Force React to re-render without losing scroll position by shallow-copying the reference
    setSelectedObject(Object.assign(Object.create(Object.getPrototypeOf(activeObj)), activeObj))
    saveHistory()
    sendCanvasUpdate()
  }

  // Phase 5: AI features (Mess Cleanup and Architecture Assist)
  const handleCleanup = async () => {
    const canvas = fabricRef.current
    if (!canvas) return

    const rawObjects = canvas.getObjects().filter(obj => obj.id && obj.id !== 'page-boundary')
    if (rawObjects.length === 0) {
      alert('Draw some shapes on the canvas first before cleaning them up!')
      return
    }

    // Save history state before cleanup so it can be undone
    saveHistory()
    setIsCleanupLoading(true)

    const elements = rawObjects.map(obj => ({
      id: obj.id,
      type: obj.type === 'i-text' || obj.type === 'text' ? 'text' : obj.type,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      scaleX: obj.scaleX || 1,
      scaleY: obj.scaleY || 1,
      isLocked: obj.lockMovementX || obj.isLocked || false
    }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

      const token = localStorage.getItem('wb_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('http://localhost:4000/api/ai/cleanup', {
        method: 'POST',
        headers,
        body: JSON.stringify({ elements }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!res.ok) throw new Error('Cleanup failed')
      const data = await res.json()
      const cleaned = data.elements || []

      if (cleaned.length === 0) return

      let completedCount = 0
      applyingRemoteRef.current = true // Disable intermediate history saves during animations

      cleaned.forEach(item => {
        const obj = rawObjects.find(o => o.id === item.id)
        if (obj) {
          const startLeft = obj.left
          const startTop = obj.top
          const endLeft = item.left
          const endTop = item.top

          window.fabric.util.animate({
            startValue: 0,
            endValue: 1,
            duration: 500,
            onChange: (value) => {
              obj.set('left', startLeft + (endLeft - startLeft) * value)
              obj.set('top', startTop + (endTop - startTop) * value)
              canvas.requestRenderAll()
            },
            onComplete: () => {
              obj.setCoords()
              completedCount++
              if (completedCount === cleaned.length) {
                applyingRemoteRef.current = false
                saveHistory()
                sendCanvasUpdate()
              }
            }
          })
        } else {
          completedCount++
        }
      })
    } catch (err) {
      console.error('Mess cleanup error:', err)
      alert('Failed to tidy elements. Please try again.')
    } finally {
      setIsCleanupLoading(false)
    }
  }

  const handleAssist = async () => {
    const canvas = fabricRef.current
    if (!canvas) return

    setIsAssistLoading(true)
    setIsAssistPanelOpen(true) // Slide open right away to show loader

    const rawObjects = canvas.getObjects().filter(obj => obj.id && obj.id !== 'page-boundary')
    const shapes = rawObjects.filter(obj => ['rect', 'circle', 'polygon'].includes(obj.type) || obj.type === 'path')
    const texts = rawObjects.filter(obj => obj.type === 'i-text' || obj.type === 'text')

    // Map shapes and find nested text overlapping as labels
    const elements = shapes.map(shape => {
      const shapeLeft = shape.left
      const shapeTop = shape.top
      const shapeWidth = shape.width * (shape.scaleX || 1)
      const shapeHeight = shape.height * (shape.scaleY || 1)

      const insideTexts = texts.filter(text => {
        const textX = text.left
        const textY = text.top
        return (
          textX >= shapeLeft &&
          textX <= shapeLeft + shapeWidth &&
          textY >= shapeTop &&
          textY <= shapeTop + shapeHeight
        )
      })

      const label = insideTexts.map(t => t.text).join(' ').trim()
      return {
        id: shape.id,
        type: shape.type,
        label: label || shape.type
      }
    })

    // Add standalone texts
    texts.forEach(text => {
      const isInside = shapes.some(shape => {
        const shapeLeft = shape.left
        const shapeTop = shape.top
        const shapeWidth = shape.width * (shape.scaleX || 1)
        const shapeHeight = shape.height * (shape.scaleY || 1)
        return (
          text.left >= shapeLeft &&
          text.left <= shapeLeft + shapeWidth &&
          text.top >= shapeTop &&
          text.top <= shapeTop + shapeHeight
        )
      })
      if (!isInside && text.text.trim()) {
        elements.push({
          id: text.id,
          type: 'text',
          label: text.text.trim(),
          left: text.left,
          top: text.top
        })
      }
    })

    // Detect connections (edges)
    const edges = []
    const connectors = rawObjects.filter(obj => obj.customType === 'arrow' || obj.customType === 'line')
    
    connectors.forEach(conn => {
      conn.setCoords()
      const connRect = conn.getBoundingRect(true, true)
      
      const connectedShapes = shapes.filter(s => {
        s.setCoords()
        const sRect = s.getBoundingRect(true, true)
        // Check simple bounding box intersection
        return !(
          connRect.left > sRect.left + sRect.width ||
          connRect.left + connRect.width < sRect.left ||
          connRect.top > sRect.top + sRect.height ||
          connRect.top + connRect.height < sRect.top
        )
      }).map(s => s.id)
      
      if (connectedShapes.length >= 2) {
        // Assume first is 'from' and second is 'to' for simplicity
        edges.push({ from: connectedShapes[0], to: connectedShapes[1] })
      }
    })

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout for assist

      const token = localStorage.getItem('wb_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('http://localhost:4000/api/ai/assist', {
        method: 'POST',
        headers,
        body: JSON.stringify({ elements, edges }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!res.ok) throw new Error('Assist failed')
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Architecture assist error:', err)
      setSuggestions([])
    } finally {
      setIsAssistLoading(false)
    }
  }

  const handleApplySuggestion = (suggestedComponent) => {
    const F = window.fabric
    const canvas = fabricRef.current
    if (!F || !canvas) return

    // Calculate default viewport center
    const vpt = canvas.viewportTransform
    let centerX = (-vpt[4] + canvas.getWidth() / 2) / zoom
    let centerY = (-vpt[5] + canvas.getHeight() / 2) / zoom

    // Smart Placement
    if (suggestedComponent.targetId) {
      const targetObj = canvas.getObjects().find(o => o.id === suggestedComponent.targetId)
      if (targetObj) {
        targetObj.setCoords()
        centerX = targetObj.left + (targetObj.width * (targetObj.scaleX || 1)) + 150 // Place 150px to the right
        centerY = targetObj.top + ((targetObj.height * (targetObj.scaleY || 1)) / 2)
      }
    }

    const elementId = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)
    const textId = 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9)

    let shape
    const type = suggestedComponent.type
    const labelText = suggestedComponent.label

    const strokeColor = propertiesRef.current.stroke || '#1E3A5F'
    const strokeWidth = propertiesRef.current.strokeWidth || 2

    switch (type) {
      case 'rect':
        shape = new F.Rect({
          id: elementId,
          left: centerX - 75,
          top: centerY - 45,
          width: 150,
          height: 90,
          fill: '#FFFFFF',
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          rx: 8,
          ry: 8,
          selectable: true,
          evented: true
        })
        break
      case 'circle':
        shape = new F.Circle({
          id: elementId,
          left: centerX - 55,
          top: centerY - 55,
          radius: 55,
          fill: '#FFFFFF',
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          selectable: true,
          evented: true
        })
        break
      case 'diamond':
        shape = new F.Polygon([
          { x: 65, y: 0 },
          { x: 130, y: 65 },
          { x: 65, y: 130 },
          { x: 0, y: 65 }
        ], {
          id: elementId,
          left: centerX - 65,
          top: centerY - 65,
          fill: '#FFFFFF',
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          selectable: true,
          evented: true
        })
        break
      case 'text':
      default:
        shape = null
        break
    }

    // Create label text
    const text = new F.IText(labelText, {
      id: textId,
      left: centerX,
      top: centerY,
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      fontWeight: '600',
      fill: '#1E3A5F',
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true
    })

    canvas.discardActiveObject()

    if (shape) {
      canvas.add(shape)
      text.set({
        left: shape.left + (shape.width * (shape.scaleX || 1)) / 2,
        top: shape.top + (shape.height * (shape.scaleY || 1)) / 2
      })
      canvas.add(text)

      const selection = new F.ActiveSelection([shape, text], { canvas })
      canvas.setActiveObject(selection)
    } else {
      canvas.add(text)
      canvas.setActiveObject(text)
    }

    canvas.requestRenderAll()
    saveHistory()
    sendCanvasUpdate()
  }

  // Fetch active contexts map
  const fetchContextMap = async (boardId) => {
    if (!boardId) return
    try {
      const token = localStorage.getItem('wb_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`http://localhost:4000/api/context/${boardId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setContextMap(data)
      }
    } catch (err) {
      console.error('Failed to load context map:', err)
    }
  }

  // Persistence triggers
  async function saveBoard() {
    if (!fabricRef.current) return
    if (isReadOnly) {
      alert('You do not have permission to modify this whiteboard.')
      return
    }

    // Save current active page state and snapshot
    const currentJson = getCanvasJson()
    const currentThumbnail = fabricRef.current.toDataURL({ format: 'jpeg', quality: 0.1, multiplier: 0.1 })

    const updatedPages = pagesRef.current.map(p =>
      p.page_id === activePageIdRef.current
        ? { ...p, canvas_state: currentJson, thumbnail: currentThumbnail }
        : p
    )

    const payload = {
      title,
      mode: pageMode,
      pageSize,
      pages: updatedPages
    }

    try {
      const token = localStorage.getItem('wb_token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const url = savedId
        ? `http://localhost:4000/api/whiteboards/${savedId}`
        : 'http://localhost:4000/api/whiteboards'
      const method = savedId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Save failed')
      }

      const data = await res.json()
      setSavedId(data.id)
      setPages(updatedPages)
      setBoardMeta(prev => ({
        ...prev,
        owner: prev.owner || user.id || user._id || null
      }))

      // Update URL query parameter without re-loading the page
      const newUrl = `${window.location.origin}${window.location.pathname}?board=${data.id}`
      window.history.pushState({ path: newUrl }, '', newUrl)

      // Fetch contexts for the saved board
      fetchContextMap(data.id)

      alert('Board saved successfully! Room ID: ' + data.id)
    } catch (err) {
      console.error(err)
      alert('Save failed: ' + err.message)
    }
  }

  async function loadBoard() {
    const id = prompt('Enter whiteboard ID to load', savedId || '')
    if (!id) return
    loadBoardById(id)
  }

  async function loadBoardById(id) {
    try {
      const token = localStorage.getItem('wb_token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`http://localhost:4000/api/whiteboards/${id}`, { headers })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('authentication_required')
        }
        throw new Error('Whiteboard not found')
      }
      const data = await res.json()

      if (data.title) setTitle(data.title)

      // Set metadata
      setBoardMeta({
        owner: data.owner || null,
        collaborators: data.collaborators || [],
        isPublic: data.isPublic || false
      })

      if (data.pages && Array.isArray(data.pages)) {
        // Multi-page document load
        setPages(data.pages)
        setPageMode(data.mode || 'infinite')
        setPageSize(data.pageSize || { w: 1024, h: 576 })

        const firstPage = data.pages[0]
        if (firstPage) {
          setActivePageId(firstPage.page_id)
          applyRemoteCanvas(firstPage.canvas_state)
        }
      } else {
        // Legacy single-page format fallback
        const canvasJson = data.json || data
        const legacyPage = {
          page_id: 'page-1',
          title: 'Page 1',
          order: 0,
          canvas_state: canvasJson,
          thumbnail: null
        }
        setPages([legacyPage])
        setPageMode('infinite')
        setActivePageId('page-1')
        applyRemoteCanvas(legacyPage.canvas_state)
      }

      setSavedId(id)

      // Fetch contexts for this whiteboard
      fetchContextMap(id)

      const newUrl = `${window.location.origin}${window.location.pathname}?board=${id}`
      window.history.pushState({ path: newUrl }, '', newUrl)
    } catch (err) {
      console.error(err)
      if (err.message === 'authentication_required') {
        alert('Authentication required: please log in or sign up to access this board.')
        setScreen('auth')
      } else {
        alert('Load failed: ' + err.message)
      }
    }
  }

  // Send updates to socket (debounced)
  const sendCanvasUpdate = debounce(() => {
    if (!fabricRef.current || !socketRef.current) return
    if (applyingRemoteRef.current) return
    try {
      const json = getCanvasJson()
      const room = savedIdRef.current || 'global'
      socketRef.current.emit('canvas:update', {
        id: room,
        pageId: activePageIdRef.current,
        json
      })
    } catch (e) {
      console.error('Failed to emit canvas update', e)
    }
  }, 200)

  // Initialize Canvas
  useEffect(() => {
    if (screen !== 'editor') return

    const F = window.fabric
    if (!F) {
      alert('Fabric library not found. Check index.html CDN import.')
      return
    }

    const viewport = document.getElementById('canvas-viewport')
    const initialWidth = viewport ? viewport.clientWidth - 40 : window.innerWidth - 380
    const initialHeight = viewport ? viewport.clientHeight - 40 : 600

    const canvasEl = document.getElementById('whiteboard-canvas')
    const canvas = new F.Canvas(canvasEl, {
      backgroundColor: 'transparent', // let wrapper handle grid background
      selection: true,
      preserveObjectStacking: true,
    })

    canvas.setWidth(initialWidth)
    canvas.setHeight(initialHeight)
    canvas.calcOffset()
    canvas.requestRenderAll()

    // Premium styling config for handles
    F.Object.prototype.transparentCorners = false
    F.Object.prototype.cornerStyle = 'circle'
    F.Object.prototype.cornerColor = '#2E86AB'
    F.Object.prototype.borderColor = '#2E86AB'
    F.Object.prototype.cornerSize = 8
    F.Object.prototype.borderScaleFactor = 1.5

    fabricRef.current = canvas
    window.__fabricCanvas = canvas

    // Initial page boundary rendering
    renderPageBoundary(canvas, pageModeRef.current, pageSizeRef.current)

    // Attach listeners
    const cleanupFabricListeners = attachFabricListeners(canvas)

    // Load existing pages if populated, else save initial history snapshot
    const initialJson = canvas.toJSON(['selectable', 'id', 'globalCompositeOperation', 'erasable', 'eraser', 'customType'])
    if (initialJson && initialJson.objects) {
      initialJson.objects = initialJson.objects.filter(obj => obj.id !== 'page-boundary')
    }

    const activePage = pagesRef.current.find(p => p.page_id === activePageIdRef.current)
    if (activePage && activePage.canvas_state && activePage.canvas_state.objects && activePage.canvas_state.objects.length > 0) {
      applyingRemoteRef.current = true
      canvas.discardActiveObject()
      canvas.loadFromJSON(activePage.canvas_state, () => {
        canvas.getObjects().forEach((obj) => obj.setCoords())
        renderPageBoundary(canvas, pageModeRef.current, pageSizeRef.current)
        canvas.requestRenderAll()
        applyingRemoteRef.current = false

        historyRef.current = [activePage.canvas_state]
        historyIndexRef.current = 0
        setCanUndo(false)
        setCanRedo(false)
      })
    } else {
      historyRef.current = [initialJson]
      historyIndexRef.current = 0
    }

    // Handle viewport resize
    const onResize = () => {
      const w = viewport ? viewport.clientWidth - 40 : window.innerWidth - 380
      const h = viewport ? viewport.clientHeight - 40 : 600
      canvas.setWidth(w)
      canvas.setHeight(h)
      canvas.calcOffset()
      canvas.requestRenderAll()
    }
    window.addEventListener('resize', onResize)

    // Keyboard Shortcuts Listener
    const onKeyDown = (e) => {
      // Don't fire shortcuts if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return
      }

      const key = e.key.toLowerCase()

      // Delete element (Delete or Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteElement()
        e.preventDefault()
      }

      // Undo (Ctrl+Z)
      if (e.ctrlKey && key === 'z') {
        undo()
        e.preventDefault()
      }

      // Redo (Ctrl+Y)
      if (e.ctrlKey && key === 'y') {
        redo()
        e.preventDefault()
      }

      // Copy (Ctrl+C)
      if (e.ctrlKey && key === 'c') {
        handleCopy()
        e.preventDefault()
      }

      // Cut (Ctrl+X)
      if (e.ctrlKey && key === 'x') {
        handleCut()
        e.preventDefault()
      }

      // Paste (Ctrl+V)
      if (e.ctrlKey && key === 'v') {
        handlePaste()
        e.preventDefault()
      }

      // Zoom In (Ctrl+=)
      if (e.ctrlKey && e.key === '=') {
        handleZoom(zoom + 0.1)
        e.preventDefault()
      }

      // Zoom Out (Ctrl+-)
      if (e.ctrlKey && e.key === '-') {
        handleZoom(zoom - 0.1)
        e.preventDefault()
      }

      // Zoom Reset (Ctrl+0)
      if (e.ctrlKey && e.key === '0') {
        handleZoomReset()
        e.preventDefault()
      }

      // Group (Ctrl+G)
      if (e.ctrlKey && !e.shiftKey && key === 'g') {
        handleGroup()
        e.preventDefault()
      }

      // Ungroup (Ctrl+Shift+G)
      if (e.ctrlKey && e.shiftKey && key === 'g') {
        handleUngroup()
        e.preventDefault()
      }

      // Lock/Unlock Toggle (Ctrl+L)
      if (e.ctrlKey && key === 'l') {
        handleToggleLock()
        e.preventDefault()
      }

      // Grid Snap toggle (G)
      if (!e.ctrlKey && key === 'g') {
        setSnapToGrid((prev) => !prev)
      }

      // Tool shortcuts
      if (!e.ctrlKey) {
        if (key === 'v') setActiveTool('square-select')
        if (key === 'c') setActiveTool('circle-select')
        if (key === 'l') setActiveTool('lasso-select')
        if (key === 'h') setActiveTool('pan')
        if (key === 'p') setActiveTool('draw')
        if (key === 'e') {
          setActiveTool('draw')
          setDrawType('eraser')
        }
        if (key === 'r') setActiveTool('rect')
        if (key === 'o') setActiveTool('circle')
        if (key === 'd') setActiveTool('diamond')
        if (key === 't') setActiveTool('text')
        if (key === 'a') setActiveTool('arrow')
        if (key === 's') setActiveTool('line')
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      cleanupFabricListeners()
      if (window.__fabricCanvas === canvas) {
        window.__fabricCanvas = null
      }
      canvas.dispose()
      fabricRef.current = null
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [screen])

  // WebSockets collaboration lifecycle
  useEffect(() => {
    if (screen !== 'editor') {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const token = localStorage.getItem('wb_token')
    const socket = io('http://localhost:4000', {
      auth: { token }
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      setConnectionStatus('connected')
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      setConnectionStatus('disconnected')
      setRoomUsers([])
      setRemoteCursors({})
    })

    socket.on('canvas:update', ({ roomId, pageId, json }) => {
      if (pageId === activePageIdRef.current) {
        applyRemoteCanvas(json)
      } else {
        // Cache in page states array
        setPages((prev) =>
          prev.map((p) =>
            p.page_id === pageId
              ? { ...p, canvas_state: json }
              : p
          )
        )
      }
    })

    socket.on('board:structure-update', ({ pages: remotePages, mode: remoteMode, pageSize: remotePageSize }) => {
      // If our current page is gone, switch to first available
      if (!remotePages.find(p => p.page_id === activePageIdRef.current)) {
        const firstPage = remotePages[0]
        if (firstPage) {
          setActivePageId(firstPage.page_id)
          applyRemoteCanvas(firstPage.canvas_state)
        }
      }
      setPages(remotePages)
      setPageMode(remoteMode)
      setPageSize(remotePageSize)
    })

    socket.on('room:users', (users) => {
      setRoomUsers(users || [])
    })

    socket.on('cursor:update', ({ userId, name, color, pageId, x, y }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: { name, color, pageId, x, y }
      }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [screen])

  // Join designated socket room
  useEffect(() => {
    if (!socketRef.current) return
    const room = savedId || 'global'
    socketRef.current.emit('join', { roomId: room, user })
  }, [savedId, connectionStatus, user])

  if (screen === 'landing') {
    return (
      <div className="landing-container">
        <header className="landing-header">
          <div className="logo-container">
            <div className="logo-icon">W</div>
            <span className="logo-text">Whiteboard Pro</span>
          </div>
          <button className="btn btn-primary" onClick={() => setScreen('auth')}>Sign In</button>
        </header>

        <main className="landing-main">
          <section className="hero-section">
            <div className="hero-badge">PHASE 6: SECURE CLOUD COLLABORATION</div>
            <h1 className="hero-title">Collaborate, Design & Align in Real-Time</h1>
            <p className="hero-subtitle">
              A premium, interactive digital canvas featuring instant static layouts, multi-page slide exports, dynamic context notes, and bank-grade session security.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => setScreen('auth')}>Get Started for Free</button>
            </div>
          </section>

          <section className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">✨</div>
              <h3>Real-Time Collab</h3>
              <p>Work together on drawing designs simultaneously with smooth cursors and dynamic team presence indicators.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🧹</div>
              <h3>Static Cleanup</h3>
              <p>Tidy up messy hand-drawn boxes, circles, and polygons into aligned grid systems automatically using layout engines.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🗂️</div>
              <h3>Context Notes & Files</h3>
              <p>Attach code blocks, technical documentation links, and media files directly to individual board nodes.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Session Security</h3>
              <p>Secure whiteboard updates and file access with robust authentication checks and rate limit guards.</p>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <p>© 2026 Visual Whiteboard Pro. All rights reserved.</p>
        </footer>
      </div>
    )
  }

  if (screen === 'auth') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo-icon" style={{ margin: '0 auto 12px' }}>W</div>
            <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{authMode === 'login' ? 'Sign in to access your digital workspace' : 'Start collaborating on your visual project'}</p>
          </div>

          {authError && <div className="auth-error-banner">{authError}</div>}

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="auth-form">
            {authMode === 'register' && (
              <div className="form-group">
                <label htmlFor="auth-name">Full Name</label>
                <input
                  type="text"
                  id="auth-name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  placeholder="Alex Architect"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email Address</label>
              <input
                type="email"
                id="auth-email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                placeholder="alex@company.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                type="password"
                id="auth-password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-footer">
            <span>
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button
              className="btn-link"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setAuthError('')
              }}
            >
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>

          <button className="btn btn-secondary btn-block" style={{ marginTop: '16px' }} onClick={() => setScreen('landing')}>
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'dashboard') {
    const filteredBoards = whiteboardsList.filter(board =>
      board.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getInitials = (name) => {
      if (!name) return '?'
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="logo-container">
            <div className="logo-icon">W</div>
            <span className="logo-text">Whiteboard Pro</span>
          </div>

          <div className="dashboard-user-profile">
            <div className="user-avatar" style={{ backgroundColor: user.color || '#6B7280' }}>
              {getInitials(user.name)}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Log Out</button>
          </div>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-toolbar">
            <h1 className="dashboard-title">Your Workspaces</h1>
            <button className="btn btn-primary" onClick={handleCreateBoard}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path>
              </svg>
              Create Board
            </button>
          </div>

          <div className="search-bar-container">
            <input
              type="text"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by board title..."
            />
          </div>

          {filteredBoards.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="empty-icon">📁</div>
              <h3>No Whiteboards Found</h3>
              <p>{searchQuery ? 'Try adjusting your search query' : 'Create your first design whiteboard workspace to begin collaborating!'}</p>
              {!searchQuery && (
                <button className="btn btn-primary" onClick={handleCreateBoard} style={{ marginTop: '16px' }}>
                  Create New Board
                </button>
              )}
            </div>
          ) : (
            <div className="dashboard-grid">
              {filteredBoards.map((board) => {
                const isOwner = board.owner && (board.owner._id === user.id || board.owner === user.id);
                return (
                  <div key={board._id} className="board-card" onClick={() => handleOpenBoard(board._id)}>
                    <div className="board-card-preview">
                      <div className="board-placeholder-grid"></div>
                      <div className="board-preview-overlay">
                        <span className="btn btn-primary btn-sm">Open Workspace</span>
                      </div>
                    </div>
                    <div className="board-card-info" onClick={(e) => e.stopPropagation()}>
                      <div className="board-card-title-row">
                        <h4 className="board-title-text" title={board.title}>{board.title}</h4>
                        <span className={`badge ${board.isPublic ? 'badge-public' : 'badge-private'}`}>
                          {board.isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>

                      <div className="board-meta-row">
                        <span className="board-owner">
                          {isOwner ? 'Owner' : `Shared by ${board.owner?.name || 'Collaborator'}`}
                        </span>
                        <span className="board-date">
                          {new Date(board.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="board-card-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const email = prompt('Enter collaborator email to add:');
                            if (email && email.trim()) {
                              shareBoard(board._id, false, email.trim());
                            }
                          }}
                          disabled={!isOwner}
                          title={isOwner ? "Add collaborator" : "Only owner can manage sharing"}
                        >
                          Share
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => shareBoard(board._id, true, null)}
                          disabled={!isOwner}
                          title={isOwner ? "Toggle public access" : "Only owner can manage visibility"}
                        >
                          {board.isPublic ? 'Make Private' : 'Make Public'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteBoard(board._id)}
                          disabled={!isOwner}
                          title={isOwner ? "Delete whiteboard" : "Only owner can delete"}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <Topbar
        title={title}
        setTitle={setTitle}
        onSave={saveBoard}
        onLoad={loadBoard}
        onClearPage={handleClearPage}
        savedId={savedId}
        roomUsers={roomUsers}
        currentUser={{ id: socketRef.current?.id, ...user }}
        onRenameUser={handleRenameUser}
        onExport={() => setIsExportModalOpen(true)}
        onCleanup={handleCleanup}
        onAssist={handleAssist}
        isCleanupLoading={isCleanupLoading}
        isAssistLoading={isAssistLoading}
        onExit={handleExitEditor}
        isReadOnly={isReadOnly}
      />

      {/* Main Workspace Area */}
      <div className="workspace-container">
        {/* Left Sidebar Page Navigator */}
        <PageStrip
          pages={pages}
          activePageId={activePageId}
          onSwitchPage={switchPage}
          onAddPage={addPage}
          onDeletePage={deletePage}
          onDuplicatePage={duplicatePage}
          onRenamePage={renamePage}
          onReorderPage={reorderPage}
          onSharePage={sharePage}
          canManagePages={!isReadOnly && (boardMeta.owner === user.id || !savedId)}
        />

        {/* Toolbar Left Side */}
        <Toolbar 
          activeTool={activeTool} 
          setActiveTool={setActiveTool} 
          drawType={drawType}
          setDrawType={setDrawType}
          isReadOnly={isReadOnly} 
        />

        {/* Central Canvas Viewport */}
        <div id="canvas-viewport" className="canvas-viewport">
          <div
            id="canvas-wrapper"
            className={`canvas-wrapper ${activeTool === 'pan' ? 'pan-mode' : ''} ${activeTool === 'draw' && drawType === 'eraser' ? 'eraser-mode' : ''}`}
          >
            <canvas id="whiteboard-canvas" />

            {/* Eraser brush size preview ring */}
            <div
              ref={eraserCursorElRef}
              className="eraser-cursor-preview"
              aria-hidden="true"
            />

            {/* Remote Cursors Overlay */}
            {Object.entries(remoteCursors).map(([id, cursor]) => {
              if (!fabricRef.current) return null
              if (id === socketRef.current?.id) return null
              if (cursor.pageId !== activePageId) return null

              const pt = new window.fabric.Point(cursor.x, cursor.y)
              const screenPt = window.fabric.util.transformPoint(pt, fabricRef.current.viewportTransform)

              return (
                <div
                  key={id}
                  className="remote-cursor"
                  style={{
                    left: `${screenPt.x}px`,
                    top: `${screenPt.y}px`,
                    transform: 'translate(-5px, -5px)',
                    transition: 'left 0.08s ease-out, top 0.08s ease-out'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M4.5 3V17.6562C4.5 18.2344 5.23438 18.5 5.60938 18.0625L10.375 12.875L17.2031 12.875C17.7969 12.875 18.0625 12.125 17.6094 11.75L5.04688 3.09375C4.89062 2.98438 4.6875 2.95312 4.5 3Z"
                      fill={cursor.color}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div className="remote-cursor-label" style={{ backgroundColor: cursor.color }}>
                    {cursor.name}
                  </div>
                </div>
              )
            })}

            {/* Element Context Badges Overlay */}
            {fabricRef.current && fabricRef.current.getObjects()
              .filter(obj => obj.id && obj.id !== 'page-boundary' && contextMap[obj.id])
              .map(obj => {
                const center = obj.getCenterPoint()
                const width = (obj.width * obj.scaleX) || 50
                const height = (obj.height * obj.scaleY) || 50

                const badgePt = new window.fabric.Point(
                  center.x + (width / 2),
                  center.y - (height / 2)
                )
                const screenPt = window.fabric.util.transformPoint(badgePt, fabricRef.current.viewportTransform)

                return (
                  <div
                    key={obj.id}
                    className="context-badge"
                    style={{
                      left: `${screenPt.x}px`,
                      top: `${screenPt.y}px`,
                      transition: 'left 0.05s ease-out, top 0.05s ease-out'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      fabricRef.current.setActiveObject(obj)
                      fabricRef.current.requestRenderAll()
                      updateInspectorProperties(obj)
                      setIsContextPanelOpen(true)
                    }}
                    title="View notes, links & files"
                  >
                    <svg viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                    </svg>
                  </div>
                )
              })
            }
          </div>

          {/* Floating Canvas Controls (Bottom Left) */}
          <CanvasControls
            zoom={zoom}
            onZoomIn={() => handleZoom(zoom + 0.1)}
            onZoomOut={() => handleZoom(zoom - 0.1)}
            onZoomReset={handleZoomReset}
            snapToGrid={snapToGrid}
            onToggleSnapToGrid={() => setSnapToGrid((prev) => !prev)}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>

        {/* Properties Panel Right Side */}
        <PropertiesPanel
          selectedObject={selectedObject}
          properties={properties}
          onChangeProperty={handleChangeProperty}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onDelete={handleDeleteElement}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onToggleLock={handleToggleLock}
          onEditContext={() => {
            if (!savedId) {
              alert('Please save the whiteboard first (click "Save" in the top bar) to enable attaching notes, code, and files.')
              return
            }
            setIsContextPanelOpen(true)
          }}
          isReadOnly={isReadOnly}
          activeTool={activeTool}
          drawType={drawType}
          setDrawType={setDrawType}
          drawSizes={drawSizes}
          onChangeDrawSize={handleChangeDrawSize}
        />

        {/* Context Details Panel (Slides from Right) */}
        <ContextPanel
          isOpen={isContextPanelOpen}
          onClose={() => setIsContextPanelOpen(false)}
          whiteboardId={savedId}
          elementId={selectedObject?.id}
          elementName={selectedObject ? `${selectedObject.type.toUpperCase()} Shape` : ''}
          onContextUpdated={(elId, hasContext) => {
            setContextMap(prev => ({
              ...prev,
              [elId]: hasContext
            }))
          }}
          isReadOnly={isReadOnly}
        />

        {/* Architecture Assistant Recommendations Panel */}
        <AssistPanel
          isOpen={isAssistPanelOpen}
          onClose={() => setIsAssistPanelOpen(false)}
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          onApplySuggestion={handleApplySuggestion}
          isLoading={isAssistLoading}
        />
      </div>

      {/* Bottom Status Bar */}
      <footer className="status-bar">
        <div className="status-item">
          <span className={`status-indicator ${connectionStatus}`} />
          <span>
            {connectionStatus === 'connected'
              ? `Live Collaboration Active (${roomUsers.length} online)`
              : 'Reconnecting to network...'}
          </span>
        </div>
        <div className="status-item">
          <span>Grid Snap: {snapToGrid ? 'ON' : 'OFF'}</span>
          <span>•</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          {savedId && (
            <>
              <span>•</span>
              <span style={{ fontFamily: 'monospace' }}>ID: {savedId}</span>
            </>
          )}
        </div>
      </footer>

      {/* Export System Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        pages={pages}
        title={title}
      />
    </div>
  )
}

