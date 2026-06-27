const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const Whiteboard = require("./models/Whiteboard");
const ElementContext = require("./models/ElementContext");
const User = require("./models/User");
const auth = require("./middleware/auth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const redis = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const JWT_SECRET = process.env.JWT_SECRET || "visual_whiteboard_secret_key_123";

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 4000;

// Initialize uploads local directory
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

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

// Resilient Redis configuration
let redisClient = null;
let subClient = null;
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

(async () => {
  try {
    redisClient = redis.createClient({
      url: REDIS_URL,
      socket: {
        // Disable automatic reconnection — try once, fail gracefully
        reconnectStrategy: false,
      },
    });
    subClient = redisClient.duplicate();

    // Log the error only once, then clean up so we don't keep a broken client
    redisClient.on("error", (err) => {
      console.warn("Redis unavailable. Running in in-memory mode.", err.message);
      redisClient = null;
      subClient = null;
    });
    subClient.on("error", (err) => {
      subClient = null;
    });

    await Promise.all([redisClient.connect(), subClient.connect()]);
    console.log("Connected to Redis successfully.");
  } catch (err) {
    console.warn("Redis connection failed. Running server in-memory mode.", err.message);
    redisClient = null;
    subClient = null;
  }
})();

// Simple in-memory store fallback for demo purposes
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

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "too_many_requests_please_try_again_later" }
});

// --- Authentication Routes ---

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "missing_required_fields" });
    }

    const emailLower = email.toLowerCase().trim();
    let user = await User.findOne({ email: emailLower });
    if (user) {
      return res.status(400).json({ error: "email_already_registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Random avatar color
    const avatarColors = ["#1E3A5F", "#2E86AB", "#10B981", "#F59E0B", "#EF4444"];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    user = new User({
      name,
      email: emailLower,
      password: hashedPassword,
      avatar_color: avatarColor
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, color: user.avatar_color },
      JWT_SECRET,
      { expiresIn: "2d" }
    );

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        color: user.avatar_color
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "registration_failed" });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "missing_required_fields" });
    }

    const emailLower = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(400).json({ error: "invalid_credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "invalid_credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, color: user.avatar_color },
      JWT_SECRET,
      { expiresIn: "2d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        color: user.avatar_color
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "login_failed" });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "user_not_found" });
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      color: user.avatar_color
    });
  } catch (err) {
    console.error("Fetch profile error:", err);
    return res.status(500).json({ error: "fetch_profile_failed" });
  }
});

// --- Whiteboards REST Routes (Protected / Checked) ---

// GET list of whiteboards (owned or collaborated)
app.get("/api/whiteboards", auth, async (req, res) => {
  try {
    const docs = await Whiteboard.find({
      $or: [
        { owner: req.user.id },
        { collaborators: req.user.id }
      ]
    }, "title owner collaborators isPublic updatedAt createdAt").populate("owner", "name email").lean();
    return res.json(docs);
  } catch (err) {
    console.error("Failed to list whiteboards", err);
    return res.status(500).json({ error: "list_failed" });
  }
});

// POST create whiteboard
app.post("/api/whiteboards", auth, async (req, res) => {
  try {
    const doc = new Whiteboard({
      title: req.body.title || "Untitled Whiteboard",
      owner: req.user.id,
      collaborators: [],
      isPublic: req.body.isPublic || false,
      content: req.body
    });
    
    await doc.save();
    const boardId = doc._id.toString();

    // Cache in Redis
    if (redisClient && redisClient.isReady) {
      await redisClient.setEx(`board:${boardId}:state`, 86400, JSON.stringify(req.body));
    }

    return res.json({ id: boardId });
  } catch (err) {
    console.error("Failed to create whiteboard", err);
    return res.status(500).json({ error: "create_failed" });
  }
});

