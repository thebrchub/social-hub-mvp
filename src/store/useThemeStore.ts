import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  // 1. Check if they have a saved preference
  const storedTheme = localStorage.getItem('zquab_theme') as 'light' | 'dark' | null;
  
  // 2. FORCE THE DEFAULT TO 'light' if they are a new user!
  const initialTheme = storedTheme || 'light'; 

  // Apply to HTML element immediately on load
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    theme: initialTheme,
    
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('zquab_theme', newTheme);
      
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      return { theme: newTheme };
    }),

    setTheme: (theme) => set(() => {
      localStorage.setItem('zquab_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme };
    }),
  };
});