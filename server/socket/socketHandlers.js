import Message from "../models/Message.js";

const onlineUsers   = {};
const roomPasswords = {};

// ─── 7-DAY GENERAL CHAT WIPE ─────────────────────────────────────
// Calculate next wipe time — every 7 days from server start
const WIPE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
let nextGeneralWipe    = Date.now() + WIPE_INTERVAL_MS;

const broadcastActiveRooms = (io) => {
  const activeRooms = Object.entries(roomPasswords)
    .map(([room, pass]) => ({
      room,
      count: onlineUsers[room] ? onlineUsers[room].size : 0,
      hasPassword: pass !== "",
    }))
    .filter((r) => r.count > 0);
  io.emit("active_rooms", activeRooms);
};

// Wipe general chat every 7 days
const scheduleWipe = (io) => {
  setTimeout(async () => {
    console.log("Wiping general chat messages...");
    await Message.deleteMany({ room: "general" });
    io.to("general").emit("general_wiped"); // tell all users in general to clear their messages
    nextGeneralWipe = Date.now() + WIPE_INTERVAL_MS;
    io.emit("wipe_timer", { nextWipe: nextGeneralWipe }); // update countdown for everyone
    scheduleWipe(io); // schedule next wipe
  }, WIPE_INTERVAL_MS);
};

export const initSocket = (io) => {
  scheduleWipe(io); // start the 7-day cycle

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    broadcastActiveRooms(io);

    // Send wipe timer to newly connected user
    socket.emit("wipe_timer", { nextWipe: nextGeneralWipe });

    // ─── CREATE ROOM ─────────────────────────────────────────────
    socket.on("create_room", ({ room, password, username }) => {
      const trimmedRoom = room.trim().toLowerCase();
      if (!trimmedRoom) return;
      if (trimmedRoom === "general") return socket.emit("room_error", { message: "Cannot recreate general room." });
      if (roomPasswords[trimmedRoom] !== undefined) return socket.emit("room_error", { message: "Room already exists. Join it instead." });
      roomPasswords[trimmedRoom] = password || "";
      socket.emit("room_created", { room: trimmedRoom, password: password || "" });
    });

    // ─── JOIN ROOM ───────────────────────────────────────────────
    socket.on("join_room", async ({ room, password, username }) => {
      const trimmedRoom = room.trim().toLowerCase();
      if (!trimmedRoom) return;

      if (roomPasswords[trimmedRoom] === undefined) roomPasswords[trimmedRoom] = "";

      const storedPass = roomPasswords[trimmedRoom];
      if (storedPass !== "" && storedPass !== password) {
        return socket.emit("room_error", { message: "Wrong password!" });
      }

      const prevRoom = socket.data.room;
      if (prevRoom && prevRoom !== trimmedRoom) {
        socket.leave(prevRoom);
        if (onlineUsers[prevRoom]) {
          onlineUsers[prevRoom].delete(socket.data.username);
          io.to(prevRoom).emit("online_users", [...onlineUsers[prevRoom]]);
        }
      }

      socket.join(trimmedRoom);
      socket.data.room     = trimmedRoom;
      socket.data.username = username;

      if (!onlineUsers[trimmedRoom]) onlineUsers[trimmedRoom] = new Set();
      onlineUsers[trimmedRoom].add(username);

      io.to(trimmedRoom).emit("online_users", [...onlineUsers[trimmedRoom]]);
      broadcastActiveRooms(io);

      const history = await Message.find({ room: trimmedRoom }).sort({ createdAt: 1 }).limit(50);
      socket.emit("message_history", history);
      socket.emit("room_joined", { room: trimmedRoom });
    });

    // ─── SEND MESSAGE ────────────────────────────────────────────
    socket.on("send_message", async ({ room, text, senderId, senderName, replyTo }) => {
      const message = await Message.create({ room, sender: senderId, senderName, text, replyTo: replyTo || null });
      io.to(room).emit("receive_message", {
        _id: message._id, senderName, text,
        replyTo: replyTo || null, reactions: {},
        createdAt: message.createdAt,
      });
    });

    // ─── DELETE MESSAGE ──────────────────────────────────────────
    socket.on("delete_message", async ({ msgId, room, username }) => {
      try {
        const msg = await Message.findById(msgId);
        if (!msg || msg.senderName !== username) return;
        await Message.findByIdAndDelete(msgId);
        io.to(room).emit("message_deleted", msgId);
      } catch (err) { console.log("Delete error:", err.message); }
    });

    // ─── ADD REACTION ────────────────────────────────────────────
    socket.on("add_reaction", async ({ msgId, room, emoji, username }) => {
      try {
        const msg = await Message.findById(msgId);
        if (!msg) return;
        if (!msg.reactions) msg.reactions = {};
        if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
        const idx = msg.reactions[emoji].indexOf(username);
        if (idx > -1) msg.reactions[emoji].splice(idx, 1);
        else msg.reactions[emoji].push(username);
        msg.markModified("reactions");
        await msg.save();
        io.to(room).emit("reaction_updated", { msgId, reactions: msg.reactions });
      } catch (err) { console.log("Reaction error:", err.message); }
    });

    // ─── TYPING ──────────────────────────────────────────────────
    socket.on("typing",      ({ room, username }) => socket.to(room).emit("user_typing", username));
    socket.on("stop_typing", ({ room })           => socket.to(room).emit("user_stop_typing"));

    // ─── DISCONNECT ──────────────────────────────────────────────
    socket.on("disconnect", () => {
      const { room, username } = socket.data;
      if (room && username && onlineUsers[room]) {
        onlineUsers[room].delete(username);
        io.to(room).emit("online_users", [...onlineUsers[room]]);
        broadcastActiveRooms(io);
      }
      console.log("User disconnected:", socket.id);
    });
  });
};