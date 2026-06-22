const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "visual_whiteboard_secret_key_123";

module.exports = function (req, res, next) {
  // Get token from Authorization header
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ error: "no_token_authorization_denied" });
  }

  // Token format should be "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "token_format_invalid" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "token_invalid_or_expired" });
  }
};
