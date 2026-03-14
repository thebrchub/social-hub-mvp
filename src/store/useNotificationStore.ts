import { create } from 'zustand';

export type NotificationType = 'DM_REQ' | 'MESSAGE' | 'SYSTEM' | 'FRIEND_REQ'| 'GROUP_INVITE';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: any;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  // --- NEW COUNTERS FOR SIDEBAR ---
  unreadChatsCount: number;
  pendingFriendsCount: number;
  
  addNotification: (n: Omit<Notification, 'id' | 'read'>) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // --- NEW ACTIONS ---
  setUnreadChatsCount: (count: number) => void;
  setPendingFriendsCount: (count: number) => void;
  incrementPendingFriends: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  unreadChatsCount: 0,
  pendingFriendsCount: 0,

  addNotification: (n) => set((state) => {
    const newId = n.data?.id || Date.now().toString();
    if (state.notifications.some(existing => existing.id === newId)) return state;
    return {
      notifications: [{ ...n, id: newId, read: false }, ...state.notifications],
      unreadCount: state.unreadCount + 1
    };
  }),

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

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  // --- NEW ACTION IMPLEMENTATIONS ---
  setUnreadChatsCount: (count) => set({ unreadChatsCount: count }),
  setPendingFriendsCount: (count) => set({ pendingFriendsCount: count }),
  incrementPendingFriends: () => set((state) => ({ pendingFriendsCount: state.pendingFriendsCount + 1 }))
}));