// GET load whiteboard content (supports public or authenticated)
app.get("/api/whiteboards/:id", async (req, res) => {
  const boardId = req.params.id;
  try {
    const board = await Whiteboard.findById(boardId);
    if (!board) return res.status(404).json({ error: "Not found" });

    // Validate access
    if (!board.isPublic) {
      const authHeader = req.header("Authorization");
      if (!authHeader) return res.status(401).json({ error: "unauthorized_missing_token" });

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ error: "token_format_invalid" });
      }

      try {
        const decoded = jwt.verify(parts[1], JWT_SECRET);
        const isAuthorized = board.owner.toString() === decoded.id || 
                             board.collaborators.map(c => c.toString()).includes(decoded.id);
        if (!isAuthorized) {
          return res.status(403).json({ error: "forbidden_access_denied" });
        }
      } catch (err) {
        return res.status(401).json({ error: "unauthorized_token_invalid" });
      }
    }

    // Cache in Redis for subsequent loads
    if (redisClient && redisClient.isReady) {
      await redisClient.setEx(`board:${boardId}:state`, 86400, JSON.stringify(board.content));
    }

    const responsePayload = {
      ...(board.content || {}),
      owner: board.owner.toString(),
      collaborators: board.collaborators.map(c => c.toString()),
      isPublic: board.isPublic
    };
    return res.json(responsePayload);
  } catch (err) {
    console.error("Failed to load whiteboard", err);
    return res.status(500).json({ error: "load_failed" });
  }
});

// PUT update existing whiteboard content
app.put("/api/whiteboards/:id", auth, async (req, res) => {
  const boardId = req.params.id;
  try {
    const board = await Whiteboard.findById(boardId);
    if (!board) return res.status(404).json({ error: "Not found" });

    const isAuthorized = board.owner.toString() === req.user.id || 
                         board.collaborators.map(c => c.toString()).includes(req.user.id);
    if (!isAuthorized) {
      return res.status(403).json({ error: "forbidden_access_denied" });
    }

    // Update root level metadata
    board.title = req.body.title || board.title;
    board.isPublic = req.body.isPublic !== undefined ? req.body.isPublic : board.isPublic;
    
    if (req.body.collaborators && board.owner.toString() === req.user.id) {
      board.collaborators = req.body.collaborators;
    }

    board.content = req.body;
    await board.save();

    // Cache updated canvas JSON in Redis
    if (redisClient && redisClient.isReady) {
      await redisClient.setEx(`board:${boardId}:state`, 86400, JSON.stringify(req.body));
    }

    return res.json({ id: boardId });
  } catch (err) {
    console.error("Failed to update whiteboard", err);
    return res.status(500).json({ error: "update_failed" });
  }
});

// DELETE delete whiteboard
app.delete("/api/whiteboards/:id", auth, async (req, res) => {
  const boardId = req.params.id;
  try {
    const board = await Whiteboard.findById(boardId);
    if (!board) return res.status(404).json({ error: "Not found" });

    // Only owner can delete
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "forbidden_only_owner_can_delete" });
    }

    await board.deleteOne();
    
    // Clear Redis Cache
    if (redisClient && redisClient.isReady) {
      await redisClient.del(`board:${boardId}:state`);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete whiteboard", err);
    return res.status(500).json({ error: "delete_failed" });
  }
});

// POST toggle share public OR add collaborator
app.post("/api/whiteboards/:id/share", auth, async (req, res) => {
  const boardId = req.params.id;
  try {
    const board = await Whiteboard.findById(boardId);
    if (!board) return res.status(404).json({ error: "Not found" });

    // Only owner can share/change collaborator settings
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "forbidden_access_denied" });
    }

    const { email } = req.body;
    if (email) {
      // Add collaborator by email
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) return res.status(404).json({ error: "user_not_found" });

      if (user._id.toString() === req.user.id) {
        return res.status(400).json({ error: "cannot_add_self_as_collaborator" });
      }

      if (!board.collaborators.includes(user._id)) {
        board.collaborators.push(user._id);
        await board.save();
      }
      return res.json({ success: true, collaboratorsCount: board.collaborators.length });
    } else {
      // Toggle public status
      board.isPublic = !board.isPublic;
      await board.save();
      return res.json({ isPublic: board.isPublic });
    }
  } catch (err) {
    console.error("Failed to share whiteboard", err);
    return res.status(500).json({ error: "share_failed" });
  }
});

