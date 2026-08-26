import React, { useEffect, useRef, useCallback } from "react";

export default function DrawioCanvas({
  initialXml = "",
  remoteXml = null,
  onXmlChange = () => {},
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
          autosave: 1,
          xml: initialXml,
        });
      }
    }
  }, [initialXml, postToDrawio]);

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
            autosave: 1,
            xml: currentXmlRef.current || "",
          });
        } else if (
          msg.event === "autosave" ||
          msg.event === "save" ||
          msg.event === "export"
        ) {
          if (msg.xml) {
            currentXmlRef.current = msg.xml;
            onXmlChange(msg.xml);
          }
        } else if (msg.event === "change") {
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
  }, [postToDrawio, onXmlChange]);

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
        autosave: 1,
        xml: remoteXml,
      });
    }
  }, [remoteXml, postToDrawio]);

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
        src="https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=1&noExitBtn=1&stealth=1"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
}
