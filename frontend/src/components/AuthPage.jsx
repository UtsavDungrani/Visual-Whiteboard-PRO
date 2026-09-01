import React, { useState, useRef } from "react";

export default function AuthPage({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authError,
  setAuthError,
  authLoading,
  handleLogin,
  handleRegister,
  onBackHome,
  onGuestDemo,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleCardMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleCardMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const isLogin = authMode === "login";

  // Registration is the mode that actually has the 6-character rule, so catch
  // it client-side instead of only learning about it from the server round-trip.
  const handleSubmit = (e) => {
    if (!isLogin && (authForm.password || "").length < 6) {
      e.preventDefault();
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    return isLogin ? handleLogin(e) : handleRegister(e);
  };

  return (
    <div className="auth-3d-root">
      {/* Background Ambient Glowing Orbs */}
      <div className="ambient-glow orb-1"></div>
      <div className="ambient-glow orb-2"></div>

      {/* Top Header */}
      <header className="auth-nav-header">
        <div className="nav-logo" onClick={onBackHome}>
          <div className="logo-badge-3d">
            <span>W</span>
          </div>
          <div className="logo-title-group">
            <span className="logo-main">Visual Whiteboard</span>
            <span className="logo-tag">PRO</span>
          </div>
        </div>

        <button className="btn-back-home" onClick={onBackHome}>
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main 3D Container */}
      <main className="auth-main-container">
        <div
          className="auth-split-wrapper"
          ref={cardRef}
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${mousePos.y * -6}deg) rotateY(${mousePos.x * 8}deg)`,
          }}
        >
          {/* Left Hero / Highlights Side Panel (visible on desktop/tablet) */}
          <div className="auth-highlights-panel">
            <div className="highlights-header">
              <span className="highlights-tag">
                <i
                  className="fa-solid fa-bolt-lightning"
                  style={{ marginRight: "6px" }}
                ></i>
                System Design Studio
              </span>
              <h2>Transform Brainstorms into Production Diagrams</h2>
              <p>
                Join engineering teams building real-time architecture,
                flowchart pipelines, and collaborative whiteboard workspaces.
              </p>
            </div>

            <div className="highlights-list">
              <div className="highlight-item">
                <div className="highlight-icon bg-blue">
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <div className="highlight-text">
                  <strong>1-Click AI Cleanup</strong>
                  <span>Auto-align messy shapes into clean DAG trees</span>
                </div>
              </div>

              <div className="highlight-item">
                <div className="highlight-icon bg-emerald">
                  <i className="fa-solid fa-bolt-lightning"></i>
                </div>
                <div className="highlight-text">
                  <strong>Sub-15ms Multiplayer</strong>
                  <span>Smooth multi-cursor presence & Redis state sync</span>
                </div>
              </div>

              <div className="highlight-item">
                <div className="highlight-icon bg-purple">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <div className="highlight-text">
                  <strong>Architecture Linter</strong>
                  <span>Automated topology checks & security guards</span>
                </div>
              </div>

              <div className="highlight-item">
                <div className="highlight-icon bg-rose">
                  <i className="fa-solid fa-file-pdf"></i>
                </div>
                <div className="highlight-text">
                  <strong>Slide Deck & PDF Export</strong>
                  <span>Export multi-page presentation decks instantly</span>
                </div>
              </div>
            </div>

            <div className="highlights-footer">
              <div className="security-badge-mini">
                <i
                  className="fa-solid fa-lock"
                  style={{ color: "#10B981" }}
                ></i>
                <span>256-bit JWT Encryption & Secure Sessions</span>
              </div>
            </div>
          </div>

          {/* Right Interactive Form Panel */}
          <div className="auth-form-panel">
            {/* Mode Switcher Tabs */}
            <div className="auth-tab-pills">
              <button
                type="button"
                className={`tab-pill-btn ${isLogin ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`tab-pill-btn ${!isLogin ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
              >
                Create Account
              </button>
            </div>

            <div className="auth-form-header">
              <h3>{isLogin ? "Welcome Back" : "Get Started Free"}</h3>
              <p>
                {isLogin
                  ? "Enter your credentials to access your whiteboards"
                  : "Create an account in seconds — no credit card needed"}
              </p>
            </div>

            {/* Error Notification Banner */}
            {authError && (
              <div className="auth-error-glass">
                <i className="fa-solid fa-triangle-exclamation error-icon"></i>
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-input-form">
              {!isLogin && (
                <div className="auth-field">
                  <label htmlFor="auth-name">Full Name</label>
                  <div className="input-with-icon">
                    <i className="field-icon fa-solid fa-user"></i>
                    <input
                      type="text"
                      id="auth-name"
                      value={authForm.name}
                      onChange={(e) =>
                        setAuthForm({ ...authForm, name: e.target.value })
                      }
                      placeholder="Alex Architect"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="auth-email">Work Email</label>
                <div className="input-with-icon">
                  <i className="field-icon fa-solid fa-envelope"></i>
                  <input
                    type="email"
                    id="auth-email"
                    value={authForm.email}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, email: e.target.value })
                    }
                    placeholder="alex@company.com"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="field-label-row">
                  <label htmlFor="auth-password">Password</label>
                  {!isLogin && (
                    <span className="forgot-hint">Minimum 6 characters</span>
                  )}
                </div>
                <div className="input-with-icon">
                  <i className="field-icon fa-solid fa-lock"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="auth-password"
                    value={authForm.password}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <i
                      className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                    ></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-auth-submit btn-glow"
                disabled={authLoading}
              >
                {authLoading ? (
                  <span className="auth-spinner-row">
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Authenticating...</span>
                  </span>
                ) : isLogin ? (
                  <span>
                    Sign In to Studio
                    <i
                      className="fa-solid fa-arrow-right"
                      style={{ marginLeft: "8px" }}
                    ></i>
                  </span>
                ) : (
                  <span>
                    Create Free Account
                    <i
                      className="fa-solid fa-arrow-right"
                      style={{ marginLeft: "8px" }}
                    ></i>
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider">
              <span>OR</span>
            </div>

            {/* Quick Guest Sandbox Access */}
            {onGuestDemo && (
              <button
                type="button"
                className="btn btn-secondary btn-block btn-guest-access"
                onClick={onGuestDemo}
              >
                <i
                  className="fa-solid fa-compass"
                  style={{ marginRight: "8px", color: "#60A5FA" }}
                ></i>
                <span>Continue as Guest Explorer</span>
              </button>
            )}

            {/* Form Footer */}
            <div className="auth-form-footer">
              <span>
                {isLogin
                  ? "New to Whiteboard Pro?"
                  : "Already have an account?"}
              </span>
              <button
                type="button"
                className="btn-link-switch"
                onClick={() => {
                  setAuthMode(isLogin ? "register" : "login");
                  setAuthError("");
                }}
              >
                {isLogin ? "Create an account" : "Sign In"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
