# Graph Report - Visual Whiteboard Pro  (2026-08-23)

## Corpus Check
- 46 files · ~47,769 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 328 nodes · 432 edges · 19 communities (14 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `415ed837`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Frontend Package Configuration
- index.js
- Project Description and Requirements
- dependencies
- Visual Whiteboard Pro
- App.jsx
- package.json
- context.test.js
- App
- Visual Whiteboard Pro — Deployment Guide
- Visual Whiteboard - Feature Backlog & Task Tracking
- GEMINI.md
- admin/admin.js
- AGENTS.md
- rules/graphify.md
- workflows/graphify.md
- copilot-instructions.md

## God Nodes (most connected - your core abstractions)
1. `Visual Whiteboard Pro` - 17 edges
2. `App()` - 15 edges
3. `Project Description and Requirements` - 12 edges
4. `Visual Whiteboard - Feature Backlog & Task Tracking` - 11 edges
5. `Visual Whiteboard Pro — Phased Task Breakdown` - 10 edges
6. `Visual Whiteboard Pro — Deployment Guide` - 9 edges
7. `updateAllConnectors()` - 8 edges
8. `useConnectorSync()` - 7 edges
9. `isPointInPolygon()` - 7 edges
10. `getObjectSelectionMode()` - 7 edges

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

## Communities (19 total, 5 thin omitted)

### Community 0 - "Frontend Package Configuration"
Cohesion: 0.09
Nodes (21): dependencies, jspdf, jszip, react, react-dom, socket.io-client, devDependencies, vite (+13 more)

### Community 1 - "index.js"
Cohesion: 0.05
Nodes (33): architectureAssist(), cleanupLayout(), activeUsers, admin, aiLimiter, auth, authLimiter, bcrypt (+25 more)

### Community 2 - "Project Description and Requirements"
Cohesion: 0.11
Nodes (21): Architecture Assist AI, Real-time Collaboration, Context Layer, Drawing Canvas, HTML/CSS Export, PDF Export, Mess Cleanup AI, MongoDB Storage (+13 more)

### Community 3 - "dependencies"
Cohesion: 0.05
Nodes (37): bcryptjs, cors, dotenv, express, express-rate-limit, jest, jsonwebtoken, mongoose (+29 more)

### Community 4 - "Visual Whiteboard Pro"
Cohesion: 0.12
Nodes (17): API Surface, Configuration, Current Limitations, Data Model, Future Improvements, How It Works, Live Url: https://visual-whiteboard-pro.vercel.app/, Local Setup (+9 more)

### Community 6 - "App.jsx"
Cohesion: 0.10
Nodes (23): AssistPanel(), CanvasControls(), CanvasOverlay(), ContextPanel(), LANGUAGES, ExportModal(), PageStrip(), PermissionsPanel() (+15 more)

### Community 8 - "package.json"
Cohesion: 0.06
Nodes (31): eslint, husky, lint-staged, author, bugs, url, description, devDependencies (+23 more)

### Community 9 - "context.test.js"
Cohesion: 0.05
Nodes (33): app, ElementContextSchema, mongoose, mongoose, UserSchema, mongoose, WhiteboardSchema, { app } (+25 more)

### Community 10 - "App"
Cohesion: 0.14
Nodes (21): App(), applyRemoteCanvas(), attachFabricListeners(), flushPendingRemoteCanvas(), loadBoard(), loadBoardById(), updateInspectorProperties(), bboxCornersInPolygon() (+13 more)

### Community 11 - "Visual Whiteboard Pro — Deployment Guide"
Cohesion: 0.20
Nodes (9): Architecture Overview, Pre-requisites & Accounts Needed, Step 1: Database Setup (MongoDB Atlas), Step 2: Caching Setup (Upstash Redis), Step 3: Backend Deployment (Render), Step 4: Frontend API Config, Step 5: Frontend Deployment (Vercel), Step 6: Post-Deployment Testing (+1 more)

### Community 12 - "Visual Whiteboard - Feature Backlog & Task Tracking"
Cohesion: 0.17
Nodes (11): 10. Advanced Lasso & Selection Tool Refactor (On-Demand Implementation), 1. Multi-Page Reordering & Sharing (Restricted Access), 2. Fixed Position Page Navigation UI, 3. Toolbar UX & Optimization, 4. Color Selection State Sync Bug, 5. Optimized PDF Export Pipeline (Sketchbook Book Style), 6. Collapsible Side Menus & Immersive Canvas Mode, 7. Board Loading by ID via Dashboard Input (+3 more)

### Community 15 - "admin/admin.js"
Cohesion: 0.52
Nodes (10): deleteBoard(), deleteUser(), getHeaders(), handleResponse(), loadAllData(), loadBoardsList(), loadDashboardStats(), loadUsersList() (+2 more)

## Knowledge Gaps
- **164 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+159 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Visual Whiteboard Pro` connect `Visual Whiteboard Pro` to `Project Description and Requirements`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `Real-time Collaboration` connect `Project Description and Requirements` to `index.js`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _164 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Package Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05226480836236934 - nodes in this community are weakly interconnected._
- **Should `Project Description and Requirements` be split into smaller, more focused modules?**
  _Cohesion score 0.11462450592885376 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._