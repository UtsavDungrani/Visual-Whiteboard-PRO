const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
// Load .env before anything reads process.env: activeCacheMode used to be
// assigned one line above this call, so DEFAULT_CACHE_MODE was always ignored.
require("dotenv").config();

const app = express();
app.set("trust proxy", 1); // Trust Render load balancers for rate-limiting IP mapping
global.activeCacheMode = process.env.DEFAULT_CACHE_MODE || "redis"; // "redis" or "memory"
const mongoose = require("mongoose");
const Whiteboard = require("./models/Whiteboard");
const ElementContext = require("./models/ElementContext");
const User = require("./models/User");
const auth = require("./middleware/auth");
const admin = require("./middleware/admin");
const optionalAuth = require("./middleware/optionalAuth");
const requireBoardAccess = require("./middleware/requireBoardAccess");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const redis = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { JWT_SECRET } = require("./config");
const {
  accessForBoard,
  canEdit,
  getBoardAccess,
  isBoardId,
} = require("./boardAccess");

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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Attachments are reference material for a diagram element: documents, images
// and archives. Uploads were previously unrestricted in both size and type, so
// the endpoint doubled as general purpose file hosting. Extend this list if a
// real workflow needs more; scriptable formats (.svg, .html, .xml, .js) are
// left out deliberately.
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".log",
  ".yml",
  ".yaml",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
]);

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_UPLOAD_EXTENSIONS.has(ext)) return cb(null, true);

    const err = new Error(`unsupported file type: ${ext || "none"}`);
    err.code = "UNSUPPORTED_FILE_TYPE";
    return cb(err);
  },
});

// Multer reports rejections through next(err), which the default Express handler
// turns into a 500 HTML page. Translate them into the JSON the client expects.
const uploadSingleFile = (req, res, next) =>
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "file_too_large" });
    }
    if (err.code === "UNSUPPORTED_FILE_TYPE") {
      return res.status(400).json({ error: "unsupported_file_type" });
    }

    console.error("Upload rejected", err);
    return res.status(400).json({ error: "upload_failed" });
  });

// Both the API and the socket server accepted any origin. Auth is a Bearer
// token rather than a cookie so this is defence in depth, not a hole on its
// own - but there is no reason for anywhere except the frontend to call us.
// Set CORS_ORIGINS to a comma separated list to lock it down; left unset the
// previous allow-any behaviour is kept so an unconfigured deploy still works.
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!allowedOrigins.length) {
  console.warn(
    "[cors] CORS_ORIGINS not set - accepting requests from any origin.",
  );
}

const corsOrigin = allowedOrigins.length ? allowedOrigins : "*";

app.use(cors({ origin: corsOrigin }));
// Board saves carry every page's canvas JSON plus a thumbnail each, which the
// 100kb default rejected outright. Capped below MongoDB's 16MB document limit,
// since board.content is stored as a single document and cannot exceed it.
app.use(express.json({ limit: "15mb" }));

// Serve static Draw.io webapp assets
const drawioDir = path.join(
  __dirname,
  "..",
  "drawio-dev",
  "src",
  "main",
  "webapp",
);
if (fs.existsSync(drawioDir)) {
  app.use("/drawio", express.static(drawioDir));
}

// Baseline security headers. Hand rolled rather than pulling in helmet: this
// is a JSON API plus one static admin page, so only a handful apply.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  next();
});

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
      console.warn(
        "Redis unavailable. Running in in-memory mode.",
        err.message,
      );
      redisClient = null;
      subClient = null;
    });
    subClient.on("error", (err) => {
      subClient = null;
    });

    await Promise.all([redisClient.connect(), subClient.connect()]);
    console.log("Connected to Redis successfully.");
  } catch (err) {
    console.warn(
      "Redis connection failed. Running server in-memory mode.",
      err.message,
    );
    redisClient = null;
    subClient = null;
  }
})();

function isRedisEnabled() {
  return (
    global.activeCacheMode === "redis" && !!(redisClient && redisClient.isReady)
  );
}

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
  message: { error: "too_many_requests_please_try_again_later" },
});