// POST toggle collaborator role (Full Access vs View-Only) by User ID
app.post("/api/whiteboards/:id/permissions", auth, async (req, res) => {
  const boardId = req.params.id;
  try {
    const board = await Whiteboard.findById(boardId);
    if (!board) return res.status(404).json({ error: "Not found" });

    // Only owner can change permissions
    if (board.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: "forbidden_access_denied" });
    }

    const { userId, access } = req.body; // access: 'full' or 'view'
    if (!userId) return res.status(400).json({ error: "missing_user_id" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "user_not_found" });

    const userObjectId = user._id;

    if (access === 'full') {
      if (!board.collaborators.map(c => c.toString()).includes(userId)) {
        board.collaborators.push(userObjectId);
        await board.save();
      }
    } else if (access === 'view') {
      board.collaborators = board.collaborators.filter(c => c.toString() !== userId);
      await board.save();
    }

    // Broadcast permission change event through sockets to all clients in the room
    io.to(boardId).emit("board:permissions-update", {
      owner: board.owner.toString(),
      collaborators: board.collaborators.map(c => c.toString()),
      isPublic: board.isPublic
    });

    return res.json({ 
      success: true, 
      collaborators: board.collaborators.map(c => c.toString()) 
    });
  } catch (err) {
    console.error("Failed to update permissions", err);
    return res.status(500).json({ error: "permissions_update_failed" });
  }
});

// Serve /uploads static folder
app.use("/uploads", express.static(uploadsDir));

// Rate limiter for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: { error: "too_many_ai_requests_please_try_again_later" }
});

// GET map of all elements with active context on a whiteboard
app.get("/api/context/:whiteboardId", auth, async (req, res) => {
  try {
    const contexts = await ElementContext.find(
      { whiteboard_id: req.params.whiteboardId },
      "element_id"
    );
    const activeMap = {};
    contexts.forEach((c) => {
      activeMap[c.element_id] = true;
    });
    return res.json(activeMap);
  } catch (err) {
    console.error("Failed to get context map", err);
    return res.status(500).json({ error: "load_map_failed" });
  }
});

// GET single element context details
app.get("/api/context/:whiteboardId/:elementId", auth, async (req, res) => {
  try {
    const { whiteboardId, elementId } = req.params;
    let context = await ElementContext.findOne({
      whiteboard_id: whiteboardId,
      element_id: elementId,
    });
    if (!context) {
      return res.json({
        whiteboard_id: whiteboardId,
        element_id: elementId,
        notes: "",
        links: [],
        code_snippet: "",
        code_language: "javascript",
        files: [],
      });
    }
    return res.json(context);
  } catch (err) {
    console.error("Failed to get element context", err);
    return res.status(500).json({ error: "load_context_failed" });
  }
});

// POST update element context text fields
app.post("/api/context/:whiteboardId/:elementId", auth, async (req, res) => {
  try {
    const { whiteboardId, elementId } = req.params;
    const { notes, links, code_snippet, code_language } = req.body;

    const context = await ElementContext.findOneAndUpdate(
      { whiteboard_id: whiteboardId, element_id: elementId },
      {
        notes: notes !== undefined ? notes : "",
        links: links || [],
        code_snippet: code_snippet !== undefined ? code_snippet : "",
        code_language: code_language || "javascript",
      },
      { new: true, upsert: true }
    );
    return res.json(context);
  } catch (err) {
    console.error("Failed to save element context", err);
    return res.status(500).json({ error: "save_context_failed" });
  }
});

// POST upload file attachment to element context
app.post(
  "/api/context/:whiteboardId/:elementId/upload",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "no_file_uploaded" });
      }
      const { whiteboardId, elementId } = req.params;
      const fileUrl = `/uploads/${req.file.filename}`;

      const context = await ElementContext.findOneAndUpdate(
        { whiteboard_id: whiteboardId, element_id: elementId },
        {
          $push: {
            files: {
              name: req.file.originalname,
              path: fileUrl,
              mimetype: req.file.mimetype,
            },
          },
        },
        { new: true, upsert: true }
      );
      return res.json(context);
    } catch (err) {
      console.error("Failed to upload file to context", err);
      return res.status(500).json({ error: "upload_failed" });
    }
  }
);

