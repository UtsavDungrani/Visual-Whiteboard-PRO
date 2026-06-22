# Graph Report - Visual Whiteboard Pro  (2026-06-22)

## Corpus Check
- 49 files · ~39,399 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 215 nodes · 243 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ec81aa6e`
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
- [[_COMMUNITY_Graphify Knowledge Graph Configuration|Graphify Knowledge Graph Configuration]]
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
5. `Drawing Canvas` - 8 edges
6. `getPathSelectionMode()` - 7 edges
7. `isPointInPolygon()` - 5 edges
8. `scripts` - 5 edges
9. `scripts` - 4 edges
10. `App()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `App()` --references--> `Real-time Collaboration`  [EXTRACTED]
  frontend/src/App.jsx → description.txt
- `App()` --references--> `Drawing Canvas`  [EXTRACTED]
  frontend/src/App.jsx → description.txt

## Import Cycles
- None detected.

## Communities (16 total, 3 thin omitted)

### Community 0 - "Frontend Package Configuration"
Cohesion: 0.12
Nodes (15): dependencies, jspdf, jszip, react, react-dom, socket.io-client, devDependencies, vite (+7 more)

### Community 1 - "Backend Server Initialization"
Cohesion: 0.05
Nodes (34): MongoDB Storage, jwt, ElementContextSchema, mongoose, mongoose, WhiteboardSchema, architectureAssist(), cleanupLayout() (+26 more)

### Community 2 - "Editor Specifications & Features"
Cohesion: 0.21
Nodes (11): Architecture Assist AI, Real-time Collaboration, Context Layer, Drawing Canvas, HTML/CSS Export, PDF Export, Mess Cleanup AI, Multi-Page System (+3 more)

### Community 3 - "Backend Package Configuration"
Cohesion: 0.09
Nodes (22): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, jsonwebtoken, mongoose (+14 more)

### Community 4 - "Backend Server Dependencies"
Cohesion: 0.12
Nodes (16): API Surface, Configuration, Current Limitations, Data Model, Future Improvements, How It Works, Local Setup, Notes For Development (+8 more)

### Community 5 - "Frontend Application & Collaboration UI"
Cohesion: 0.14
Nodes (10): AssistPanel(), CanvasControls(), ContextPanel(), LANGUAGES, ExportModal(), PageStrip(), PermissionsPanel(), PropertiesPanel() (+2 more)

### Community 6 - "Database Schema & Persistence"
Cohesion: 0.20
Nodes (10): Phase 0 — Project Setup, Phase 1 — Core Editor MVP, Phase 2 — Real-time Collaboration, Phase 3 — Pages & Export System, Phase 4 — Context Layer & UI Polish, Phase 5 — AI Features (Mess Cleanup + Architecture Assist), Phase 6 — Testing, Auth & Security, Phase 7 — Deployment & Monitoring (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (20): author, bugs, url, description, homepage, keywords, license, lint-staged (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (9): mongoose, UserSchema, app, { app }, mongoose, request, User, { app } (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): husky.sh script, devDependencies, eslint, husky, lint-staged, prettier

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (11): 10. Advanced Lasso & Selection Tool Refactor (On-Demand Implementation), 1. Multi-Page Reordering & Sharing (Restricted Access), 2. Fixed Position Page Navigation UI, 3. Toolbar UX & Optimization, 4. Color Selection State Sync Bug, 5. Optimized PDF Export Pipeline (Sketchbook Book Style), 6. Collapsible Side Menus & Immersive Canvas Mode, 7. Board Loading by ID via Dashboard Input (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (8): bboxCornersInPolygon(), getObjectSelectionMode(), getPathSelectionMode(), isPointInPolygon(), pathDataToSvgD(), sampleFabricPath(), samplePathHitPoints(), splitObjectWithLasso()

## Knowledge Gaps
- **130 isolated node(s):** `husky.sh script`, `name`, `version`, `private`, `dev` (+125 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Real-time Collaboration` connect `Editor Specifications & Features` to `Backend Server Initialization`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `Project Description and Requirements` connect `Editor Specifications & Features` to `Backend Server Initialization`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `App()` connect `Editor Specifications & Features` to `Frontend Application & Collaboration UI`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **What connects `husky.sh script`, `name`, `version` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Package Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Backend Server Initialization` be split into smaller, more focused modules?**
  _Cohesion score 0.0524390243902439 - nodes in this community are weakly interconnected._
- **Should `Backend Package Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._