import React from "react";

const GROUPS = [
  {
    title: "Tools",
    items: [
      ["V", "Select"],
      ["H", "Pan / hand"],
      ["P", "Pen (draw)"],
      ["E", "Eraser"],
      ["R", "Rectangle"],
      ["O", "Circle"],
      ["D", "Diamond"],
      ["T", "Text"],
      ["A", "Arrow"],
      ["S", "Line"],
      ["X", "Connector"],
      ["L", "Lasso select"],
      ["C", "Circle select"],
    ],
  },
  {
    title: "Edit",
    items: [
      ["Ctrl + Z", "Undo"],
      ["Ctrl + Y", "Redo"],
      ["Ctrl + C", "Copy"],
      ["Ctrl + X", "Cut"],
      ["Ctrl + V", "Paste"],
      ["Del / Backspace", "Delete selection"],
      ["Ctrl + G", "Group"],
      ["Ctrl + Shift + G", "Ungroup"],
      ["Ctrl + L", "Lock / unlock"],
    ],
  },
  {
    title: "View & canvas",
    items: [
      ["Ctrl + =", "Zoom in"],
      ["Ctrl + -", "Zoom out"],
      ["Ctrl + 0", "Reset zoom"],
      ["G", "Toggle snap-to-grid"],
      ["?", "This cheat sheet"],
      ["Esc", "Close this"],
    ],
  },
];

function renderKey(combo) {
  return combo.split(" + ").map((k, i, arr) => (
    <React.Fragment key={k + i}>
      <kbd className="shortcut-key">{k}</kbd>
      {i < arr.length - 1 && <span className="shortcut-plus">+</span>}
    </React.Fragment>
  ));
}

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div
        className="shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="shortcuts-header">
          <h2>
            <i
              className="fa-solid fa-keyboard"
              style={{ marginRight: "8px" }}
            ></i>
            Keyboard Shortcuts
          </h2>
          <button
            className="shortcuts-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="shortcuts-grid">
          {GROUPS.map((g) => (
            <div className="shortcuts-col" key={g.title}>
              <div className="shortcuts-col-title">{g.title}</div>
              {g.items.map(([combo, label]) => (
                <div className="shortcut-row" key={combo + label}>
                  <span className="shortcut-label">{label}</span>
                  <span className="shortcut-keys">{renderKey(combo)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="shortcuts-footer">
          Press <kbd className="shortcut-key">?</kbd> anytime to toggle this
          panel.
        </div>
      </div>
    </div>
  );
}
