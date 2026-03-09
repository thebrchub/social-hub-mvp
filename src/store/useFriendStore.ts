import { create } from 'zustand';
import { api } from '../services/api';

interface Friend {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  last_seen_at: string;
  is_online: boolean;
}

interface FriendStore {
  friends: Friend[];
  isLoading: boolean;
  fetchFriends: (force?: boolean) => Promise<void>;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  friends: [],
  isLoading: false,
  fetchFriends: async (force = false) => {
    if (!force && get().friends.length > 0) return;
    set({ isLoading: true });
    try {
      // STRICTLY fetch from friends API, not rooms!
      const res = await api.get('/friends'); 
      set({ friends: Array.isArray(res) ? res : res.data || [], isLoading: false });
    } catch (error) {
      console.error("Failed to fetch friends", error);
      set({ friends: [], isLoading: false });
    }
  }
}));