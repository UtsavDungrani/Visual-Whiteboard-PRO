const mongoose = require("mongoose");
const { Schema } = mongoose;

// A comment thread anchored to a board. The anchor is either an element id
// (moves with the shape) or a free canvas point on a page. Replies are embedded.
const ReplySchema = new Schema(
  {
    author: {
      id: { type: String, default: "" },
      name: { type: String, default: "Collaborator" },
      color: { type: String, default: "#6B7280" },
    },
    text: { type: String, default: "" },
  },
  { timestamps: true },
);

const CommentSchema = new Schema(
  {
    whiteboard_id: {
      type: Schema.Types.ObjectId,
      ref: "Whiteboard",
      required: true,
      index: true,
    },
    page_id: { type: String, default: "page-1", index: true },
    // Anchor: element_id when pinned to a shape, else a free {x,y} canvas point.
    element_id: { type: String, default: "" },
    anchor: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    author: {
      id: { type: String, default: "" },
      name: { type: String, default: "Collaborator" },
      color: { type: String, default: "#6B7280" },
    },
    text: { type: String, default: "" },
    resolved: { type: Boolean, default: false },
    replies: [ReplySchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Comment", CommentSchema);
