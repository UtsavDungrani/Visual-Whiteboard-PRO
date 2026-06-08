const mongoose = require("mongoose");
const { Schema } = mongoose;

const WhiteboardSchema = new Schema(
  {
    content: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Whiteboard", WhiteboardSchema);