// --- Authentication Routes ---

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "missing_required_fields" });
    }

    // Registration accepted anything at all: a name is rendered wherever the
    // user appears and an unbounded one is a denial of service on every view.
    if (typeof name !== "string" || name.trim().length < 1) {
      return res.status(400).json({ error: "invalid_name" });
    }
    if (name.length > 80) {
      return res.status(400).json({ error: "name_too_long" });
    }
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({ error: "invalid_email" });
    }
    // bcrypt silently truncates beyond 72 bytes, so reject rather than mislead.
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "password_too_short" });
    }
    if (Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: "password_too_long" });
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
    const avatarColors = [
      "#1E3A5F",
      "#2E86AB",
      "#10B981",
      "#F59E0B",
      "#EF4444",
    ];
    const avatarColor =
      avatarColors[Math.floor(Math.random() * avatarColors.length)];

    user = new User({
      name,
      email: emailLower,
      password: hashedPassword,
      avatar_color: avatarColor,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        color: user.avatar_color,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "2d" },
    );

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        color: user.avatar_color,
        role: user.role,
      },
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
      {
        id: user._id,
        name: user.name,
        email: user.email,
        color: user.avatar_color,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "2d" },
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        color: user.avatar_color,
        role: user.role,
      },
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
      color: user.avatar_color,
      role: user.role,
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
    const docs = await Whiteboard.find(
      {
        $or: [{ owner: req.user.id }, { collaborators: req.user.id }],
      },
      "title owner collaborators isPublic updatedAt createdAt",
    )
      .populate("owner", "name email")
      .lean();
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
      content: req.body,
    });

    await doc.save();
    const boardId = doc._id.toString();

    // Cache in Redis
    if (isRedisEnabled()) {
      await redisClient.setEx(
        `board:${boardId}:state`,
        86400,
        JSON.stringify(req.body),
      );
    }

    return res.json({ id: boardId });
  } catch (err) {
    console.error("Failed to create whiteboard", err);
    return res.status(500).json({ error: "create_failed" });
  }
});

