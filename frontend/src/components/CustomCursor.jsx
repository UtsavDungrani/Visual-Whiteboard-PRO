import React, { useEffect, useRef, useState } from "react";

export default function CustomCursor({ isEnabled = true }) {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const animationFrameId = useRef(null);

  useEffect(() => {
    // Do nothing when disabled: previously the listeners and the perpetual
    // requestAnimationFrame loop ran regardless, burning CPU on pages where the
    // custom cursor is off.
    if (!isEnabled) return;

    // Only run on non-touch devices with fine pointers
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    const onMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      // Functional update bails out if already visible, so we no longer need
      // `isVisible` in the dep array (which re-registered everything on every
      // show/hide toggle).
      setIsVisible((v) => v || true);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }

      // Check if hovering interactive elements
      const target = e.target;
      const isInteractive = Boolean(
        target.closest(
          "button, a, input, textarea, select, [role='button'], .board-3d-card, .template-card, .feature-3d-card, .nav-logo, .faq-item, .stat-pill, .btn-action-tool",
        ),
      );
      setIsHovered(isInteractive);
    };

    const onMouseDown = () => setIsClicked(true);
    const onMouseUp = () => setIsClicked(false);
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    // Smooth lerp loop for the trailing ambient ring
    const render = () => {
      // Lerp factor (0.18 gives snappy yet silky smooth trailing motion)
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.18;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.18;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <div
      className={`custom-cursor-container ${isVisible ? "visible" : "hidden"}`}
    >
      {/* Precision Core Dot */}
      <div
        ref={dotRef}
        className={`custom-cursor-dot ${isHovered ? "hovered" : ""} ${isClicked ? "clicked" : ""}`}
      />
      {/* Fluid Trailing Glow Aura Ring */}
      <div
        ref={ringRef}
        className={`custom-cursor-ring ${isHovered ? "hovered" : ""} ${isClicked ? "clicked" : ""}`}
      />
    </div>
  );
}
