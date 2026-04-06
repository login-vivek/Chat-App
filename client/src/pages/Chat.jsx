import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import socket from "../socket.js";

const EMOJIS    = ["😀","😂","😍","🥰","😎","😢","😡","🤔","👍","👎","❤️","🔥","🎉","✅","💯","🙏","😭","🤣","😊","🥳"];
const REACTIONS = ["❤️","😂","👍","🔥","😮","😢"];

const avatarColors   = ["#2AABEE","#229ED9","#e74c3c","#2ecc71","#f39c12","#9b59b6","#1abc9c"];
const getAvatarColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];
const getInitials    = (name) => name?.slice(0, 2).toUpperCase() || "??";
const formatTime     = (d)    => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatCountdown = (ms) => {
  if (ms <= 0) return "Resetting...";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [room, setRoom]               = useState("");
  const [messages, setMessages]       = useState([]);
  const [text, setText]               = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser]   = useState("");
  const [activeRooms, setActiveRooms] = useState([]);
  const [replyTo, setReplyTo]         = useState(null);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch]   = useState(false);
  const [hoveredMsg, setHoveredMsg]   = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [roomError, setRoomError]     = useState("");
  const [nextWipe, setNextWipe]       = useState(null);
  const [countdown, setCountdown]     = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName]         = useState("");
  const [newRoomPass, setNewRoomPass]         = useState("");
  const [showJoinModal, setShowJoinModal]     = useState(false);
  const [joiningRoom, setJoiningRoom]         = useState("");
  const [joinPassword, setJoinPassword]       = useState("");
  const [sidebarOpen, setSidebarOpen]         = useState(false); // mobile sidebar toggle

  const bottomRef   = useRef(null);
  const typingTimer = useRef(null);
  const inputRef    = useRef(null);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!nextWipe) return;
    const tick = setInterval(() => setCountdown(formatCountdown(nextWipe - Date.now())), 1000);
    return () => clearInterval(tick);
  }, [nextWipe]);

  useEffect(() => {
    socket.connect();
    socket.on("active_rooms",     (rooms)   => setActiveRooms(rooms));
    socket.on("message_history",  (history) => setMessages(history));
    socket.on("receive_message",  (msg)     => setMessages((prev) => [...prev, msg]));
    socket.on("online_users",     (users)   => setOnlineUsers(users));
    socket.on("user_typing",      (u)       => setTypingUser(u));
    socket.on("user_stop_typing", ()        => setTypingUser(""));
    socket.on("message_deleted",  (msgId)   => setMessages((prev) => prev.filter((m) => m._id !== msgId)));
    socket.on("reaction_updated", ({ msgId, reactions }) =>
      setMessages((prev) => prev.map((m) => m._id === msgId ? { ...m, reactions } : m))
    );
    socket.on("room_joined",  ({ room: r }) => {
      setRoom(r); setRoomError(""); setShowJoinModal(false); setJoinPassword("");
      if (isMobile) setSidebarOpen(false); // close sidebar on mobile after joining
    });
    socket.on("room_created", ({ room: r, password: p }) => {
      setShowCreateModal(false); setNewRoomName(""); setNewRoomPass("");
      socket.emit("join_room", { room: r, password: p, username: user.username });
    });
    socket.on("room_error",    ({ message }) => setRoomError(message));
    socket.on("wipe_timer",    ({ nextWipe: t }) => { setNextWipe(t); setCountdown(formatCountdown(t - Date.now())); });
    socket.on("general_wiped", () => { if (room === "general") setMessages([]); });

    return () => {
      ["active_rooms","message_history","receive_message","online_users",
       "user_typing","user_stop_typing","message_deleted","reaction_updated",
       "room_joined","room_created","room_error","wipe_timer","general_wiped"
      ].forEach((e) => socket.off(e));
      socket.disconnect();
    };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const handler = () => { setShowEmoji(false); setShowReactions(null); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleJoinRoom = (roomName, isLocked) => {
    setRoomError("");
    if (isLocked) { setJoiningRoom(roomName); setShowJoinModal(true); }
    else socket.emit("join_room", { room: roomName, password: "", username: user.username });
  };
  const handleJoinWithPassword = () => socket.emit("join_room", { room: joiningRoom, password: joinPassword, username: user.username });
  const handleCreateRoom = () => { if (!newRoomName.trim()) return; socket.emit("create_room", { room: newRoomName.trim().toLowerCase(), password: newRoomPass, username: user.username }); };
  const sendMessage = () => {
    if (!text.trim() || !room) return;
    socket.emit("send_message", { room, text, senderId: user._id, senderName: user.username, replyTo: replyTo ? { _id: replyTo._id, senderName: replyTo.senderName, text: replyTo.text } : null });
    setText(""); setReplyTo(null); setShowEmoji(false);
    socket.emit("stop_typing", { room });
  };
  const handleTyping = (e) => {
    setText(e.target.value);
    socket.emit("typing", { room, username: user.username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("stop_typing", { room }), 2000);
  };
  const deleteMessage = (msgId) => socket.emit("delete_message", { msgId, room, username: user.username });
  const addReaction   = (msgId, emoji) => { socket.emit("add_reaction", { msgId, room, emoji, username: user.username }); setShowReactions(null); };
  const handleLogout  = () => { logout(); navigate("/login"); };

  const filteredMessages = searchQuery
    ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const modalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" };
  const modalBox     = { background: "#2f2f2f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "360px" };
  const modalInput   = { width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", outline: "none", boxSizing: "border-box", marginTop: "6px" };

  // Sidebar content (shared between desktop and mobile)
  const SidebarContent = () => (
    <>
      {/* Header */}
      <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2f2f2f", background: "linear-gradient(135deg, #2AABEE, #229ED9)", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontWeight: "700", fontSize: "18px" }}>💬 ChatApp</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "8px", padding: "4px 8px", fontSize: "16px", cursor: "pointer" }}>✕</button>
          )}
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "8px", padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      {/* User info */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #2f2f2f", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: getAvatarColor(user.username), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "#fff", flexShrink: 0 }}>{getInitials(user.username)}</div>
        <div>
          <p style={{ color: "#fff", fontSize: "14px", fontWeight: "600", margin: 0 }}>{user.username}</p>
          <p style={{ color: "#2AABEE", fontSize: "11px", margin: 0 }}>Online</p>
        </div>
      </div>

      {/* Pinned general */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #2f2f2f", flexShrink: 0 }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pinned</p>
        <div onClick={() => handleJoinRoom("general", false)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", cursor: "pointer", background: room === "general" ? "linear-gradient(135deg, #2AABEE22, #229ED922)" : "rgba(255,255,255,0.05)", border: room === "general" ? "1px solid #2AABEE44" : "1px solid transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🌐</span>
            <div>
              <p style={{ color: "#fff", fontSize: "13px", fontWeight: "600", margin: 0 }}>general</p>
              {countdown && <p style={{ color: "#f39c12", fontSize: "10px", margin: 0 }}>🕐 resets in {countdown}</p>}
            </div>
          </div>
          <span style={{ background: "rgba(243,156,18,0.2)", color: "#f39c12", fontSize: "10px", padding: "2px 6px", borderRadius: "8px", border: "1px solid rgba(243,156,18,0.3)" }}>7d</span>
        </div>
      </div>

      {/* Create room */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #2f2f2f", flexShrink: 0 }}>
        <button onClick={() => { setRoomError(""); setShowCreateModal(true); }}
          style={{ width: "100%", padding: "10px", borderRadius: "10px", background: "linear-gradient(135deg, #2AABEE, #229ED9)", border: "none", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
          + Create room
        </button>
      </div>

      {/* Active rooms + online users */}
      <div style={{ padding: "12px 16px", flex: 1, overflowY: "auto" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active rooms — {activeRooms.filter(r => r.room !== "general").length}</p>
        {activeRooms.filter(r => r.room !== "general").length === 0 && (
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "12px" }}>No active rooms. Create one!</p>
        )}
        {activeRooms.filter(r => r.room !== "general").map((r) => (
          <div key={r.room} onClick={() => handleJoinRoom(r.room, r.hasPassword)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "10px", marginBottom: "6px", cursor: "pointer", background: room === r.room ? "linear-gradient(135deg, #2AABEE22, #229ED922)" : "rgba(255,255,255,0.05)", border: room === r.room ? "1px solid #2AABEE44" : "1px solid transparent" }}
            onMouseEnter={(e) => { if (room !== r.room) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={(e) => { if (room !== r.room) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: r.hasPassword ? "#f39c12" : "#2AABEE", fontSize: "14px" }}>{r.hasPassword ? "🔒" : "#"}</span>
              <span style={{ color: "#fff", fontSize: "13px", fontWeight: room === r.room ? "600" : "400" }}>{r.room}</span>
            </div>
            <span style={{ background: "rgba(42,171,238,0.2)", color: "#2AABEE", fontSize: "11px", padding: "2px 7px", borderRadius: "10px" }}>{r.count}</span>
          </div>
        ))}

        {room && onlineUsers.length > 0 && (
          <>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", margin: "16px 0 10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Online — {onlineUsers.length}</p>
            {onlineUsers.map((u) => (
              <div key={u} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: getAvatarColor(u), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", color: "#fff", position: "relative", flexShrink: 0 }}>
                  {getInitials(u)}
                  <span style={{ position: "absolute", bottom: 0, right: 0, width: "7px", height: "7px", borderRadius: "50%", background: "#2ecc71", border: "1.5px solid #212121" }}/>
                </div>
                <span style={{ color: "#fff", fontSize: "13px" }}>{u}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );

  return (
    <div style={{ height: "100vh", display: "flex", fontFamily: "sans-serif", background: "#212121", overflow: "hidden" }}>

      {/* ── MODALS ──────────────────────────────────────────── */}
      {showCreateModal && (
        <div style={modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "700", margin: "0 0 20px" }}>Create a room</h2>
            {roomError && <p style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "12px" }}>{roomError}</p>}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Room name</label>
              <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="e.g. gaming" style={modalInput} autoFocus />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Password <span style={{ color: "rgba(255,255,255,0.3)" }}>(leave empty for public)</span></label>
              <input type="password" value={newRoomPass} onChange={(e) => setNewRoomPass(e.target.value)} placeholder="optional" style={modalInput} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
              <button onClick={handleCreateRoom} style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "linear-gradient(135deg, #2AABEE, #229ED9)", border: "none", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div style={modalOverlay} onClick={() => setShowJoinModal(false)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: "#fff", fontSize: "18px", fontWeight: "700", margin: "0 0 8px" }}>🔒 Private room</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", margin: "0 0 20px" }}>Enter password to join <span style={{ color: "#2AABEE" }}>#{joiningRoom}</span></p>
            {roomError && <p style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "12px" }}>{roomError}</p>}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Password</label>
              <input type="password" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleJoinWithPassword()} placeholder="Enter room password" style={modalInput} autoFocus />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setShowJoinModal(false); setRoomError(""); }} style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
              <button onClick={handleJoinWithPassword} style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "linear-gradient(135deg, #2AABEE, #229ED9)", border: "none", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>Join</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE SIDEBAR OVERLAY ───────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ width: "280px", background: "#212121", borderRight: "1px solid #2f2f2f", display: "flex", flexDirection: "column", height: "100%" }}>
            <SidebarContent />
          </div>
          {/* Tap outside to close */}
          <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
      {!isMobile && (
        <div style={{ width: "260px", background: "#212121", borderRight: "1px solid #2f2f2f", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <SidebarContent />
        </div>
      )}

      {/* ── CHAT AREA ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1a1a2e", minWidth: 0 }}>

        {/* Welcome screen */}
        {!room && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", padding: "20px", textAlign: "center" }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "8px", padding: "8px 12px", fontSize: "18px", cursor: "pointer" }}>☰</button>
            )}
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>💬</div>
            <p style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 8px", color: "rgba(255,255,255,0.5)" }}>Welcome, {user.username}!</p>
            <p style={{ fontSize: "14px", marginBottom: "24px" }}>Join general chat or create your own room</p>
            <button onClick={() => handleJoinRoom("general", false)}
              style={{ padding: "12px 28px", borderRadius: "12px", background: "linear-gradient(135deg, #2AABEE, #229ED9)", border: "none", color: "#fff", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}>
              Join general chat 🌐
            </button>
          </div>
        )}

        {room && (
          <>
            {/* Chat header */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #2f2f2f", background: "#212121", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Hamburger on mobile */}
                {isMobile && (
                  <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", padding: "4px" }}>☰</button>
                )}
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #2AABEE, #229ED9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
                  {room === "general" ? "🌐" : "💬"}
                </div>
                <div>
                  <p style={{ color: "#fff", fontWeight: "700", fontSize: "15px", margin: 0 }}># {room}</p>
                  <p style={{ color: room === "general" ? "#f39c12" : "#2AABEE", fontSize: "11px", margin: 0 }}>
                    {room === "general" ? `🕐 resets in ${countdown}` : `${onlineUsers.length} online`}
                  </p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setShowSearch(!showSearch); setSearchQuery(""); }}
                style={{ background: showSearch ? "rgba(42,171,238,0.2)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", cursor: "pointer", flexShrink: 0 }}>
                🔍
              </button>
            </div>

            {/* General wipe banner */}
            {room === "general" && (
              <div style={{ padding: "8px 16px", background: "rgba(243,156,18,0.08)", borderBottom: "1px solid rgba(243,156,18,0.15)", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <span style={{ fontSize: "14px", flexShrink: 0 }}>⚠️</span>
                <p style={{ color: "#f39c12", fontSize: "12px", margin: 0 }}>
                  General chat resets every 7 days. Next reset in <strong>{countdown}</strong>
                </p>
              </div>
            )}

            {/* Search bar */}
            {showSearch && (
              <div style={{ padding: "10px 16px", background: "#212121", borderBottom: "1px solid #2f2f2f", flexShrink: 0 }}>
                <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..."
                  style={{ width: "100%", padding: "10px 16px", borderRadius: "12px", fontSize: "14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", outline: "none", boxSizing: "border-box" }} />
                {searchQuery && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "6px" }}>{filteredMessages.length} result(s)</p>}
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {filteredMessages.length === 0 && !searchQuery && (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.2)", marginTop: "60px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>💬</div>
                  <p style={{ fontSize: "14px" }}>No messages yet. Say hello!</p>
                </div>
              )}

              {filteredMessages.map((msg) => {
                const isMe = msg.senderName === user.username;
                return (
                  <div key={msg._id}
                    style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: "6px", position: "relative" }}
                    onMouseEnter={() => !isMobile && setHoveredMsg(msg._id)}
                    onMouseLeave={() => !isMobile && setHoveredMsg(null)}
                    onTouchStart={() => isMobile && setHoveredMsg(hoveredMsg === msg._id ? null : msg._id)}
                  >
                    {!isMe && (
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: getAvatarColor(msg.senderName), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700", color: "#fff", marginRight: "8px", alignSelf: "flex-end", flexShrink: 0 }}>
                        {getInitials(msg.senderName)}
                      </div>
                    )}
                    <div style={{ maxWidth: isMobile ? "80%" : "65%", position: "relative" }}>
                      {!isMe && <p style={{ color: "#2AABEE", fontSize: "12px", fontWeight: "600", margin: "0 0 3px 4px" }}>{msg.senderName}</p>}
                      {msg.replyTo && (
                        <div style={{ background: "rgba(42,171,238,0.15)", borderLeft: "3px solid #2AABEE", borderRadius: "8px 8px 0 0", padding: "6px 10px", marginBottom: "-4px" }}>
                          <p style={{ color: "#2AABEE", fontSize: "11px", fontWeight: "600", margin: "0 0 2px" }}>{msg.replyTo.senderName}</p>
                          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg.replyTo.text}</p>
                        </div>
                      )}
                      <div style={{ padding: "10px 14px", borderRadius: msg.replyTo ? (isMe ? "0 0 4px 16px" : "0 0 16px 4px") : (isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px"), background: isMe ? "linear-gradient(135deg, #2AABEE, #229ED9)" : "rgba(255,255,255,0.08)", color: "#fff", fontSize: "14px", lineHeight: "1.5", wordBreak: "break-word" }}>
                        {msg.text}
                      </div>
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                          {Object.entries(msg.reactions).map(([emoji, users]) =>
                            users.length > 0 && (
                              <span key={emoji} onClick={() => addReaction(msg._id, emoji)}
                                style={{ background: users.includes(user.username) ? "rgba(42,171,238,0.3)" : "rgba(255,255,255,0.1)", border: users.includes(user.username) ? "1px solid #2AABEE" : "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "2px 8px", fontSize: "12px", cursor: "pointer", color: "#fff" }}>
                                {emoji} {users.length}
                              </span>
                            )
                          )}
                        </div>
                      )}
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", margin: "3px 4px 0", textAlign: isMe ? "right" : "left" }}>{formatTime(msg.createdAt)}</p>
                    </div>

                    {hoveredMsg === msg._id && (
                      <div style={{ position: "absolute", top: "-10px", [isMe ? "left" : "right"]: "0", display: "flex", gap: "4px", zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ position: "relative" }}>
                          <button onClick={() => setShowReactions(showReactions === msg._id ? null : msg._id)}
                            style={{ background: "rgba(42,42,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>😊</button>
                          {showReactions === msg._id && (
                            <div style={{ position: "absolute", top: "30px", [isMe ? "right" : "left"]: "0", background: "#2f2f2f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "8px", display: "flex", gap: "6px", zIndex: 20 }}>
                              {REACTIONS.map((emoji) => (
                                <span key={emoji} onClick={() => addReaction(msg._id, emoji)}
                                  style={{ fontSize: "20px", cursor: "pointer", padding: "2px", borderRadius: "6px" }}
                                  onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
                                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                                >{emoji}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => { setReplyTo(msg); inputRef.current?.focus(); setHoveredMsg(null); }}
                          style={{ background: "rgba(42,42,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>↩</button>
                        {isMe && (
                          <button onClick={() => { deleteMessage(msg._id); setHoveredMsg(null); }}
                            style={{ background: "rgba(231,76,60,0.2)", border: "1px solid rgba(231,76,60,0.3)", color: "#ff6b6b", borderRadius: "8px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}>🗑</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {typingUser && <p style={{ color: "#2AABEE", fontSize: "12px", fontStyle: "italic", padding: "0 4px" }}>{typingUser} is typing...</p>}
              <div ref={bottomRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div style={{ padding: "10px 16px", background: "#212121", borderTop: "1px solid #2f2f2f", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div style={{ width: "3px", height: "36px", background: "#2AABEE", borderRadius: "2px", flexShrink: 0 }}/>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: "#2AABEE", fontSize: "12px", fontWeight: "600", margin: "0 0 2px" }}>Replying to {replyTo.senderName}</p>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{replyTo.text}</p>
                  </div>
                </div>
                <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "18px", cursor: "pointer", flexShrink: 0 }}>×</button>
              </div>
            )}

            {/* Emoji picker */}
            {showEmoji && (
              <div onClick={(e) => e.stopPropagation()} style={{ padding: "12px 16px", background: "#212121", borderTop: "1px solid #2f2f2f", display: "flex", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
                {EMOJIS.map((emoji) => (
                  <span key={emoji} onClick={() => { setText((prev) => prev + emoji); inputRef.current?.focus(); }}
                    style={{ fontSize: "22px", cursor: "pointer", padding: "4px", borderRadius: "8px" }}
                    onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
                    onMouseLeave={(e) => e.target.style.background = "transparent"}
                  >{emoji}</span>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: "12px 16px", background: "#212121", borderTop: "1px solid #2f2f2f", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button onClick={(e) => { e.stopPropagation(); setShowEmoji(!showEmoji); }}
                  style={{ background: showEmoji ? "rgba(42,171,238,0.2)" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "12px", padding: "10px", fontSize: "18px", cursor: "pointer", flexShrink: 0 }}>😊</button>
                <input ref={inputRef} value={text} onChange={handleTyping} onKeyDown={(e) => e.key === "Enter" && !isMobile && sendMessage()}
                  placeholder={`Message #${room}`}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: "24px", fontSize: "14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", minWidth: 0 }} />
                <button onClick={sendMessage} disabled={!text.trim()}
                  style={{ width: "44px", height: "44px", borderRadius: "50%", background: text.trim() ? "linear-gradient(135deg, #2AABEE, #229ED9)" : "rgba(255,255,255,0.1)", border: "none", cursor: text.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>➤</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}