import express from "express";
import Message from "../models/Message.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/rooms/:roomName/messages
// Protected route — user must be logged in to fetch messages
router.get("/:roomName/messages", protect, async (req, res) => {
  try {
    // Fetch last 50 messages for this room, oldest first
    const messages = await Message.find({ room: req.params.roomName })
      .sort({ createdAt: 1 })
      .limit(50);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;