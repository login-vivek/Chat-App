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

app.use(cors({
  origin: "https://chat-app-tau-three-99.vercel.app",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "https://chat-app-tau-three-99.vercel.app",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

initSocket(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));