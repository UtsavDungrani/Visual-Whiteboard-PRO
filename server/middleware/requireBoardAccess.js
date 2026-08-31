const { getBoardAccess, canEdit, isBoardId } = require("../boardAccess");

// Guards a route on the permissions of the board named in the URL. `level` is
// "view" or "edit". Expects req.user to have been resolved already by either the
// auth or optionalAuth middleware; an absent req.user is treated as anonymous,
// which is only enough for a public board.
//
// The context routes checked that the id was a well-formed ObjectId and nothing
// else, so any logged-in user could read, overwrite, or delete the notes, code,
// and file attachments of any board on the instance.
module.exports = function requireBoardAccess(
  level,
  paramName = "whiteboardId",
) {
  return async function boardAccessGuard(req, res, next) {
    const boardId = req.params[paramName];
    if (!isBoardId(boardId)) {
      return res.status(400).json({ error: "invalid_whiteboard_id" });
    }

    try {
      const userId = req.user ? req.user.id : null;
      const { board, access } = await getBoardAccess(boardId, userId);

      if (!board) return res.status(404).json({ error: "board_not_found" });

      if (!access) {
        // Anonymous callers get 401 so the client knows to log in; identified
        // ones get 403 because logging in again will not help them.
        return userId
          ? res.status(403).json({ error: "forbidden_access_denied" })
          : res.status(401).json({ error: "unauthorized_missing_token" });
      }

      if (level === "edit" && !canEdit(access)) {
        return res.status(403).json({ error: "forbidden_read_only" });
      }

      req.board = board;
      req.boardAccess = access;
      return next();
    } catch (err) {
      console.error("Board access check failed", err);
      return res.status(500).json({ error: "access_check_failed" });
    }
  };
};
