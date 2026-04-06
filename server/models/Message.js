import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    room:       { type: String, required: true },
    sender:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true },
    text:       { type: String, required: true },

    // Stores the message being replied to (just a snapshot, not a DB reference)
    replyTo: {
      _id:        { type: String },
      senderName: { type: String },
      text:       { type: String },
    },

    // Stores reactions as { "❤️": ["vivek", "john"], "😂": ["jane"] }
    reactions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);