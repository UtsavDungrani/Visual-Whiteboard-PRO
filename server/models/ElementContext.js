const mongoose = require("mongoose");
const { Schema } = mongoose;

const ElementContextSchema = new Schema(
  {
    whiteboard_id: { type: Schema.Types.ObjectId, ref: "Whiteboard", required: true },
    element_id: { type: String, required: true, index: true },
    notes: { type: String, default: "" }, // Markdown notes
    links: [
      {
        label: { type: String, default: "" },
        url: { type: String, default: "" },
      },
    ],
    code_snippet: { type: String, default: "" },
    code_language: { type: String, default: "javascript" },
    files: [
      {
        name: { type: String, default: "" },
        path: { type: String, default: "" }, // local path or relative URL
        mimetype: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ElementContext", ElementContextSchema);
