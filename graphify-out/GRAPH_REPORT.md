# Graph Report - Visual Whiteboard Pro  (2026-09-03)

## Corpus Check
- 74 files · ~69,886 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 468 nodes · 639 edges · 40 communities (28 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4401f3b3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- index.js
- Visual Whiteboard Pro — Phased Task Breakdown
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
- auth.js
- User.js
- config.js
- app
- adminPanel.test.js
- frontendUrlSanitize.test.js
- boardAccess.js
- ai.service.js
- boardTemplates.js
- comments.test.js
- optionalAuth.js

## God Nodes (most connected - your core abstractions)
1. `App()` - 18 edges
2. `Visual Whiteboard Pro` - 17 edges
3. `Project Description and Requirements` - 12 edges
4. `Visual Whiteboard - Feature Backlog & Task Tracking` - 11 edges
5. `Visual Whiteboard Pro — Phased Task Breakdown` - 10 edges
6. `loadUsersList()` - 9 edges
7. `Visual Whiteboard Pro — Deployment Guide` - 9 edges
8. `updateAllConnectors()` - 8 edges
9. `isPointInPolygon()` - 8 edges
10. `getObjectSelectionMode()` - 8 edges

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

## Communities (40 total, 12 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, jspdf, jszip, react, react-dom, socket.io-client, devDependencies, jsdom (+25 more)

### Community 1 - "index.js"
Cohesion: 0.05
Nodes (34): {
  accessForBoard,
  canEdit,
  getBoardAccess,
  isBoardId,
}, activeUsers, admin, ADMIN_CSP, aiLimiter, ALLOWED_UPLOAD_EXTENSIONS, allowedOrigins, auth (+26 more)

### Community 2 - "Visual Whiteboard Pro — Phased Task Breakdown"
Cohesion: 0.20
Nodes (10): Phase 0 — Project Setup, Phase 1 — Core Editor MVP, Phase 2 — Real-time Collaboration, Phase 3 — Pages & Export System, Phase 4 — Context Layer & UI Polish, Phase 5 — AI Features (Mess Cleanup + Architecture Assist), Phase 6 — Testing, Auth & Security, Phase 7 — Deployment & Monitoring (+2 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (38): bcryptjs, cors, dotenv, express, express-rate-limit, jest, jsonwebtoken, mongoose (+30 more)

### Community 4 - "Visual Whiteboard Pro"
Cohesion: 0.08
Nodes (28): Architecture Assist AI, Real-time Collaboration, Context Layer, Drawing Canvas, HTML/CSS Export, PDF Export, Mess Cleanup AI, MongoDB Storage (+20 more)

### Community 6 - "App.jsx"
Cohesion: 0.06
Nodes (24): RESERVED_ROUTES, AssistPanel(), AuthPage(), CanvasControls(), CanvasOverlay(), CommentsLayer(), baseProps, ContextPanel() (+16 more)

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
Cohesion: 0.22
Nodes (15): bboxCornersInPolygon(), buildClipPolygon(), canvasPolygonToLocal(), getLineEndpoints(), getObjectSelectionMode(), getPathSelectionMode(), isPointInPolygon(), lineLineIntersection() (+7 more)

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

### Community 28 - "User.js"
Cohesion: 0.25
Nodes (6): mongoose, UserSchema, { app }, mongoose, request, User

### Community 29 - "config.js"
Cohesion: 0.20
Nodes (7): crypto, { app }, jwt, { JWT_SECRET }, mongoose, request, User

### Community 30 - "app"
Cohesion: 0.50
Nodes (3): app, { app }, request

### Community 33 - "boardAccess.js"
Cohesion: 0.29
Nodes (9): accessForBoard(), canEdit(), getBoardAccess(), isBoardId(), mongoose, Whiteboard, refreshRoomAccess(), writableRoom() (+1 more)

### Community 35 - "boardTemplates.js"
Cohesion: 0.25
Nodes (12): DashboardPage(), architecture, BOARD_TEMPLATES, box(), flowchart, getTemplateById(), heading(), kanban (+4 more)

### Community 36 - "comments.test.js"
Cohesion: 0.15
Nodes (11): CommentSchema, mongoose, ReplySchema, { app }, Comment, jwt, { JWT_SECRET }, mongoose (+3 more)

## Knowledge Gaps
- **220 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+215 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Real-time Collaboration` connect `Visual Whiteboard Pro` to `index.js`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _220 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Visual Whiteboard Pro` be split into smaller, more focused modules?**
  _Cohesion score 0.08275862068965517 - nodes in this community are weakly interconnected._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05795918367346939 - nodes in this community are weakly interconnected._