// Helper to slugify titles for clean URL lookup
function slugifyTitle(title) {
  if (!title) return "board";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET load whiteboard content (supports public or authenticated, by ID or by Slug/Title)
app.get("/api/whiteboards/:id", async (req, res) => {
  const identifier = req.params.id;
  try {
    let userId = null;
    const authHeader = req.header("Authorization");
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        try {
          const decoded = jwt.verify(parts[1], JWT_SECRET);
          userId = decoded.id;
        } catch (e) {
          // Token expired or invalid
        }
      }
    }

    let board = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      board = await Whiteboard.findById(identifier);
    }

    if (!board) {
      // Look up by slug or title. Titles are not unique - "My Whiteboard" is the
      // default for every new board - so a slug can match several boards and the
      // caller's own must win over a stranger's that merely happens to be public.
      const cleanSlug = identifier.replace(/^[/-]+|[/-]+$/g, "").toLowerCase();

      // Only boards this caller may actually open. The previous version also
      // fell back to scanning every board on the instance, which could only ever
      // select one it then had to refuse - turning a 404 into a 401/403 that
      // confirmed the title exists. It also loaded full canvas content for every
      // board just to read the title.
      const visibleToCaller = userId
        ? {
            $or: [
              { owner: userId },
              { collaborators: userId },
              { isPublic: true },
            ],
          }
        : { isPublic: true };

      const candidates = await Whiteboard.find(
        visibleToCaller,
        "title owner collaborators isPublic updatedAt",
      )
        .sort({ updatedAt: -1 })
        .lean();

      const matches = candidates.filter(
        (b) => slugifyTitle(b.title) === cleanSlug,
      );

      // Own boards first, then ones shared with us, then merely public. Sort is
      // stable, so the most recently updated still wins inside each tier.
      const ownershipRank = (b) => {
        if (!userId) return 2;
        if (String(b.owner) === userId) return 0;
        if (b.collaborators.some((c) => String(c) === userId)) return 1;
        return 2;
      };
      matches.sort((a, b) => ownershipRank(a) - ownershipRank(b));

      if (matches[0]) {
        board = await Whiteboard.findById(matches[0]._id);
      }
    }

    if (!board) return res.status(404).json({ error: "Not found" });

    // Validate access
    if (!board.isPublic) {
      if (!userId) {
        return res.status(401).json({ error: "unauthorized_missing_token" });
      }

      const isAuthorized =
        board.owner.toString() === userId ||
        board.collaborators.map((c) => c.toString()).includes(userId);
      if (!isAuthorized) {
        return res.status(403).json({ error: "forbidden_access_denied" });
      }
    }

    const boardId = board._id.toString();

    // Cache in Redis for subsequent loads
    if (isRedisEnabled()) {
      await redisClient.setEx(
        `board:${boardId}:state`,
        86400,
        JSON.stringify(board.content),
      );
    }

    const responsePayload = {
      id: boardId,
      _id: boardId,
      title: board.title,
      ...(board.content || {}),
      owner: board.owner.toString(),
      collaborators: board.collaborators.map((c) => c.toString()),
      isPublic: board.isPublic,
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

    const isAuthorized =
      board.owner.toString() === req.user.id ||
      board.collaborators.map((c) => c.toString()).includes(req.user.id);
    if (!isAuthorized) {
      return res.status(403).json({ error: "forbidden_access_denied" });
    }

    // Update root level metadata
    board.title = req.body.title || board.title;
    board.isPublic =
      req.body.isPublic !== undefined ? req.body.isPublic : board.isPublic;

    if (req.body.collaborators && board.owner.toString() === req.user.id) {
      board.collaborators = req.body.collaborators;
    }

    board.content = req.body;
    await board.save();

    // Cache updated canvas JSON in Redis
    if (isRedisEnabled()) {
      await redisClient.setEx(
        `board:${boardId}:state`,
        86400,
        JSON.stringify(req.body),
      );
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
    if (isRedisEnabled()) {
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
        return res
          .status(400)
          .json({ error: "cannot_add_self_as_collaborator" });
      }

      if (!board.collaborators.includes(user._id)) {
        board.collaborators.push(user._id);
        await board.save();
        refreshRoomAccess(board);
      }
      return res.json({
        success: true,
        collaboratorsCount: board.collaborators.length,
      });
    } else {
      // Toggle public status
      board.isPublic = !board.isPublic;
      await board.save();
      refreshRoomAccess(board);
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

    if (access === "full") {
      if (!board.collaborators.map((c) => c.toString()).includes(userId)) {
        board.collaborators.push(userObjectId);
        await board.save();
      }
    } else if (access === "view") {
      board.collaborators = board.collaborators.filter(
        (c) => c.toString() !== userId,
      );
      await board.save();
    }

    // Connected sockets cache their access, so re-resolve it here too.
    refreshRoomAccess(board);

    // Broadcast permission change event through sockets to all clients in the room
    io.to(boardId).emit("board:permissions-update", {
      owner: board.owner.toString(),
      collaborators: board.collaborators.map((c) => c.toString()),
      isPublic: board.isPublic,
    });

    return res.json({
      success: true,
      collaborators: board.collaborators.map((c) => c.toString()),
    });
  } catch (err) {
    console.error("Failed to update permissions", err);
    return res.status(500).json({ error: "permissions_update_failed" });
  }
});

// Serve /uploads static folder
// User supplied files served from an application origin are active content:
// an uploaded page would run as if we wrote it. The app only ever links to
// these as downloads, so force that and stop the browser sniffing a type.
app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader("Content-Disposition", "attachment");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
    },
    dotfiles: "deny",
    index: false,
  }),
);

// Serve /admin static folder for separate Admin Panel app.
// script-src without 'unsafe-inline' blocks inline event handlers, which is what
// an injected `<img onerror=...>` relies on - a second line of defence behind
// escaping the values in the first place. Inline style attributes are used
// throughout the markup, so styles still need 'unsafe-inline'.
const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Both admin pages pull Inter from Google Fonts.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join("; ");

