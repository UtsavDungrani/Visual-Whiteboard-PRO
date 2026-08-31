// Shared board authorisation. The REST routes enforced these rules inline while
// the socket layer enforced nothing at all, so anyone who knew a board id could
// join its room and read or inject live edits. Both surfaces now resolve access
// through here so there is one definition of who may do what.
const mongoose = require("mongoose");
const Whiteboard = require("./models/Whiteboard");

// Whether an identifier can name a persisted board at all. Socket rooms that
// are not boards (unsaved boards use "global") fail this too.
function isBoardId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// "owner" | "edit" | "view" | null. Mirrors the REST rules: the owner and any
// collaborator may edit, a public board is readable by anyone including guests.
function accessForBoard(board, userId) {
  if (!board) return null;

  const uid = userId ? String(userId) : null;
  if (uid) {
    if (String(board.owner) === uid) return "owner";
    if (board.collaborators.some((c) => String(c) === uid)) return "edit";
  }

  return board.isPublic ? "view" : null;
}

function canEdit(access) {
  return access === "owner" || access === "edit";
}

// Loads the board and resolves access in one step. Returns access null when the
// board is missing or the user may not see it - callers must not distinguish
// those cases to anyone but the owner.
async function getBoardAccess(boardId, userId) {
  if (!isBoardId(boardId)) return { board: null, access: null };

  const board = await Whiteboard.findById(boardId).select(
    "owner collaborators isPublic",
  );
  return { board, access: accessForBoard(board, userId) };
}

module.exports = {
  accessForBoard,
  canEdit,
  getBoardAccess,
  isBoardId,
};
