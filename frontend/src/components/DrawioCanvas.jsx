import React, {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

const DrawioCanvas = forwardRef(function DrawioCanvas(
  {
    initialXml = "",
    remoteXml = null,
    onXmlChange = () => {},
    isReadOnly = false,
  },
  ref,
) {
  const iframeRef = useRef(null);
  const isLoadedRef = useRef(false);
  const currentXmlRef = useRef(initialXml);

  const postToDrawio = useCallback((msgObj) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify(msgObj), "*");
    }
  }, []);

  // Parent persists the board (Topbar Save), so it owns the dirty flag too.
  // Without this the iframe keeps its own "modified" state and warns that
  // changes may not be saved on unload, even right after a successful save.
  useImperativeHandle(
    ref,
    () => ({
      markSaved: () =>
        postToDrawio({ action: "status", message: "Saved", modified: false }),
    }),
    [postToDrawio],
  );

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
    ? "https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=0&noExitBtn=1&noSaveBtn=1&saveAndExit=0&chrome=0&editable=0&stealth=1"
    : "https://embed.diagrams.net/?embed=1&proto=json&spin=1&libraries=1&noExitBtn=1&noSaveBtn=1&saveAndExit=0&stealth=1";

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
        allow="clipboard-read; clipboard-write; storage-access"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
});

export default DrawioCanvas;