app.use(
  "/admin",
  (req, res, next) => {
    res.setHeader("Content-Security-Policy", ADMIN_CSP);
    next();
  },
  express.static(path.join(__dirname, "admin")),
);

// Rate limiter for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: { error: "too_many_ai_requests_please_try_again_later" },
});

// GET map of all elements with active context on a whiteboard
app.get(
  "/api/context/:whiteboardId",
  optionalAuth,
  requireBoardAccess("view"),
  async (req, res) => {
    try {
      const { whiteboardId } = req.params;
      const contexts = await ElementContext.find(
        { whiteboard_id: whiteboardId },
        "element_id notes links code_snippet files",
      );
      const activeMap = {};
      contexts.forEach((c) => {
        const hasContent =
          (c.notes && c.notes.trim() !== "") ||
          (c.links &&
            c.links.length > 0 &&
            c.links.some((l) => l.url && l.url.trim() !== "")) ||
          (c.code_snippet && c.code_snippet.trim() !== "") ||
          (c.files && c.files.length > 0);
        if (hasContent) {
          activeMap[c.element_id] = true;
        }
      });
      return res.json(activeMap);
    } catch (err) {
      console.error("Failed to get context map", err);
      return res.status(500).json({ error: "load_map_failed" });
    }
  },
);

// GET single element context details
app.get(
  "/api/context/:whiteboardId/:elementId",
  optionalAuth,
  requireBoardAccess("view"),
  async (req, res) => {
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
  },
);

// POST update element context text fields (preserves existing file attachments)
app.post(
  "/api/context/:whiteboardId/:elementId",
  auth,
  requireBoardAccess("edit"),
  async (req, res) => {
    try {
      const { whiteboardId, elementId } = req.params;
      const { notes, links, code_snippet, code_language, files } = req.body;

      const updateFields = {
        notes: notes !== undefined ? notes : "",
        links: links || [],
        code_snippet: code_snippet !== undefined ? code_snippet : "",
        code_language: code_language || "javascript",
      };
      if (files !== undefined) {
        updateFields.files = files;
      }

      const context = await ElementContext.findOneAndUpdate(
        { whiteboard_id: whiteboardId, element_id: elementId },
        { $set: updateFields },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      return res.json(context);
    } catch (err) {
      console.error("Failed to save element context", err);
      return res.status(500).json({ error: "save_context_failed" });
    }
  },
);

// POST upload file attachment to element context
app.post(
  "/api/context/:whiteboardId/:elementId/upload",
  auth,
  requireBoardAccess("edit"),
  uploadSingleFile,
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
              size: req.file.size || 0,
            },
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      return res.json(context);
    } catch (err) {
      console.error("Failed to upload file to context", err);
      return res.status(500).json({ error: "upload_failed" });
    }
  },
);

// DELETE file attachment from element context
app.delete(
  "/api/context/:whiteboardId/:elementId/files/:fileId",
  auth,
  requireBoardAccess("edit"),
  async (req, res) => {
    try {
      const { whiteboardId, elementId, fileId } = req.params;

      // Clean up physical file from uploads folder if it exists
      const existing = await ElementContext.findOne({
        whiteboard_id: whiteboardId,
        element_id: elementId,
      });
      if (existing && Array.isArray(existing.files)) {
        const targetFile = existing.files.find(
          (f) => String(f._id) === String(fileId),
        );
        if (targetFile && targetFile.path) {
          const diskFilename = path.basename(targetFile.path);
          const diskPath = path.join(uploadsDir, diskFilename);
          if (fs.existsSync(diskPath)) {
            try {
              fs.unlinkSync(diskPath);
            } catch (unlinkErr) {
              console.error("Failed to delete physical file", unlinkErr);
            }
          }
        }
      }

      const context = await ElementContext.findOneAndUpdate(
        { whiteboard_id: whiteboardId, element_id: elementId },
        { $pull: { files: { _id: fileId } } },
        { new: true },
      );
      return res.json(context || { files: [] });
    } catch (err) {
      console.error("Failed to delete file from context", err);
      return res.status(500).json({ error: "delete_file_failed" });
    }
  },
);

