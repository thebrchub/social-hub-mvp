import { useEffect, useState, useRef, } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import {
  MessageSquare, Users, Loader2, FlaskConical,
  Video, Sparkles, Globe, UserPlus, Image as ImageIcon,
  Smile, X, ArrowUp, Zap, TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import PostCard, { type Post } from '../components/feed/PostCard';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { useFeedStore } from '../store/useFeedStore';

const gf = new GiphyFetch('QkvvAzTY6DrGBFLYQS0u5E1MBTzw8eMP');

function useOnClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

const compressImage = (file: File): Promise<{ blob: Blob; type: string; w: number; h: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      const MAX = 1920;
      if (w > MAX || h > MAX) { const r = Math.min(MAX / w, MAX / h); w = Math.round(w * r); h = Math.round(h * r); }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      const t = 'image/webp';
      canvas.toBlob(b => {
        if (!b) return resolve({ blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
        resolve(b.size < file.size ? { blob: b, type: t, w, h } : { blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
      }, t, 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('fail'));
    img.src = URL.createObjectURL(file);
  });

// GiphyPicker — responsive: full-screen bottom sheet on mobile, popover on desktop
function GiphyPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const fetchGifs = (offset: number) =>
    search ? gf.search(search, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 });

  return (
    <>
      {/* Mobile: full-screen overlay */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#111] sm:hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
          <span className="text-[14px] font-bold text-gray-900 dark:text-white">Pick a GIF</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-3 pt-3">
          <input
            type="text" placeholder="Search GIFs…"
            className="w-full bg-gray-100 dark:bg-black rounded-xl px-4 py-2.5 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none text-gray-900 dark:text-white"
            onChange={e => setSearch(e.target.value)} value={search} autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <Grid
            key={search}
            width={Math.min(window.innerWidth - 24, 600)}
            columns={3}
            fetchGifs={fetchGifs}
            onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); onClose(); }}
            noResultsMessage={<div className="text-center text-gray-500 mt-6 text-sm">No GIFs found</div>}
          />
        </div>
      </div>

      {/* Desktop: inline popover */}
      <div className="hidden sm:block absolute top-full left-0 mt-2 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/10 z-50 animate-in slide-in-from-top-2 duration-150">
        <div className="w-[300px] flex flex-col gap-2 p-3">
          <input
            type="text" placeholder="Search GIFs…"
            className="w-full bg-gray-100 dark:bg-black rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none text-gray-900 dark:text-white"
            onChange={e => setSearch(e.target.value)} value={search}
          />
          <div className="h-[280px] overflow-y-auto scrollbar-hide rounded-lg">
            <Grid
              key={search} width={275} columns={2} fetchGifs={fetchGifs}
              onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); onClose(); }}
              noResultsMessage={<div className="text-center text-gray-500 mt-4 text-sm">No GIFs found</div>}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
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
  
  const isLoadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  


  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const [gifUrl, setGifUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [composeFocused, setComposeFocused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifMenuRef = useRef<HTMLDivElement>(null);
  const emojiMenuRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiAbove, setEmojiAbove] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(gifMenuRef, () => setShowGifPicker(false));
  useOnClickOutside(emojiMenuRef, () => setShowEmojiPicker(false));

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

  // --- THE MISSING FETCH TRIGGER ---
  useEffect(() => { 
    setNewSparksAvatars([]); 
    fetchFeed(true, false); 
  }, [feedType]); // This guarantees the feed loads when the component mounts or tabs switch!

  const fetchFeed = async (isInitial = false, forceRefresh = false) => {
    // If we are just mounting and already have cached posts, exit instantly!
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

  // Run when the tab changes (Global <-> Network)
  useEffect(() => { 
    setNewSparksAvatars([]); 
    fetchFeed(true, false); 
  }, [feedType]);


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

  useEffect(() => {
    const el = scrollRef.current;
    let scrollTimeout: any;

    const onScroll = () => {
      if (!el) return;
      
      // Throttle saving the scroll position to the store so we don't spam Zustand
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        feedStore.setScrollPosition(feedType, el.scrollTop);
      }, 100);

      // Pagination logic
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 400
        && !isLoadingMoreRef.current && hasMoreRef.current) {
          fetchFeed(false, false);
      }
    };
    el?.addEventListener('scroll', onScroll, { passive: true });
    return () => el?.removeEventListener('scroll', onScroll);
  }, [feedType, posts]); // Added dependencies to keep refs fresh

  const handleLoadNewSparks = () => {
    setNewSparksAvatars([]);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    feedStore.setScrollPosition(feedType, 0); // Reset scroll cache
    fetchFeed(true, true); // forceRefresh = true!
  };

  const handlePostDeleted = (id: number) => feedStore.removePost(id);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setGifUrl(''); setImageFile(file); setImagePreview(URL.createObjectURL(file)); e.target.value = '';
  };

  const clearAttachment = () => {
    setGifUrl(''); setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
  };

  const handlePostSubmit = async () => {
    if (!caption.trim() && !gifUrl && !imageFile) return;
    setIsPosting(true);
    
    try {
      let media: any[] = [];
      
      // --- UPGRADED S3 POST POLICY UPLOAD ---
      if (imageFile) {
        const { blob, type, w, h } = await compressImage(imageFile);
        const safeFilename = `post_${Date.now()}.webp`;
        
        const presignRes = await api.post('/arena/media/presign', { filename: safeFilename, contentType: type });
        const presignData = presignRes.data || presignRes;
        
        if (presignData.fields && presignData.url) {
          const formData = new FormData();
          
          // 1. Attach S3 Security tokens
          Object.keys(presignData.fields).forEach(key => {
            formData.append(key, presignData.fields[key]);
          });
          
          // 2. Attach the image
          formData.append('file', blob);

          // 3. POST it!
          const uploadRes = await fetch(presignData.url, { 
            method: 'POST', 
            body: formData 
          });
          
          if (!uploadRes.ok) throw new Error('S3 Upload failed');
          
          media = [{ 
            objectKey: presignData.objectKey || presignData.key, 
            mediaType: 'image', 
            width: w, 
            height: h, 
            sortOrder: 0 
          }];
        } else {
          throw new Error("Backend did not return valid S3 POST policy fields.");
        }
      }
      // ----------------------------------------

      if (gifUrl) media = [{ url: gifUrl, mediaType: 'image', sortOrder: 0 }];
      
      await api.post('/arena/posts', { caption: caption.trim(), visibility, media: media.length ? media : undefined });
      
      setCaption(''); clearAttachment(); setComposeFocused(false); fetchFeed(true);
    } catch (err) { 
      console.error(err);
      alert('Failed to post.'); 
    } finally { 
      setIsPosting(false); 
    }
  };

  return (
    <DashboardLayout>
      <div ref={scrollRef} className="flex-1 h-full w-full overflow-y-auto scrollbar-hide bg-white dark:bg-[#0E0E0E]">

        {/* ══ HEADER ══════════════════════════════════════════════════════════
            - Mobile  (<640px) : avatar | tabs | icons (no text labels, no online pill)
            - Tablet  (640px+) : avatar + name | tabs | online + icons
            - Desktop (1024px+): same as tablet + online pill visible in header
        ═══════════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0E0E0E]/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/[0.06]">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            {/* 3-col grid: left | center | right */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center h-14 gap-2 sm:gap-3">

              {/* LEFT — avatar (+ name on sm+) */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=6366f1&color=fff`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-[#0E0E0E] ring-offset-1 ring-offset-indigo-400"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[9px] leading-none select-none">{timeEmoji}</span>
                </div>
                <span className="hidden sm:block text-[14px] font-bold text-gray-900 dark:text-white truncate max-w-[100px]">
                  {user?.name?.split(' ')[0] || 'Macha'}
                </span>
              </div>

              {/* CENTER — tab toggle, always centred */}
              <div className="flex items-center justify-center">
                <div className="flex items-center bg-gray-100 dark:bg-white/[0.06] rounded-xl p-[3px] gap-0.5">
                  {(['global', 'network'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => { setFeedType(type); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-[9px] text-[12px] sm:text-[13px] font-semibold transition-all duration-200 whitespace-nowrap ${
                        feedType === type
                          ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {type === 'global'
                        ? <><TrendingUp size={12} strokeWidth={2.5} /><span>Global</span></>
                        : <><Users size={12} strokeWidth={2.5} /><span>Network</span></>
                      }
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT — actions, flush right */}
              <div className="flex items-center gap-1 sm:gap-1.5 justify-end">
                <button
                  onClick={() => navigate('/matches')}
                  title="Stranger Chat"
                  className="group w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-500/10 dark:hover:border-blue-500/20 transition-all"
                >
                  <MessageSquare size={14} strokeWidth={2.5} className="text-gray-500 group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400 transition-colors" />
                </button>

                <button
                  onClick={() => navigate('/vid-matches')}
                  title="Video Match"
                  className="group relative w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.08] hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-500/10 dark:hover:border-purple-500/20 transition-all"
                >
                  <span className="absolute -top-1.5 -right-1 bg-pink-500 text-white text-[6px] font-black px-1 py-px rounded-full rotate-6 leading-tight tracking-wide">BETA</span>
                  <Video size={14} strokeWidth={2.5} className="text-gray-500 group-hover:text-purple-600 dark:text-gray-400 dark:group-hover:text-purple-400 transition-colors" />
                </button>

                <button
                  onClick={() => navigate('/labs')}
                  title="zQuab Labs"
                  className="group w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/[0.05] border border-purple-200 dark:border-purple-500/20 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                >
                  <FlaskConical size={14} strokeWidth={2.5} className="text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" />
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* ══ FEED COLUMN ═════════════════════════════════════════════════════ */}
        <div className="w-full">

          {/* Stats bar — full width, compact */}
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
            {/* Online indicator — always in the stats bar */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative h-1.5 w-1.5 rounded-full bg-green-500"></span>
              </span>
              <span className="font-medium text-green-600 dark:text-green-500">1,240+ online</span>
            </div>
          </div>

          {/* Feed inner column — max-width for readability on ultrawide */}
          <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8">

          

          {/* ── New sparks pill — fixed to viewport, just below the sticky header (64px) ──
               Mirrors Twitter's "X new posts" behaviour: always visible regardless of scroll depth.
               Uses a vibrant indigo-to-violet gradient so it pops on both light and dark backgrounds.
               Remove the DEV test button above once real polling drives this. */}
          {/* ── Floating "New Sparks" Pill ── */}
          {newSparksAvatars.length > 0 && (
            // 1. sticky top-20 glues the invisible anchor just under the header
            <div className="sticky top-20 z-50 flex justify-center w-full pointer-events-none">
              
              {/* 2. absolute top-2 pulls it COMPLETELY out of the flow so it doesn't push the feed down, but keeps its natural shape! */}
              <div className="absolute top-2">
                <button
                  onClick={handleLoadNewSparks}
                  className="pointer-events-auto flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full text-white text-[13px] font-bold shadow-xl shadow-indigo-500/30 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 animate-in slide-in-from-top-4 fade-in duration-300 border border-white/20"
                >
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <ArrowUp size={11} strokeWidth={3} className="text-white" />
                  </div>
                  <div className="flex -space-x-2 mx-0.5">
                    {newSparksAvatars.map((url, i) => (
                      <img key={i} src={url} className="w-5 h-5 rounded-full border-2 border-indigo-500 object-cover bg-white shrink-0" alt="" />
                    ))}
                  </div>
                  <span>New sparks</span>
                </button>
              </div>

            </div>
          )}

          {/* ── Compose box ─────────────────────────────────────────────── */}
          <div className={`my-3 rounded-2xl border transition-all duration-200 ${
            composeFocused
              ? 'border-gray-300 dark:border-white/20 shadow-md shadow-black/5 dark:shadow-black/40'
              : 'border-gray-200 dark:border-white/[0.08]'
          } bg-white dark:bg-white/[0.03]`}>

            <div className="flex gap-2.5 sm:gap-3 p-4">
              <img
                src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=6366f1&color=fff`}
                alt=""
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  onFocus={() => setComposeFocused(true)}
                  onBlur={() => !caption && setComposeFocused(false)}
                  placeholder="What's sparking in your mind?"
                  rows={1}
                  className="w-full bg-transparent text-[14px] sm:text-[15px] text-gray-900 dark:text-white resize-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 leading-relaxed"
                  style={{ minHeight: composeFocused || caption ? '72px' : '24px', transition: 'min-height 0.25s cubic-bezier(0.4,0,0.2,1)' }}
                />
                {(gifUrl || imagePreview) && (
                  <div className="relative mt-2 inline-block max-w-full">
                    <img
                      src={gifUrl || imagePreview} alt=""
                      className="max-h-40 sm:max-h-48 w-auto max-w-full rounded-xl border border-gray-200 dark:border-white/10 object-cover"
                    />
                    <button
                      onClick={clearAttachment}
                      className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-md hover:scale-110 transition-transform"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Add image"
                  className={`p-1.5 rounded-lg transition-colors ${imageFile ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  <ImageIcon size={16} strokeWidth={2} />
                </button>

                <div className="relative" ref={gifMenuRef}>
                  <button
                    onClick={() => { setShowGifPicker(p => !p); setShowEmojiPicker(false); }}
                    className={`p-1.5 rounded-lg transition-colors ${gifUrl ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-black border-[1.5px] border-current px-1 rounded leading-[14px] flex tracking-wide">GIF</span>
                  </button>
                  {showGifPicker && (
                    <GiphyPicker
                      onSelect={url => { setGifUrl(url); setImageFile(null); setImagePreview(''); setShowGifPicker(false); }}
                      onClose={() => setShowGifPicker(false)}
                    />
                  )}
                </div>

                <div className="relative" ref={emojiMenuRef}>
                  <button
                    ref={emojiButtonRef}
                    onClick={() => {
                      if (!showEmojiPicker && emojiButtonRef.current) {
                        const rect = emojiButtonRef.current.getBoundingClientRect();
                        // 450px is approx picker height — show above if not enough room below
                        setEmojiAbove(rect.bottom + 450 > window.innerHeight && rect.top > 450);
                      }
                      setShowEmojiPicker(p => !p);
                      setShowGifPicker(false);
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-400 dark:text-gray-600 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/20'}`}
                  >
                    <Smile size={16} strokeWidth={2} />
                  </button>
                  {showEmojiPicker && (
                    <div
                      className={`absolute left-0 z-50 shadow-2xl rounded-2xl overflow-hidden animate-in duration-150 ${
                        emojiAbove
                          ? 'bottom-full mb-2 slide-in-from-bottom-2'
                          : 'top-full mt-2 slide-in-from-top-2'
                      }`}
                    >
                      <EmojiPicker
                        onEmojiClick={(e) => { setCaption(p => p + e.emoji); setShowEmojiPicker(false); }}
                        theme={'auto' as Theme}
                        width={320}
                        height={400}
                        searchPlaceholder="Search emoji…"
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setVisibility(p => p === 'public' ? 'friends' : 'public')}
                  className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {visibility === 'public' ? <Globe size={15} strokeWidth={2} /> : <UserPlus size={15} strokeWidth={2} />}
                  <span className="text-[11px] sm:text-[12px] capitalize hidden sm:inline">{visibility}</span>
                </button>
              </div>

              <button
                onClick={handlePostSubmit}
                disabled={(!caption.trim() && !gifUrl && !imageFile) || isPosting}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[12px] sm:text-[13px] font-bold transition-all active:scale-[0.97] disabled:opacity-35 disabled:cursor-not-allowed bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100"
              >
                {isPosting
                  ? <Loader2 size={13} className="animate-spin" />
                  : <><Zap size={12} className="text-yellow-400 dark:text-yellow-500" strokeWidth={3} />Spark it</>
                }
              </button>
            </div>
          </div>

          {/* Divider */}
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
                <button
                  onClick={() => navigate('/friends')}
                  className="text-[13px] font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 underline underline-offset-2 transition-colors"
                >
                  Find people to follow →
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
              {posts.map(post => (
                // PostCard reads likeCount/commentCount/repostCount from `post` directly
                // and applies the High Heat UI (orange border + 🔥 badge) internally
                // when totalEngagement (likes + comments + reposts) >= 20.
                <PostCard
                  key={post.id}
                  post={post}
                  onDeleted={() => handlePostDeleted(post.id)}
                />
              ))}
              </div>
              {isLoadingMore && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-white/10 border-t-gray-500 dark:border-t-gray-400 animate-spin" />
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <div className="flex flex-col items-center py-12 gap-2">
                  <Sparkles size={18} className="text-gray-200 dark:text-gray-800" />
                  <p className="text-[11px] font-semibold text-gray-300 dark:text-gray-700 tracking-widest uppercase">All caught up</p>
                </div>
              )}
            </>
          )}

          </div>{/* /feed inner column */}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;