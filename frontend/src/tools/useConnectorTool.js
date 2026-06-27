import { useEffect, useRef } from 'react'
import { findClosestAnchor, getAnchorPoint } from '../utils/anchorPoints'
import { ConnectorLine } from './ConnectorLine'

/**
 * Custom hook to manage the magnetic connector drawing state machine.
 */
export function useConnectorTool({
  canvas,
  activeTool,
  overlayRef,
  onConnectorAdded // Callback when a new ConnectorLine is created
}) {
  const drawingStateRef = useRef({
    isDrawing: false,
    source: null,       // { object, anchor, canvasX, canvasY, screenX, screenY }
    activeAnchor: null, // Currently snapped anchor
    hoveredObject: null // Currently hovered shape
  })

  const onConnectorAddedRef = useRef(onConnectorAdded)
  useEffect(() => {
    onConnectorAddedRef.current = onConnectorAdded
  }, [onConnectorAdded])

  const lastScreenMouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!canvas || !overlayRef.current) return
    if (activeTool !== 'connector') {
      // Clear overlay when leaving connector tool
      const ctx = overlayRef.current.getContext('2d')
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height)
      drawingStateRef.current = { isDrawing: false, source: null, activeAnchor: null, hoveredObject: null }
      return
    }

    // Disable standard Fabric selections when connector tool is active
    canvas.selection = false
    canvas.discardActiveObject()
    canvas.requestRenderAll()

    const ctx = overlayRef.current.getContext('2d')

    const getScreenPointer = (e) => {
      // Return cursor coordinates relative to overlay canvas element viewport
      const rect = overlayRef.current.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }

    const drawAnchor = (context, x, y, isSnapped) => {
      context.beginPath()
      context.arc(x, y, isSnapped ? 9 : 6, 0, Math.PI * 2)
      context.fillStyle = isSnapped ? '#27AE60' : '#2E86AB'
      context.fill()
      context.strokeStyle = '#FFFFFF'
      context.lineWidth = 2
      context.stroke()
    }

    const redrawOverlay = (currentScreenMouse) => {
      if (!overlayRef.current) return
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height)

      const state = drawingStateRef.current

      // 1. Draw hovered shapes anchors (in blue)
      if (state.hoveredObject) {
        // Draw 4 anchor points
        const positions = ['left', 'right', 'top', 'bottom']
        positions.forEach(pos => {
          const canvasPt = getAnchorPoint(state.hoveredObject, pos, true)
          const F = window.fabric
          let screenX = canvasPt.x
          let screenY = canvasPt.y
          if (F && canvas.viewportTransform) {
            const tempPt = new F.Point(canvasPt.x, canvasPt.y)
            const projected = F.util.transformPoint(tempPt, canvas.viewportTransform)
            screenX = projected.x
            screenY = projected.y
          }

          // Don't draw over a snapped green highlight
          const isSnapped = state.activeAnchor && 
                            state.activeAnchor.object.id === state.hoveredObject.id && 
                            state.activeAnchor.anchor === pos
          if (!isSnapped) {
            drawAnchor(ctx, screenX, screenY, false)
          }
        })
      }

      // 2. Draw snapped active anchor (in green)
      if (state.activeAnchor) {
        // Re-calculate screen position on redraw in case scale or zoom changed
        const canvasCoords = getAnchorPoint(state.activeAnchor.object, state.activeAnchor.anchor, true)
        const F = window.fabric
        let screenX = state.activeAnchor.screenX
        let screenY = state.activeAnchor.screenY
        if (F && canvas.viewportTransform) {
          const pt = new F.Point(canvasCoords.x, canvasCoords.y)
          const screenPt = F.util.transformPoint(pt, canvas.viewportTransform)
          screenX = screenPt.x
          screenY = screenPt.y
        }
        drawAnchor(ctx, screenX, screenY, true)
      }

      // 3. Draw dashed preview line if drawing
      if (state.isDrawing && state.source && currentScreenMouse) {
        const sourceCoords = getAnchorPoint(state.source.object, state.source.anchor, true)
        const F = window.fabric
        let sourceScreenX = state.source.screenX
        let sourceScreenY = state.source.screenY
        if (F && canvas.viewportTransform) {
          const pt = new F.Point(sourceCoords.x, sourceCoords.y)
          const screenPt = F.util.transformPoint(pt, canvas.viewportTransform)
          sourceScreenX = screenPt.x
          sourceScreenY = screenPt.y
        }

        ctx.beginPath()
        ctx.moveTo(sourceScreenX, sourceScreenY)
        ctx.lineTo(currentScreenMouse.x, currentScreenMouse.y)
        ctx.strokeStyle = '#2E86AB'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        ctx.stroke()
        ctx.setLineDash([]) // Reset dash array
      }
    }

    const handleMouseMove = (options) => {
      const e = options.e
      const mousePointer = canvas.getPointer(e)
      const screenPointer = getScreenPointer(e)
      lastScreenMouseRef.current = screenPointer

      const state = drawingStateRef.current

      // Find closest anchor within snapping radius
      const snapped = findClosestAnchor(canvas, mousePointer, 15)

      if (snapped) {
        state.activeAnchor = snapped
        state.hoveredObject = snapped.object
      } else {
        state.activeAnchor = null
        
        // Find general hovered object if no anchor snapped
        const target = canvas.findTarget(e, true)
        if (target && target.id !== 'page-boundary' && target.type !== 'connector') {
          state.hoveredObject = target
        } else {
          state.hoveredObject = null
        }
      }

      redrawOverlay(screenPointer)
    }

    const handleMouseDown = (options) => {
      const e = options.e
      const state = drawingStateRef.current
      console.log("[ConnectorTool] mouse:down", {
        activeAnchor: state.activeAnchor ? { objectId: state.activeAnchor.object.id, anchor: state.activeAnchor.anchor } : null,
        isDrawing: state.isDrawing,
        source: state.source ? { objectId: state.source.object.id, anchor: state.source.anchor } : null
      })

      if (state.activeAnchor) {
        if (!state.isDrawing) {
          // 1. Start drawing from source anchor
          state.source = { ...state.activeAnchor }
          state.isDrawing = true
          console.log("[ConnectorTool] Started drawing from source:", state.source)
        } else {
          // 2. Finish drawing at target anchor
          const sourceObj = state.source.object
          const targetObj = state.activeAnchor.object
          console.log("[ConnectorTool] Attempting to finalize connection between:", sourceObj.id, "and", targetObj.id)

          if (sourceObj.id !== targetObj.id) {
            // Finalize connector creation
            const points = [
              state.source.canvasX,
              state.source.canvasY,
              state.activeAnchor.canvasX,
              state.activeAnchor.canvasY
            ]
            console.log("[ConnectorTool] Instantiating ConnectorLine with points:", points)

            try {
              const connector = new ConnectorLine(points, {
                data: {
                  id: Math.random().toString(36).substring(2, 9),
                  type: 'connector',
                  sourceId: sourceObj.id,
                  sourceAnchor: state.source.anchor,
                  targetId: targetObj.id,
                  targetAnchor: state.activeAnchor.anchor
                }
              })
              console.log("[ConnectorTool] ConnectorLine instantiated successfully:", connector)

              canvas.add(connector)
              canvas.renderAll()
              console.log("[ConnectorTool] Connector added to canvas")

              if (onConnectorAddedRef.current) {
                onConnectorAddedRef.current(connector)
              }
            } catch (err) {
              console.error("[ConnectorTool] Error creating connector line:", err)
            }
          } else {
            console.warn("[ConnectorTool] Cancelled: source and target are the same object")
          }

          // Reset drawing state
          state.isDrawing = false
          state.source = null
          state.activeAnchor = null
          state.hoveredObject = null
        }
      } else {
        // Clicked on empty space: cancel drawing
        console.log("[ConnectorTool] Clicked on empty space, resetting drawing state")
        state.isDrawing = false
        state.source = null
        state.activeAnchor = null
        state.hoveredObject = null
      }

      redrawOverlay(getScreenPointer(e))
    }

    const handleAfterRender = () => {
      const state = drawingStateRef.current
      if (state.hoveredObject || state.activeAnchor || state.isDrawing) {
        redrawOverlay(lastScreenMouseRef.current)
      }
    }

    // Bind listeners to FabricJS canvas
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:down', handleMouseDown)
    canvas.on('after:render', handleAfterRender)

    return () => {
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('after:render', handleAfterRender)
    }
  }, [canvas, activeTool, overlayRef])
}
