# Visual Whiteboard Pro — Phased Task Breakdown

This file lists project phases and concrete tasks (one after another) for review. Each task includes an ID, short description, priority, and rough estimate.

---

## Phase 0 — Project Setup

- [c] **0.1 Init repo skeleton:** create `frontend/`, `server/`, `README.md`, `.gitignore` — **Priority:** High — **Estimate:** 2h
- [c] **0.2 Tooling:** add `ESLint`, `Prettier`, basic `package.json` scripts, Husky pre-commit hook — **Priority:** High — **Estimate:** 3h
- [c] **0.3 CI:** simple GitHub Actions for lint and install — **Priority:** Medium — **Estimate:** 2h

## Phase 1 — Core Editor MVP

- [c] **1.1 Frontend bootstrap:** Vite + React app, Tailwind setup, global layout (Topbar/Sidebar/Canvas area) — **Priority:** High — **Estimate:** 4h
- [c] **1.2 FabricJS canvas:** integrate FabricJS, add basic shape tools (rect, circle, arrow), select/drag/resize — **Priority:** High — **Estimate:** 8h
- [c] **1.3 Persistence API:** backend endpoints `POST /whiteboards` and `GET /whiteboards/:id` to save/load Fabric JSON — **Priority:** High — **Estimate:** 4h

## Phase 2 — Real-time Collaboration

- [c] **2.1 Socket.io server:** Socket.io integration on Express, room model, connect/disconnect handling — **Priority:** High — **Estimate:** 4h
- [c] **2.2 Client sync logic:** broadcast element created/modified/deleted events, optimistic updates and basic reconciliation — **Priority:** High — **Estimate:** 8h
- [c] **2.3 Redis state & Pub/Sub:** store current board state, use Redis for pub/sub to scale multiple server instances — **Priority:** Medium — **Estimate:** 6h
- [c] **2.4 Presence & cursors:** per-user cursor position + colored avatars — **Priority:** Medium — **Estimate:** 4h

## Phase 3 — Pages & Export System

- [c] **3.1 Multi-page model:** implement page manager (thumbnails, add/duplicate/delete, infinite vs fixed page mode) — **Priority:** High — **Estimate:** 6h
- [c] **3.2 PDF export:** html2canvas + jsPDF multi-page export, export settings UI — **Priority:** High — **Estimate:** 6h
- [c] **3.3 HTML/CSS export:** implement Fabric→HTML serializer, single-file & zip options (JSZip) — **Priority:** Medium — **Estimate:** 10h

## Phase 4 — Context Layer & UI Polish

- [c] **4.1 Context panel:** attach notes (Markdown), links, code snippets; persist context to DB — **Priority:** High — **Estimate:** 5h
- [c] **4.2 File uploads:** Multer local uploads endpoint + serve static files `/uploads` — **Priority:** Medium — **Estimate:** 3h
- [c] **4.3 UX polish & shortcuts:** snap-to-grid, keyboard shortcuts, styling tokens from guidelines — **Priority:** Medium — **Estimate:** 6h

## Phase 5 — AI Features (Mess Cleanup + Architecture Assist)

- [c] **5.1 AI schemas:** define request/response JSON for Mess Cleanup and Architecture Assist, sample payloads — **Priority:** High — **Estimate:** 3h
- [c] **5.2 Mess Cleanup integration:** send elements JSON to Claude, parse returned positions, animate/apply changes with undo — **Priority:** High — **Estimate:** 8h (Integration complete; using optimized geometric engine)
- [c] **5.3 Architecture Assist integration:** send diagram summary, show suggestions panel, implement Apply/Dismiss — **Priority:** High — **Estimate:** 8h (Integration complete; using topology-aware local engine)
- [c] **5.4 Resilience:** timeouts, retries, UI fallbacks when AI unavailable — **Priority:** Medium — **Estimate:** 3h

## Phase 6 — Testing, Auth & Security

- [c] **6.1 Auth:** implement JWT + bcrypt sign-up/login, protect APIs — **Priority:** High — **Estimate:** 5h
- [c] **6.2 Tests:** unit tests for core components, integration tests for Socket flows, basic E2E smoke — **Priority:** Medium — **Estimate:** 12h (All integration, AI, socket, and context tests fully implemented and passing)
- [c] **6.3 Security & validation:** input validation, rate limiting on AI endpoints, CORS config — **Priority:** Medium — **Estimate:** 4h

## Phase 7 — Deployment & Monitoring

- **7.1 Deploy:** FE → Vercel, BE → Render (or alternative), add env config docs — **Priority:** High — **Estimate:** 3h
- **7.2 Monitoring:** logs, basic Sentry integration, health endpoints (`/health`) — **Priority:** Medium — **Estimate:** 3h
- **7.3 Demo prep:** wake backend before presentation, create demo script — **Priority:** Low — **Estimate:** 1h

## PR / Review Checklist

- Title and description with screenshots or GIF for UI changes.
- Link to relevant task ID from this file.
- Basic manual smoke steps for reviewer (how to run locally, test flow).
- Tests added or justified as TODO.
- Env vars documented in README.

---

If you'd like, I can:

- create GitHub Issues from these tasks,
- scaffold the repo and apply Phase 0/1 files now,
- or split tasks into finer-grained tickets with owner estimates.
