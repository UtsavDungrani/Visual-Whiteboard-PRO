/**
 * Lasso partial selection helpers for fabric.Object shapes and fabric.Path strokes.
 */

export function isPointInPolygon(p, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

function pathDataToSvgD(pathData, pathOffset = { x: 0, y: 0 }) {
  const ox = pathOffset.x || 0;
  const oy = pathOffset.y || 0;
  let d = "";
  for (const cmd of pathData) {
    d += cmd[0];
    for (let i = 1; i < cmd.length; i += 2) {
      if (i + 1 < cmd.length) {
        d += ` ${cmd[i] - ox} ${cmd[i + 1] - oy}`;
      }
    }
    d += " ";
  }
  return d;
}

export function sampleFabricPath(path, spacing = 2) {
  const F = window.fabric;
  const pathData = path.path;
  if (!F || !pathData || pathData.length === 0) return [];

  const d = pathDataToSvgD(pathData, path.pathOffset);
  const svgPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  svgPath.setAttribute("d", d);
  const totalLength = svgPath.getTotalLength();
  if (!totalLength) return [];

  const matrix = path.calcTransformMatrix();
  const points = [];
  for (let len = 0; len <= totalLength; len += spacing) {
    const pt = svgPath.getPointAtLength(len);
    const canvasPt = F.util.transformPoint(new F.Point(pt.x, pt.y), matrix);
    points.push({ x: canvasPt.x, y: canvasPt.y });
  }
  return points;
}

/** Sample stroke pixels using fabric's own hit-testing. */
export function samplePathHitPoints(path, polygon, spacing = 4) {
  const F = window.fabric;
  if (!F || !path) return [];

  path.setCoords();
  const r = path.getBoundingRect(true, true);
  if (r.width <= 0 && r.height <= 0) return [];

  const step = Math.max(spacing, Math.min(r.width, r.height) / 10 || spacing);
  const hits = [];

  for (let x = r.left; x <= r.left + r.width; x += step) {
    for (let y = r.top; y <= r.top + r.height; y += step) {
      if (path.containsPoint(new F.Point(x, y), null, true)) {
        hits.push({ x, y, inside: isPointInPolygon({ x, y }, polygon) });
      }
    }
  }
  return hits;
}

function bboxCornersInPolygon(path, polygon) {
  path.setCoords();
  const r = path.getBoundingRect(true, true);
  const corners = [
    { x: r.left, y: r.top },
    { x: r.left + r.width, y: r.top },
    { x: r.left, y: r.top + r.height },
    { x: r.left + r.width, y: r.top + r.height },
    { x: r.left + r.width / 2, y: r.top + r.height / 2 },
  ];
  return corners.some((p) => isPointInPolygon(p, polygon));
}

/** @returns {'none'|'full'|'partial'} */
export function getPathSelectionMode(path, polygon) {
  if (!polygon || polygon.length < 3) return "none";

  const samples = sampleFabricPath(path);
  if (samples.length > 0) {
    let insideCount = 0;
    for (const p of samples) {
      if (isPointInPolygon(p, polygon)) insideCount++;
    }
    if (insideCount === 0) {
      return bboxCornersInPolygon(path, polygon) ? "full" : "none";
    }
    if (insideCount === samples.length) return "full";
    return "partial";
  }

  const hits = samplePathHitPoints(path, polygon);
  if (hits.length > 0) {
    const insideCount = hits.filter((h) => h.inside).length;
    if (insideCount === 0) return "none";
    if (insideCount === hits.length) return "full";
    return "partial";
  }

  // ponytail: no stroke hits at all — treat as 'none' even if bbox corner is inside.
  // Earlier code returned 'full' here, which wrongly selected paths the lasso didn't touch.
  return "none";
}

/** Compute transformed canvas-space endpoints for a fabric.Line. */
export function getLineEndpoints(line) {
  const F = window.fabric;
  if (
    line &&
    typeof line.calcLinePoints === "function" &&
    typeof line.calcTransformMatrix === "function" &&
    F
  ) {
    const pts = line.calcLinePoints();
    const matrix = line.calcTransformMatrix();
    const p1 = F.util.transformPoint(new F.Point(pts.x1, pts.y1), matrix);
    const p2 = F.util.transformPoint(new F.Point(pts.x2, pts.y2), matrix);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }
  return {
    x1: line.x1 != null ? line.x1 : line.left || 0,
    y1: line.y1 != null ? line.y1 : line.top || 0,
    x2: line.x2 != null ? line.x2 : line.left || 0,
    y2: line.y2 != null ? line.y2 : line.top || 0,
  };
}

/** Classifies selection mode for any object (Paths, Lines & standard shapes) */
export function getObjectSelectionMode(obj, polygon) {
  if (!polygon || polygon.length < 3) return "none";

  if (obj.type === "path") {
    return getPathSelectionMode(obj, polygon);
  }

  // ponytail: a Line is 1px-wide — its bbox corners almost never land on the stroke,
  // so the corner-based "partial" check below misses it. We compute the segment
  // crossing count directly using transformed canvas-space endpoints.
  if (obj.type === "line" || obj.customType === "line") {
    const { x1, y1, x2, y2 } = getLineEndpoints(obj);
    const { inside, outside } = splitSegmentByPolygon(x1, y1, x2, y2, polygon);
    if (inside.length === 0) return "none";
    if (outside.length === 0) return "full";
    return "partial";
  }

  // Non-path shapes (Rect, Circle, Diamond, etc.)
  obj.setCoords();
  // Use the object's oriented bounding-box corners (which account for rotation)
  // rather than the axis-aligned getBoundingRect corners. For a rotated shape
  // the AABB corners sit in empty space, so the old code both split shapes the
  // lasso only grazed and reported 'partial' for shapes that were fully enclosed.
  const orientedCorners =
    typeof obj.getCoords === "function"
      ? obj.getCoords(true, true)
      : (() => {
          const r = obj.getBoundingRect(true, true);
          return [
            { x: r.left, y: r.top },
            { x: r.left + r.width, y: r.top },
            { x: r.left + r.width, y: r.top + r.height },
            { x: r.left, y: r.top + r.height },
          ];
        })();
  const corners = orientedCorners.map((p) => ({ x: p.x, y: p.y }));

  let insideCount = 0;
  for (const pt of corners) {
    if (isPointInPolygon(pt, polygon)) insideCount++;
  }

  if (insideCount === 4) {
    return "full";
  }
  if (insideCount > 0) {
    return "partial";
  }

  // Check if lasso actually overlaps the drawn shape (not just the bbox).
  // For curved shapes (Circle, Diamond, Polygon) the bbox can contain empty space,
  // so we use fabric's own containsPoint on a few sample points of the lasso.
  const F = window.fabric;
  const sample = polygon[0];
  if (obj.containsPoint && obj.containsPoint(new F.Point(sample.x, sample.y))) {
    return "partial";
  }
  // ponytail: a polygon vertex inside the bbox isn't enough — round/diamond shapes
  // have empty corners. Falling back to 'none' here prevents splitting shapes
  // when the lasso was drawn in empty space inside their bbox.

  return "none";
}

function canvasPolygonToLocal(obj, polygonCanvasPts) {
  const F = window.fabric;
  const inv = F.util.invertTransform(obj.calcTransformMatrix());
  return polygonCanvasPts.map((p) =>
    F.util.transformPoint(new F.Point(p.x, p.y), inv),
  );
}

function buildClipPolygon(localPoints) {
  const F = window.fabric;
  return new F.Polygon(
    localPoints.map((p) => ({ x: p.x, y: p.y })),
    {
      absolutePositioned: false,
      originX: "left",
      originY: "top",
      objectCaching: false,
      selectable: false,
      evented: false,
    },
  );
}

function lineLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  // t and u both in [0,1] -> segments actually cross
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), t };
}

