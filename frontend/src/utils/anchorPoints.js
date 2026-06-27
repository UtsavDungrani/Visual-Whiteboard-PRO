/**
 * Helper utilities for rendering and snapping to magnetic connection points on FabricJS shapes.
 */

/**
 * Calculates the coordinates of an anchor point on a FabricJS object.
 * @param {fabric.Object} fabricObject - The FabricJS shape.
 * @param {string} anchor - 'left' | 'right' | 'top' | 'bottom'.
 * @param {boolean} absolute - If true, returns canvas space coordinates. If false, returns viewport/screen space coordinates.
 */
export function getAnchorPoint(fabricObject, anchor, absolute = false) {
  // fabricObject.getBoundingRect(absolute) returns bounds in canvas coordinate space when absolute = true.
  // When absolute = false, it returns bounds in viewport/screen space.
  const bounds = fabricObject.getBoundingRect(absolute)
  const cx = bounds.left + bounds.width / 2
  const cy = bounds.top + bounds.height / 2

  switch (anchor) {
    case 'left':
      return { x: bounds.left, y: cy }
    case 'right':
      return { x: bounds.left + bounds.width, y: cy }
    case 'top':
      return { x: cx, y: bounds.top }
    case 'bottom':
      return { x: cx, y: bounds.top + bounds.height }
    default:
      return { x: cx, y: cy }
  }
}

/**
 * Finds all anchor points of an object in screen space.
 */
export function getObjectAnchors(fabricObject) {
  return [
    { name: 'left', ...getAnchorPoint(fabricObject, 'left', false) },
    { name: 'right', ...getAnchorPoint(fabricObject, 'right', false) },
    { name: 'top', ...getAnchorPoint(fabricObject, 'top', false) },
    { name: 'bottom', ...getAnchorPoint(fabricObject, 'bottom', false) }
  ]
}

/**
 * Find the closest anchor point within snapping distance.
 * @param {fabric.Canvas} canvas - Fabric canvas.
 * @param {Object} mousePointer - {x, y} coordinates of the cursor.
 * @param {number} threshold - Snapping radius in pixels (e.g. 12px).
 * @returns {Object|null} Snapped anchor info { object, anchor, screenX, screenY, canvasX, canvasY }
 */
export function findClosestAnchor(canvas, mousePointer, threshold = 12) {
  // Find all elements except line/connector, active overlay, grid, etc.
  const objects = canvas.getObjects().filter(obj => {
    return obj.id !== 'page-boundary' && 
           obj.type !== 'connector' && 
           obj.visible !== false
  })

  let closest = null
  const zoom = canvas.getZoom() || 1
  // Convert screen threshold (px) to canvas space threshold
  const thresholdCanvas = threshold / zoom
  let minDistance = thresholdCanvas

  for (const obj of objects) {
    const positions = ['left', 'right', 'top', 'bottom']
    for (const pos of positions) {
      // Get anchor coordinate in absolute canvas space
      const canvasCoords = getAnchorPoint(obj, pos, true)
      
      const dx = mousePointer.x - canvasCoords.x
      const dy = mousePointer.y - canvasCoords.y
      const dist = Math.hypot(dx, dy)

      if (dist < minDistance) {
        minDistance = dist
        
        // Convert canvas coordinates to screen coordinates for overlay drawing
        const F = window.fabric
        let screenX = canvasCoords.x
        let screenY = canvasCoords.y
        if (F && canvas.viewportTransform) {
          const pt = new F.Point(canvasCoords.x, canvasCoords.y)
          const screenPt = F.util.transformPoint(pt, canvas.viewportTransform)
          screenX = screenPt.x
          screenY = screenPt.y
        }

        closest = {
          object: obj,
          anchor: pos,
          screenX: screenX,
          screenY: screenY,
          canvasX: canvasCoords.x,
          canvasY: canvasCoords.y
        }
      }
    }
  }

  return closest
}
