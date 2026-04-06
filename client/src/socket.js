import { io } from "socket.io-client";

// Create ONE socket connection and reuse it everywhere
// If we created a new socket in every component, we'd have multiple connections
const socket = io("http://localhost:5000", {
  autoConnect: false, // don't connect until user is logged in
});

export default socket;