// POST static layout cleanup snap & distribute
app.post("/api/ai/cleanup", auth, aiLimiter, (req, res) => {
  try {
    const { elements, connectors } = req.body;
    console.log(
      "[Server Cleanup API] Elements received:",
      elements?.length,
      "Connectors received:",
      connectors?.length,
    );
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

// --- Administrator Panel REST Endpoints (Protected by auth and admin middleware) ---

app.get("/api/admin/stats", auth, admin, async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const boardCount = await Whiteboard.countDocuments();
    const activeSocketCount = io.sockets.sockets.size;

    return res.json({
      userCount,
      boardCount,
      activeSocketCount,
      activeCacheMode: global.activeCacheMode,
      redisConnected: !!(redisClient && redisClient.isReady),
    });
  } catch (err) {
    console.error("Admin stats failed:", err);
    return res.status(500).json({ error: "admin_stats_failed" });
  }
});

app.get("/api/admin/users", auth, admin, async (req, res) => {
  try {
    const users = await User.find(
      {},
      "name email avatar_color role createdAt",
    ).lean();
    return res.json(users);
  } catch (err) {
    console.error("Admin list users failed:", err);
    return res.status(500).json({ error: "list_users_failed" });
  }
});

app.put("/api/admin/users/:id/role", auth, admin, async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== "user" && role !== "admin") {
      return res.status(400).json({ error: "invalid_role" });
    }

    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: "cannot_modify_own_role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    );
    if (!user) return res.status(404).json({ error: "user_not_found" });

    return res.json({ success: true, user: { id: user._id, role: user.role } });
  } catch (err) {
    console.error("Admin role change failed:", err);
    return res.status(500).json({ error: "role_change_failed" });
  }
});

app.delete("/api/admin/users/:id", auth, admin, async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: "cannot_delete_own_account" });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: "user_not_found" });

    await Whiteboard.deleteMany({ owner: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    return res.json({ success: true });
  } catch (err) {
    console.error("Admin user delete failed:", err);
    return res.status(500).json({ error: "delete_user_failed" });
  }
});

app.get("/api/admin/boards", auth, admin, async (req, res) => {
  try {
    const boards = await Whiteboard.find(
      {},
      "title owner collaborators isPublic createdAt updatedAt",
    )
      .populate("owner", "name email")
      .lean();
    return res.json(boards);
  } catch (err) {
    console.error("Admin list boards failed:", err);
    return res.status(500).json({ error: "list_boards_failed" });
  }
});

app.delete("/api/admin/boards/:id", auth, admin, async (req, res) => {
  try {
    const board = await Whiteboard.findByIdAndDelete(req.params.id);
    if (!board) return res.status(404).json({ error: "board_not_found" });

    if (isRedisEnabled()) {
      const cacheKey = `board:${req.params.id}:state`;
      await redisClient.del(cacheKey);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Admin board delete failed:", err);
    return res.status(500).json({ error: "delete_board_failed" });
  }
});

app.get("/api/admin/config", auth, admin, (req, res) => {
  return res.json({
    activeCacheMode: global.activeCacheMode,
    redisConnected: !!(redisClient && redisClient.isReady),
    redisUrl: process.env.REDIS_URL ? "Configured" : "Not Configured",
  });
});

app.post("/api/admin/config", auth, admin, (req, res) => {
  const { mode } = req.body;
  if (mode !== "redis" && mode !== "memory") {
    return res.status(400).json({ error: "invalid_cache_mode" });
  }
  global.activeCacheMode = mode;
  console.log(`[Admin] Cache mode dynamically switched to: ${mode}`);
  io.emit("admin:cache-mode-changed", {
    activeCacheMode: global.activeCacheMode,
  });
  return res.json({ success: true, activeCacheMode: global.activeCacheMode });
});

// Registered after every route so it also catches body parser failures.
// Express's default handler answers those with an HTML page, which the client
// then tries to res.json() - surfacing as "Unexpected token '<'" rather than
// anything describing the real problem.
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "payload_too_large" });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "invalid_json" });
  }

  if (res.headersSent) return next(err);
  console.error("Unhandled request error", err);
  return res.status(500).json({ error: "internal_error" });
});

