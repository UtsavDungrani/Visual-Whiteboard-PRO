const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, index: true },
    password: { type: String, required: true },
    avatar_color: { type: String, default: "#6B7280" },
    whiteboards: [{ type: Schema.Types.ObjectId, ref: "Whiteboard" }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
