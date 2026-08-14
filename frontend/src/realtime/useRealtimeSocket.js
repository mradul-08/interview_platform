import { useEffect, useRef, useState } from "react";
import { connectRealtimeSocket } from "./socket";

export default function useRealtimeSocket(eventHandlers = {}) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(eventHandlers);
  const eventNames = Object.keys(eventHandlers).sort().join("|");

  useEffect(() => {
    handlersRef.current = eventHandlers;
  }, [eventHandlers]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setConnected(false);
      return undefined;
    }
    const socket = connectRealtimeSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);
    const onAuthRefreshed = () => {
      socket.auth = { token: localStorage.getItem("token") || undefined };
      if (socket.connected) socket.disconnect();
      if (localStorage.getItem("token")) socket.connect();
    };
    const listeners = eventNames ? eventNames.split("|").map((eventName) => {
      const listener = (payload) => handlersRef.current[eventName]?.(payload);
      socket.on(eventName, listener);
      return [eventName, listener];
    }) : [];
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    window.addEventListener("auth:refreshed", onAuthRefreshed);
    setConnected(socket.connected);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      window.removeEventListener("auth:refreshed", onAuthRefreshed);
      listeners.forEach(([eventName, listener]) => socket.off(eventName, listener));
    };
  }, [eventNames]);
  return { connected };
}
