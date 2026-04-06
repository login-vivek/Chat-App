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

// Allow requests from your React frontend
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json()); // Parse incoming JSON requests

// REST API routes
app.use("/api/auth", authRoutes);   // /api/auth/register and /api/auth/login
app.use("/api/rooms", roomRoutes);  // /api/rooms

// Wrap express app in an HTTP server (required for Socket.io)
const httpServer = createServer(app);

// Attach Socket.io to the HTTP server
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", credentials: true },
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Initialize all socket events
initSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));