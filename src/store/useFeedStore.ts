import { create } from 'zustand';
import { type Post } from '../components/feed/PostCard';

interface FeedState {
  globalPosts: Post[];
  networkPosts: Post[];
  globalCursor: string | null;
  networkCursor: string | null;
  globalHasMore: boolean;
  networkHasMore: boolean;
  scrollPositions: { global: number; network: number };
  
  setFeedData: (type: 'global' | 'network', posts: Post[], cursor: string | null, hasMore: boolean) => void;
  setScrollPosition: (type: 'global' | 'network', position: number) => void;
  removePost: (postId: number) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  globalPosts: [],
  networkPosts: [],
  globalCursor: null,
  networkCursor: null,
  globalHasMore: true,
  networkHasMore: true,
  scrollPositions: { global: 0, network: 0 },

  setFeedData: (type, posts, cursor, hasMore) => set((state) => ({
    ...state,
    [`${type}Posts`]: posts,
    [`${type}Cursor`]: cursor,
    [`${type}HasMore`]: hasMore,
  })),

  setScrollPosition: (type, position) => set((state) => ({
    scrollPositions: { ...state.scrollPositions, [type]: position }
  })),

  removePost: (postId) => set((state) => ({
    globalPosts: state.globalPosts.filter(p => p.id !== postId),
    networkPosts: state.networkPosts.filter(p => p.id !== postId),
  })),
}));