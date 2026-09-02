import { describe, it, expect, beforeAll } from "vitest";
import { isPointInPolygon, getObjectSelectionMode } from "./pathLassoSplit";

// A square lasso from (0,0) to (100,100).
const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe("isPointInPolygon", () => {
  it("detects a point clearly inside", () => {
    expect(isPointInPolygon({ x: 50, y: 50 }, square)).toBe(true);
  });
  it("detects a point clearly outside", () => {
    expect(isPointInPolygon({ x: 200, y: 200 }, square)).toBe(false);
  });
  it("returns false for a degenerate polygon", () => {
    expect(isPointInPolygon({ x: 1, y: 1 }, [{ x: 0, y: 0 }])).toBe(false);
  });
});

// Minimal Fabric-object stand-in whose oriented corners we control.
function mockShape(corners) {
  return {
    type: "rect",
    setCoords() {},
    getCoords() {
      return corners;
    },
    getBoundingRect() {
      const xs = corners.map((c) => c.x);
      const ys = corners.map((c) => c.y);
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      return {
        left,
        top,
        width: Math.max(...xs) - left,
        height: Math.max(...ys) - top,
      };
    },
    containsPoint() {
      return false;
    },
  };
}

describe("getObjectSelectionMode (shapes)", () => {
  beforeAll(() => {
    // getObjectSelectionMode's empty-corner fallback touches window.fabric.Point.
    globalThis.window = globalThis.window || {};
    window.fabric = {
      Point: class {
        constructor(x, y) {
          this.x = x;
          this.y = y;
        }
      },
    };
  });

  it("returns 'full' when all corners are inside the lasso", () => {
    const shape = mockShape([
      { x: 20, y: 20 },
      { x: 80, y: 20 },
      { x: 80, y: 80 },
      { x: 20, y: 80 },
    ]);
    expect(getObjectSelectionMode(shape, square)).toBe("full");
  });

  it("returns 'partial' when only some corners are inside", () => {
    const shape = mockShape([
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 150 },
      { x: 50, y: 150 },
    ]);
    expect(getObjectSelectionMode(shape, square)).toBe("partial");
  });

  it("returns 'none' when the shape is entirely outside", () => {
    const shape = mockShape([
      { x: 200, y: 200 },
      { x: 260, y: 200 },
      { x: 260, y: 260 },
      { x: 200, y: 260 },
    ]);
    expect(getObjectSelectionMode(shape, square)).toBe("none");
  });

  it("uses oriented corners: a rotated shape fully inside reads as 'full'", () => {
    // Diamond (rotated square) whose oriented corners all sit inside the lasso,
    // even though an axis-aligned bbox would poke to the same extent here.
    const shape = mockShape([
      { x: 50, y: 20 },
      { x: 80, y: 50 },
      { x: 50, y: 80 },
      { x: 20, y: 50 },
    ]);
    expect(getObjectSelectionMode(shape, square)).toBe("full");
  });
});
