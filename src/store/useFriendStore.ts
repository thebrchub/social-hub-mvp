import { create } from 'zustand';
import { api } from '../services/api';

interface FriendStore {
  friends: any[];
  isLoading: boolean;
  hasFetched: boolean;
  fetchFriends: (force?: boolean) => Promise<void>;
}

export const useFriendStore = create<FriendStore>((set, get) => ({
  friends: [],
  isLoading: false,
  hasFetched: false,
  fetchFriends: async (force = false) => {
    // If we already fetched the friends and aren't forcing a refresh, skip the API call!
    if (get().hasFetched && !force) return; 
    
    set({ isLoading: true });
    try {
      const res = await api.get('/friends');
      set({ 
        friends: Array.isArray(res) ? res : res?.data || [], 
        hasFetched: true 
      });
    } catch (error) {
      console.error("Failed to fetch friends:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));