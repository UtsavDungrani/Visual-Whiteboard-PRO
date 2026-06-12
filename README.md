# Visual Whiteboard Pro

Visual Whiteboard Pro is a real-time whiteboard for collaborative diagramming, built around a FabricJS canvas in the frontend and an Express + Socket.io backend. The current codebase already supports drawing basic shapes, live canvas sync between connected clients, and saving/loading boards from MongoDB.

The broader product vision is documented in [description.txt](description.txt) and the phase breakdown in [TASKS.md](TASKS.md). This README focuses on what is in the repository now, how to run it, and how the pieces fit together.

## What It Does Today

- React + Vite frontend with a FabricJS canvas loaded through the CDN in [frontend/index.html](frontend/index.html).
- Basic shape tools in [frontend/src/App.jsx](frontend/src/App.jsx): rectangle and circle.
- Live whiteboard syncing through Socket.io.
- Board persistence through Express endpoints backed by MongoDB.
- Health and startup routes for local checks.

## Repository Layout

- [frontend/](frontend) - Vite + React app for the whiteboard UI.
- [server/](server) - Express server, Socket.io collaboration layer, and MongoDB persistence.
- [description.txt](description.txt) - full product requirements and design reference.
- [TASKS.md](TASKS.md) - phase plan and implementation checklist.

## Tech Stack

- Frontend: React, Vite, FabricJS, socket.io-client.
- Backend: Node.js, Express, Socket.io, Mongoose, MongoDB, CORS, dotenv.
- Storage: MongoDB stores whiteboard documents in a single mixed content field.
- Collaboration: Socket.io rooms are used to broadcast canvas updates.

## Prerequisites

- Node.js 18 or newer, preferably the current LTS release.
- npm.
- MongoDB running locally or a reachable MongoDB Atlas connection string.

## Configuration

The backend reads the following environment variable:

- MONGO_URI - MongoDB connection string.

The default value is shown in [.env.example](.env.example): mongodb://127.0.0.1:27017/visual-whiteboard.

## Local Setup

Install dependencies in each app folder:

1. Open a terminal in the frontend folder and run npm install.
2. Open a terminal in the server folder and run npm install.

Example PowerShell commands:

- cd "d:\Projects\Visual Whiteboard Pro\frontend"
- npm install
- cd "d:\Projects\Visual Whiteboard Pro\server"
- npm install

If you want to use a custom MongoDB connection, create a .env file in server/ and set MONGO_URI there.

## Run The App

Start the frontend and backend in separate terminals:

- Frontend: cd "d:\Projects\Visual Whiteboard Pro\frontend" then npm run dev
- Backend: cd "d:\Projects\Visual Whiteboard Pro\server" then npm start

Default local URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

If Vite picks a different port, the backend already allows the common local dev origins used by Vite.

## How It Works

The frontend mounts a FabricJS canvas, adds shapes, and serializes the canvas to JSON whenever objects are added, moved, resized, rotated, or removed. Updates are emitted through Socket.io to the current room.

When a board has not been saved yet, the client uses the default global room. After saving, the returned board id becomes the active room and subsequent sync traffic is grouped there.

The backend accepts the canvas JSON, stores it in MongoDB, and exposes it again for later loading. Socket.io rebroadcasts canvas updates to other clients in the same room.

## API Surface

Backend routes in [server/index.js](server/index.js):

- GET /health - basic health check.
- GET / - simple text response for browser checks.
- POST /api/whiteboards - persist a whiteboard document and return its id.
- GET /api/whiteboards/:id - load a saved whiteboard payload by id.

Socket.io events:

- join - join a board room.
- canvas:update - broadcast the serialized FabricJS canvas to other clients in the room.

## Data Model

Whiteboard documents are defined in [server/models/Whiteboard.js](server/models/Whiteboard.js). At the moment the schema stores the full FabricJS payload in a mixed content field and adds timestamps.

## Current Limitations

The current implementation is intentionally small and focused on the MVP. Features described in the product docs are not fully implemented yet, including auth, multi-page management, exports, AI cleanup, architecture assistance, and rich context panels.

## Roadmap Reference

The planned work is already broken down in [TASKS.md](TASKS.md). The main next milestones are:

- core editor polish and broader drawing tools,
- multi-user collaboration hardening,
- multi-page support,
- export pipelines for PDF and HTML/CSS,
- context attachments and richer metadata,
- authentication, testing, and deployment.

## Useful Files

- [frontend/src/App.jsx](frontend/src/App.jsx) - canvas behavior, socket sync, and save/load actions.
- [frontend/index.html](frontend/index.html) - Vite entry page and FabricJS CDN bootstrap.
- [server/index.js](server/index.js) - API, Socket.io server, and MongoDB startup.
- [server/models/Whiteboard.js](server/models/Whiteboard.js) - board persistence schema.

## Notes For Development

- The backend will try to keep starting even if MongoDB is unavailable, but save and load requests will still fail until a database connection exists.
- FabricJS is loaded from a CDN, so internet access is required for the frontend to initialize unless that dependency is bundled locally later.
- The repository currently uses separate frontend and server package manifests, so install and run them independently.

## Future Improvements

If you want the README to reflect the full project vision from the design docs, the next step is to add sections for authentication, page management, export flows, AI assistants, and deployment once those features land in the codebase.
