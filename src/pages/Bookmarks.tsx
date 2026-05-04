import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bookmark, Heart, AtSign, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import PostCard, { type Post } from '../components/feed/PostCard';

export default function Bookmarks() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'likes' | 'mentions'>('bookmarks');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const currentScrollY = scrollContainerRef.current.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) setShowHeader(false);
      else if (currentScrollY < lastScrollY.current) setShowHeader(true);
      lastScrollY.current = currentScrollY;
    };
    const container = scrollContainerRef.current;
    if (container) container.addEventListener('scroll', handleScroll, { passive: true });
    return () => { if (container) container.removeEventListener('scroll', handleScroll); };
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true);
      setPosts([]); 
      
      try {
        let endpoint = '';
        if (activeTab === 'bookmarks') endpoint = '/arena/bookmarks';
        else if (activeTab === 'likes') endpoint = '/arena/posts/liked'; 
        else if (activeTab === 'mentions') endpoint = '/users/me/mentions';

        const res = await api.get(`${endpoint}?limit=30`);
        const data = res.data || res;
        
        let fetchedPosts = Array.isArray(data) ? data : (data.posts || data.data || []);
        
        // --- NEW: Force isBookmarked to true for the Bookmarks tab ---
        if (activeTab === 'bookmarks') {
          fetchedPosts = fetchedPosts.map((p: any) => ({ ...p, isBookmarked: true }));
        }
        
        setPosts(fetchedPosts);
      } catch (error) {
        console.error(`Failed to fetch ${activeTab}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [activeTab]);

  return (
    <DashboardLayout>
      {/* Container is now full width and a flex column */}
      <div ref={scrollContainerRef} className="flex-1 h-full w-full flex flex-col bg-gray-50 dark:bg-[#030303] overflow-y-auto scrollbar-hide relative transition-colors duration-300">
        
        {/* ── Sticky Header (FULL WIDTH) ── */}
        <div className={`sticky top-0 z-40 pt-3 pb-0 w-full flex flex-col transition-transform duration-300 ease-in-out bg-gray-50/95 dark:bg-[#030303]/95 backdrop-blur-md border-b border-gray-200 dark:border-[#1a1a1a] ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex items-center justify-between px-4 pb-2">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-white dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#272729] rounded-2xl shadow-sm transition-colors text-gray-900 dark:text-white border border-gray-200 dark:border-[#272729]">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-gray-900 dark:text-white tracking-tight">Your Activity</h1>
            <div className="w-10" /> 
          </div>

          <div className="flex w-full mt-2">
            <button 
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-[14px] font-bold transition-colors relative capitalize ${activeTab === 'bookmarks' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#111]'}`}
            >
              <Bookmark size={16} strokeWidth={2.5} /> Bookmarks
              {activeTab === 'bookmarks' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
            </button>

            <button 
              onClick={() => setActiveTab('likes')}
              className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-[14px] font-bold transition-colors relative capitalize ${activeTab === 'likes' ? 'text-amber-600 dark:text-amber-500' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#111]'}`}
            >
              <Heart size={16} strokeWidth={2.5} /> Likes
              {activeTab === 'likes' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-amber-600 dark:bg-amber-500 rounded-t-full"></div>}
            </button>

            <button 
              onClick={() => setActiveTab('mentions')}
              className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-[14px] font-bold transition-colors relative capitalize ${activeTab === 'mentions' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#111]'}`}
            >
              <AtSign size={16} strokeWidth={2.5} /> Mentions
              {activeTab === 'mentions' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-purple-600 dark:bg-purple-400 rounded-t-full"></div>}
            </button>
          </div>
        </div>

        {/* ── Feed Content (CONSTRAINED TO 600PX) ── */}
        <div className="w-full max-w-[600px] mx-auto flex-1 flex flex-col pb-36 px-3 lg:px-0 pt-4 gap-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-gray-100 dark:bg-[#1a1a1a] rounded-full flex items-center justify-center mb-5 border border-gray-200 dark:border-[#272729]">
                {activeTab === 'bookmarks' && <Bookmark size={32} className="text-gray-400 dark:text-gray-500" />}
                {activeTab === 'likes' && <Heart size={32} className="text-gray-400 dark:text-gray-500" />}
                {activeTab === 'mentions' && <AtSign size={32} className="text-gray-400 dark:text-gray-500" />}
              </div>
              <h3 className="font-display font-black text-xl text-gray-900 dark:text-white mb-2">
                No {activeTab} yet
              </h3>
              <p className="text-gray-500 text-[15px] max-w-sm">
                {activeTab === 'bookmarks' && "Save interesting sparks and ripples to easily find them later."}
                {activeTab === 'likes' && "Sparks you ignite will show up here so you can look back at them."}
                {activeTab === 'mentions' && "When other users mention you using @yourusername, they'll appear here."}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onDeleted={() => setPosts(prev => prev.filter(p => p.id !== post.id))} 
                // --- NEW: Instant removal from Bookmarks page ---
                onBookmarkToggled={(isBookmarked) => {
                  if (activeTab === 'bookmarks' && !isBookmarked) {
                    setPosts(prev => prev.filter(p => p.id !== post.id));
                  }
                }}
              />
            ))
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}