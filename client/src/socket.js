import { io } from "socket.io-client";

const socket = io("https://chat-app-production-5010.up.railway.app", {
  autoConnect: false,
});

export default socket;