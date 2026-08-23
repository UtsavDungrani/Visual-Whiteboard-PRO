import { useEffect } from "react";
import { getAnchorPoint } from "../utils/anchorPoints";

function collectMovedShapes(target, out = []) {
  if (!target || target.type === "connector" || target.id === "page-boundary") {
    return out;
  }
  if (target.type === "activeSelection" || target.type === "group") {
    const kids = target.getObjects
      ? target.getObjects()
      : target._objects || [];
    kids.forEach((child) => collectMovedShapes(child, out));
  }
  if (target.id) {
    out.push(target);
  }
  return out;
}

function stripConnectorsFromSelection(canvas) {
  const active = canvas.getActiveObject();
  if (!active) return;
  if (active.type === "connector") {
    return;
  }
  if (active.type !== "activeSelection") return;
  const connectors = active
    .getObjects()
    .filter((obj) => obj.type === "connector");
  if (connectors.length === 0) return;
  connectors.forEach((conn) => active.removeWithUpdate(conn));
  const remaining = active.getObjects();
  if (remaining.length === 0) {
    canvas.discardActiveObject();
  } else if (remaining.length === 1) {
    canvas.setActiveObject(remaining[0]);
  }
  canvas.requestRenderAll();
}

function applyConnectorAnchors(connector, shapesMap) {
  if (!connector.data) return false;
  const { sourceId, sourceAnchor, targetId, targetAnchor } = connector.data;
  const sourceObj = shapesMap.get(sourceId);
  const targetObj = shapesMap.get(targetId);
  if (!sourceObj && !targetObj) return false;

  const p1 = sourceObj
    ? getAnchorPoint(sourceObj, sourceAnchor)
    : { x: connector.x1, y: connector.y1 };
  const p2 = targetObj
    ? getAnchorPoint(targetObj, targetAnchor)
    : { x: connector.x2, y: connector.y2 };

  if (typeof connector.setEndpoints === "function") {
    connector.setEndpoints(p1.x, p1.y, p2.x, p2.y);
  } else {
    connector.set({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
    });
    connector.setCoords();
  }
  connector.set({
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    objectCaching: false,
  });
  return true;
}

function shapesMapFromCanvas(canvas) {
  return new Map(
    canvas
      .getObjects()
      .filter(
        (obj) =>
          obj.id && obj.id !== "page-boundary" && obj.type !== "connector",
      )
      .map((s) => [s.id, s]),
  );
}

export function useConnectorSync(canvas) {
  useEffect(() => {
    if (!canvas) return;

    const handleObjectMove = (e) => {
      const moved = collectMovedShapes(e.target);
      if (moved.length === 0) return;

      const movedIds = new Set(moved.map((obj) => obj.id));
      const shapesMap = shapesMapFromCanvas(canvas);
      let updatedAny = false;

      for (const connector of canvas.getObjects()) {
        if (connector.type !== "connector" || !connector.data) continue;
        const { sourceId, targetId } = connector.data;
        if (!movedIds.has(sourceId) && !movedIds.has(targetId)) continue;
        if (applyConnectorAnchors(connector, shapesMap)) {
          updatedAny = true;
        }
      }

      if (updatedAny) {
        canvas.requestRenderAll();
      }
    };

    const handleSelection = () => stripConnectorsFromSelection(canvas);

    canvas.on("object:moving", handleObjectMove);
    canvas.on("object:scaling", handleObjectMove);
    canvas.on("object:rotating", handleObjectMove);
    canvas.on("object:modified", handleObjectMove);
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);

    return () => {
      canvas.off("object:moving", handleObjectMove);
      canvas.off("object:scaling", handleObjectMove);
      canvas.off("object:rotating", handleObjectMove);
      canvas.off("object:modified", handleObjectMove);
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
    };
  }, [canvas]);
}

export function updateAllConnectors(canvas) {
  if (!canvas) return;

  const shapesMap = shapesMapFromCanvas(canvas);
  let updatedAny = false;

  for (const connector of canvas.getObjects()) {
    if (connector.type !== "connector") continue;
    if (applyConnectorAnchors(connector, shapesMap)) {
      updatedAny = true;
    }
  }

  if (updatedAny) {
    canvas.requestRenderAll();
  }
}