// DELETE file attachment from element context
app.delete(
  "/api/context/:whiteboardId/:elementId/files/:fileId",
  auth,
  async (req, res) => {
    try {
      const { whiteboardId, elementId, fileId } = req.params;
      const context = await ElementContext.findOneAndUpdate(
        { whiteboard_id: whiteboardId, element_id: elementId },
        { $pull: { files: { _id: fileId } } },
        { new: true }
      );
      return res.json(context);
    } catch (err) {
      console.error("Failed to delete file from context", err);
      return res.status(500).json({ error: "delete_file_failed" });
    }
  }
);

// POST static layout cleanup snap & distribute
app.post("/api/ai/cleanup", auth, aiLimiter, (req, res) => {
  try {
    const { elements, connectors } = req.body;
    console.log("[Server Cleanup API] Elements received:", elements?.length, "Connectors received:", connectors?.length);
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ error: "missing_elements_array" });
    }
    const { cleanupLayout } = require("./ai.service");
    const cleaned = cleanupLayout(elements, connectors || []);
    return res.json({ elements: cleaned });
  } catch (err) {
    console.error("Static layout cleanup failed", err);
    return res.status(500).json({ error: "cleanup_failed" });
  }
});

// POST static system architecture review
app.post("/api/ai/assist", auth, aiLimiter, (req, res) => {
  try {
    const { elements, edges } = req.body;
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ error: "missing_elements_array" });
    }
    const { architectureAssist } = require("./ai.service");
    const suggestions = architectureAssist(elements, edges || []);
    return res.json({ suggestions });
  } catch (err) {
    console.error("Static architecture assist failed", err);
    return res.status(500).json({ error: "assist_failed" });
  }
});

// Start server with EADDRINUSE handling: try next ports up to 5 times
// Create HTTP server and attach Socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

(async () => {
  try {
    redisClient = redis.createClient({
      url: REDIS_URL,
      socket: {
        // Disable automatic reconnection — try once, fail gracefully
        reconnectStrategy: false,
      },
    });
    subClient = redisClient.duplicate();

    // Log the error only once, then clean up so we don't keep a broken client
    redisClient.on("error", (err) => {
      console.warn("Redis unavailable. Running in in-memory mode.", err.message);
      redisClient = null;
      subClient = null;
    });
    subClient.on("error", (err) => {
      subClient = null;
    });

    await Promise.all([redisClient.connect(), subClient.connect()]);
    console.log("Connected to Redis successfully.");

    // Attach Socket.io Redis Adapter for horizontal scaling
    io.adapter(createAdapter(redisClient, subClient));
    console.log("Socket.io Redis adapter attached.");
  } catch (err) {
    console.warn("Redis connection failed. Running server in-memory mode.", err.message);
    redisClient = null;
    subClient = null;
  }
})();

// Dynamic active users tracking (socketId -> { roomId, name, color, pageId })
const activeUsers = new Map();

function broadcastRoomUsers(roomId) {
  const roomUsers = [];
  for (const [sid, u] of activeUsers.entries()) {
    if (u.roomId === roomId) {
      roomUsers.push({ 
        id: sid, 
        name: u.name, 
        color: u.color, 
        pageId: u.pageId,
        dbUserId: u.dbUserId || null,
        isGuest: !!u.isGuest,
        sessionAccess: u.sessionAccess || null
      });
    }
  }
  io.to(roomId).emit("room:users", roomUsers);
}

