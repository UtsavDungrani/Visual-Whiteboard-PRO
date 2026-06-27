import React, { useEffect, useRef } from 'react'

/**
 * CanvasOverlay sits on top of the FabricJS canvas wrapper.
 * It has pointer-events: none so that all mouse clicks and drags
 * pass directly to the FabricJS viewport underneath.
 */
export default function CanvasOverlay({ fabricCanvas, overlayRef }) {
  useEffect(() => {
    if (!fabricCanvas || !overlayRef.current) return

    const canvasElement = overlayRef.current
    const originalParent = canvasElement.parentElement
    
    // Find the FabricJS container (.canvas-container)
    const container = originalParent?.querySelector('.canvas-container')
    if (container) {
      container.appendChild(canvasElement)
    }

    const resizeOverlay = () => {
      // Match the Fabric canvas width and height exactly
      canvasElement.width = fabricCanvas.getWidth()
      canvasElement.height = fabricCanvas.getHeight()
      canvasElement.style.width = fabricCanvas.getWidth() + 'px'
      canvasElement.style.height = fabricCanvas.getHeight() + 'px'
    }

    // Initialize and bind resize listener
    resizeOverlay()
    window.addEventListener('resize', resizeOverlay)
    
    // Also listen to Fabric canvas events to trigger overlay updates
    fabricCanvas.on('after:render', resizeOverlay)

    return () => {
      // Append back to original parent so React can clean it up safely
      if (canvasElement && originalParent && canvasElement.parentElement !== originalParent) {
        originalParent.appendChild(canvasElement)
      }
      window.removeEventListener('resize', resizeOverlay)
      fabricCanvas.off('after:render', resizeOverlay)
    }
  }, [fabricCanvas, overlayRef])

  return (
    <canvas
      ref={overlayRef}
      className="canvas-overlay"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 9, // Sits right on top of FabricJS canvas elements
      }}
    />
  )
}