// Start server with EADDRINUSE handling: try next ports up to 5 times
// Create HTTP server and attach Socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
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
      console.warn(
        "Redis unavailable. Running in in-memory mode.",
        err.message,
      );
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
    console.warn(
      "Redis connection failed. Running server in-memory mode.",
      err.message,
    );
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
        sessionAccess: u.sessionAccess || null,
      });
    }
  }
  io.to(roomId).emit("room:users", roomUsers);
}

// The room a socket may write to, or null. Always derived from server state:
// a client-supplied roomId let anyone broadcast into a room they never joined.
function writableRoom(socket) {
  const u = activeUsers.get(socket.id);
  if (!u) return null;
  if (isBoardId(u.roomId) && !canEdit(u.access)) return null;
  return u.roomId;
}

// Re-resolves cached access for everyone in a room after its permissions
// change, so a demoted collaborator stops being able to write immediately
// instead of at their next reconnect.
function refreshRoomAccess(board) {
  const roomId = board._id.toString();
  for (const [sid, u] of activeUsers.entries()) {
    if (u.roomId !== roomId) continue;
    const access = accessForBoard(board, u.dbUserId);
    if (!access) {
      // Lost all access: drop them out of the room.
      const sock = io.sockets.sockets.get(sid);
      if (sock) {
        sock.leave(roomId);
        sock.emit("board:access-denied", { roomId });
      }
      activeUsers.delete(sid);
      continue;
    }
    activeUsers.set(sid, {
      ...u,
      access,
      sessionAccess: access === "view" ? "view" : "full",
    });
  }
}

