import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/rooms.js";
import { initSocket } from "./socket/socketHandlers.js";

dotenv.config();

const app = express();

/* CORS FIX */
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://chat-app-2-9g0n.onrender.com"
  ],
  credentials: true
}));

app.use(express.json());

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

/* HTTP SERVER */
const httpServer = createServer(app);

/* SOCKET.IO */
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://chat-app-2-9g0n.onrender.com"
    ],
    credentials: true
  }
});

/* DATABASE */
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB error:", err));

/* SOCKET EVENTS */
initSocket(io);

/* START SERVER */
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});