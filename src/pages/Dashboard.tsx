import { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import {
  MessageSquare, Users, FlaskConical,
  Video, Sparkles, ArrowUp, TrendingUp, Edit3
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import PostCard, { type Post } from '../components/feed/PostCard';
import { useFeedStore } from '../store/useFeedStore';
import ComposeBox from '../components/feed/ComposeBox';
import Modal from '../components/Modal';

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ friends: 0, messages: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const feedStore = useFeedStore();
  const [feedType, setFeedType] = useState<'global' | 'network'>('global');

  const posts = feedType === 'global' ? feedStore.globalPosts : feedStore.networkPosts;
  const hasMore = feedType === 'global' ? feedStore.globalHasMore : feedStore.networkHasMore;
  const currentCursor = feedType === 'global' ? feedStore.globalCursor : feedStore.networkCursor;

  const [feedLoading, setFeedLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newSparksAvatars, setNewSparksAvatars] = useState<string[]>([]);
  
  // Modal & FAB States
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [showFab, setShowFab] = useState(false);
  
  const isLoadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showFabRef = useRef(false);

  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  
  const hour = new Date().getHours();
  const timeEmoji = hour < 12 ? '🌤️' : hour < 18 ? '☀️' : '🌙';

  useEffect(() => {
    (async () => {
      try {
        const [roomsRes, friendsRes] = await Promise.all([
          api.get('/rooms').catch(() => ({ data: [] })),
          api.get('/friends').catch(() => ({ data: [] })),
        ]);
        setStats({
          friends: (Array.isArray(friendsRes) ? friendsRes : friendsRes?.data || []).length,
          messages: (Array.isArray(roomsRes) ? roomsRes : roomsRes?.data || []).length,
        });
      } catch { } finally { setStatsLoading(false); }
    })();
  }, []);

  useEffect(() => { 
    setNewSparksAvatars([]); 
    fetchFeed(true, false); 
  }, [feedType]);

  const fetchFeed = async (isInitial = false, forceRefresh = false) => {
    if (isInitial && !forceRefresh && posts.length > 0) return; 
    if (isInitial) setFeedLoading(true); else setIsLoadingMore(true);
    
    try {
      const cursorParam = currentCursor && !isInitial && !forceRefresh 
        ? `&cursor=${encodeURIComponent(currentCursor)}` 
        : '';
        
      const url = `/arena/feed/${feedType}?limit=20${cursorParam}`;
      const res = await api.get(url);
      
      const fetched: Post[] = Array.isArray(res) ? res : (res.data || []);
      
      if (fetched.length > 0) {
        const newPosts = (isInitial || forceRefresh) ? fetched : [...posts, ...fetched];
        const newCursor = fetched[fetched.length - 1].createdAt;
        const newHasMore = fetched.length >= 20;
        feedStore.setFeedData(feedType, newPosts, newCursor, newHasMore);
      } else {
        if (isInitial || forceRefresh) feedStore.setFeedData(feedType, [], null, false);
        else feedStore.setFeedData(feedType, posts, currentCursor, false);
      }
    } catch (err) { 
      console.error("Feed fetch error:", err);
    } finally { 
      setFeedLoading(false); 
      setIsLoadingMore(false); 
    }
  };

  useEffect(() => {
    if (posts.length === 0) return;
    const topId = posts[0].id;
    const poll = setInterval(async () => {
      try {
        const res = await api.get(`/arena/feed/${feedType}?limit=5`);
        const latest: Post[] = Array.isArray(res) ? res : (res.data || []);
        if (latest.length > 0 && latest[0].id > topId) {
          const newer = latest.filter(p => p.id > topId);
          const avatars = Array.from(new Set(newer.map((p: any) =>
            p.avatarUrl || `https://ui-avatars.com/api/?name=${p.displayName || 'U'}&background=random`
          ))).slice(0, 3) as string[];
          setNewSparksAvatars(avatars);
        }
      } catch { }
    }, 20000);
    return () => clearInterval(poll);
  }, [posts, feedType]);

  // Optimized Scroll Listener
  useEffect(() => {
    const el = scrollRef.current;
    let scrollTimeout: any;

    const onScroll = () => {
      if (!el) return;
      
      // Efficient FAB Toggle (~150px gets past the inline compose block)
      const shouldShowFab = el.scrollTop > 150;
      if (showFabRef.current !== shouldShowFab) {
         showFabRef.current = shouldShowFab;
         setShowFab(shouldShowFab);
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        feedStore.setScrollPosition(feedType, el.scrollTop);
      }, 100);

      // Pagination
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 400 && !isLoadingMoreRef.current && hasMoreRef.current) {
         fetchFeed(false, false);
      }
    };

    el?.addEventListener('scroll', onScroll, { passive: true });
    return () => el?.removeEventListener('scroll', onScroll);
  }, [feedType, posts]);

  const handleLoadNewSparks = () => {
    setNewSparksAvatars([]);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    feedStore.setScrollPosition(feedType, 0); 
    fetchFeed(true, true); 
  };

  const handlePostDeleted = (id: number) => feedStore.removePost(id);

  return (
    <DashboardLayout>

      {/* ── FLOATING ACTION BUTTON (FAB) ──
          Positioned using an inset-x-0 wrapper to keep it perfectly horizontally 
          aligned with the 720px feed column, no matter the screen size.
      */}
      <div className="fixed inset-x-0 bottom-6 sm:bottom-10 pointer-events-none z-40 flex justify-center">
        <div className="w-full max-w-[720px] relative px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => setIsPostModalOpen(true)}
            className={`absolute right-4 sm:right-8 bottom-0 pointer-events-auto w-14 h-14 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all duration-300 ${showFab ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-90'}`}
            title="Create Post"
          >
            <Edit3 size={24} className="ml-0.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 h-full w-full overflow-y-auto scrollbar-hide bg-white dark:bg-[#0E0E0E]">

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0E0E0E]/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/[0.06]">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-[auto_1fr_auto] items-center h-14 gap-2 sm:gap-3">

              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=6366f1&color=fff`} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-[#0E0E0E] ring-offset-1 ring-offset-indigo-400" />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[9px] leading-none select-none">{timeEmoji}</span>
                </div>
                <span className="hidden sm:block text-[14px] font-bold text-gray-900 dark:text-white truncate max-w-[100px]">
                  {user?.name?.split(' ')[0] || 'Macha'}
                </span>
              </div>

              <div className="flex items-center justify-center">
                <div className="flex items-center bg-gray-100 dark:bg-white/[0.06] rounded-xl p-[3px] gap-0.5">
                  {(['global', 'network'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => { setFeedType(type); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-[9px] text-[12px] sm:text-[13px] font-semibold transition-all duration-200 whitespace-nowrap ${
                        feedType === type ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {type === 'global' ? <><TrendingUp size={12} strokeWidth={2.5} /><span>Global</span></> : <><Users size={12} strokeWidth={2.5} /><span>Network</span></>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
                <button onClick={() => navigate('/matches')} title="Stranger Chat" className="group w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-500/10 dark:hover:border-blue-500/20 transition-all">
                  <MessageSquare size={14} strokeWidth={2.5} className="text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 transition-colors" />
                </button>
                <button onClick={() => navigate('/vid-matches')} title="Video Match" className="group relative w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-500/10 dark:hover:border-purple-500/20 transition-all">
                  <span className="absolute -top-1.5 -right-1 bg-pink-500 text-white text-[6px] font-black px-1 py-px rounded-full rotate-6 leading-tight tracking-wide">BETA</span>
                  <Video size={14} strokeWidth={2.5} className="text-gray-500 group-hover:text-purple-600 dark:text-gray-400 dark:group-hover:text-purple-400 transition-colors" />
                </button>
                <button onClick={() => navigate('/labs')} title="zQuab Labs" className="group w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-purple-200 dark:border-purple-500/20 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all">
                  <FlaskConical size={14} strokeWidth={2.5} className="text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" />
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* ══ FEED COLUMN ═════════════════════════════════════════════════════ */}
        <div className="w-full relative pb-20">

          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-2 border-b border-gray-100 dark:border-white/[0.06] text-[11px] sm:text-[12px] text-gray-400 dark:text-gray-600 overflow-x-auto scrollbar-hide">
            <button onClick={() => navigate('/friends')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0">
              <Users size={11} strokeWidth={2.5} />
              <span>{statsLoading ? '—' : stats.friends} friends</span>
            </button>
            <span className="shrink-0">·</span>
            <button onClick={() => navigate('/chats')} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors shrink-0">
              <MessageSquare size={11} strokeWidth={2.5} />
              <span>{statsLoading ? '—' : stats.messages} active chats</span>
            </button>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative h-1.5 w-1.5 rounded-full bg-green-500"></span>
              </span>
              <span className="font-medium text-green-600 dark:text-green-500">1,240+ online</span>
            </div>
          </div>

          <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Floating "New Sparks" Pill ── */}
          {newSparksAvatars.length > 0 && (
            <div className="sticky top-20 z-20 flex justify-center w-full pointer-events-none">
              <div className="absolute top-2">
                <button
                  onClick={handleLoadNewSparks}
                  className="pointer-events-auto flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full text-white text-[13px] font-bold shadow-xl shadow-indigo-500/30 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 animate-in slide-in-from-top-4 fade-in duration-300 border border-white/20"
                >
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <ArrowUp size={11} strokeWidth={3} className="text-white" />
                  </div>
                  <div className="flex -space-x-2 mx-0.5">
                    {newSparksAvatars.map((url, i) => <img key={i} src={url} className="w-5 h-5 rounded-full border-2 border-indigo-500 object-cover bg-white shrink-0" alt="" />)}
                  </div>
                  <span>New sparks</span>
                </button>
              </div>
            </div>
          )}

          {/* ── INLINE COMPOSE BOX ── */}
          <ComposeBox onSuccess={() => fetchFeed(true, true)} variant="inline" />

          <div className="flex items-center gap-3 py-2.5">
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.05]" />
            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest shrink-0">
              {feedType === 'global' ? 'Latest sparks' : 'From your network'}
            </span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.05]" />
          </div>

          {/* ── Posts ── */}
          {feedLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-7 h-7 rounded-full border-2 border-gray-200 dark:border-white/10 border-t-gray-900 dark:border-t-white animate-spin" />
              <p className="text-[13px] text-gray-400 dark:text-gray-600 font-medium">Loading the arena…</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 px-6 text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] flex items-center justify-center">
                <Sparkles size={22} className="text-gray-300 dark:text-gray-700" />
              </div>
              <div>
                <p className="text-[14px] sm:text-[15px] font-semibold text-gray-700 dark:text-gray-300 mb-1">The Arena is quiet right now</p>
                <p className="text-[12px] sm:text-[13px] text-gray-400 dark:text-gray-600">
                  {feedType === 'network' ? 'Add friends to see their sparks here.' : 'Be the first to light a spark today.'}
                </p>
              </div>
              {feedType === 'network' && (
                <button onClick={() => navigate('/friends')} className="text-[13px] font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 underline underline-offset-2 transition-colors">
                  Find people to follow →
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
              {posts.map(post => (
                <PostCard key={post.id} post={post} onDeleted={() => handlePostDeleted(post.id)} />
              ))}
              </div>
              {isLoadingMore && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-white/10 border-t-gray-500 dark:border-t-gray-400 animate-spin" />
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <div className="flex flex-col items-center py-12 gap-2">
                  <p className="text-[11px] font-semibold text-gray-300 dark:text-gray-700 tracking-widest uppercase">All caught up</p>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      {/* ── MODAL COMPOSE BOX ── */}
      <Modal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} title="Create a Spark">
         <ComposeBox onSuccess={() => { fetchFeed(true, true); setIsPostModalOpen(false); }} variant="modal" />
      </Modal>

    </DashboardLayout>
  );
};

export default Dashboard;