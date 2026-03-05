import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar_url?: string; // Ensure this is here
  is_private?: boolean;
  gender?: string;
  mobile?: string;
  karma?: number;
  show_last_seen?: boolean; // <-- ADD THIS LINE
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  needsOnboarding: boolean;
  login: (userData: User) => void;
  logout: () => void;
  completeOnboarding: (details: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      needsOnboarding: false,

      login: (userData) => set({ 
        isAuthenticated: true, 
        user: userData,
        // If the user doesn't have a username set yet, they need onboarding
        needsOnboarding: !userData.username 
      }),

      logout: () => {
        // Wipe the actual JWT tokens your backend uses
        localStorage.removeItem('aarpaar_access_token');
        localStorage.removeItem('aarpaar_refresh_token');
        localStorage.removeItem('auth-storage'); // Wipe zustand cache
        
        set({ isAuthenticated: false, user: null, needsOnboarding: false });
      },

      completeOnboarding: (details) => set((state) => ({
        needsOnboarding: false,
        user: state.user ? { ...state.user, ...details } : null
      }))
    }),
    {
      name: 'auth-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);