/**
 * Walk a line segment along a polygon edge list and split it into inside/outside pieces.
 * Returns { inside: [{x1,y1,x2,y2}, ...], outside: [...] }.
 * General (non-convex) polygons: Weiler-Atherton would be textbook, but for lasso
 * tool UX, general (potentially self-intersecting) polygons are rare — we use a
 * parametric approach that handles them correctly anyway:
 *   - For each polygon edge, compute t-values where the segment crosses that edge.
 *   - Sort intersection t-values; alternate inside/outside between them.
 */
function splitSegmentByPolygon(x1, y1, x2, y2, polygon) {
  const ts = [];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const hit = lineLineIntersection(
      x1,
      y1,
      x2,
      y2,
      polygon[j].x,
      polygon[j].y,
      polygon[i].x,
      polygon[i].y,
    );
    if (hit) ts.push(hit.t);
  }
  ts.sort((a, b) => a - b);

  const inside = [];
  const outside = [];
  const EPS = 1e-6;
  const cuts = [0, ...ts, 1];
  for (let k = 0; k < cuts.length - 1; k++) {
    const a = cuts[k];
    const b = cuts[k + 1];
    if (b - a < EPS) continue;
    const midT = (a + b) / 2;
    const mx = x1 + midT * (x2 - x1);
    const my = y1 + midT * (y2 - y1);
    const isIn = isPointInPolygon({ x: mx, y: my }, polygon);
    const seg = {
      x1: x1 + a * (x2 - x1),
      y1: y1 + a * (y2 - y1),
      x2: x1 + b * (x2 - x1),
      y2: y1 + b * (y2 - y1),
    };
    if (seg.x1 === seg.x2 && seg.y1 === seg.y2) continue;
    (isIn ? inside : outside).push(seg);
  }
  return { inside, outside };
}

/**
 * Split a fabric.Line at the lasso boundary.
 * Replaces the original line with: 0+ outside-pieces (stays in canvas) and
 * 0+ inside-pieces (returned in `picked` and added to the canvas).
 * Returns the array of new inside line objects to add to the selection.
 */
