import { useEffect } from 'react'
import { getAnchorPoint } from '../utils/anchorPoints'

/**
 * Custom hook to synchronize connector line endpoints when connected shapes are moved, scaled, or modified.
 */
export function useConnectorSync(canvas) {
  useEffect(() => {
    if (!canvas) return

    const handleObjectMove = (e) => {
      const movedObject = e.target
      if (!movedObject || movedObject.type === 'connector' || movedObject.id === 'page-boundary') {
        return
      }

      // Find all connectors on the canvas
      const connectors = canvas.getObjects().filter(obj => obj.type === 'connector')
      let updatedAny = false

      for (const connector of connectors) {
        if (!connector.data) continue

        const { sourceId, sourceAnchor, targetId, targetAnchor } = connector.data

        if (sourceId === movedObject.id) {
          const pt = getAnchorPoint(movedObject, sourceAnchor, true)
          connector.set({ x1: pt.x, y1: pt.y })
          connector.setCoords()
          updatedAny = true
        }

        if (targetId === movedObject.id) {
          const pt = getAnchorPoint(movedObject, targetAnchor, true)
          connector.set({ x2: pt.x, y2: pt.y })
          connector.setCoords()
          updatedAny = true
        }
      }

      if (updatedAny) {
        canvas.renderAll()
      }
    }

    // Bind listeners
    canvas.on('object:moving', handleObjectMove)
    canvas.on('object:scaling', handleObjectMove)
    canvas.on('object:modified', handleObjectMove)

    return () => {
      canvas.off('object:moving', handleObjectMove)
      canvas.off('object:scaling', handleObjectMove)
      canvas.off('object:modified', handleObjectMove)
    }
  }, [canvas])
}

/**
 * Utility function to manually update all connectors for a specific canvas.
 * Useful after loading a canvas, running AI cleanup, or bulk operations.
 */
export function updateAllConnectors(canvas) {
  if (!canvas) return

  const connectors = canvas.getObjects().filter(obj => obj.type === 'connector')
  const shapes = canvas.getObjects().filter(obj => obj.id !== 'page-boundary' && obj.type !== 'connector')
  
  const shapesMap = new Map(shapes.map(s => [s.id, s]))
  let updatedAny = false

  for (const connector of connectors) {
    if (!connector.data) continue
    const { sourceId, sourceAnchor, targetId, targetAnchor } = connector.data

    const sourceObj = shapesMap.get(sourceId)
    const targetObj = shapesMap.get(targetId)

    if (sourceObj) {
      const pt = getAnchorPoint(sourceObj, sourceAnchor, true)
      connector.set({ x1: pt.x, y1: pt.y })
      updatedAny = true
    }

    if (targetObj) {
      const pt = getAnchorPoint(targetObj, targetAnchor, true)
      connector.set({ x2: pt.x, y2: pt.y })
      updatedAny = true
    }

    if (sourceObj || targetObj) {
      connector.setCoords()
    }
  }

  if (updatedAny) {
    canvas.renderAll()
  }
}
