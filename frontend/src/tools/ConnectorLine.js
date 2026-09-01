const fabric = window.fabric;

/** Squared distance from point p to segment a-b (avoids a sqrt per test). */
function pointSegmentDistanceSq(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  const ex = p.x - cx;
  const ey = p.y - cy;
  return ex * ex + ey * ey;
}

/**
 * Custom FabricJS class for connecting shapes magnetic-style
 */
export const ConnectorLine = fabric.util.createClass(fabric.Line, {
  type: "connector",

  initialize: function (points, options) {
    options = options || {};
    // Ensure standard points format [x1, y1, x2, y2]
    const pts = points || [0, 0, 0, 0];
    this.callSuper("initialize", pts, {
      stroke: "#1A1A2E",
      strokeWidth: 2,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      perPixelTargetFind: false,
      objectCaching: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      fill: "transparent",
      ...options,
    });

    // Store custom connector data
    this.data = options.data || {
      id: Math.random().toString(36).substring(2, 9),
      type: "connector",
      sourceId: "",
      sourceAnchor: "",
      targetId: "",
      targetAnchor: "",
    };
  },

  /**
   * Pin both ends in canvas space and drop leftover Line scale/angle.
   * fabric.Line x1/y1 are not the same as left/top after drag/zoom/group.
   */
  setEndpoints: function (x1, y1, x2, y2) {
    this.set({
      x1,
      y1,
      x2,
      y2,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      skewX: 0,
      skewY: 0,
      flipX: false,
      flipY: false,
    });
    this.setCoords();
    return this;
  },

  _getConnectorGeometry: function () {
    const pts = this.calcLinePoints();
    const r = { x: pts.x1, y: pts.y1 };
    const i = { x: pts.x2, y: pts.y2 };

    // Determine target anchor orientation to compute final entry angle
    const targetAnchor = this.data?.targetAnchor || "left";
    const sourceAnchor = this.data?.sourceAnchor || "right";

    // Compute path points for orthogonal elbow routing
    let path = [];
    path.push({ x: r.x, y: r.y });

    // Compute intermediate turning points
    if (sourceAnchor === "left" || sourceAnchor === "right") {
      if (targetAnchor === "left" || targetAnchor === "right") {
        const midX = (r.x + i.x) / 2;
        path.push({ x: midX, y: r.y });
        path.push({ x: midX, y: i.y });
      } else {
        // Horizontal to vertical mid route
        path.push({ x: i.x, y: r.y });
      }
    } else {
      // Top or Bottom source anchor
      if (targetAnchor === "top" || targetAnchor === "bottom") {
        const midY = (r.y + i.y) / 2;
        path.push({ x: r.x, y: midY });
        path.push({ x: i.x, y: midY });
      } else {
        // Vertical to horizontal route
        path.push({ x: r.x, y: i.y });
      }
    }
    path.push({ x: i.x, y: i.y });

    const secondToLast = path[path.length - 2] || path[0];
    const dx = i.x - secondToLast.x;
    const dy = i.y - secondToLast.y;
    const angle = Math.atan2(dy, dx);

    return { path, endPoint: i, angle };
  },

  // Hit-test against the actual elbow polyline rather than fabric.Line's
  // straight-segment bounding box. Without this, clicking empty space inside
  // the connector's bbox selected it while parts of the drawn elbow did not.
  containsPoint: function (point) {
    if (!point) return this.callSuper("containsPoint", point);
    const { path } = this._getConnectorGeometry();
    if (!path || path.length < 2) {
      return this.callSuper("containsPoint", point);
    }
    const m = this.calcTransformMatrix();
    const pts = path.map((p) =>
      fabric.util.transformPoint(new fabric.Point(p.x, p.y), m),
    );
    // Clickable tolerance: half the stroke plus a comfortable margin.
    const tol = (this.strokeWidth || 2) / 2 + 6;
    const tolSq = tol * tol;
    for (let k = 0; k < pts.length - 1; k++) {
      if (pointSegmentDistanceSq(point, pts[k], pts[k + 1]) <= tolSq) {
        return true;
      }
    }
    return false;
  },

  _render: function (ctx) {
    const { path, endPoint, angle } = this._getConnectorGeometry();

    // Draw the main line/elbow route path
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let p = 1; p < path.length; p++) {
      ctx.lineTo(path[p].x, path[p].y);
    }

    // Set line styles (if selected, make it thick and colored)
    ctx.save();
    const isActive =
      this.active || (this.canvas && this.canvas.getActiveObject() === this);
    if (isActive) {
      ctx.strokeStyle = "#E74C3C";
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = this.stroke || "#1A1A2E";
      ctx.lineWidth = this.strokeWidth || 2;
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    // Draw arrow head at the target end point
    ctx.save();
    ctx.translate(endPoint.x, endPoint.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-10, 5);
    ctx.closePath();
    ctx.fillStyle = isActive ? "#E74C3C" : this.stroke || "#1A1A2E";
    ctx.fill();
    ctx.restore();
  },

  _toSVG: function () {
    const { path, endPoint, angle } = this._getConnectorGeometry();
    const d = path
      .map((p, idx) => (idx === 0 ? "M " : "L ") + p.x + " " + p.y)
      .join(" ");
    const color = this.stroke || "#1A1A2E";
    const strokeWidth = this.strokeWidth || 2;
    const angleDeg = (angle * 180) / Math.PI;

    return [
      '<path d="' +
        d +
        '" fill="none" stroke="' +
        color +
        '" stroke-width="' +
        strokeWidth +
        '" stroke-linecap="round" stroke-linejoin="round" />\n',
      '<polygon points="0,0 -10,-5 -10,5" fill="' +
        color +
        '" transform="translate(' +
        endPoint.x +
        "," +
        endPoint.y +
        ") rotate(" +
        angleDeg +
        ')" />\n',
    ];
  },

  toJSON: function () {
    return {
      ...this.callSuper("toJSON"),
      data: this.data,
    };
  },
});

// Register the class with FabricJS
fabric.ConnectorLine = ConnectorLine;
fabric.Connector = ConnectorLine;

const fromObjectFn = function (object, callback) {
  const points = [object.x1, object.y1, object.x2, object.y2];
  const instance = new fabric.Connector(points, object);
  callback && callback(instance);
  return instance;
};

fabric.Connector.fromObject = fromObjectFn;
fabric.ConnectorLine.fromObject = fromObjectFn;
