import React, { useEffect, useRef, useCallback } from "react";

export default function DrawioCanvas({
  initialXml = "",
  remoteXml = null,
  onXmlChange = () => {},
  isReadOnly = false,
}) {
  const iframeRef = useRef(null);
  const isLoadedRef = useRef(false);
  const currentXmlRef = useRef(initialXml);

  const postToDrawio = useCallback((msgObj) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify(msgObj), "*");
    }
  }, []);

  // Sync initialXml into iframe when board finishes loading from backend
  useEffect(() => {
    if (initialXml && initialXml !== currentXmlRef.current) {
      currentXmlRef.current = initialXml;
      if (isLoadedRef.current) {
        postToDrawio({
          action: "load",
          autosave: isReadOnly ? 0 : 1,
          xml: initialXml,
          editable: !isReadOnly,
        });
      }
    }
  }, [initialXml, isReadOnly, postToDrawio]);

  // Handle messages from Draw.io iframe (embed postMessage API)
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || typeof event.data !== "string") return;
      try {
        const msg = JSON.parse(event.data);

        if (msg.event === "init") {
          isLoadedRef.current = true;
          postToDrawio({
            action: "load",
            autosave: isReadOnly ? 0 : 1,
            xml: currentXmlRef.current || "",
            editable: !isReadOnly,
          });
        } else if (
          (msg.event === "autosave" ||
            msg.event === "save" ||
            msg.event === "export") &&
          !isReadOnly
        ) {
          if (msg.xml) {
            currentXmlRef.current = msg.xml;
            onXmlChange(msg.xml);
          }
        } else if (msg.event === "change" && !isReadOnly) {
          // Whenever a change occurs inside Draw.io, request an XML export so parent state stays fresh
          postToDrawio({
            action: "export",
            format: "xml",
          });
        }
      } catch (e) {
        // Ignore non-json postMessages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [postToDrawio, onXmlChange, isReadOnly]);

  // Sync remote XML updates from socket into Draw.io iframe
  useEffect(() => {
    if (
      remoteXml &&
      remoteXml !== currentXmlRef.current &&
      isLoadedRef.current
    ) {
      currentXmlRef.current = remoteXml;
      postToDrawio({
        action: "load",
        autosave: isReadOnly ? 0 : 1,
        xml: remoteXml,
        editable: !isReadOnly,
      });
    }
  }, [remoteXml, isReadOnly, postToDrawio]);

  const iframeSrc = isReadOnly
    ? "https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=0&noExitBtn=1&noSaveBtn=1&chrome=0&editable=0"
    : "https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=1&noExitBtn=1&noSaveBtn=1";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "500px",
        position: "relative",
        overflow: "hidden",
        background: "#1e1e1e",
      }}
    >
      <iframe
        ref={iframeRef}
        title="Draw.io Diagrammer"
        src={iframeSrc}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />

      {/* Non-blocking View Only lock indicator */}
      {isReadOnly && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 20,
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(8px)",
            color: "#f8fafc",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
          }}
        >
          <i className="fa-solid fa-lock" style={{ color: "#ef4444" }} />
          <span>Architecture Diagram: View Only</span>
        </div>
      )}
    </div>
  );
}
