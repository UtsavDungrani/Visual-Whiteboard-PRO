/**
 * Magnetic anchors in canvas space (viewport / zoom independent).
 * Uses calcTransformMatrix so grouped / multi-selected objects stay correct.
 */

export function localAnchorOffset(width, height, anchor) {
  const w = width || 0;
  const h = height || 0;
  switch (anchor) {
    case "left":
      return { x: -w / 2, y: 0 };
    case "right":
      return { x: w / 2, y: 0 };
    case "top":
      return { x: 0, y: -h / 2 };
    case "bottom":
      return { x: 0, y: h / 2 };
    default:
      return { x: 0, y: 0 };
  }
}

export function canvasToScreen(canvas, pt) {
  const F = typeof window !== "undefined" ? window.fabric : null;
  if (!F || !canvas?.viewportTransform) {
    return { x: pt.x, y: pt.y };
  }
  const screen = F.util.transformPoint(
    new F.Point(pt.x, pt.y),
    canvas.viewportTransform,
  );
  return { x: screen.x, y: screen.y };
}

/**
 * Side midpoint of a shape in canvas coordinates (ignores zoom / viewport).
 */
export function getAnchorPoint(fabricObject, anchor) {
  const F = typeof window !== "undefined" ? window.fabric : null;
  const local = localAnchorOffset(
    fabricObject.width,
    fabricObject.height,
    anchor,
  );
  if (!F || !fabricObject?.calcTransformMatrix) {
    return local;
  }
  const pt = F.util.transformPoint(
    new F.Point(local.x, local.y),
    fabricObject.calcTransformMatrix(),
  );
  return { x: pt.x, y: pt.y };
}

export function findClosestAnchor(canvas, mousePointer, threshold = 12) {
  const objects = canvas.getObjects().filter((obj) => {
    return (
      obj.id !== "page-boundary" &&
      obj.type !== "connector" &&
      obj.visible !== false
    );
  });

  const zoom = canvas.getZoom() || 1;
  const thresholdCanvas = threshold / zoom;
  let minDistance = thresholdCanvas;
  let closest = null;

  for (const obj of objects) {
    for (const pos of ["left", "right", "top", "bottom"]) {
      const canvasCoords = getAnchorPoint(obj, pos);
      const dist = Math.hypot(
        mousePointer.x - canvasCoords.x,
        mousePointer.y - canvasCoords.y,
      );
      if (dist < minDistance) {
        minDistance = dist;
        const screen = canvasToScreen(canvas, canvasCoords);
        closest = {
          object: obj,
          anchor: pos,
          screenX: screen.x,
          screenY: screen.y,
          canvasX: canvasCoords.x,
          canvasY: canvasCoords.y,
        };
      }
    }
  }

  return closest;
}
