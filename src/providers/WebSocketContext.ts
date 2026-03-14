import { createContext } from 'react';

export interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (roomId: string, text: string, tempId?: string) => void;
  sendTypingStart: (roomId: string) => void;
  markRead: (roomId: string) => void;
  markDelivered: (roomId: string) => void;
  lastMessage: any | null; 
  subscribe: (callback: (msg: any) => void) => () => void;
  sendRaw: (payload: any) => void; 
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);