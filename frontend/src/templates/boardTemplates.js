/**
 * Starter board templates. Each template provides real pre-built canvas content
 * (plain Fabric JSON: rects, i-text labels and lines) so "New from template"
 * drops the user onto a populated, editable board instead of a titled blank.
 *
 * Objects are intentionally built from primitive Fabric types (no custom
 * connector class) so they load reliably through canvas.loadFromJSON on any
 * board without extra registration.
 */

let idc = 0;
const nid = () => `tpl-${Date.now().toString(36)}-${idc++}`;

// A rounded box with a centered text label -> returns [rect, label].
function box(x, y, w, h, label, opts = {}) {
  const fill = opts.fill || "#EEF2FF";
  const stroke = opts.stroke || "#6366F1";
  const textColor = opts.textColor || "#1E293B";
  const fontSize = opts.fontSize || 16;
  return [
    {
      type: "rect",
      id: nid(),
      left: x,
      top: y,
      width: w,
      height: h,
      rx: 10,
      ry: 10,
      fill,
      stroke,
      strokeWidth: 2,
      strokeUniform: true,
    },
    {
      type: "i-text",
      id: nid(),
      left: x + w / 2,
      top: y + h / 2,
      originX: "center",
      originY: "center",
      text: label,
      fontSize,
      fontFamily: "Inter, system-ui, sans-serif",
      fontWeight: opts.bold ? "700" : "500",
      fill: textColor,
      textAlign: "center",
      width: w - 20,
    },
  ];
}

// A plain connector line between two points.
function link(x1, y1, x2, y2, opts = {}) {
  return {
    type: "line",
    id: nid(),
    x1,
    y1,
    x2,
    y2,
    stroke: opts.stroke || "#94A3B8",
    strokeWidth: opts.strokeWidth || 2,
    strokeUniform: true,
    strokeDashArray: opts.dashed ? [6, 5] : null,
  };
}

// A free-standing heading label.
function heading(x, y, text, opts = {}) {
  return {
    type: "i-text",
    id: nid(),
    left: x,
    top: y,
    text,
    fontSize: opts.fontSize || 22,
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: "700",
    fill: opts.fill || "#0F172A",
  };
}

function objectsFor(builder) {
  idc = 0;
  const objects = [];
  builder((o) => {
    if (Array.isArray(o)) objects.push(...o);
    else objects.push(o);
  });
  return { objects };
}

// --- Template content builders -------------------------------------------

const flowchart = objectsFor((add) => {
  add(heading(360, 60, "Flowchart"));
  add(box(360, 120, 200, 60, "Start", { fill: "#DCFCE7", stroke: "#10B981" }));
  add(link(460, 180, 460, 220));
  add(
    box(360, 220, 200, 70, "Process step", {
      fill: "#EEF2FF",
      stroke: "#6366F1",
    }),
  );
  add(link(460, 290, 460, 330));
  add(
    box(360, 330, 200, 80, "Decision?", { fill: "#FEF3C7", stroke: "#F59E0B" }),
  );
  add(link(560, 370, 700, 370));
  add(
    box(700, 335, 180, 70, "Yes -> Handle", {
      fill: "#EEF2FF",
      stroke: "#6366F1",
    }),
  );
  add(link(460, 410, 460, 450));
  add(box(360, 450, 200, 60, "End", { fill: "#FEE2E2", stroke: "#EF4444" }));
});

const architecture = objectsFor((add) => {
  add(heading(300, 60, "System Architecture"));
  add(
    box(300, 130, 200, 70, "React Client", {
      fill: "#DBEAFE",
      stroke: "#2E86AB",
    }),
  );
  add(link(400, 200, 400, 250));
  add(
    box(300, 250, 200, 70, "API Server\n(Express + Socket.IO)", {
      fill: "#EEF2FF",
      stroke: "#6366F1",
      fontSize: 14,
    }),
  );
  add(link(400, 320, 400, 370));
  add(
    box(300, 370, 200, 70, "MongoDB", { fill: "#DCFCE7", stroke: "#10B981" }),
  );
  add(link(500, 285, 640, 285));
  add(
    box(640, 250, 180, 70, "Redis\nPub/Sub + Cache", {
      fill: "#FEE2E2",
      stroke: "#EF4444",
      fontSize: 14,
    }),
  );
});

