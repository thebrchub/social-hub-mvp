import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';

// Define the shape of our context
interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (roomId: string, text: string, tempId?: string) => void;
  sendTypingStart: (roomId: string) => void;
  markRead: (roomId: string) => void;
  markDelivered: (roomId: string) => void;
  lastMessage: any | null; 
  subscribe: (callback: (msg: any) => void) => () => void;
  sendRaw: (payload: any) => void; // <-- ADDED: For WebRTC Signaling
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocket must be used within a WebSocketProvider");
  return context;
};

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  
  const reconnectTimeoutRef = useRef<any>(null);

  const listeners = useRef<Set<Function>>(new Set());
  const subscribe = (callback: Function) => {
    listeners.current.add(callback);
    return () => listeners.current.delete(callback);
  };

  const connect = () => {
    const token = localStorage.getItem('aarpaar_access_token');
    if (!token) return;

    // Use your actual production WebSocket URL
    const wsUrl = `wss://aarpaar-api.brchub.me/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected to Aarpaar Backend!");
      setIsConnected(true);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };

    ws.onmessage = (event) => {
      try {
        let parsed = JSON.parse(event.data);
        if (parsed.type === 'private' && parsed.data) parsed = parsed.data;
        
        console.log("[WS IN]", parsed);
        setLastMessage(parsed); 
        
        listeners.current.forEach(cb => cb(parsed));
        
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.onclose = (event) => {
      console.log(`[WS] Disconnected (code=${event.code})`);
      setIsConnected(false);
      wsRef.current = null;
      
      // Auto-reconnect if we are still supposed to be authenticated
      if (isAuthenticated) {
        console.log("[WS] Attempting reconnect in 3s...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("[WS] Error", error);
      // Let onclose handle the reconnection
    };
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      // Strip event listeners before closing. 
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Connect when authenticated, disconnect when logged out
  useEffect(() => {
    if (isAuthenticated && user?.username) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [isAuthenticated, user?.username]);

  // --- EXPOSED METHODS ---

  const sendMessage = (roomId: string, text: string, tempId?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const payload = {
      type: 'send_message',
      roomId,
      text,
      tempId: tempId || `tmp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };
    console.log("[WS OUT (CHAT)]", payload);
    wsRef.current.send(JSON.stringify(payload));
  };

  // --- NEW: sendRaw function for WebRTC signaling ---
  const sendRaw = (payload: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[WS OUT] Cannot send raw payload, websocket is not open.");
      return;
    }
    const dataString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    console.log("[WS OUT (RAW)]", payload);
    wsRef.current.send(dataString);
  };

  const sendTypingStart = (roomId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'typing_start', roomId }));
  };

  const markRead = (roomId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'mark_read', roomId }));
  };

  const markDelivered = (roomId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'mark_delivered', roomId }));
  };

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      sendMessage,
      sendTypingStart,
      markRead,
      markDelivered,
      lastMessage,
      subscribe,
      sendRaw // <-- EXPOSED HERE
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};