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

/* ----- CORS CONFIG (LOCAL + RENDER FRONTEND) ----- */
const allowedOrigins = [
  "http://localhost:5173",
  "https://chat-app-2-9g0n.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);

app.use(express.json());

/* ----- ROUTES ----- */
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

/* ----- HTTP SERVER ----- */
const httpServer = createServer(app);

/* ----- SOCKET.IO ----- */
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

/* ----- DATABASE ----- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

/* ----- SOCKET HANDLERS ----- */
initSocket(io);

/* ----- START SERVER ----- */
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});