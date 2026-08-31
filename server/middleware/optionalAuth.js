const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

// Populates req.user when a valid Bearer token is present and moves on quietly
// when it is missing or expired. Routes that serve public boards need to know
// who is calling without forcing everyone to be logged in - previously each one
// inlined this parsing, or skipped identifying the caller altogether.
module.exports = function optionalAuth(req, res, next) {
  const authHeader = req.header("Authorization");
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      try {
        req.user = jwt.verify(parts[1], JWT_SECRET);
      } catch {
        // Invalid or expired: the request continues as anonymous.
      }
    }
  }
  next();
};
