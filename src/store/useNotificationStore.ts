import { create } from 'zustand';

// FIX: Updated to match our actual real-time logic (DM_REQ instead of FRIEND_REQ)
export type NotificationType = 'DM_REQ' | 'MESSAGE' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: any; // For extra data like raw backend payloads
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, 'id' | 'read'>) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  // Clean slate for production - No more mock data!
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => set((state) => {
    // Generate a transient ID if the backend didn't provide one in the data payload
    const newId = n.data?.id || Date.now().toString();
    
    // Prevent duplicate notifications (useful for WebSocket reconnects)
    if (state.notifications.some(existing => existing.id === newId)) {
        return state;
    }

    return {
      notifications: [{ ...n, id: newId, read: false }, ...state.notifications],
      unreadCount: state.unreadCount + 1
    };
  }),

  // Super useful for bulk loading from an API
  setNotifications: (notifications) => set(() => ({
    notifications,
    unreadCount: notifications.filter(n => !n.read).length
  })),

  markAsRead: (id) => set((state) => {
    const isUnread = state.notifications.find(n => n.id === id && !n.read);
    return {
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: isUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    };
  }),

  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0
  })),

  removeNotification: (id) => set((state) => {
    const isUnread = state.notifications.find(n => n.id === id && !n.read);
    return {
      notifications: state.notifications.filter(n => n.id !== id),
      unreadCount: isUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
    };
  }),

  clearAll: () => set({ notifications: [], unreadCount: 0 })
}));