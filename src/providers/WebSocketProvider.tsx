import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { WebSocketContext } from './WebSocketContext';

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
    const token = localStorage.getItem('zquab_access_token');
    
    if (!token) {
        setIsConnected(false);
        return;
    }

    // FIX 1: SINGLETON CHECK
    // If we are already connecting or open, DO NOT start a new one!
    // This stops the "Double Connection" race condition after refresh.
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN) {
        console.log("⏳ Connection already in progress, skipping redundant connect.");
        return;
      }
    }

    const wsUrl = `wss://api.zquab.com/ws?token=${encodeURIComponent(token)}`;
    console.log("🚀 Attempting unique connection...");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket Connected!");
      setIsConnected(true);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };

    ws.onmessage = (event) => {
      try {
        const stringPayloads = typeof event.data === 'string' ? event.data.split('\n') : [event.data];
        stringPayloads.forEach(payloadStr => {
           if (!payloadStr.trim()) return; 
           try {
             let parsed = JSON.parse(payloadStr);
             if (parsed.type === 'private' && parsed.data) parsed = parsed.data;
             setLastMessage(parsed); 
             listeners.current.forEach(cb => cb(parsed));
           } catch (parseErr) {}
        });
      } catch (err) {}
    };

    ws.onclose = (e) => {
      console.log("❌ WebSocket Closed:", e.code);
      setIsConnected(false);
      
      // FIX 2: Ref-Safe Cleanup
      // Only clear the ref if the socket that closed is the one we are currently tracking
      if (wsRef.current === ws) {
          wsRef.current = null;
      }

      // Reconnect if not a clean logout
      if (isAuthenticated && e.code !== 1000) {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };
    
    ws.onerror = (err) => {
        console.error("🔥 WebSocket Error Details:", err);
    };
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      // 1000 is a normal closure
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    if (isAuthenticated && user?.username) {
      connect();
    } else {
      disconnect();
    }
    // Standard cleanup on unmount
    return () => {
        // We don't call disconnect() here to prevent Vite HMR from 
        // killing the socket during simple code edits
    };
  }, [isAuthenticated, user?.username]);

  // Keep-alive heartbeat
  useEffect(() => {
      if (!isConnected) return;
      const interval = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
      }, 30000);
      return () => clearInterval(interval);
  }, [isConnected]);

  // WRAPPER METHODS
  const sendMessage = (roomId: string, text: string, tempId?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    // Explicitly using snake_case as per backend requirements
    wsRef.current.send(JSON.stringify({ 
        type: 'send_message', 
        room_id: roomId, 
        text: text, 
        temp_id: tempId || `tmp_${Date.now()}` 
    }));
  };
  
  const sendRaw = (payload: any) => { 
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(typeof payload === 'string' ? payload : JSON.stringify(payload)); 
      }
  };

  // WRAPPER METHODS - Strictly using 'roomId' as per backend specs
  const sendTypingStart = (roomId: string) => { 
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'typing_start', roomId: roomId })); 
    }
  };

  const markRead = (roomId: string) => { 
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'mark_read', roomId: roomId })); 
    }
  };

  const markDelivered = (roomId: string) => { 
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'mark_delivered', roomId: roomId })); 
    }
  };
  
  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, sendTypingStart, markRead, markDelivered, lastMessage, subscribe, sendRaw }}>
      {children}
    </WebSocketContext.Provider>
  );
};