// Socket.io JWT authentication handshake middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.user = { id: socket.id, name: "Guest Collaborator", color: "#6B7280", isGuest: true };
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = {
      id: decoded.id,
      name: decoded.name,
      color: decoded.color || "#6B7280",
      isGuest: false
    };
    next();
  } catch (err) {
    console.warn("Socket handshake auth failed. Fallback to guest:", err.message);
    socket.user = { id: socket.id, name: "Guest Collaborator", color: "#6B7280", isGuest: true };
    next();
  }
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("join", (payload) => {
    let roomId = "global";
    let user = socket.user || { name: "Collaborator", color: "#6B7280" };
    let pageId = "page-1";

    if (payload && typeof payload === "object") {
      roomId = payload.roomId || "global";
      if (socket.user && !socket.user.isGuest) {
        user = socket.user;
      } else if (payload.user) {
        user = payload.user;
      }
      pageId = payload.pageId || pageId;
    } else if (typeof payload === "string") {
      roomId = payload;
    }

    // Leave old room if switching
    const oldUser = activeUsers.get(socket.id);
    if (oldUser && oldUser.roomId !== roomId) {
      socket.leave(oldUser.roomId);
    }

    socket.join(roomId);
    activeUsers.set(socket.id, { 
      roomId, 
      name: user.name, 
      color: user.color, 
      pageId,
      dbUserId: socket.user && !socket.user.isGuest ? socket.user.id : null,
      isGuest: !socket.user || socket.user.isGuest
    });
    console.log(`socket ${socket.id} (${user.name}) joined ${roomId} (page: ${pageId})`);

    // Notify room of updated users list
    broadcastRoomUsers(roomId);
  });

  socket.on("canvas:update", ({ id, pageId, json }) => {
    const room = id || "global";
    // broadcast to others in same room
    socket.to(room).emit("canvas:update", { roomId: room, pageId, json });

    // Cache updated canvas JSON in Redis
    if (redisClient && redisClient.isReady) {
      redisClient.setEx(`board:${room}:page:${pageId}:state`, 86400, JSON.stringify(json))
        .catch(err => console.error("Redis cache save error", err));
    }
  });

  socket.on("cursor:move", ({ roomId, pageId, x, y }) => {
    const u = activeUsers.get(socket.id);
    if (u) {
      socket.to(roomId || "global").emit("cursor:update", {
        userId: socket.id,
        name: u.name,
        color: u.color,
        pageId,
        x,
        y
      });
    }
  });

  socket.on("page-switch", ({ roomId, pageId }) => {
    const room = roomId || "global";
    const u = activeUsers.get(socket.id);
    if (u) {
      activeUsers.set(socket.id, { ...u, pageId });
      console.log(`socket ${socket.id} (${u.name}) switched to page ${pageId}`);
      broadcastRoomUsers(room);
    }
  });

  socket.on("board:structure-update", ({ roomId, pages, mode, pageSize }) => {
    const room = roomId || "global";
    socket.to(room).emit("board:structure-update", { pages, mode, pageSize });
  });

  socket.on("board:toggle-user-permission", async ({ roomId, targetSocketId, access }) => {
    try {
      const board = await Whiteboard.findById(roomId);
      if (!board) return;
      
      const senderDbUserId = socket.user && !socket.user.isGuest ? socket.user.id : null;
      if (board.owner.toString() !== senderDbUserId) {
        console.warn("Unauthorized permission toggle attempt");
        return;
      }

      const targetUser = activeUsers.get(targetSocketId);
      if (targetUser) {
        if (targetUser.dbUserId) {
          // Prevent toggling board owner's own permissions
          if (targetUser.dbUserId === board.owner.toString()) {
            console.warn("Cannot toggle board owner permissions");
            return;
          }
          const userObjectId = new mongoose.Types.ObjectId(targetUser.dbUserId);
          if (access === 'full') {
            if (!board.collaborators.map(c => c.toString()).includes(targetUser.dbUserId)) {
              board.collaborators.push(userObjectId);
              await board.save();
            }
          } else {
            board.collaborators = board.collaborators.filter(c => c.toString() !== targetUser.dbUserId);
            await board.save();
          }
        }
        
        targetUser.sessionAccess = access;
        activeUsers.set(targetSocketId, targetUser);

        io.to(roomId).emit("board:user-permission-changed", {
          socketId: targetSocketId,
          dbUserId: targetUser.dbUserId,
          access: access,
          owner: board.owner.toString(),
          collaborators: board.collaborators.map(c => c.toString()),
          isPublic: board.isPublic
        });

        broadcastRoomUsers(roomId);
      }
    } catch (err) {
      console.error("Failed to toggle user socket permission:", err);
    }
  });

  socket.on("disconnect", () => {
    const u = activeUsers.get(socket.id);
    if (u) {
      const { roomId } = u;
      activeUsers.delete(socket.id);
      console.log(`socket ${socket.id} disconnected from ${roomId}`);
      broadcastRoomUsers(roomId);
    }
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

// Export app, httpServer, and io for testing
module.exports = { app, httpServer, io };

if (require.main === module) {
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
}
