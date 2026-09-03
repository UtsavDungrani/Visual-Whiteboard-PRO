# Graph Report - Visual Whiteboard Pro  (2026-09-01)

## Corpus Check
- 62 files · ~63,468 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 405 nodes · 547 edges · 35 communities (25 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3b7bea6f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- frontend/package.json
- index.js
- Project Description and Requirements
- dependencies
- Visual Whiteboard Pro
- App.jsx
- App
- package.json
- context.test.js
- pathLassoSplit.js
- Visual Whiteboard Pro — Deployment Guide
- Visual Whiteboard - Feature Backlog & Task Tracking
- GEMINI.md
- admin/admin.js
- AGENTS.md
- rules/graphify.md
- workflows/graphify.md
- copilot-instructions.md
- useConnectorSync.js
- frontend/vercel.json
- login.js
- vercel.json
- sockets.test.js
- whiteboards.test.js
- config.js
- User.js
- ai.test.js
- app
- adminPanel.test.js
- frontendUrlSanitize.test.js
- boardAccess.js
- ai.service.js

## God Nodes (most connected - your core abstractions)
1. `App()` - 18 edges
2. `Visual Whiteboard Pro` - 17 edges
3. `Project Description and Requirements` - 12 edges
4. `Visual Whiteboard - Feature Backlog & Task Tracking` - 11 edges
5. `Visual Whiteboard Pro — Phased Task Breakdown` - 10 edges
6. `loadUsersList()` - 9 edges
7. `Visual Whiteboard Pro — Deployment Guide` - 9 edges
8. `updateAllConnectors()` - 8 edges
9. `useConnectorSync()` - 7 edges
10. `isPointInPolygon()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `updateAllConnectors()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/hooks/useConnectorSync.js
- `App()` --calls--> `useConnectorSync()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/hooks/useConnectorSync.js
- `App()` --calls--> `useConnectorTool()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/tools/useConnectorTool.js
- `applyRemoteCanvas()` --calls--> `updateAllConnectors()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/hooks/useConnectorSync.js
- `attachFabricListeners()` --calls--> `getObjectSelectionMode()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/pathLassoSplit.js

## Import Cycles
- None detected.

## Communities (35 total, 10 thin omitted)

### Community 0 - "frontend/package.json"
Cohesion: 0.09
Nodes (21): dependencies, jspdf, jszip, react, react-dom, socket.io-client, devDependencies, vite (+13 more)

### Community 1 - "index.js"
Cohesion: 0.05
Nodes (33): {
  accessForBoard,
  canEdit,
  getBoardAccess,
  isBoardId,
}, activeUsers, admin, ADMIN_CSP, aiLimiter, ALLOWED_UPLOAD_EXTENSIONS, allowedOrigins, auth (+25 more)

### Community 2 - "Project Description and Requirements"
Cohesion: 0.11
Nodes (21): Architecture Assist AI, Real-time Collaboration, Context Layer, Drawing Canvas, HTML/CSS Export, PDF Export, Mess Cleanup AI, MongoDB Storage (+13 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (38): bcryptjs, cors, dotenv, express, express-rate-limit, jest, jsonwebtoken, mongoose (+30 more)

### Community 4 - "Visual Whiteboard Pro"
Cohesion: 0.12
Nodes (17): API Surface, Configuration, Current Limitations, Data Model, Future Improvements, How It Works, Live Url: https://visual-whiteboard-pro.vercel.app/, Local Setup (+9 more)

### Community 6 - "App.jsx"
Cohesion: 0.08
Nodes (20): RESERVED_ROUTES, AssistPanel(), AuthPage(), CanvasControls(), CanvasOverlay(), ContextPanel(), ensureAbsoluteUrl(), escapeAttr() (+12 more)

### Community 7 - "App"
Cohesion: 0.23
Nodes (11): App(), applyRemoteCanvas(), attachFabricListeners(), flushPendingRemoteCanvas(), loadBoard(), loadBoardById(), saveBoard(), updateInspectorProperties() (+3 more)

### Community 8 - "package.json"
Cohesion: 0.06
Nodes (32): eslint, husky, lint-staged, author, bugs, url, description, devDependencies (+24 more)

### Community 9 - "context.test.js"
Cohesion: 0.14
Nodes (12): ElementContextSchema, mongoose, { app }, ElementContext, fs, jwt, { JWT_SECRET }, mongoose (+4 more)

### Community 10 - "pathLassoSplit.js"
Cohesion: 0.30
Nodes (14): bboxCornersInPolygon(), buildClipPolygon(), canvasPolygonToLocal(), getLineEndpoints(), getObjectSelectionMode(), getPathSelectionMode(), isPointInPolygon(), lineLineIntersection() (+6 more)

### Community 11 - "Visual Whiteboard Pro — Deployment Guide"
Cohesion: 0.20
Nodes (9): Architecture Overview, Pre-requisites & Accounts Needed, Step 1: Database Setup (MongoDB Atlas), Step 2: Caching Setup (Upstash Redis), Step 3: Backend Deployment (Render), Step 4: Frontend API Config, Step 5: Frontend Deployment (Vercel), Step 6: Post-Deployment Testing (+1 more)

### Community 12 - "Visual Whiteboard - Feature Backlog & Task Tracking"
Cohesion: 0.17
Nodes (11): 10. Advanced Lasso & Selection Tool Refactor (On-Demand Implementation), 1. Multi-Page Reordering & Sharing (Restricted Access), 2. Fixed Position Page Navigation UI, 3. Toolbar UX & Optimization, 4. Color Selection State Sync Bug, 5. Optimized PDF Export Pipeline (Sketchbook Book Style), 6. Collapsible Side Menus & Immersive Canvas Mode, 7. Board Loading by ID via Dashboard Input (+3 more)

### Community 15 - "admin/admin.js"
Cohesion: 0.43
Nodes (12): deleteBoard(), deleteUser(), escapeHtml(), getHeaders(), handleResponse(), loadAllData(), loadBoardsList(), loadDashboardStats() (+4 more)

### Community 21 - "useConnectorSync.js"
Cohesion: 0.20
Nodes (15): escapeHtml(), ExportModal(), applyConnectorAnchors(), collectMovedShapes(), shapesMapFromCanvas(), stripConnectorsFromSelection(), updateAllConnectors(), useConnectorSync() (+7 more)

### Community 23 - "login.js"
Cohesion: 0.50
Nodes (3): alertBox, form, submitBtn

### Community 25 - "sockets.test.js"
Cohesion: 0.18
Nodes (10): httpServer, io, { app, httpServer, io }, http, ioClient, jwt, { JWT_SECRET }, mongoose (+2 more)

### Community 26 - "whiteboards.test.js"
Cohesion: 0.18
Nodes (9): mongoose, WhiteboardSchema, { app }, jwt, { JWT_SECRET }, mongoose, request, User (+1 more)

### Community 27 - "config.js"
Cohesion: 0.22
Nodes (5): crypto, jwt, { JWT_SECRET }, jwt, { JWT_SECRET }

### Community 28 - "User.js"
Cohesion: 0.25
Nodes (6): mongoose, UserSchema, { app }, mongoose, request, User

### Community 29 - "ai.test.js"
Cohesion: 0.29
Nodes (6): { app }, jwt, { JWT_SECRET }, mongoose, request, User

### Community 30 - "app"
Cohesion: 0.50
Nodes (3): app, { app }, request

### Community 33 - "boardAccess.js"
Cohesion: 0.29
Nodes (9): accessForBoard(), canEdit(), getBoardAccess(), isBoardId(), mongoose, Whiteboard, refreshRoomAccess(), writableRoom() (+1 more)

## Knowledge Gaps
- **198 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+193 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Visual Whiteboard Pro` connect `Visual Whiteboard Pro` to `Project Description and Requirements`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Real-time Collaboration` connect `Project Description and Requirements` to `index.js`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _198 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Project Description and Requirements` be split into smaller, more focused modules?**
  _Cohesion score 0.11462450592885376 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._