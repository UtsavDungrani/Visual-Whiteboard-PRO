const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const Whiteboard = require("./models/Whiteboard");
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 4000;

app.use(cors());
app.use(express.json());

// Development Content Security Policy to avoid blocking DevTools probes
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' data:; " +
        "connect-src 'self' http://localhost:4000 http://localhost:5173 http://localhost:5174; " +
        "img-src 'self' data:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:;",
    );
    next();
  });
}

// Simple in-memory store for demo purposes
const whiteboards = new Map();

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Root route for simple browser checks
app.get("/", (req, res) => {
  res.type("text/plain").send("Visual Whiteboard Pro backend");
});

// DevTools probe used by some Chrome extensions — return 204 to satisfy check
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(204).end();
});

app.post("/api/whiteboards", async (req, res) => {
  try {
    const doc = await Whiteboard.create({ content: req.body });
    return res.json({ id: doc._id.toString() });
  } catch (err) {
    console.error("Failed to save whiteboard", err);
    return res.status(500).json({ error: "save_failed" });
  }
});

app.get("/api/whiteboards/:id", async (req, res) => {
  try {
    const doc = await Whiteboard.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.json(doc.content);
  } catch (err) {
    console.error("Failed to load whiteboard", err);
    return res.status(500).json({ error: "load_failed" });
  }
});

// Start server with EADDRINUSE handling: try next ports up to 5 times
// Create HTTP server and attach Socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:4000",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);
  socket.on("join", (roomId) => {
    if (!roomId) roomId = "global";
    socket.join(roomId);
    console.log(`socket ${socket.id} joined ${roomId}`);
  });

  socket.on("canvas:update", ({ id, json }) => {
    // broadcast to others in same room
    const room = id || "global";
    socket.to(room).emit("canvas:update", json);
  });

  socket.on("disconnect", () => {
    // no-op for now
  });
});

function startServer(port, attemptsLeft = 5) {
  const server = httpServer.listen(port);
  server.on("listening", () => {
    console.log(
      `Visual Whiteboard server listening on http://localhost:${port}`,
    );
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.warn(`Port ${port} in use, trying port ${port + 1}...`);
      setTimeout(() => startServer(port + 1, attemptsLeft - 1), 500);
    } else {
      console.error("Server failed to start:", err);
      process.exit(1);
    }
  });
}

// Connect to MongoDB then start server
const mongo =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visual-whiteboard";
mongoose
  .connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    startServer(DEFAULT_PORT);
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    // start server anyway (fallback to ephemeral in-memory behavior was removed)
    startServer(DEFAULT_PORT);
  });
