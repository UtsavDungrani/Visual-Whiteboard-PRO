import React, { useState, useEffect, useRef } from "react";

export default function LandingPage({
  onGetStarted,
  onSignIn,
  onTryDemo,
  isAuthenticated = false,
}) {
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [demoCleaned, setDemoCleaned] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  // Exact 1:1 Pinned Horizontal Scroll State
  const [translateX, setTranslateX] = useState(0);
  const [horizontalProgress, setHorizontalProgress] = useState(0);
  const [containerHeight, setContainerHeight] = useState(3000);

  // Sequential Staggered Entrance Animation State for How It Works
  const [isWorkflowVisible, setIsWorkflowVisible] = useState(false);

  const heroRef = useRef(null);
  const featuresSectionRef = useRef(null);
  const horizontalTrackRef = useRef(null);
  const workflowSectionRef = useRef(null);

  // Generous Pinned Horizontal Scroll Math & Resizing
  useEffect(() => {
    const calculateBounds = () => {
      if (horizontalTrackRef.current) {
        // Generous runway (4.5 viewports) so all 6 cards have dedicated scroll time
        const totalHeight = window.innerHeight * 4.5;
        setContainerHeight(totalHeight);
      }
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);

      if (featuresSectionRef.current && horizontalTrackRef.current) {
        const rect = featuresSectionRef.current.getBoundingClientRect();
        const totalScrollable = rect.height - window.innerHeight;

        if (totalScrollable > 0) {
          const scrollWidth = horizontalTrackRef.current.scrollWidth;
          const viewportWidth = window.innerWidth;
          const maxDist = Math.max(scrollWidth - viewportWidth, 0);

          // Scrolled distance from top of pinned container (offset by 72px sticky nav)
          const scrolled = -(rect.top - 72);
          const progress = Math.min(Math.max(scrolled / totalScrollable, 0), 1);
          const currentTranslate = progress * maxDist;

          setTranslateX(currentTranslate);
          setHorizontalProgress(progress);
        }
      }
    };

    calculateBounds();
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", calculateBounds);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateBounds);
    };
  }, []);

  // IntersectionObserver to trigger the sequential step entrance when scrolled to section
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsWorkflowVisible(true);
        }
      },
      { threshold: 0.2 },
    );

    if (workflowSectionRef.current) {
      observer.observe(workflowSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Track mouse coordinates over hero for 3D tilt
  const handleHeroMouseMove = (e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleHeroMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Scroll to section helper
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Interactive Mini-Demo shapes state
  const demoShapes = demoCleaned
    ? [
        {
          id: "fe",
          label: "React Frontend",
          left: 30,
          top: 75,
          color: "#3B82F6",
          iconClass: "fa-solid fa-laptop-code",
        },
        {
          id: "api",
          label: "Express API Gateway",
          left: 220,
          top: 75,
          color: "#10B981",
          iconClass: "fa-solid fa-bolt-lightning",
        },
        {
          id: "db",
          label: "MongoDB Database",
          left: 420,
          top: 75,
          color: "#8B5CF6",
          iconClass: "fa-solid fa-database",
        },
      ]
    : [
        {
          id: "fe",
          label: "React Frontend",
          left: 20,
          top: 30,
          color: "#3B82F6",
          iconClass: "fa-solid fa-laptop-code",
        },
        {
          id: "api",
          label: "Express API Gateway",
          left: 210,
          top: 130,
          color: "#10B981",
          iconClass: "fa-solid fa-bolt-lightning",
        },
        {
          id: "db",
          label: "MongoDB Database",
          left: 390,
          top: 40,
          color: "#8B5CF6",
          iconClass: "fa-solid fa-database",
        },
      ];

  const faqs = [
    {
      q: "How does the AI Layout & Cleanup engine work?",
      a: "Our geometric engine analyzes element coordinates, topological hierarchy, and connectors. Connected components are arranged into structured DAG pipelines (e.g. Frontend → Gateway → Database) while standalone notes and cards are organized into balanced 2D grids with 20px grid snapping.",
    },
    {
      q: "Is collaboration truly real-time?",
      a: "Yes! Powered by WebSocket channels and Redis pub/sub, element creation, transforms, cursor movements, and context notes sync across all connected teammates with sub-15ms latency.",
    },
    {
      q: "What export formats are supported?",
      a: "You can export multi-page slide decks as high-resolution PDFs, serialize canvas elements into pure HTML/CSS web components (single file or ZIP package), or download crisp PNG/SVG image assets.",
    },
    {
      q: "What is Architecture Assist?",
      a: "Architecture Assist performs automated static analysis on your diagrams. It identifies security anti-patterns (such as direct browser-to-database connections), alerts you to missing caching layers (Redis) or async job queues (RabbitMQ), and suggests one-click component fixes.",
    },
    {
      q: "Can I attach technical notes and code to diagram shapes?",
      a: "Yes! Every shape and node features an integrated Context Drawer supporting rich Markdown notes, syntax-highlighted code snippets, documentation URLs, and file attachments.",
    },
  ];

  return (
    <div className="landing-3d-root">
      {/* Background Ambient Glowing Orbs */}
      <div className="ambient-glow orb-1"></div>
      <div className="ambient-glow orb-2"></div>
      <div className="ambient-glow orb-3"></div>

      {/* Modern Sticky Navigation */}
      <nav className={`landing-nav ${scrollY > 30 ? "nav-scrolled" : ""}`}>
        <div className="nav-container">
          <div
            className="nav-logo"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="logo-badge-3d">
              <span>W</span>
            </div>
            <div className="logo-title-group">
              <span className="logo-main">Visual Whiteboard</span>
              <span className="logo-tag">PRO</span>
            </div>
          </div>

          <div className="nav-links">
            <button
              className="nav-link-btn"
              onClick={() => scrollToSection("features")}
            >
              Features
            </button>
            <button
              className="nav-link-btn"
              onClick={() => scrollToSection("interactive-demo")}
            >
              Interactive Demo
            </button>
            <button
              className="nav-link-btn"
              onClick={() => scrollToSection("architecture")}
            >
              How It Works
            </button>
            <button
              className="nav-link-btn"
              onClick={() => scrollToSection("security")}
            >
              Security
            </button>
            <button
              className="nav-link-btn"
              onClick={() => scrollToSection("faq")}
            >
              FAQ
            </button>
          </div>

          <div className="nav-actions">
            {isAuthenticated ? (
              <button
                className="btn btn-primary btn-glow"
                onClick={onGetStarted}
              >
                <span>Open Dashboard</span>
                <i
                  className="fa-solid fa-arrow-right"
                  style={{ marginLeft: "6px" }}
                ></i>
              </button>
            ) : (
              <>
                <button
                  className="btn btn-secondary btn-nav-signin"
                  onClick={onSignIn}
                >
                  <i
                    className="fa-solid fa-arrow-right-to-bracket"
                    style={{ marginRight: "6px" }}
                  ></i>
                  <span>Sign In</span>
                </button>
                <button
                  className="btn btn-primary btn-glow"
                  onClick={onGetStarted}
                >
                  <span>Get Started Free</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 3D Hero Section */}
      <section
        className="hero-3d-section"
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        <div className="hero-content">
          <div className="hero-badge-pill">
            <span className="badge-pulse"></span>
            <span>Next-Gen Multiplayer Whiteboard & Architecture Studio</span>
          </div>

          <h1 className="hero-headline">
            Where System Design Meets <br />
            <span className="gradient-text">Real-Time Intelligence</span>
          </h1>

          <p className="hero-subtext">
            Build architectural diagrams, brainstorm with fluid freehand tools,
            and instantly tidy messy canvases into geometric alignment with
            integrated AI assistance, multi-page PDF exports, and Redis-powered
            collaboration.
          </p>

          <div className="hero-cta-group">
            <button
              className="btn btn-primary btn-hero-lg btn-glow"
              onClick={onGetStarted}
            >
              <span>Start Designing for Free</span>
              <i
                className="fa-solid fa-arrow-right"
                style={{ marginLeft: "8px" }}
              ></i>
            </button>

            {onTryDemo && (
              <button
                className="btn btn-secondary btn-hero-lg"
                onClick={onTryDemo}
              >
                <i
                  className="fa-solid fa-play"
                  style={{ marginRight: "8px" }}
                ></i>
                <span>Launch Live Sandbox</span>
              </button>
            )}
          </div>

          {/* Social Proof & Status Banner */}
          <div className="hero-stats-strip">
            <div className="stat-pill">
              <strong>&lt; 15ms</strong>
              <span>Sync Latency</span>
            </div>
            <div className="stat-separator">•</div>
            <div className="stat-pill">
              <strong>1-Click</strong>
              <span>Geometric Clean</span>
            </div>
            <div className="stat-separator">•</div>
            <div className="stat-pill">
              <strong>100%</strong>
              <span>Vector Precision</span>
            </div>
            <div className="stat-separator">•</div>
            <div className="stat-pill">
              <strong>Enterprise</strong>
              <span>Security Guard</span>
            </div>
          </div>
        </div>

        {/* 3D Perspective Floating Whiteboard Stage */}
        <div className="hero-3d-stage">
          <div
            className="board-3d-canvas"
            style={{
              transform: `perspective(1200px) rotateX(${mousePos.y * -14}deg) rotateY(${mousePos.x * 16}deg) scale3d(1, 1, 1)`,
            }}
          >
            {/* Whiteboard Top Toolbar Simulation */}
            <div className="board-mockup-topbar">
              <div className="mockup-dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="mockup-board-title">
                <span className="mockup-icon">
                  <i className="fa-solid fa-compass-drafting"></i>
                </span>
                <span>System Architecture — v2.4 (Live)</span>
              </div>
              <div className="mockup-live-users">
                <div className="avatar av-1" title="Sarah (Lead Architect)">
                  S
                </div>
                <div className="avatar av-2" title="Alex (Backend Dev)">
                  A
                </div>
                <div className="avatar av-3" title="Maya (DevOps)">
                  M
                </div>
                <span className="live-pulse-badge">Live</span>
              </div>
            </div>

            {/* Canvas Surface with Grid & Elements */}
            <div className="board-canvas-surface">
              {/* Grid Lines Pattern */}
              <div className="board-grid-pattern"></div>

              {/* Symmetrically Centered System Architecture Diagram Flow */}
              <div className="hero-diagram-flow-row">
                <div className="mockup-node node-client">
                  <div className="node-header">
                    <span className="node-icon">
                      <i className="fa-solid fa-mobile-screen"></i>
                    </span>
                    <span className="node-title">React Client</span>
                  </div>
                  <div className="node-body">Vite + Fabric.js Canvas</div>
                  <div className="anchor-point anchor-right"></div>
                </div>

                {/* Connecting Simple Dotted Line 1 */}
                <div className="mockup-connector-cell">
                  <svg
                    className="mockup-connector-svg"
                    viewBox="0 0 80 24"
                    fill="none"
                  >
                    <line
                      x1="0"
                      y1="12"
                      x2="80"
                      y2="12"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                    />
                  </svg>
                </div>

                <div className="mockup-node node-server">
                  <div className="node-header">
                    <span className="node-icon">
                      <i className="fa-solid fa-bolt-lightning"></i>
                    </span>
                    <span className="node-title">Express API Server</span>
                  </div>
                  <div className="node-body">Node.js + Socket.IO</div>
                  <div className="anchor-point anchor-left"></div>
                  <div className="anchor-point anchor-right"></div>
                </div>

                {/* Connecting Simple Dotted Line 2 */}
                <div className="mockup-connector-cell">
                  <svg
                    className="mockup-connector-svg"
                    viewBox="0 0 80 24"
                    fill="none"
                  >
                    <line
                      x1="0"
                      y1="12"
                      x2="80"
                      y2="12"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                    />
                  </svg>
                </div>

                <div className="mockup-node node-db">
                  <div className="node-header">
                    <span className="node-icon">
                      <i className="fa-solid fa-database"></i>
                    </span>
                    <span className="node-title">MongoDB Primary</span>
                  </div>
                  <div className="node-body">Whiteboards & Context</div>
                  <div className="anchor-point anchor-left"></div>
                </div>
              </div>

              {/* Animated Floating Multiplayer Cursor 1 */}
              <div
                className="mockup-cursor cursor-sarah"
                style={{ left: "32%", top: "58%" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#3B82F6">
                  <path d="M3 3l7 18 3-7 7-3L3 3z" />
                </svg>
                <div
                  className="cursor-tag"
                  style={{ backgroundColor: "#3B82F6" }}
                >
                  Sarah (Design Lead)
                </div>
              </div>

              {/* Animated Floating Multiplayer Cursor 2 */}
              <div
                className="mockup-cursor cursor-alex"
                style={{ left: "74%", top: "18%" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#10B981">
                  <path d="M3 3l7 18 3-7 7-3L3 3z" />
                </svg>
                <div
                  className="cursor-tag"
                  style={{ backgroundColor: "#10B981" }}
                >
                  Alex (Backend)
                </div>
              </div>

              {/* Floating Layer 3D Badge 1: 1-Click Cleanup */}
              <div className="floating-card-3d card-cleanup">
                <div className="card-pill">
                  <span className="icon">
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                  </span>
                  <strong>Smart Cleanup</strong>
                </div>
                <span className="card-caption">DAG Flow Auto-Aligned</span>
              </div>

              {/* Floating Layer 3D Badge 2: Security Checked */}
              <div className="floating-card-3d card-security">
                <div className="card-pill">
                  <span className="icon">
                    <i className="fa-solid fa-shield-halved"></i>
                  </span>
                  <strong>Security Guard</strong>
                </div>
                <span className="card-caption">All Nodes Authenticated</span>
              </div>

              {/* Floating Sticky Note 3D */}
              <div className="floating-sticky-3d">
                <div className="sticky-pin">
                  <i className="fa-solid fa-thumbtack"></i>
                </div>
                <p>Deploy Redis Pub/Sub for scale testing in Phase 2</p>
                <span className="sticky-author">Attached by Alex</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive In-Page Playground / Demo Section */}
      <section id="interactive-demo" className="interactive-demo-section">
        <div className="section-header-center">
          <span className="section-tag">Interactive Experience</span>
          <h2 className="section-title">Test 1-Click Clean Up Right Here</h2>
          <p className="section-subtitle">
            See how messy, unaligned whiteboard boxes instantly organize into a
            structured, connected flow diagram.
          </p>
        </div>

        <div className="interactive-demo-box">
          <div className="demo-toolbar">
            <div className="demo-status">
              <span
                className={`status-indicator ${demoCleaned ? "cleaned" : "messy"}`}
              ></span>
              <span>
                State:{" "}
                <strong>
                  {demoCleaned ? "Aligned (DAG Flow)" : "Messy Canvas"}
                </strong>
              </span>
            </div>
            <button
              className={`btn btn-sm ${demoCleaned ? "btn-secondary" : "btn-primary btn-glow"}`}
              onClick={() => setDemoCleaned(!demoCleaned)}
            >
              {demoCleaned ? (
                <>
                  <i
                    className="fa-solid fa-rotate"
                    style={{ marginRight: "6px" }}
                  ></i>
                  <span>Scramble Elements</span>
                </>
              ) : (
                <>
                  <i
                    className="fa-solid fa-wand-magic-sparkles"
                    style={{ marginRight: "6px" }}
                  ></i>
                  <span>Run 1-Click Cleanup</span>
                </>
              )}
            </button>
          </div>

          <div className="demo-canvas-area">
            <div className="demo-grid-bg"></div>

            {/* Render Demo Nodes with Smooth CSS Transitions */}
            {demoShapes.map((shape) => (
              <div
                key={shape.id}
                className="demo-shape-card"
                style={{
                  left: `${shape.left}px`,
                  top: `${shape.top}px`,
                  borderColor: shape.color,
                }}
              >
                <div
                  className="shape-icon"
                  style={{
                    backgroundColor: `${shape.color}20`,
                    color: shape.color,
                  }}
                >
                  <i className={shape.iconClass}></i>
                </div>
                <div className="shape-info">
                  <strong>{shape.label}</strong>
                  <span>Node: {shape.id}</span>
                </div>
              </div>
            ))}

            {/* Connecting lines */}
            <svg className="demo-connector-svg">
              <line
                x1={demoShapes[0].left + 160}
                y1={demoShapes[0].top + 30}
                x2={demoShapes[1].left}
                y2={demoShapes[1].top + 30}
                stroke="#6366F1"
                strokeWidth="2.5"
                strokeDasharray={demoCleaned ? "0" : "5 5"}
              />
              <line
                x1={demoShapes[1].left + 180}
                y1={demoShapes[1].top + 30}
                x2={demoShapes[2].left}
                y2={demoShapes[2].top + 30}
                stroke="#6366F1"
                strokeWidth="2.5"
                strokeDasharray={demoCleaned ? "0" : "5 5"}
              />
            </svg>
          </div>

          <div className="demo-footer-caption">
            <span>
              <i
                className="fa-solid fa-sparkles"
                style={{ color: "#60A5FA", marginRight: "6px" }}
              ></i>
              Powered by deterministic graph algorithms & geometric DAG
              alignment engines.
            </span>
          </div>
        </div>
      </section>

      {/* Pinned Horizontal Scroll Feature Showcase Section */}
      <div
        id="features"
        ref={featuresSectionRef}
        className="features-horizontal-scroll-container"
        style={{ height: `${containerHeight}px` }}
      >
        <div className="features-sticky-viewport">
          {/* Sticky Header */}
          <div className="features-sticky-header">
            <span className="section-tag">Core Capabilities</span>
            <h2 className="section-title">
              Built for Modern Engineering & Design Teams
            </h2>
            <p className="section-subtitle">
              Explore our 6 deep architectural features — scroll down to pan
              through all capabilities.
            </p>
          </div>

          {/* Horizontal Track Viewport & Cards */}
          <div className="features-track-viewport">
            <div
              ref={horizontalTrackRef}
              className="features-horizontal-track"
              style={{
                transform: `translate3d(-${translateX}px, 0, 0)`,
              }}
            >
              {/* Card 1 */}
              <div className="feature-horizontal-card border-blue">
                <span className="card-number-badge">01</span>
                <div className="card-icon-3d bg-blue">
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <h3>Intelligent Layout Cleanup</h3>
                <p>
                  Transform scattered brainstorm sketches into clean, readable
                  diagrams. Automatically computes DAG rankings for connected
                  graphs and aligns standalone elements into balanced 2D grids.
                </p>
                <ul className="feature-bullets">
                  <li>Topological layering for architecture flows</li>
                  <li>Smart 2D grid placement for sticky notes</li>
                  <li>Preserves locked elements & snaps to 20px grid</li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="feature-horizontal-card border-emerald">
                <span className="card-number-badge">02</span>
                <div className="card-icon-3d bg-emerald">
                  <i className="fa-solid fa-bolt-lightning"></i>
                </div>
                <h3>Real-Time Multiplayer Sync</h3>
                <p>
                  Collaborate live with your distributed team. Enjoy smooth
                  cursor interpolations, optimistic updates, and Redis pub/sub
                  state broadcasting.
                </p>
                <ul className="feature-bullets">
                  <li>Sub-15ms WebSocket event updates</li>
                  <li>Per-user colored avatars & live presence</li>
                  <li>Conflict-free multi-user canvas locking</li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="feature-horizontal-card border-purple">
                <span className="card-number-badge">03</span>
                <div className="card-icon-3d bg-purple">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <h3>Architecture Assistant</h3>
                <p>
                  Real-time design linting for system diagrams. Automatically
                  flags security concerns (like direct client-to-DB calls) and
                  suggests caching layers and message queues.
                </p>
                <ul className="feature-bullets">
                  <li>Automated security risk alerts</li>
                  <li>Performance & caching recommendations</li>
                  <li>1-click suggestion application to canvas</li>
                </ul>
              </div>

              {/* Card 4 */}
              <div className="feature-horizontal-card border-amber">
                <span className="card-number-badge">04</span>
                <div className="card-icon-3d bg-amber">
                  <i className="fa-solid fa-folder-open"></i>
                </div>
                <h3>Context Layer & Notes</h3>
                <p>
                  Attach technical documentation directly to canvas nodes. Add
                  rich Markdown notes, syntax-highlighted code snippets, URLs,
                  and file uploads.
                </p>
                <ul className="feature-bullets">
                  <li>Markdown editor with preview mode</li>
                  <li>Syntax-highlighted code snippets</li>
                  <li>File attachments & persistent metadata</li>
                </ul>
              </div>

              {/* Card 5 */}
              <div className="feature-horizontal-card border-rose">
                <span className="card-number-badge">05</span>
                <div className="card-icon-3d bg-rose">
                  <i className="fa-solid fa-file-pdf"></i>
                </div>
                <h3>Multi-Page & Slide Export</h3>
                <p>
                  Manage multi-page whiteboard documents with thumbnail strips.
                  Export seamlessly to multi-page presentation PDFs, HTML/CSS
                  bundles, or SVG vector assets.
                </p>
                <ul className="feature-bullets">
                  <li>Infinite canvas or fixed presentation pages</li>
                  <li>Client-side PDF generator (jsPDF + html2canvas)</li>
                  <li>HTML/CSS serializer with ZIP bundling</li>
                </ul>
              </div>

              {/* Card 6 */}
              <div className="feature-horizontal-card border-cyan">
                <span className="card-number-badge">06</span>
                <div className="card-icon-3d bg-cyan">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <h3>Enterprise Session Security</h3>
                <p>
                  Protect your intellectual property with JWT session tokens,
                  bcrypt password hashing, rate-limited AI endpoints, and
                  granular board permissions.
                </p>
                <ul className="feature-bullets">
                  <li>JWT authentication & session guards</li>
                  <li>Rate limiting on AI & sync endpoints</li>
                  <li>Board owner vs collaborator permissions</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Interactive Progress & Indicator */}
          <div className="features-scroll-indicator">
            <span className="scroll-step-pill">
              {Math.min(Math.floor(horizontalProgress * 5.99) + 1, 6)} / 6
              Capabilities
            </span>
            <div className="scroll-progress-bar-container">
              <div
                className="scroll-progress-bar-fill"
                style={{ width: `${Math.max(horizontalProgress * 100, 6)}%` }}
              ></div>
            </div>
            <span className="scroll-hint-text">
              {horizontalProgress >= 0.96 ? (
                <>
                  <span>Continuing to How It Works</span>
                  <i
                    className="fa-solid fa-arrow-down"
                    style={{ color: "#34D399" }}
                  ></i>
                </>
              ) : (
                <>
                  <span>Scroll down to pan cards</span>
                  <i
                    className="fa-solid fa-arrow-right"
                    style={{ color: "#60A5FA" }}
                  ></i>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Architecture & Workflow Walkthrough Section with Sequential Staggered Entrance */}
      <section
        id="architecture"
        ref={workflowSectionRef}
        className="workflow-walkthrough-section"
      >
        <div className="section-header-center">
          <span className="section-tag">How It Works</span>
          <h2 className="section-title">
            From First Brainstorm to Shipped Architecture
          </h2>
          <p className="section-subtitle">
            A seamless three-step workflow designed for rapid ideation and
            technical accuracy.
          </p>
        </div>

        <div
          className={`workflow-steps-container ${isWorkflowVisible ? "workflow-in-view" : ""}`}
        >
          {/* Step 1 Card */}
          <div className="step-card step-card-1">
            <div className="step-card-header">
              <div className="step-number">01</div>
              <div className="step-icon-badge bg-blue">
                <i className="fa-solid fa-pen-nib"></i>
              </div>
            </div>
            <h4>Draft & Connect</h4>
            <p>
              Drop shapes, sketch with freehand pencils, lasso split paths, and
              snap magnetic connectors to magnetic anchor points.
            </p>
            <div className="step-card-footer-pill">
              <i
                className="fa-solid fa-circle-check"
                style={{ color: "#60A5FA" }}
              ></i>
              <span>Freeform Vector Engine</span>
            </div>
          </div>

          {/* Animated Connecting Arrow 1 */}
          <div className="step-arrow step-arrow-1">
            <svg width="56" height="24" viewBox="0 0 56 24" fill="none">
              <line
                x1="2"
                y1="12"
                x2="42"
                y2="12"
                stroke="#60A5FA"
                strokeWidth="2.5"
                strokeDasharray="6 3"
                className="animated-arrow-dash"
              />
              <polygon points="50,12 40,6 40,18" fill="#60A5FA" />
            </svg>
          </div>

          {/* Step 2 Card */}
          <div className="step-card step-card-2">
            <div className="step-card-header">
              <div className="step-number">02</div>
              <div className="step-icon-badge bg-emerald">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
              </div>
            </div>
            <h4>Auto-Clean & Lint</h4>
            <p>
              Click <strong>Cleanup</strong> to align nodes into structured DAG
              layouts, and run <strong>Architecture Assist</strong> to audit
              system topology.
            </p>
            <div className="step-card-footer-pill">
              <i
                className="fa-solid fa-circle-check"
                style={{ color: "#10B981" }}
              ></i>
              <span>DAG Topology Engine</span>
            </div>
          </div>

          {/* Animated Connecting Arrow 2 */}
          <div className="step-arrow step-arrow-2">
            <svg width="56" height="24" viewBox="0 0 56 24" fill="none">
              <line
                x1="2"
                y1="12"
                x2="42"
                y2="12"
                stroke="#8B5CF6"
                strokeWidth="2.5"
                strokeDasharray="6 3"
                className="animated-arrow-dash"
              />
              <polygon points="50,12 40,6 40,18" fill="#8B5CF6" />
            </svg>
          </div>

          {/* Step 3 Card */}
          <div className="step-card step-card-3">
            <div className="step-card-header">
              <div className="step-number">03</div>
              <div className="step-icon-badge bg-purple">
                <i className="fa-solid fa-file-pdf"></i>
              </div>
            </div>
            <h4>Present & Export</h4>
            <p>
              Review pages in slide mode, attach context notes, and export
              professional multi-page PDFs or HTML/CSS packages for stakeholder
              reviews.
            </p>
            <div className="step-card-footer-pill">
              <i
                className="fa-solid fa-circle-check"
                style={{ color: "#A78BFA" }}
              ></i>
              <span>Slide Deck & PDF Bundle</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Tech Stack Banner */}
      <section id="security" className="tech-stack-section">
        <div className="tech-stack-box">
          <div className="tech-text">
            <span className="section-tag">Engineered for Scale</span>
            <h3>Enterprise-Ready Technology Stack</h3>
            <p>
              Visual Whiteboard Pro is powered by modern, reliable web
              standards: React 19, Fabric.js vector canvas, Vite bundler,
              Express Node.js backends, Redis Pub/Sub cluster, and MongoDB
              persistent storage.
            </p>
          </div>

          <div className="tech-badges-grid">
            <div className="tech-badge">
              <span className="tech-icon icon-react">
                <i
                  className="fa-brands fa-react"
                  style={{ color: "#61DAFB" }}
                ></i>
              </span>
              <span>React 19</span>
            </div>
            <div className="tech-badge">
              <span className="tech-icon icon-fabric">
                <i
                  className="fa-solid fa-palette"
                  style={{ color: "#F59E0B" }}
                ></i>
              </span>
              <span>Fabric.js 5.3</span>
            </div>
            <div className="tech-badge">
              <span className="tech-icon icon-vite">
                <i
                  className="fa-solid fa-bolt"
                  style={{ color: "#FCD34D" }}
                ></i>
              </span>
              <span>Vite 8</span>
            </div>
            <div className="tech-badge">
              <span className="tech-icon icon-node">
                <i
                  className="fa-brands fa-node-js"
                  style={{ color: "#22C55E" }}
                ></i>
              </span>
              <span>Node.js / Express</span>
            </div>
            <div className="tech-badge">
              <span className="tech-icon icon-redis">
                <svg
                  className="redis-stack-svg"
                  viewBox="0 0 32 32"
                  fill="none"
                >
                  {/* Layer 1: Base Slab */}
                  <g className="redis-layer layer-1">
                    <polygon points="16,28 28,21 16,14 4,21" fill="#DC2626" />
                    <polygon points="4,21 16,28 16,30 4,23" fill="#991B1B" />
                    <polygon points="16,28 28,21 28,23 16,30" fill="#B91C1C" />
                  </g>
                  {/* Layer 2: Middle Slab */}
                  <g className="redis-layer layer-2">
                    <polygon points="16,21 28,14 16,7 4,14" fill="#EF4444" />
                    <polygon points="4,14 16,21 16,23 4,16" fill="#B91C1C" />
                    <polygon points="16,21 28,14 28,16 16,23" fill="#DC2626" />
                  </g>
                  {/* Layer 3: Top Slab */}
                  <g className="redis-layer layer-3">
                    <polygon points="16,14 28,7 16,0 4,7" fill="#F87171" />
                    <polygon points="4,7 16,14 16,16 4,9" fill="#DC2626" />
                    <polygon points="16,14 28,7 28,9 16,16" fill="#EF4444" />
                  </g>
                </svg>
              </span>
              <span>Redis Pub/Sub</span>
            </div>
            <div className="tech-badge">
              <span className="tech-icon icon-mongo">
                <i
                  className="fa-solid fa-database"
                  style={{ color: "#10B981" }}
                ></i>
              </span>
              <span>MongoDB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="faq-section">
        <div className="section-header-center">
          <span className="section-tag">Got Questions?</span>
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>

        <div className="faq-accordion-list">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className={`faq-item ${activeFaq === idx ? "active" : ""}`}
              onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
            >
              <div className="faq-question">
                <span>{faq.q}</span>
                <span className="faq-chevron">
                  <i
                    className={`fa-solid ${activeFaq === idx ? "fa-minus" : "fa-plus"}`}
                  ></i>
                </span>
              </div>
              {activeFaq === idx && <div className="faq-answer">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Final Call to Action 3D Banner */}
      <section className="cta-banner-section">
        <div className="cta-3d-card">
          <div className="cta-glow-mesh"></div>
          <h2>Ready to Elevate Your Whiteboarding Experience?</h2>
          <p>
            Join thousands of developers and product teams building clear,
            real-time architectural diagrams with Visual Whiteboard Pro.
          </p>
          <div className="cta-buttons">
            <button
              className="btn btn-primary btn-hero-lg btn-glow"
              onClick={onGetStarted}
            >
              <span>Get Started for Free</span>
              <i
                className="fa-solid fa-arrow-right"
                style={{ marginLeft: "8px" }}
              ></i>
            </button>
            <button
              className="btn btn-secondary btn-hero-lg"
              onClick={onSignIn}
            >
              <span>Sign In to Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* Modern Rich Footer */}
      <footer className="landing-footer-rich">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="nav-logo">
              <div className="logo-badge-3d">
                <span>W</span>
              </div>
              <span className="logo-main">Visual Whiteboard PRO</span>
            </div>
            <p className="footer-desc">
              The high-performance real-time canvas for architectural diagrams,
              system design, and visual collaboration.
            </p>
          </div>

          <div className="footer-links-col">
            <h5>Product</h5>
            <a onClick={() => scrollToSection("features")}>Features</a>
            <a onClick={() => scrollToSection("interactive-demo")}>Live Demo</a>
            <a onClick={() => scrollToSection("architecture")}>How It Works</a>
            <a onClick={() => scrollToSection("security")}>Security</a>
          </div>

          <div className="footer-links-col">
            <h5>Export & Tools</h5>
            <span>PDF Slide Decks</span>
            <span>HTML/CSS Bundles</span>
            <span>Lasso Split Engine</span>
            <span>Context Drawers</span>
          </div>

          <div className="footer-links-col">
            <h5>Status & Security</h5>
            <div className="system-status-indicator">
              <span className="status-dot-green"></span>
              <span>All Systems Operational</span>
            </div>
            <span className="footer-subtext">JWT + Bcrypt Protected</span>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Visual Whiteboard Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