// Socket.io JWT authentication handshake middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.user = {
      id: socket.id,
      name: "Guest Collaborator",
      color: "#6B7280",
      isGuest: true,
    };
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = {
      id: decoded.id,
      name: decoded.name,
      color: decoded.color || "#6B7280",
      isGuest: false,
    };
    next();
  } catch (err) {
    console.warn(
      "Socket handshake auth failed. Fallback to guest:",
      err.message,
    );
    socket.user = {
      id: socket.id,
      name: "Guest Collaborator",
      color: "#6B7280",
      isGuest: true,
    };
    next();
  }
});

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("join", async (payload) => {
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

    const dbUserId =
      socket.user && !socket.user.isGuest ? socket.user.id : null;

    // Every unsaved board joined a single shared "global" room, so two people
    // each starting a new board saw each other's strokes, cursors and page
    // switches. A draft belongs to one socket until the board has an id.
    if (roomId === "global") {
      roomId = `draft:${socket.id}`;
    }

    // Authorise before joining. Room membership is what grants sight of and
    // write access to live board traffic, so an unchecked join bypassed every
    // permission the REST routes enforce. "global" holds unsaved boards only.
    let access = "edit";
    if (isBoardId(roomId)) {
      ({ access } = await getBoardAccess(roomId, dbUserId));
      if (!access) {
        console.warn(`socket ${socket.id} denied join for board ${roomId}`);
        socket.emit("board:access-denied", { roomId });
        return;
      }
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
      dbUserId,
      isGuest: !socket.user || socket.user.isGuest,
      access,
      sessionAccess: access === "view" ? "view" : "full",
    });
    console.log(
      `socket ${socket.id} (${user.name}) joined ${roomId} (page: ${pageId})`,
    );

    // Notify room of updated users list
    broadcastRoomUsers(roomId);
  });

  socket.on("canvas:update", ({ pageId, json }) => {
    const room = writableRoom(socket);
    if (!room) return;

    // broadcast to others in same room
    socket.to(room).emit("canvas:update", { roomId: room, pageId, json });

    // Cache updated canvas JSON in Redis
    if (isRedisEnabled()) {
      redisClient
        .setEx(
          `board:${room}:page:${pageId}:state`,
          86400,
          JSON.stringify(json),
        )
        .catch((err) => console.error("Redis cache save error", err));
    }
  });

  socket.on("cursor:move", ({ pageId, x, y }) => {
    const u = activeUsers.get(socket.id);
    if (u) {
      socket.to(u.roomId).emit("cursor:update", {
        userId: socket.id,
        name: u.name,
        color: u.color,
        pageId,
        x,
        y,
      });
    }
  });

  socket.on("page-switch", ({ pageId }) => {
    const u = activeUsers.get(socket.id);
    if (u) {
      activeUsers.set(socket.id, { ...u, pageId });
      console.log(`socket ${socket.id} (${u.name}) switched to page ${pageId}`);
      broadcastRoomUsers(u.roomId);
    }
  });

  socket.on(
    "board:structure-update",
    ({ pages, mode, pageSize, canvasMode }) => {
      const room = writableRoom(socket);
      if (!room) return;

      socket
        .to(room)
        .emit("board:structure-update", { pages, mode, pageSize, canvasMode });
    },
  );

  socket.on("canvas-mode:change", ({ mode }) => {
    const u = activeUsers.get(socket.id);
    // The client already restricts this to the owner; enforce it server side.
    if (!u || (isBoardId(u.roomId) && u.access !== "owner")) return;

    socket.to(u.roomId).emit("canvas-mode:updated", { roomId: u.roomId, mode });
  });

  socket.on("drawio:update", ({ pageId, xml }) => {
    const room = writableRoom(socket);
    if (!room) return;

    socket.to(room).emit("drawio:update", { roomId: room, pageId, xml });
  });

  socket.on(
    "board:toggle-user-permission",
    async ({ roomId, targetSocketId, access }) => {
      try {
        const board = await Whiteboard.findById(roomId);
        if (!board) return;

        const senderDbUserId =
          socket.user && !socket.user.isGuest ? socket.user.id : null;
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
            const userObjectId = new mongoose.Types.ObjectId(
              targetUser.dbUserId,
            );
            if (access === "full") {
              if (
                !board.collaborators
                  .map((c) => c.toString())
                  .includes(targetUser.dbUserId)
              ) {
                board.collaborators.push(userObjectId);
                await board.save();
              }
            } else {
              board.collaborators = board.collaborators.filter(
                (c) => c.toString() !== targetUser.dbUserId,
              );
              await board.save();
            }
          }

          // Re-resolve from the saved board rather than trusting the request,
          // so the cached access a socket writes with cannot drift from the DB.
          refreshRoomAccess(board);

          io.to(roomId).emit("board:user-permission-changed", {
            socketId: targetSocketId,
            dbUserId: targetUser.dbUserId,
            access: access,
            owner: board.owner.toString(),
            collaborators: board.collaborators.map((c) => c.toString()),
            isPublic: board.isPublic,
          });

          broadcastRoomUsers(roomId);
        }
      } catch (err) {
        console.error("Failed to toggle user socket permission:", err);
      }
    },
  );

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
    .then(async () => {
      console.log("Connected to MongoDB");
      await seedAdminUser();
      startServer(DEFAULT_PORT);
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      // start server anyway (fallback to ephemeral in-memory behavior was removed)
      startServer(DEFAULT_PORT);
    });
}

// Seeds an admin only from explicit env credentials. There is deliberately no
// fallback: a hardcoded default would be a publicly known login on every deploy.
async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log(
      "[Seeder] ADMIN_EMAIL/ADMIN_PASSWORD not set - skipping admin seed.",
    );
    return;
  }

  try {
    // Match the casing normalisation used by the login route.
    const email = adminEmail.toLowerCase().trim();
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`[Seeder] Admin user already exists: ${email}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await new User({
      name: "System Administrator",
      email,
      password: hashedPassword,
      avatar_color: "#1E3A8A",
      role: "admin",
    }).save();
    console.log(`[Seeder] Admin user created: ${email}`);
  } catch (err) {
    console.error("[Seeder] Error seeding admin user:", err);
  }
}
