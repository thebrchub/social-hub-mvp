import { create } from 'zustand';

export type NotificationType = 'FRIEND_REQ' | 'MESSAGE' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: any; // For extra data like requester ID
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, 'id' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  // MOCK DATA: Let's start with 2 fake notifications so you can see the UI
  notifications: [
    {
      id: '1',
      type: 'FRIEND_REQ',
      title: 'New Friend Request',
      message: 'Rahul Dev wants to be your friend.',
      time: '2m ago',
      read: false,
    },
    {
      id: '2',
      type: 'SYSTEM',
      title: 'Welcome to SocialHub!',
      message: 'Start matching with people globally now.',
      time: '1h ago',
      read: false,
    }
  ],
  unreadCount: 2,

  addNotification: (n) => set((state) => ({
    notifications: [{ ...n, id: Date.now().toString(), read: false }, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),

  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0
  })),

  markAllRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0
  })),

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
    // Recalculate unread count just in case
    unreadCount: state.notifications.find(n => n.id === id && !n.read) 
      ? state.unreadCount - 1 
      : state.unreadCount
  }))
}));