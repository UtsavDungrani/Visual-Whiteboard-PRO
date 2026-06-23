/**
 * Lasso partial selection helpers for fabric.Object shapes and fabric.Path strokes.
 */

export function isPointInPolygon(p, polygon) {
  if (!polygon || polygon.length < 3) return false
  let isInside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersect =
      (yi > p.y) !== (yj > p.y) &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi
    if (intersect) isInside = !isInside
  }
  return isInside
}

function pathDataToSvgD(pathData, pathOffset = { x: 0, y: 0 }) {
  const ox = pathOffset.x || 0
  const oy = pathOffset.y || 0
  let d = ''
  for (const cmd of pathData) {
    d += cmd[0]
    for (let i = 1; i < cmd.length; i += 2) {
      if (i + 1 < cmd.length) {
        d += ` ${cmd[i] - ox} ${cmd[i + 1] - oy}`
      }
    }
    d += ' '
  }
  return d
}

export function sampleFabricPath(path, spacing = 2) {
  const F = window.fabric
  const pathData = path.path
  if (!F || !pathData || pathData.length === 0) return []

  const d = pathDataToSvgD(pathData, path.pathOffset)
  const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  svgPath.setAttribute('d', d)
  const totalLength = svgPath.getTotalLength()
  if (!totalLength) return []

  const matrix = path.calcTransformMatrix()
  const points = []
  for (let len = 0; len <= totalLength; len += spacing) {
    const pt = svgPath.getPointAtLength(len)
    const canvasPt = F.util.transformPoint(new F.Point(pt.x, pt.y), matrix)
    points.push({ x: canvasPt.x, y: canvasPt.y })
  }
  return points
}

/** Sample stroke pixels using fabric's own hit-testing. */
export function samplePathHitPoints(path, polygon, spacing = 4) {
  const F = window.fabric
  if (!F || !path) return []

  path.setCoords()
  const r = path.getBoundingRect(true, true)
  if (r.width <= 0 && r.height <= 0) return []

  const step = Math.max(spacing, Math.min(r.width, r.height) / 10 || spacing)
  const hits = []

  for (let x = r.left; x <= r.left + r.width; x += step) {
    for (let y = r.top; y <= r.top + r.height; y += step) {
      if (path.containsPoint(new F.Point(x, y), null, true)) {
        hits.push({ x, y, inside: isPointInPolygon({ x, y }, polygon) })
      }
    }
  }
  return hits
}

function bboxCornersInPolygon(path, polygon) {
  path.setCoords()
  const r = path.getBoundingRect(true, true)
  const corners = [
    { x: r.left, y: r.top },
    { x: r.left + r.width, y: r.top },
    { x: r.left, y: r.top + r.height },
    { x: r.left + r.width, y: r.top + r.height },
    { x: r.left + r.width / 2, y: r.top + r.height / 2 },
  ]
  return corners.some((p) => isPointInPolygon(p, polygon))
}

/** @returns {'none'|'full'|'partial'} */
export function getPathSelectionMode(path, polygon) {
  if (!polygon || polygon.length < 3) return 'none'

  const samples = sampleFabricPath(path)
  if (samples.length > 0) {
    let insideCount = 0
    for (const p of samples) {
      if (isPointInPolygon(p, polygon)) insideCount++
    }
    if (insideCount === 0) {
      return bboxCornersInPolygon(path, polygon) ? 'full' : 'none'
    }
    if (insideCount === samples.length) return 'full'
    return 'partial'
  }

  const hits = samplePathHitPoints(path, polygon)
  if (hits.length > 0) {
    const insideCount = hits.filter((h) => h.inside).length
    if (insideCount === 0) return 'none'
    if (insideCount === hits.length) return 'full'
    return 'partial'
  }

  return bboxCornersInPolygon(path, polygon) ? 'full' : 'none'
}