export function splitLineWithLasso(canvas, line, polygonCanvasPts) {
  const F = window.fabric;
  if (!canvas || !line || !F || polygonCanvasPts.length < 3) return [];

  const { x1, y1, x2, y2 } = getLineEndpoints(line);
  const { inside, outside } = splitSegmentByPolygon(
    x1,
    y1,
    x2,
    y2,
    polygonCanvasPts,
  );

  if (inside.length === 0) return []; // line is fully outside the lasso
  if (outside.length === 0) return [line]; // line is fully inside

  // ponytail: build a fresh Line for each inside and outside piece rather than
  // mutating the original — fabric's internal caches (coords, dims) don't
  // recompute on a `set({x1,y1,x2,y2})` reliably, and a stale object is the
  // #1 cause of "selection doesn't show, whole thing moves" reports.

  // Snapshot visual props from the original line.
  const visualProps = {
    stroke: line.stroke,
    strokeWidth: line.strokeWidth,
    strokeUniform: line.strokeUniform,
    strokeLineCap: line.strokeLineCap,
    strokeDashArray: line.strokeDashArray ? [...line.strokeDashArray] : null,
    strokeLineJoin: line.strokeLineJoin,
    customType: line.customType || "line",
    erasable: line.erasable !== false,
    opacity: line.opacity,
    fill: line.fill,
    shadow: line.shadow,
    globalCompositeOperation: line.globalCompositeOperation,
  };

  const makeLine = (seg) => {
    const nl = new F.Line([seg.x1, seg.y1, seg.x2, seg.y2], visualProps);
    nl.set({
      id: "el-" + Date.now() + "-" + Math.round(Math.random() * 1e9),
      selectable: true,
      evented: true,
    });
    nl.setCoords();
    return nl;
  };

  // Remove the original line, add the new pieces.
  canvas.remove(line);
  const insideLines = inside.map(makeLine);
  const outsideLines = outside.map(makeLine);
  for (const l of [...outsideLines, ...insideLines]) {
    canvas.add(l);
    l.setCoords();
  }

  return insideLines;
}

/**
 * Split any shape object at the lasso boundary using clipPaths.
 * The selected region becomes a new object; the original keeps the outside region.
 */
export function splitObjectWithLasso(canvas, obj, polygonCanvasPts) {
  const F = window.fabric;
  if (!canvas || !obj || !F || polygonCanvasPts.length < 3) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    obj.clone(
      (cloned) => {
        if (!cloned) {
          resolve(null);
          return;
        }

        const localPoly = canvasPolygonToLocal(obj, polygonCanvasPts);
        const forwardClip = buildClipPolygon(localPoly);
        forwardClip.inverted = false;

        const inverseClip = buildClipPolygon(localPoly);
        inverseClip.inverted = true;

        let finalClonedClipPath = forwardClip;
        if (cloned.clipPath && F.util.mergeClipPaths) {
          finalClonedClipPath = F.util.mergeClipPaths(
            forwardClip,
            cloned.clipPath,
          );
        }

        cloned.set({
          id: "el-" + Date.now() + "-" + Math.round(Math.random() * 1e9),
          clipPath: finalClonedClipPath,
          selectable: true,
          evented: true,
          erasable: obj.erasable !== false,
          objectCaching: false,
          lassoPoints: polygonCanvasPts,
          initialMatrix: cloned.calcTransformMatrix(),
        });

        let finalInverseClip;
        if (obj.clipPath) {
          let existingPolygons = [];
          if (obj.clipPath.isType && obj.clipPath.isType("group")) {
            existingPolygons = obj.clipPath.getObjects().map((p) => {
              p.set({ inverted: false });
              return p;
            });
          } else {
            obj.clipPath.set({ inverted: false });
            existingPolygons = [obj.clipPath];
          }

          const excludePolygon = buildClipPolygon(localPoly);
          excludePolygon.inverted = false;
          existingPolygons.push(excludePolygon);

          const group = new F.Group(existingPolygons, {
            absolutePositioned: false,
            originX: "left",
            originY: "top",
            objectCaching: false,
            selectable: false,
            evented: false,
          });
          group.inverted = true;
          finalInverseClip = group;
        } else {
          const inverseClip = buildClipPolygon(localPoly);
          inverseClip.inverted = true;
          finalInverseClip = inverseClip;
        }

        obj.set({
          clipPath: finalInverseClip,
          objectCaching: false,
          lassoPoints: polygonCanvasPts,
          initialMatrix: obj.calcTransformMatrix(),
          isCutoutRemainder: true,
        });

        obj.dirty = true;
        cloned.dirty = true;
        canvas.add(cloned);
        cloned.setCoords();
        obj.setCoords();
        canvas.fire("object:modified", { target: obj });
        resolve(cloned);
      },
      ["eraser", "erasable", "globalCompositeOperation"],
    );
  });
}
