// Single source of truth for the JWT signing secret.
//
// This used to be `process.env.JWT_SECRET || "visual_whiteboard_secret_key_123"`,
// duplicated across the app and the tests. A hardcoded fallback means anyone who
// reads the source can forge a token for any user id - including role:"admin" -
// so there is deliberately no default here.
require("dotenv").config();

const crypto = require("crypto");

function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not set. Refusing to start in production without one.",
    );
  }

  // Local/test runs get a random per-process secret instead of a shared
  // constant. Tokens do not survive a restart, which is fine here and keeps
  // the predictable value out of the codebase entirely.
  console.warn(
    "[config] JWT_SECRET not set - using an ephemeral secret. Tokens will be invalidated on restart.",
  );
  return crypto.randomBytes(32).toString("hex");
}

module.exports = { JWT_SECRET: resolveJwtSecret() };