/** Classifies selection mode for any object (Paths & standard shapes) */
export function getObjectSelectionMode(obj, polygon) {
  if (!polygon || polygon.length < 3) return 'none'

  if (obj.type === 'path') {
    return getPathSelectionMode(obj, polygon)
  }

  // Non-path shapes (Rect, Circle, Diamond, etc.)
  obj.setCoords()
  const r = obj.getBoundingRect(true, true)
  const corners = [
    { x: r.left, y: r.top },
    { x: r.left + r.width, y: r.top },
    { x: r.left, y: r.top + r.height },
    { x: r.left + r.width, y: r.top + r.height }
  ]

  let insideCount = 0
  for (const pt of corners) {
    if (isPointInPolygon(pt, polygon)) insideCount++
  }

  if (insideCount === 4) {
    return 'full'
  }
  if (insideCount > 0) {
    return 'partial'
  }

  // Check if lasso is completely inside the shape boundary
  const lassoInsideShape = polygon.some(p =>
    p.x >= r.left && p.x <= r.left + r.width &&
    p.y >= r.top && p.y <= r.top + r.height
  )
  if (lassoInsideShape) {
    return 'partial'
  }

  return 'none'
}

function canvasPolygonToLocal(obj, polygonCanvasPts) {
  const F = window.fabric
  const inv = F.util.invertTransform(obj.calcTransformMatrix())
  return polygonCanvasPts.map((p) =>
    F.util.transformPoint(new F.Point(p.x, p.y), inv)
  )
}

function buildClipPolygon(localPoints) {
  const F = window.fabric
  return new F.Polygon(
    localPoints.map((p) => ({ x: p.x, y: p.y })),
    {
      absolutePositioned: false,
      originX: 'left',
      originY: 'top',
      objectCaching: false,
      selectable: false,
      evented: false,
    }
  )
}

/**
 * Split any shape object at the lasso boundary using clipPaths.
 * The selected region becomes a new object; the original keeps the outside region.
 */
export function splitObjectWithLasso(canvas, obj, polygonCanvasPts) {
  const F = window.fabric
  if (!canvas || !obj || !F || polygonCanvasPts.length < 3) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    obj.clone(
      (cloned) => {
        if (!cloned) {
          resolve(null)
          return
        }

        const localPoly = canvasPolygonToLocal(obj, polygonCanvasPts)
        const forwardClip = buildClipPolygon(localPoly)
        forwardClip.inverted = false

        const inverseClip = buildClipPolygon(localPoly)
        inverseClip.inverted = true

        let finalClonedClipPath = forwardClip
        if (cloned.clipPath && F.util.mergeClipPaths) {
          finalClonedClipPath = F.util.mergeClipPaths(forwardClip, cloned.clipPath)
        }

        cloned.set({
          id: 'el-' + Date.now() + '-' + Math.round(Math.random() * 1e9),
          clipPath: finalClonedClipPath,
          selectable: true,
          evented: true,
          erasable: obj.erasable !== false,
          objectCaching: false,
          lassoPoints: polygonCanvasPts,
          initialMatrix: cloned.calcTransformMatrix(),
        })

        let finalInverseClip
        if (obj.clipPath) {
          let existingPolygons = []
          if (obj.clipPath.isType && obj.clipPath.isType('group')) {
            existingPolygons = obj.clipPath.getObjects().map(p => {
              p.set({ inverted: false })
              return p
            })
          } else {
            obj.clipPath.set({ inverted: false })
            existingPolygons = [obj.clipPath]
          }
          
          const excludePolygon = buildClipPolygon(localPoly)
          excludePolygon.inverted = false
          existingPolygons.push(excludePolygon)
          
          const group = new F.Group(existingPolygons, {
            absolutePositioned: false,
            originX: 'left',
            originY: 'top',
            objectCaching: false,
            selectable: false,
            evented: false,
          })
          group.inverted = true
          finalInverseClip = group
        } else {
          const inverseClip = buildClipPolygon(localPoly)
          inverseClip.inverted = true
          finalInverseClip = inverseClip
        }

        obj.set({
          clipPath: finalInverseClip,
          objectCaching: false,
          lassoPoints: polygonCanvasPts,
          initialMatrix: obj.calcTransformMatrix(),
          isCutoutRemainder: true,
        })

        obj.dirty = true
        cloned.dirty = true
        canvas.add(cloned)
        cloned.setCoords()
        obj.setCoords()
        canvas.fire('object:modified', { target: obj })
        resolve(cloned)
      },
      ['eraser', 'erasable', 'globalCompositeOperation']
    )
  })
}
