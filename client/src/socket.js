import { io } from "socket.io-client";

// Create ONE socket connection and reuse it everywhere
const socket = io("https://chat-app-server-d22c.onrender.com", {
  autoConnect: false, // connect only after login
});

export default socket;