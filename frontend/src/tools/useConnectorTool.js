import { useEffect, useRef } from "react";
import {
  findClosestAnchor,
  getAnchorPoint,
  canvasToScreen,
} from "../utils/anchorPoints";
import { ConnectorLine } from "./ConnectorLine";

/**
 * Custom hook to manage the magnetic connector drawing state machine.
 */
export function useConnectorTool({
  canvas,
  activeTool,
  overlayRef,
  onConnectorAdded, // Callback when a new ConnectorLine is created
}) {
  const drawingStateRef = useRef({
    isDrawing: false,
    source: null, // { object, anchor, canvasX, canvasY, screenX, screenY }
    activeAnchor: null, // Currently snapped anchor
    hoveredObject: null, // Currently hovered shape
  });

  const onConnectorAddedRef = useRef(onConnectorAdded);
  useEffect(() => {
    onConnectorAddedRef.current = onConnectorAdded;
  }, [onConnectorAdded]);

  const lastScreenMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvas || !overlayRef.current) return;
    if (activeTool !== "connector") {
      // Clear overlay when leaving connector tool
      const ctx = overlayRef.current.getContext("2d");
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      drawingStateRef.current = {
        isDrawing: false,
        source: null,
        activeAnchor: null,
        hoveredObject: null,
      };
      return;
    }

    // Disable standard Fabric selections when connector tool is active
    canvas.selection = false;
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const ctx = overlayRef.current.getContext("2d");

    const getScreenPointer = (e) => {
      // Return cursor coordinates relative to overlay canvas element viewport
      const rect = overlayRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const drawAnchor = (context, x, y, isSnapped) => {
      context.beginPath();
      context.arc(x, y, isSnapped ? 9 : 6, 0, Math.PI * 2);
      context.fillStyle = isSnapped ? "#27AE60" : "#2E86AB";
      context.fill();
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.stroke();
    };

    const redrawOverlay = (currentScreenMouse) => {
      if (!overlayRef.current) return;
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);

      const state = drawingStateRef.current;

      // 1. Draw hovered shapes anchors (in blue)
      if (state.hoveredObject) {
        // Draw 4 anchor points
        const positions = ["left", "right", "top", "bottom"];
        positions.forEach((pos) => {
          const canvasPt = getAnchorPoint(state.hoveredObject, pos);
          const screen = canvasToScreen(canvas, canvasPt);
          const screenX = screen.x;
          const screenY = screen.y;

          // Don't draw over a snapped green highlight
          const isSnapped =
            state.activeAnchor &&
            state.activeAnchor.object.id === state.hoveredObject.id &&
            state.activeAnchor.anchor === pos;
          if (!isSnapped) {
            drawAnchor(ctx, screenX, screenY, false);
          }
        });
      }

      // 2. Draw snapped active anchor (in green)
      if (state.activeAnchor) {
        const canvasCoords = getAnchorPoint(
          state.activeAnchor.object,
          state.activeAnchor.anchor,
        );
        const screen = canvasToScreen(canvas, canvasCoords);
        drawAnchor(ctx, screen.x, screen.y, true);
      }

      // 3. Draw dashed preview line if drawing
      if (state.isDrawing && state.source && currentScreenMouse) {
        const sourceCoords = getAnchorPoint(
          state.source.object,
          state.source.anchor,
        );
        const sourceScreen = canvasToScreen(canvas, sourceCoords);

        ctx.beginPath();
        ctx.moveTo(sourceScreen.x, sourceScreen.y);
        ctx.lineTo(currentScreenMouse.x, currentScreenMouse.y);
        ctx.strokeStyle = "#2E86AB";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash array
      }
    };

    const handleMouseMove = (options) => {
      const e = options.e;
      const mousePointer = canvas.getPointer(e);
      const screenPointer = getScreenPointer(e);
      lastScreenMouseRef.current = screenPointer;

      const state = drawingStateRef.current;

      // Find closest anchor within snapping radius
      const snapped = findClosestAnchor(canvas, mousePointer, 15);

      if (snapped) {
        state.activeAnchor = snapped;
        state.hoveredObject = snapped.object;
      } else {
        state.activeAnchor = null;

        // Find general hovered object if no anchor snapped
        const target = canvas.findTarget(e, true);
        if (
          target &&
          target.id !== "page-boundary" &&
          target.type !== "connector"
        ) {
          state.hoveredObject = target;
        } else {
          state.hoveredObject = null;
        }
      }

      redrawOverlay(screenPointer);
    };

    const handleMouseDown = (options) => {
      const e = options.e;
      const state = drawingStateRef.current;

      if (state.activeAnchor) {
        if (!state.isDrawing) {
          state.source = { ...state.activeAnchor };
          state.isDrawing = true;
        } else {
          const sourceObj = state.source.object;
          const targetObj = state.activeAnchor.object;

          if (sourceObj.id !== targetObj.id) {
            const start = getAnchorPoint(sourceObj, state.source.anchor);
            const end = getAnchorPoint(targetObj, state.activeAnchor.anchor);
            try {
              const connector = new ConnectorLine(
                [start.x, start.y, end.x, end.y],
                {
                  data: {
                    id: Math.random().toString(36).substring(2, 9),
                    type: "connector",
                    sourceId: sourceObj.id,
                    sourceAnchor: state.source.anchor,
                    targetId: targetObj.id,
                    targetAnchor: state.activeAnchor.anchor,
                  },
                },
              );
              connector.setEndpoints(start.x, start.y, end.x, end.y);
              canvas.add(connector);
              canvas.requestRenderAll();

              if (onConnectorAddedRef.current) {
                onConnectorAddedRef.current(connector);
              }
            } catch (err) {
              console.error(
                "[ConnectorTool] Error creating connector line:",
                err,
              );
            }
          }

          state.isDrawing = false;
          state.source = null;
          state.activeAnchor = null;
          state.hoveredObject = null;
        }
      } else {
        state.isDrawing = false;
        state.source = null;
        state.activeAnchor = null;
        state.hoveredObject = null;
      }

      redrawOverlay(getScreenPointer(e));
    };

    const handleAfterRender = () => {
      const state = drawingStateRef.current;
      if (state.hoveredObject || state.activeAnchor || state.isDrawing) {
        redrawOverlay(lastScreenMouseRef.current);
      }
    };

    // Bind listeners to FabricJS canvas
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("after:render", handleAfterRender);

    return () => {
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("after:render", handleAfterRender);
    };
  }, [canvas, activeTool, overlayRef]);
}
