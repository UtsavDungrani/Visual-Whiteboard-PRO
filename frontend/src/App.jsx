import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export default function App() {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const socketRef = useRef(null)
  const canvasListenersCleanupRef = useRef(null)
  const applyingRemoteRef = useRef(false)
  const interactingRef = useRef(false)
  const pendingRemoteJsonRef = useRef(null)
  const savedIdRef = useRef(null)
  const [savedId, setSavedId] = useState(null)

  const canvasOptions = {
    backgroundColor: '#FAFAFA',
    selection: true,
    preserveObjectStacking: true,
  }

  // simple debounce helper
  function debounce(fn, wait) {
    let t
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...args), wait)
    }
  }

  function applyRemoteCanvas(json) {
    if (!fabricRef.current) return
    if (interactingRef.current) {
      pendingRemoteJsonRef.current = json
      return
    }

    applyingRemoteRef.current = true
    const canvas = fabricRef.current
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    canvas.loadFromJSON(json, () => {
      canvas.getObjects().forEach((object) => object.setCoords())
      canvas.calcOffset()
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      applyingRemoteRef.current = false
    })
  }

  function flushPendingRemoteCanvas() {
    if (!pendingRemoteJsonRef.current || !fabricRef.current) return
    const json = pendingRemoteJsonRef.current
    pendingRemoteJsonRef.current = null
    applyRemoteCanvas(json)
  }

  function attachFabricListeners(canvas) {
    const onMouseDown = () => {
      interactingRef.current = true
    }

    const onMouseUp = () => {
      interactingRef.current = false
      flushPendingRemoteCanvas()
    }

    const onObjectMoving = () => {
      interactingRef.current = true
    }

    const onObjectScaling = () => {
      interactingRef.current = true
    }

    const onObjectRotating = () => {
      interactingRef.current = true
    }

    const onObjectAdded = () => {
      if (applyingRemoteRef.current) return
      sendCanvasUpdate()
    }
    const onObjectModified = () => {
      if (applyingRemoteRef.current) return
      sendCanvasUpdate()
    }
    const onObjectRemoved = () => {
      if (applyingRemoteRef.current) return
      sendCanvasUpdate()
    }

    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:up', onMouseUp)
    canvas.on('object:moving', onObjectMoving)
    canvas.on('object:scaling', onObjectScaling)
    canvas.on('object:rotating', onObjectRotating)
    canvas.on('object:added', onObjectAdded)
    canvas.on('object:modified', onObjectModified)
    canvas.on('object:removed', onObjectRemoved)

    return () => {
      canvas.off('mouse:down', onMouseDown)
      canvas.off('mouse:up', onMouseUp)
      canvas.off('object:moving', onObjectMoving)
      canvas.off('object:scaling', onObjectScaling)
      canvas.off('object:rotating', onObjectRotating)
      canvas.off('object:added', onObjectAdded)
      canvas.off('object:modified', onObjectModified)
      canvas.off('object:removed', onObjectRemoved)
    }
  }

  function createFabricCanvas() {
    const F = window.fabric
    const canvasEl = document.getElementById('whiteboard-canvas')
    const canvas = new F.Canvas(canvasEl, canvasOptions)
    const wrapper = document.getElementById('canvas-wrapper')
    const initialWidth = wrapper ? wrapper.clientWidth : window.innerWidth - 260
    canvas.setWidth(initialWidth)
    canvas.setHeight(600)
    canvas.calcOffset()
    canvas.requestRenderAll()

    F.Object.prototype.transparentCorners = false
    F.Object.prototype.cornerStyle = 'rect'

    return canvas
  }

  useEffect(() => {
    const F = window.fabric
    if (!F) {
      alert('Fabric library not found. Ensure the CDN script is loaded in index.html')
      return
    }
    // ensure wrapper and canvas have proper styles
    const wrapper = document.getElementById('canvas-wrapper')
    if (wrapper) wrapper.style.position = 'relative'
    const canvasEl = document.getElementById('whiteboard-canvas')
    if (canvasEl) {
      canvasEl.style.display = 'block'
      canvasEl.style.width = '100%'
      canvasEl.style.height = '600px'
    }

    fabricRef.current = createFabricCanvas()
    window.__fabricCanvas = fabricRef.current
    canvasListenersCleanupRef.current = attachFabricListeners(fabricRef.current)

    // handle resize
    const onResize = () => {
      const w = wrapper ? wrapper.clientWidth : window.innerWidth - 260
      fabricRef.current.setWidth(w)
      fabricRef.current.setHeight(600)
      fabricRef.current.calcOffset()
      fabricRef.current.requestRenderAll()
    }
    window.addEventListener('resize', onResize)

    // cleanup
    return () => {
      if (canvasListenersCleanupRef.current) {
        canvasListenersCleanupRef.current()
        canvasListenersCleanupRef.current = null
      }
      if (window.__fabricCanvas === fabricRef.current) {
        window.__fabricCanvas = null
      }
      fabricRef.current.dispose()
      fabricRef.current = null
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // connect socket once on mount
  useEffect(() => {
    const socket = io('http://localhost:4000')
    socketRef.current = socket
    socket.on('connect', () => console.log('socket connected', socket.id))
    socket.on('canvas:update', (json) => {
      applyRemoteCanvas(json)
    })
    return () => {
      socket.disconnect()
    }
  }, [])

  // join room when savedId changes
  useEffect(() => {
    savedIdRef.current = savedId
    if (!socketRef.current) return
    const room = savedId || 'global'
    socketRef.current.emit('join', room)
  }, [savedId])

  // send canvas updates (debounced)
  const sendCanvasUpdate = debounce(() => {
    if (!fabricRef.current || !socketRef.current) return
    if (applyingRemoteRef.current) return
    try {
      const json = fabricRef.current.toJSON(['selectable'])
      const room = savedIdRef.current || 'global'
      socketRef.current.emit('canvas:update', { id: room, json })
    } catch (e) {
      console.error('Failed to emit canvas update', e)
    }
  }, 250)

  function addRect() {
    const F = window.fabric
    const rect = new F.Rect({ left: 100, top: 100, width: 120, height: 80, fill: '#fff', stroke: '#1E3A5F', strokeWidth: 2, selectable: true, evented: true })
    fabricRef.current.add(rect)
    fabricRef.current.setActiveObject(rect)
    rect.setCoords()
    fabricRef.current.requestRenderAll()
  }

  function addCircle() {
    const F = window.fabric
    const circ = new F.Circle({ left: 140, top: 140, radius: 50, fill: '#fff', stroke: '#2E86AB', strokeWidth: 2, selectable: true, evented: true })
    fabricRef.current.add(circ)
    fabricRef.current.setActiveObject(circ)
    circ.setCoords()
    fabricRef.current.requestRenderAll()
  }

  async function saveBoard() {
    const json = fabricRef.current.toJSON(['selectable'])
    try {
      const res = await fetch('http://localhost:4000/api/whiteboards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json)
      })
      const data = await res.json()
      setSavedId(data.id)
      alert('Saved board ID: ' + data.id)
    } catch (err) {
      console.error(err)
      alert('Save failed: ' + err.message)
    }
  }

  async function loadBoard() {
    const id = prompt('Enter board ID to load', savedId || '')
    if (!id) return
    try {
      const res = await fetch(`http://localhost:4000/api/whiteboards/${id}`)
      if (!res.ok) throw new Error('Not found')
      const json = await res.json()
      applyRemoteCanvas(json)
      setSavedId(id)
    } catch (err) {
      console.error(err)
      alert('Load failed: ' + err.message)
    }
  }

  return (
    <div style={{fontFamily: 'Inter, system-ui, sans-serif', padding: 12}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <h1 style={{margin: 0}}>Visual Whiteboard Pro</h1>
        <div style={{marginLeft: 'auto'}}>
          <button onClick={addRect} style={{marginRight:8}}>Add Rectangle</button>
          <button onClick={addCircle} style={{marginRight:8}}>Add Circle</button>
          <button onClick={saveBoard} style={{marginRight:8}}>Save</button>
          <button onClick={loadBoard}>Load</button>
        </div>
      </div>

      <div id="canvas-wrapper" style={{border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 12}}>
        <canvas id="whiteboard-canvas" />
      </div>
    </div>
  )
}

