# Graph Report - Visual Whiteboard Pro  (2026-06-16)

## Corpus Check
- 42 files · ~29,753 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 182 nodes · 206 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9fc7abe3`
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
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `Visual Whiteboard Pro` - 16 edges
2. `Project Description and Requirements` - 12 edges
3. `Visual Whiteboard Pro — Phased Task Breakdown` - 10 edges
4. `Drawing Canvas` - 8 edges
5. `getPathSelectionMode()` - 6 edges
6. `scripts` - 5 edges
7. `scripts` - 4 edges
8. `App()` - 4 edges
9. `isPointInPolygon()` - 4 edges
10. `sampleFabricPath()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `App()` --references--> `Real-time Collaboration`  [EXTRACTED]
  frontend/src/App.jsx → description.txt
- `App()` --references--> `Drawing Canvas`  [EXTRACTED]
  frontend/src/App.jsx → description.txt

## Import Cycles
- None detected.

## Communities (11 total, 2 thin omitted)

### Community 0 - "Frontend Package Configuration"
Cohesion: 0.12
Nodes (15): dependencies, jspdf, jszip, react, react-dom, socket.io-client, devDependencies, vite (+7 more)

### Community 1 - "Backend Server Initialization"
Cohesion: 0.05
Nodes (36): MongoDB Storage, jwt, ElementContextSchema, mongoose, mongoose, UserSchema, mongoose, WhiteboardSchema (+28 more)

### Community 2 - "Editor Specifications & Features"
Cohesion: 0.21
Nodes (11): Architecture Assist AI, Real-time Collaboration, Context Layer, Drawing Canvas, HTML/CSS Export, PDF Export, Mess Cleanup AI, Multi-Page System (+3 more)

### Community 3 - "Backend Package Configuration"
Cohesion: 0.11
Nodes (17): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, jsonwebtoken, mongoose (+9 more)

### Community 4 - "Backend Server Dependencies"
Cohesion: 0.12
Nodes (16): API Surface, Configuration, Current Limitations, Data Model, Future Improvements, How It Works, Local Setup, Notes For Development (+8 more)

### Community 5 - "Frontend Application & Collaboration UI"
Cohesion: 0.11
Nodes (16): AssistPanel(), CanvasControls(), ContextPanel(), LANGUAGES, ExportModal(), PageStrip(), PropertiesPanel(), Toolbar() (+8 more)

### Community 6 - "Database Schema & Persistence"
Cohesion: 0.20
Nodes (10): Phase 0 — Project Setup, Phase 1 — Core Editor MVP, Phase 2 — Real-time Collaboration, Phase 3 — Pages & Export System, Phase 4 — Context Layer & UI Polish, Phase 5 — AI Features (Mess Cleanup + Architecture Assist), Phase 6 — Testing, Auth & Security, Phase 7 — Deployment & Monitoring (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (20): author, bugs, url, description, homepage, keywords, license, lint-staged (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): husky.sh script, devDependencies, eslint, husky, lint-staged, prettier

## Knowledge Gaps
- **109 isolated node(s):** `husky.sh script`, `name`, `version`, `private`, `dev` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Project Description and Requirements` connect `Editor Specifications & Features` to `Backend Server Initialization`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `Real-time Collaboration` connect `Editor Specifications & Features` to `Backend Server Initialization`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Why does `App()` connect `Editor Specifications & Features` to `Frontend Application & Collaboration UI`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `Drawing Canvas` (e.g. with `Architecture Assist AI` and `Context Layer`) actually correct?**
  _`Drawing Canvas` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `husky.sh script`, `name`, `version` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Package Configuration` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Backend Server Initialization` be split into smaller, more focused modules?**
  _Cohesion score 0.048625792811839326 - nodes in this community are weakly interconnected._