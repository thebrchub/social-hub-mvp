import { create } from 'zustand';

interface BookmarkState {
  bookmarkedIds: Record<number, boolean>;
  toggleBookmark: (postId: number, status: boolean) => void;
  // This safely loads the backend status ONLY if we haven't touched it locally yet
  syncInitialState: (postId: number, backendStatus: boolean) => void; 
}

export const useBookmarkStore = create<BookmarkState>((set) => ({
  bookmarkedIds: {},
  
  toggleBookmark: (postId, status) => set((state) => ({
    bookmarkedIds: { ...state.bookmarkedIds, [postId]: status }
  })),
  
  syncInitialState: (postId, backendStatus) => set((state) => {
    // If the user already clicked bookmark in this session, ignore the backend's stale cache!
    if (state.bookmarkedIds[postId] !== undefined) return state; 
    return { bookmarkedIds: { ...state.bookmarkedIds, [postId]: backendStatus } };
  })
}));