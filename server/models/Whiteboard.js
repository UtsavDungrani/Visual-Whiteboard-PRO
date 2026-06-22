const mongoose = require("mongoose");
const { Schema } = mongoose;

const WhiteboardSchema = new Schema(
  {
    title: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    collaborators: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isPublic: { type: Boolean, default: false },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Whiteboard", WhiteboardSchema);
