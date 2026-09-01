import React, { useState, useEffect, useRef } from "react";

export default function LoadingScreen({
  message,
  subMessage,
  onFinished,
  minDuration = 2800,
}) {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Parents pass onFinished as an inline arrow, so its identity changes on
  // every parent render. Keeping it in the progress effect's deps restarted the
  // timer (progress reset to 0) on each render, and under frequent re-renders
  // rawLinear never reached 1 so the screen never dismissed. Hold it in a ref
  // and keep the effect free of that dependency.
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const stages = message
    ? [
        {
          title: message,
          desc:
            subMessage ||
            "Calibrating workspace environment and encrypted session",
        },
        {
          title: "Connecting Real-Time Mesh",
          desc: "Establishing WebSocket channel & Redis Pub/Sub cluster",
        },
        {
          title: "Synchronizing Workspace",
          desc: "Preparing vector canvas, context drawers & cloud state",
        },
        {
          title: "Visual Whiteboard PRO Ready",
          desc: "Entering workspace",
        },
      ]
    : [
        {
          title: "Initializing Vector Engine",
          desc: "Calibrating Fabric.js GPU context & 60 FPS render pipeline",
        },
        {
          title: "Connecting Real-Time Mesh",
          desc: "Establishing WebSocket channel & Redis Pub/Sub cluster",
        },
        {
          title: "Loading Whiteboard Workspace",
          desc: "Synchronizing DAG layouts, context drawers & page decks",
        },
        {
          title: "Visual Whiteboard PRO Ready",
          desc: "Entering collaborative architecture canvas",
        },
      ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = 25; // 25ms tick
    const totalDuration = minDuration;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawLinear = Math.min(elapsed / totalDuration, 1);

      // Custom easing curve: steady build -> realistic pause around 70% -> swift finish to 100%
      let easedProgress;
      if (rawLinear < 0.3) {
        easedProgress = (rawLinear / 0.3) * 32;
      } else if (rawLinear < 0.65) {
        easedProgress = 32 + ((rawLinear - 0.3) / 0.35) * 36;
      } else if (rawLinear < 0.88) {
        easedProgress = 68 + ((rawLinear - 0.65) / 0.23) * 24;
      } else {
        easedProgress = 92 + ((rawLinear - 0.88) / 0.12) * 8;
      }

      const pct = Math.min(Math.round(easedProgress), 100);
      setProgress(pct);

      if (pct < 32) {
        setStageIndex(0);
      } else if (pct < 68) {
        setStageIndex(1);
      } else if (pct < 92) {
        setStageIndex(2);
      } else {
        setStageIndex(3);
      }

      if (rawLinear >= 1) {
        clearInterval(timer);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinishedRef.current) onFinishedRef.current();
          }, 450);
        }, 250);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [minDuration, message]);

  return (
    <div className={`pro-loading-screen ${isFadingOut ? "fade-out" : ""}`}>
      {/* Background Ambient Glows */}
      <div className="loading-ambient-orb orb-top"></div>
      <div className="loading-ambient-orb orb-bottom"></div>
      <div className="loading-grid-bg"></div>

      <div className="loading-card-content">
        {/* Futuristic 3D Holographic Loader Badge */}
        <div className="loading-holo-loader">
          <div className="holo-ring ring-outer"></div>
          <div className="holo-ring ring-middle"></div>
          <div className="holo-ring ring-inner"></div>

          <div className="holo-center-logo">
            <div className="holo-logo-cube">
              <i className="fa-solid fa-compass-drafting"></i>
            </div>
          </div>

          {/* Orbiting Sparkles */}
          <div className="holo-orbit-particle p1"></div>
          <div className="holo-orbit-particle p2"></div>
          <div className="holo-orbit-particle p3"></div>
        </div>

        {/* Brand Title */}
        <div className="loading-brand-header">
          <div className="loading-brand-title">
            <span className="brand-main">Visual Whiteboard</span>
            <span className="brand-badge-pill">PRO</span>
          </div>
          <span className="loading-system-tag">
            NEXT-GEN ARCHITECTURE STUDIO
          </span>
        </div>

        {/* Stage Status with Keyed Smooth Fade */}
        <div className="loading-status-block">
          <div
            key={`title-${stageIndex}`}
            className="loading-status-title animate-status-fade"
          >
            <i
              className="fa-solid fa-sparkles"
              style={{ color: "#60A5FA" }}
            ></i>
            <span>{stages[stageIndex].title}</span>
          </div>
          <p
            key={`desc-${stageIndex}`}
            className="loading-status-desc animate-status-fade"
          >
            {stages[stageIndex].desc}
          </p>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="loading-progress-section">
          <div className="progress-track-wrapper">
            <div
              className="loading-progress-bar"
              style={{ width: `${progress}%` }}
            >
              <span className="progress-glow-tip"></span>
            </div>
          </div>

          <div className="loading-progress-footer">
            <span className="loading-mono-pct">{progress}%</span>
            <span className="loading-sync-status">
              <span className="live-status-dot"></span>
              <span>Encrypted Session • Sub-15ms WebSocket</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
