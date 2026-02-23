import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  // Add other user fields here
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  needsOnboarding: boolean;
  login: (userData: User) => void;
  logout: () => void;
  completeOnboarding: (details: any) => void;
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
        // If user doesn't have a gender/dob, send them to onboarding
        needsOnboarding: true 
      }),

      logout: () => {
        localStorage.removeItem('auth-storage'); // Optional: Force clear
        set({ isAuthenticated: false, user: null, needsOnboarding: false });
      },

      completeOnboarding: (details) => set((state) => ({
        needsOnboarding: false,
        user: state.user ? { ...state.user, ...details } : null
      }))
    }),
    {
      name: 'auth-storage', // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // saves to localStorage
    }
  )
);