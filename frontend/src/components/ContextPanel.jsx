import React, { useState, useEffect, useRef, useCallback } from "react";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "sql", label: "SQL" },
  { value: "css", label: "CSS" },
  { value: "plaintext", label: "Plain Text" },
];

const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_BASE_URL = rawApiUrl.endsWith("/")
  ? rawApiUrl.slice(0, -1)
  : rawApiUrl;

const ensureAbsoluteUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) || trimmed.startsWith("//")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export default function ContextPanel({
  isOpen,
  onClose,
  whiteboardId,
  elementId,
  elementName,
  onContextUpdated, // callback to let App know context changed (for badges)
  isReadOnly = false,
}) {
  const [activeTab, setActiveTab] = useState("notes");
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState([]);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [files, setFiles] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState("saved"); // "saved" | "saving" | "error"
  const [isNotesPreview, setIsNotesPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const currentContextRef = useRef({
    notes: "",
    links: [],
    codeSnippet: "",
    codeLanguage: "javascript",
  });
  const autoSaveTimerRef = useRef(null);
  const isDirtyRef = useRef(false);
  const activeTargetRef = useRef({ whiteboardId, elementId });

  // Keep refs updated with current state
  useEffect(() => {
    currentContextRef.current = {
      notes,
      links,
      codeSnippet,
      codeLanguage,
    };
  }, [notes, links, codeSnippet, codeLanguage]);

  useEffect(() => {
    activeTargetRef.current = { whiteboardId, elementId };
  }, [whiteboardId, elementId]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Perform API save
  const performSave = useCallback(
    async (manual = false, overrideTarget = null) => {
      const targetWbId = overrideTarget
        ? overrideTarget.whiteboardId
        : activeTargetRef.current.whiteboardId;
      const targetElId = overrideTarget
        ? overrideTarget.elementId
        : activeTargetRef.current.elementId;

      if (!targetWbId || !targetElId || isReadOnly) return;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      setSyncStatus("saving");
      if (manual) {
        setIsSaving(true);
        setStatusMessage({ type: "", text: "" });
      }

      const {
        notes: curNotes,
        links: curLinks,
        codeSnippet: curCodeSnippet,
        codeLanguage: curCodeLanguage,
      } = currentContextRef.current;

      try {
        const token = localStorage.getItem("wb_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${API_BASE_URL}/api/context/${targetWbId}/${targetElId}`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              notes: curNotes,
              links: curLinks,
              code_snippet: curCodeSnippet,
              code_language: curCodeLanguage,
            }),
          },
        );

        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();

        isDirtyRef.current = false;
        setSyncStatus("saved");

        if (data.files) {
          setFiles(data.files);
        }

        if (manual) {
          setStatusMessage({
            type: "success",
            text: "Context saved successfully!",
          });
          setTimeout(() => setStatusMessage({ type: "", text: "" }), 3000);
        }

        if (onContextUpdated) {
          const hasContent =
            (curNotes && curNotes.trim() !== "") ||
            (curLinks &&
              curLinks.length > 0 &&
              curLinks.some((l) => l.url && l.url.trim() !== "")) ||
            (curCodeSnippet && curCodeSnippet.trim() !== "") ||
            (data.files && data.files.length > 0);
          onContextUpdated(targetElId, hasContent);
        }
      } catch (err) {
        console.error("Context save error:", err);
        setSyncStatus("error");
        if (manual) {
          setStatusMessage({ type: "error", text: "Failed to save context" });
        }
      } finally {
        if (manual) setIsSaving(false);
      }
    },
    [isReadOnly, onContextUpdated],
  );

  // Trigger debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (isReadOnly) return;
    isDirtyRef.current = true;
    setSyncStatus("saving");

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      performSave(false);
    }, 600);
  }, [isReadOnly, performSave]);

  // Load context on mount / element change
  useEffect(() => {
    if (!whiteboardId || !elementId || !isOpen) return;

    let isSubscribed = true;

    const fetchContext = async () => {
      setIsLoading(true);
      setStatusMessage({ type: "", text: "" });
      try {
        const token = localStorage.getItem("wb_token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(
          `${API_BASE_URL}/api/context/${whiteboardId}/${elementId}`,
          { headers },
        );
        if (!res.ok) throw new Error("Failed to load element details");
        const data = await res.json();
        if (isSubscribed) {
          setNotes(data.notes || "");
          setLinks(data.links || []);
          setCodeSnippet(data.code_snippet || "");
          setCodeLanguage(data.code_language || "javascript");
          setFiles(data.files || []);
          isDirtyRef.current = false;
          setSyncStatus("saved");
          if (isReadOnly) {
            setIsNotesPreview(true);
          }
        }
      } catch (err) {
        console.error("Error fetching context:", err);
        if (isSubscribed) {
          setStatusMessage({
            type: "error",
            text: "Failed to load element details",
          });
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    fetchContext();

    return () => {
      isSubscribed = false;
      if (isDirtyRef.current) {
        performSave(false, { whiteboardId, elementId });
      }
    };
  }, [whiteboardId, elementId, isOpen, isReadOnly, performSave]);

  // Save text-based context explicitly
  const handleSave = () => {
    if (!whiteboardId) {
      setStatusMessage({
        type: "error",
        text: "Please save the whiteboard first before saving context.",
      });
      return;
    }
    if (!elementId) {
      setStatusMessage({
        type: "error",
        text: "No element selected.",
      });
      return;
    }
    performSave(true);
  };

  // Notes change handler
  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    triggerAutoSave();
  };

  // Link modification functions
  const handleAddLink = () => {
    const updated = [...links, { label: "", url: "" }];
    setLinks(updated);
    triggerAutoSave();
  };

  const handleLinkChange = (index, field, value) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    setLinks(updated);
    triggerAutoSave();
  };

  const handleRemoveLink = (index) => {
    const updated = links.filter((_, idx) => idx !== index);
    setLinks(updated);
    triggerAutoSave();
  };

  // Code change handlers
  const handleCodeChange = (e) => {
    setCodeSnippet(e.target.value);
    triggerAutoSave();
  };

  const handleCodeLanguageChange = (e) => {
    setCodeLanguage(e.target.value);
    triggerAutoSave();
  };

  // File Upload Handlers
  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!whiteboardId) {
      setStatusMessage({
        type: "error",
        text: "Please save the whiteboard first before uploading attachments.",
      });
      return;
    }
    if (!elementId) {
      setStatusMessage({
        type: "error",
        text: "No element selected to attach file to.",
      });
      return;
    }

    // 10MB limit check
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setStatusMessage({
        type: "error",
        text: `File "${file.name}" exceeds the 10MB limit (${formatFileSize(file.size)}).`,
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("wb_token");
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE_URL}/api/context/${whiteboardId}/${elementId}/upload`,
        {
          method: "POST",
          headers,
          body: formData,
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }
      const data = await res.json();
      setFiles(data.files || []);
      setStatusMessage({
        type: "success",
        text: `Uploaded ${file.name} successfully!`,
      });
      if (onContextUpdated) {
        onContextUpdated(elementId, true);
      }
      setTimeout(() => setStatusMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      console.error("File upload error:", err);
      setStatusMessage({
        type: "error",
        text: err.message
          ? `Upload failed: ${err.message}`
          : "File upload failed",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
      e.target.value = "";
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = async (fileId) => {
    if (!whiteboardId || !elementId) return;
    if (
      !window.confirm("Are you sure you want to delete this file attachment?")
    )
      return;
    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const token = localStorage.getItem("wb_token");
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `${API_BASE_URL}/api/context/${whiteboardId}/${elementId}/files/${fileId}`,
        {
          method: "DELETE",
          headers,
        },
      );
      if (!res.ok) throw new Error("Delete failed");
      const data = await res.json();
      setFiles(data.files || []);
      setStatusMessage({ type: "success", text: "Attachment removed" });

      // If no files, notes, code, or links are active, we might clear badge. Let App handle it.
      if (onContextUpdated) {
        const hasContent =
          notes.trim() !== "" ||
          links.some((l) => l.url) ||
          codeSnippet.trim() !== "" ||
          (data.files && data.files.length > 0);
        onContextUpdated(elementId, hasContent);
      }
      setTimeout(() => setStatusMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      console.error("Delete attachment error:", err);
      setStatusMessage({ type: "error", text: "Failed to delete attachment" });
    } finally {
      setIsLoading(false);
    }
  };

  // Custom visual components
  const parseMarkdown = (text) => {
    if (!text)
      return '<p class="empty-preview">No notes written yet. Switch to Edit mode to write notes.</p>';
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headers
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Italic
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Code blocks (inline)
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");

    // Links: [text](url)
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, text, url) =>
        `<a href="${ensureAbsoluteUrl(url)}" target="_blank" rel="noopener noreferrer" class="md-link">${text} ↗</a>`,
    );

    // Lines
    html = html
      .split("\n")
      .map((line) => {
        if (
          line.startsWith("<h3>") ||
          line.startsWith("<h2>") ||
          line.startsWith("<h1>") ||
          line.startsWith("<ul>") ||
          line.startsWith("<li>")
        ) {
          return line;
        }
        if (line.trim().startsWith("- ")) {
          return `<li>${line.substring(2)}</li>`;
        }
        return line ? `<p>${line}</p>` : "";
      })
      .join("");

    return html;
  };

  const highlightCode = (code, language) => {
    if (!code) return "";
    let highlighted = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const keywords = {
      javascript:
        /\b(const|let|var|function|return|import|export|from|default|class|extends|if|else|for|while|try|catch|new|this|async|await)\b/g,
      python:
        /\b(def|class|return|import|from|if|elif|else|for|while|try|except|as|with|in|is|not|and|or|lambda|self)\b/g,
      html: /(&lt;\/?[a-zA-Z0-9\-]+&gt;)/g,
      sql: /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|JOIN|LEFT|RIGHT|ON|GROUP|BY|ORDER|HAVING|INDEX)\b/gi,
      css: /\b(color|background|margin|padding|width|height|border|display|flex|position|top|left|right|bottom)\b/g,
    };

    const regex = keywords[language.toLowerCase()];
    if (regex) {
      if (language.toLowerCase() === "html") {
        highlighted = highlighted.replace(
          regex,
          '<span class="code-html-tag">$1</span>',
        );
      } else if (language.toLowerCase() === "css") {
        highlighted = highlighted.replace(
          regex,
          '<span class="code-css-prop">$1</span>',
        );
      } else {
        highlighted = highlighted.replace(
          regex,
          '<span class="code-keyword">$1</span>',
        );
      }
    }

    // Strings
    highlighted = highlighted.replace(
      /(["'`])(.*?)\1/g,
      '<span class="code-string">$1$2$1</span>',
    );
    // Comments
    highlighted = highlighted.replace(
      /(\/\/.*|#.*)/g,
      '<span class="code-comment">$1</span>',
    );

    return highlighted;
  };

  if (!isOpen) return null;

  return (
    <div className={`context-panel-drawer ${isOpen ? "open" : ""}`}>
      <div className="context-panel-header">
        <div className="header-info">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3>Context Details</h3>
            {whiteboardId && !isReadOnly && (
              <span className={`context-sync-indicator ${syncStatus}`}>
                {syncStatus === "saving" && "Saving..."}
                {syncStatus === "saved" && "Saved ✓"}
                {syncStatus === "error" && "Save failed"}
              </span>
            )}
          </div>
          <span className="element-badge">
            {elementName || "Selected Shape"}
          </span>
        </div>
        <button
          className="btn-close"
          onClick={() => {
            if (isDirtyRef.current) {
              performSave(false);
            }
            onClose();
          }}
          title="Close Context Inspector"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {statusMessage.text && (
        <div className={`context-status-bar ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {!whiteboardId && (
        <div
          className="context-status-bar error"
          style={{
            background: "#fffbeb",
            color: "#92400e",
            border: "1px solid #fde68a",
          }}
        >
          ⚠️ Whiteboard not saved yet. Please click &quot;Save&quot; in the top
          bar to enable persistent file attachments and context.
        </div>
      )}

      {isLoading && (
        <div className="context-loading-overlay">
          <div className="loader"></div>
          <span>Loading attachment details...</span>
        </div>
      )}

      <div className="context-panel-tabs">
        <button
          className={`tab-btn ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          <i
            className="fa-solid fa-note-sticky"
            style={{ marginRight: "6px" }}
          ></i>
          Notes
        </button>
        <button
          className={`tab-btn ${activeTab === "links" ? "active" : ""}`}
          onClick={() => setActiveTab("links")}
        >
          <i className="fa-solid fa-link" style={{ marginRight: "6px" }}></i>
          Links
        </button>
        <button
          className={`tab-btn ${activeTab === "code" ? "active" : ""}`}
          onClick={() => setActiveTab("code")}
        >
          <i className="fa-solid fa-code" style={{ marginRight: "6px" }}></i>
          Code
        </button>
        <button
          className={`tab-btn ${activeTab === "files" ? "active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          <i
            className="fa-solid fa-paperclip"
            style={{ marginRight: "6px" }}
          ></i>
          Files ({files.length})
        </button>
      </div>

      <div className="context-panel-body">
        {/* NOTES TAB */}
        {activeTab === "notes" && (
          <div className="tab-pane notes-pane">
            <div className="pane-header-actions">
              <span className="pane-hint">Supports Markdown syntax</span>
              {!isReadOnly && (
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={() => setIsNotesPreview(!isNotesPreview)}
                >
                  {isNotesPreview ? "Edit Notes" : "Preview Notes"}
                </button>
              )}
            </div>

            {isNotesPreview ? (
              <div
                className="markdown-preview-container"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(notes) }}
              />
            ) : (
              <textarea
                className="notes-textarea"
                placeholder="Write markdown notes for this element here..."
                value={notes}
                onChange={handleNotesChange}
                onBlur={() => performSave(false)}
                disabled={isReadOnly}
              />
            )}
          </div>
        )}

        {/* LINKS TAB */}
        {activeTab === "links" && (
          <div className="tab-pane links-pane">
            <div className="pane-header-actions">
              <span className="pane-hint">Attach web hyperlinks</span>
              {!isReadOnly && (
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={handleAddLink}
                >
                  + Add Link
                </button>
              )}
            </div>

            <div className="links-list">
              {links.length === 0 ? (
                <div className="empty-tab-state">
                  <p>No web links added yet.</p>
                </div>
              ) : (
                links.map((link, index) => (
                  <div key={index} className="link-item-card">
                    <input
                      type="text"
                      placeholder="Link Label (e.g. API Docs)"
                      className="link-input label-input"
                      value={link.label || ""}
                      onChange={(e) =>
                        handleLinkChange(index, "label", e.target.value)
                      }
                      onBlur={() => performSave(false)}
                      disabled={isReadOnly}
                    />
                    <div className="link-row">
                      <input
                        type="url"
                        placeholder="https://example.com"
                        className="link-input url-input"
                        value={link.url || ""}
                        onChange={(e) =>
                          handleLinkChange(index, "url", e.target.value)
                        }
                        onBlur={() => performSave(false)}
                        disabled={isReadOnly}
                      />
                      {!isReadOnly && (
                        <button
                          className="btn-icon btn-danger-icon"
                          onClick={() => handleRemoveLink(index)}
                        >
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {link.url && (
                      <a
                        href={ensureAbsoluteUrl(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-test-btn"
                      >
                        Test Link ↗
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CODE TAB */}
        {activeTab === "code" && (
          <div className="tab-pane code-pane">
            <div className="pane-header-actions">
              <span className="pane-hint">Attach code snippets</span>
              {!isReadOnly && (
                <select
                  className="language-dropdown"
                  value={codeLanguage}
                  onChange={handleCodeLanguageChange}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!isReadOnly ? (
              <textarea
                className="code-textarea"
                placeholder="Paste or write your code snippet here..."
                value={codeSnippet}
                onChange={handleCodeChange}
                onBlur={() => performSave(false)}
              />
            ) : (
              !codeSnippet && (
                <div className="empty-tab-state">
                  <p>No code snippet attached yet.</p>
                </div>
              )
            )}

            {codeSnippet && (
              <div className="code-highlight-preview">
                <span className="preview-label">Highlighted Preview:</span>
                <pre className="code-snippet-box">
                  <code
                    dangerouslySetInnerHTML={{
                      __html: highlightCode(codeSnippet, codeLanguage),
                    }}
                  />
                </pre>
              </div>
            )}
          </div>
        )}

        {/* FILES TAB */}
        {activeTab === "files" && (
          <div className="tab-pane files-pane">
            {!isReadOnly && (
              <div
                className={`file-dropzone ${dragActive ? "active" : ""}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload-input"
                  className="hidden-file-input"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="file-upload-input"
                  className="file-dropzone-label"
                >
                  <svg
                    width="32"
                    height="32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                    />
                  </svg>
                  <span>Drag & drop files or click to upload</span>
                  <span className="file-size-limit">
                    Supported text, image, PDF, up to 10MB
                  </span>
                </label>
              </div>
            )}

            <div className="attachments-list">
              <h4 className="attachments-title">
                Attachments ({files.length})
              </h4>
              {files.length === 0 ? (
                <p className="no-attachments">No files attached yet.</p>
              ) : (
                files.map((file) => (
                  <div key={file._id} className="attachment-item-card">
                    <div className="attachment-info">
                      <span className="file-icon">
                        {file.mimetype?.includes("image")
                          ? "🖼️"
                          : file.mimetype?.includes("pdf")
                            ? "📄"
                            : "📁"}
                      </span>
                      <div className="file-meta">
                        <span className="file-name" title={file.name}>
                          {file.name}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          {file.size > 0 && (
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--color-text-muted)",
                              }}
                            >
                              {formatFileSize(file.size)}
                            </span>
                          )}
                          <a
                            href={
                              file.path?.startsWith("http")
                                ? file.path
                                : `${API_BASE_URL}${file.path?.startsWith("/") ? file.path : `/${file.path || ""}`}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-download-link"
                            download={file.name}
                          >
                            Download file
                          </a>
                        </div>
                      </div>
                    </div>
                    {!isReadOnly && (
                      <button
                        className="btn-icon btn-danger-icon"
                        onClick={() => handleRemoveFile(file._id)}
                        title="Delete file"
                      >
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {!isReadOnly && (
        <div className="context-panel-footer">
          <button
            className="btn btn-primary btn-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving Context..." : "Save Context"}
          </button>
        </div>
      )}
    </div>
  );
}
