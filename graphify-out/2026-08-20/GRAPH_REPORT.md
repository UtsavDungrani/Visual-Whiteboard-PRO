# Graph Report - Visual Whiteboard Pro  (2026-06-27)

## Corpus Check
- 57 files · ~46,215 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 275 nodes · 355 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b70da5be`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Package Configuration|Frontend Package Configuration]]
- [[_COMMUNITY_Backend Server Initialization|Backend Server Initialization]]
- [[_COMMUNITY_Editor Specifications & Features|Editor Specifications & Features]]
- [[_COMMUNITY_Backend Package Configuration|Backend Package Configuration]]
- [[_COMMUNITY_Backend Server Dependencies|Backend Server Dependencies]]
- [[_COMMUNITY_Frontend Application & Collaboration UI|Frontend Application & Collaboration UI]]
- [[_COMMUNITY_Database Schema & Persistence|Database Schema & Persistence]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]

## God Nodes (most connected - your core abstractions)
1. `Visual Whiteboard Pro` - 16 edges
2. `Project Description and Requirements` - 12 edges
3. `Visual Whiteboard - Feature Backlog & Task Tracking` - 11 edges
4. `Visual Whiteboard Pro — Phased Task Breakdown` - 10 edges
5. `Visual Whiteboard Pro — Deployment Guide` - 9 edges
6. `Drawing Canvas` - 8 edges
7. `getPathSelectionMode()` - 7 edges
8. `getAnchorPoint()` - 7 edges
9. `getHeaders()` - 7 edges
10. `handleResponse()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `App()` --references--> `Real-time Collaboration`  [EXTRACTED]
  frontend/src/App.jsx → description.txt
- `App()` --references--> `Drawing Canvas`  [EXTRACTED]
  frontend/src/App.jsx → description.txt
- `App()` --calls--> `useConnectorSync()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/hooks/useConnectorSync.js
- `App()` --calls--> `useConnectorTool()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/tools/useConnectorTool.js
- `updateAllConnectors()` --calls--> `getAnchorPoint()`  [EXTRACTED]
  frontend/src/hooks/useConnectorSync.js → frontend/src/utils/anchorPoints.js

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "Frontend Package Configuration"
Cohesion: 0.12
Nodes (15): dependencies, jspdf, jszip, react, react-dom, socket.io-client, devDependencies, vite (+7 more)

### Community 1 - "Backend Server Initialization"
Cohesion: 0.05
Nodes (33): jwt, architectureAssist(), cleanupLayout(), activeUsers, admin, aiLimiter, auth, authLimiter (+25 more)

### Community 2 - "Editor Specifications & Features"
Cohesion: 0.27
Nodes (10): Architecture Assist AI, Real-time Collaboration, Context Layer, Drawing Canvas, HTML/CSS Export, PDF Export, Mess Cleanup AI, Multi-Page System (+2 more)

### Community 3 - "Backend Package Configuration"
Cohesion: 0.08
Nodes (23): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, jsonwebtoken, mongoose (+15 more)

### Community 4 - "Backend Server Dependencies"
Cohesion: 0.12
Nodes (16): API Surface, Configuration, Current Limitations, Data Model, Future Improvements, How It Works, Local Setup, Notes For Development (+8 more)

### Community 5 - "Frontend Application & Collaboration UI"
Cohesion: 0.10
Nodes (19): AssistPanel(), CanvasControls(), CanvasOverlay(), ContextPanel(), LANGUAGES, ExportModal(), PageStrip(), PermissionsPanel() (+11 more)

### Community 6 - "Database Schema & Persistence"
Cohesion: 0.20
Nodes (10): Phase 0 — Project Setup, Phase 1 — Core Editor MVP, Phase 2 — Real-time Collaboration, Phase 3 — Pages & Export System, Phase 4 — Context Layer & UI Polish, Phase 5 — AI Features (Mess Cleanup + Architecture Assist), Phase 6 — Testing, Auth & Security, Phase 7 — Deployment & Monitoring (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.48
Nodes (10): deleteBoard(), deleteUser(), getHeaders(), handleResponse(), loadAllData(), loadBoardsList(), loadDashboardStats(), loadUsersList() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (26): husky.sh script, author, bugs, url, description, devDependencies, eslint, husky (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (20): mongoose, UserSchema, app, { app }, jwt, mongoose, request, User (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (14): MongoDB Storage, ElementContextSchema, mongoose, mongoose, WhiteboardSchema, { app }, ElementContext, fs (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (9): Architecture Overview, Pre-requisites & Accounts Needed, Step 1: Database Setup (MongoDB Atlas), Step 2: Caching Setup (Upstash Redis), Step 3: Backend Deployment (Render), Step 4: Frontend API Config, Step 5: Frontend Deployment (Vercel), Step 6: Post-Deployment Testing (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (11): 10. Advanced Lasso & Selection Tool Refactor (On-Demand Implementation), 1. Multi-Page Reordering & Sharing (Restricted Access), 2. Fixed Position Page Navigation UI, 3. Toolbar UX & Optimization, 4. Color Selection State Sync Bug, 5. Optimized PDF Export Pipeline (Sketchbook Book Style), 6. Collapsible Side Menus & Immersive Canvas Mode, 7. Board Loading by ID via Dashboard Input (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (8): bboxCornersInPolygon(), getObjectSelectionMode(), getPathSelectionMode(), isPointInPolygon(), pathDataToSvgD(), sampleFabricPath(), samplePathHitPoints(), splitObjectWithLasso()

## Knowledge Gaps
- **158 isolated node(s):** `husky.sh script`, `name`, `version`, `private`, `dev` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Real-time Collaboration` connect `Editor Specifications & Features` to `Backend Server Initialization`, `Frontend Application & Collaboration UI`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `App()` connect `Frontend Application & Collaboration UI` to `Editor Specifications & Features`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `Project Description and Requirements` connect `Editor Specifications & Features` to `Community 10`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **What connects `husky.sh script`, `name`, `version` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Package Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Backend Server Initialization` be split into smaller, more focused modules?**
  _Cohesion score 0.05226480836236934 - nodes in this community are weakly interconnected._
- **Should `Backend Package Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._