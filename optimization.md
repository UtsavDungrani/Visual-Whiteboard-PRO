# Visual Whiteboard - Feature Backlog & Task Tracking

This document outlines the pending technical tasks, optimizations, and feature implementations for the Visual Whiteboard project.

---

## 1. Multi-Page Reordering & Sharing (Restricted Access)
* **Objective:** Allow authorized users to share specific pages or reorder/swap pages dynamically.
* **Context/Scope:** Canvas state management / Page Manager component.
* **Access Control:** **Strictly Owner-only or Full Access users.** View-only and restricted users must not have access to these controls.
* **Action Items:**
    * [c] Implement drag-and-drop or directional layout controls to reorder pages within the global state array.
    * [c] Wrap the reordering UI and event listeners in a permission guard checking if `user.role === 'owner'` or `user.hasFullAccess === true`.
    * [c] Add a "Share Page" action payload containing specific page JSON data, accessible only to authorized roles.
* **Acceptance Criteria:** Only the board owner or a user explicitly granted full access can change the sequence of pages or initiate page sharing. The UI elements for ordering are hidden or disabled for all other users.

## 2. Fixed Position Page Navigation UI
* **Objective:** Prevent the page control/navigation buttons from shifting layout positions when new pages are appended.
* **Context/Scope:** UI/UX Front-end (`PageControls` component).
* **Action Items:**
    * [c] Refactor CSS/Tailwind classes of the page control container from relative flow to fixed positioning (e.g., `fixed bottom-4 left-1/2 -translate-x-1/2`).
    * [c] Ensure overflow scrolling is restricted only to the page thumbnail list, keeping control buttons static.
* **Acceptance Criteria:** Adding $N$ number of pages allows scrolling through the navigation list, but the container buttons stay locked in place on the viewport.

## 3. Toolbar UX & Optimization
* **Objective:** Convert the main toolbar into a draggable floating dock, consolidate tools into 3 distinct logical groups, and elevate the eraser tool.
* **Context/Scope:** `Toolbar` component & layout state.
* **Action Items:**
    * [c] Implement draggable boundaries on the main toolbar container using pointer events or a positioning library (e.g., `framer-motion` or `react-draggable`).
    * [c] Refactor and group the toolbar options into the following 3 collapsible dropdowns/popover sub-menus:
        1. **Selection Tools Group:** Rectangle Selection, Round Selection, Lasso Tool.
        2. **Shape Draw Group:** Rectangle, Circle, Diamond.
        3. **Connectors Group:** Arrow, Line.
    * [c] Extract the `Eraser` tool entirely out of the Free Draw sub-panel and expose it as a primary, first-class standalone button on the main toolbar dock.
* **Acceptance Criteria:** The main toolbar is freely draggable. Tools are neatly consolidated into their 3 defined structural drop-down categories, and the eraser is immediately accessible without opening sub-menus.

## 4. Color Selection State Sync Bug
* **Objective:** Fix active color UI feedback on the selection button.
* **Context/Scope:** `ColorPicker` component & global tool state.
* **Action Items:**
    * [c] Verify that selecting a color properly updates the active color state variable (e.g., `currentStrokeColor`).
    * [c] Bind the background color or border style of the picker button directly to the `currentStrokeColor` state reactive variable.
* **Acceptance Criteria:** When a color is selected, the color picker box visibly reflects that specific hue dynamically on the UI, matching the stroke color rendering on the canvas.

## 5. Optimized PDF Export Pipeline (Sketchbook Book Style)
* **Objective:** Implement a lightweight, rapid multi-page PDF generation pipeline by converting pages to optimized images first.
* **Context/Scope:** Export Utilities module.
* **Action Items:**
    * [c] Create a generation routine that creates a workspace directory path structured as `${timestamp}-${boardName}`.
    * [c] Iterate through all canvas pages, converting them to compressed image formats (e.g., JPEG with 0.85 quality) for rapid compilation and low file size.
    * [c] Sequence the compressed image files into a cohesive PDF document (using `jsPDF`).
* **Acceptance Criteria:** Clicking "Save as PDF" outputs a highly compressed file quickly without freezing the browser tab, using an intermediate image step. (Note: Implemented as "Save to Local Folder" in ExportModal).

## 6. Collapsible Side Menus & Immersive Canvas Mode
* **Objective:** Maximize drawing real estate by making side menus auto-hide or overlay intelligently.
* **Context/Scope:** Main Layout UI shell.
* **Action Items:**
    * [ ] Implement an auto-collapse trigger for side menus when the active canvas receives focus or a drag/draw event starts (`onPointerDown`).
    * [ ] Change menus from static layout columns to absolute overlays (`absolute z-50`) that appear on hovering/clicking the edge and slide away on blur.
* **Acceptance Criteria:** Canvas fills the full screen by default. Selecting a menu opens a floating drawer overlay that slides closed automatically when interaction shifts back to drawing.

## 7. Board Loading by ID via Dashboard Input
* **Objective:** Add a quick-connect board option by string ID with visibility permission guardrails.
* **Context/Scope:** Dashboard / Landing Page Router.
* **Action Items:**
    * [ ] Add a "Join Board by ID" button on the main dashboard page that triggers an input modal box.
    * [ ] Fetch board metadata on submission: 
        * If `visibility === 'private'`, throw an error message: "Board is not available/Private".
        * If `visibility === 'public'`, route the user into the canvas room in a **Default View-Only Mode**.
* **Acceptance Criteria:** Users can instantly join public boards as view-only directly via their ID string from the dashboard.

## 8. Admin Access Management & View-Only Canvas State
* **Objective:** Provide board owners with an access control panel and strip drawing/structural interfaces from unauthorized clients.
* **Context/Scope:** Permissions Module & Multi-user Websockets.
* **Action Items:**
    * [ ] Build an "Admin / Connected Users" sidebar panel visible exclusively to the board owner to toggle user write permissions ("Full Access" vs "View-Only").
    * [ ] Implement client-side UI conditioning: if a user is `view-only`, remove the `Toolbar`, page manipulation options (adding/reordering pages), hidden utility features (`Cleanup`, `Suggestions`), and globally disable canvas interaction listeners.
* **Acceptance Criteria:** Unauthorized users see an un-editable, un-sequenceable canvas lacking any creation or structural tools, while the owner can revoke/grant access in real-time.

## 9. Integrated Audio, Video, and Chat Communication Rooms
* **Objective:** Add built-in native collaboration tools (A/V conferencing & textual chat).
* **Context/Scope:** Collaboration Engine (WebRTC / Twilio / Agora integration).
* **Action Items:**
    * [ ] Create a "Start Meeting" action button that establishes media streams (audio/video blocks).
    * [ ] Build a persistent side chat panel accessible during or outside active calls to exchange text messages between connected peers.
* **Acceptance Criteria:** Multiple users can toggle audio/video inputs and chat concurrently while collaborating on the same active board.

## 10. Advanced Lasso & Selection Tool Refactor (On-Demand Implementation)
* **Note:** Keep this in backlog until explicitly prioritized.
* **Objective:** Refactor selection tools to behave as structural drag/move tools seamlessly.
* **Context/Scope:** Canvas Vector Interaction Engines.
* **Action Items:**
    * [ ] Upgrade Lasso Tool to capture vector nodes within paths, treating the bounded area as an object cutout that can be dragged/pasted.
    * [ ] Adjust global selection mechanics: once an area is defined via any selection tool, the pointer automatically overrides into a `Move Tool` state to prevent accidental secondary selections.
* **Acceptance Criteria:** Active selections can be directly repositioned without losing focus or accidentally drawing new artifacts.