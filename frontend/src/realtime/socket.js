import { io } from "socket.io-client";

const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
let socket;

export function getRealtimeSocket() {
  if (socket) return socket;
  socket = io(socketUrl, { autoConnect: false, withCredentials: true, auth: (callback) => callback({ token: localStorage.getItem("token") || undefined }) });
  return socket;
}

export function connectRealtimeSocket() {
  const client = getRealtimeSocket();
  if (!client.connected) client.connect();
  return client;
}

export function disconnectRealtimeSocket() { if (socket) socket.disconnect(); }
