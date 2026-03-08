import { create } from 'zustand';
import { api } from '../services/api';
import { useAuthStore } from './useAuthStore';

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
    if (get().hasFetched && !force) return; 
    
    set({ isLoading: true });
    try {
      const res = await api.get('/rooms?limit=50');
      const rooms = Array.isArray(res) ? res : res?.data || [];
      
      const userId = useAuthStore.getState().user?.id;

      // Transform DM rooms into "Friends"
      const mappedFriends = rooms
        .filter((r: any) => r.type === 'DM' || r.type === 'private')
        .map((r: any) => {
           // Find the partner in the members array
           const partner = r.members?.find((m: any) => m.id !== userId);
           return {
             id: partner?.id || r.room_id,
             room_id: r.room_id, // Store roomId so we can delete the connection later
             name: partner?.name || r.name || 'Unknown',
             username: partner?.username || r.friend_username,
             avatar_url: partner?.avatar_url || partner?.avatarUrl || r.avatar_url,
             friends_since: r.created_at || r.last_message_at,
             is_online: partner?.is_online || false
           };
        })
        .filter((f: any) => f.username); // Ensure it's a valid mapped user

      set({ friends: mappedFriends, hasFetched: true });
    } catch (error) {
      console.error("Failed to fetch friends via rooms:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));