const kanban = objectsFor((add) => {
  add(heading(80, 60, "Kanban Board"));
  const cols = [
    { x: 80, label: "To Do", fill: "#EEF2FF", stroke: "#6366F1" },
    { x: 380, label: "In Progress", fill: "#FEF3C7", stroke: "#F59E0B" },
    { x: 680, label: "Done", fill: "#DCFCE7", stroke: "#10B981" },
  ];
  cols.forEach((c) => {
    add(
      box(c.x, 120, 260, 46, c.label, {
        fill: c.fill,
        stroke: c.stroke,
        bold: true,
      }),
    );
    add(
      box(c.x + 10, 185, 240, 60, "Task card", {
        fill: "#FFFFFF",
        stroke: "#CBD5E1",
        textColor: "#475569",
        fontSize: 14,
      }),
    );
    add(
      box(c.x + 10, 260, 240, 60, "Task card", {
        fill: "#FFFFFF",
        stroke: "#CBD5E1",
        textColor: "#475569",
        fontSize: 14,
      }),
    );
  });
});

const mindmap = objectsFor((add) => {
  add(
    box(420, 260, 180, 70, "Central Idea", {
      fill: "#EDE9FE",
      stroke: "#8B5CF6",
      bold: true,
    }),
  );
  const branches = [
    { x: 140, y: 120, label: "Topic A", color: "#2E86AB", fill: "#DBEAFE" },
    { x: 720, y: 120, label: "Topic B", color: "#10B981", fill: "#DCFCE7" },
    { x: 140, y: 420, label: "Topic C", color: "#F59E0B", fill: "#FEF3C7" },
    { x: 720, y: 420, label: "Topic D", color: "#EF4444", fill: "#FEE2E2" },
  ];
  branches.forEach((b) => {
    add(link(510, 295, b.x + 80, b.y + 30, { stroke: b.color }));
    add(box(b.x, b.y, 160, 60, b.label, { fill: b.fill, stroke: b.color }));
  });
});

const retro = objectsFor((add) => {
  add(heading(80, 60, "Sprint Retrospective"));
  const cols = [
    { x: 80, label: "What went well", fill: "#DCFCE7", stroke: "#10B981" },
    { x: 380, label: "What to improve", fill: "#FEF3C7", stroke: "#F59E0B" },
    { x: 680, label: "Action items", fill: "#DBEAFE", stroke: "#2E86AB" },
  ];
  cols.forEach((c) => {
    add(
      box(c.x, 120, 260, 46, c.label, {
        fill: c.fill,
        stroke: c.stroke,
        bold: true,
      }),
    );
    add(
      box(c.x + 10, 185, 240, 70, "Add a note...", {
        fill: "#FFFFFF",
        stroke: "#CBD5E1",
        textColor: "#94A3B8",
        fontSize: 14,
      }),
    );
  });
});

// --- Public catalogue -----------------------------------------------------

export const BOARD_TEMPLATES = [
  {
    id: "blank",
    title: "Blank Canvas",
    description: "Start from an empty board.",
    icon: "fa-regular fa-square",
    accent: "blue",
    pages: null, // null => empty board
  },
  {
    id: "flowchart",
    title: "Flowchart",
    description: "Start / process / decision / end, pre-connected.",
    icon: "fa-solid fa-diagram-project",
    accent: "purple",
    pages: [pageFrom("Flowchart", flowchart)],
  },
  {
    id: "architecture",
    title: "System Architecture",
    description: "Client, API, database and cache tiers.",
    icon: "fa-solid fa-sitemap",
    accent: "emerald",
    pages: [pageFrom("Architecture", architecture)],
  },
  {
    id: "kanban",
    title: "Kanban Board",
    description: "To Do / In Progress / Done with starter cards.",
    icon: "fa-solid fa-table-columns",
    accent: "amber",
    pages: [pageFrom("Kanban", kanban)],
  },
  {
    id: "mindmap",
    title: "Mind Map",
    description: "A central idea with four radiating topics.",
    icon: "fa-solid fa-brain",
    accent: "purple",
    pages: [pageFrom("Mind Map", mindmap)],
  },
  {
    id: "retro",
    title: "Sprint Retro",
    description: "Went well / improve / action items columns.",
    icon: "fa-solid fa-list-check",
    accent: "rose",
    pages: [pageFrom("Retro", retro)],
  },
];

function pageFrom(title, canvasState) {
  return {
    page_id: "page-1",
    title,
    order: 0,
    canvas_state: canvasState,
    thumbnail: null,
  };
}

export function getTemplateById(id) {
  return BOARD_TEMPLATES.find((t) => t.id === id) || null;
}
