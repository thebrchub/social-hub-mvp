import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // ADDED NAVIGATE
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import PostCard, { type Post } from '../components/feed/PostCard';
import { Loader2, Image as ImageIcon, Smile, Globe, Send, X, UserPlus, TrendingUp, Sparkles, ArrowUp } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch('QkvvAzTY6DrGBFLYQS0u5E1MBTzw8eMP');

function useOnClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

const compressImage = (file: File): Promise<{ blob: Blob, type: string, w: number, h: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      const MAX_DIM = 1920;
      if (w > MAX_DIM || h > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, w, h);
      
      const outType = 'image/webp';
      canvas.toBlob(blob => {
        if (!blob) return resolve({ blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
        if (blob.size < file.size) resolve({ blob, type: outType, w, h });
        else resolve({ blob: file, type: file.type, w: img.naturalWidth, h: img.naturalHeight });
      }, outType, 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
};

function GiphyPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [search, setSearch] = useState('');
  const fetchGifs = (offset: number) => search ? gf.search(search, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 });

  return (
    <div className="w-[300px] flex flex-col gap-2 p-3">
      <input type="text" placeholder="Search GIFs..." className="w-full bg-gray-100 dark:bg-black rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white" onChange={(e) => setSearch(e.target.value)} value={search} />
      <div className="h-[300px] overflow-y-auto scrollbar-hide rounded-lg">
        <Grid key={search} width={275} columns={2} fetchGifs={fetchGifs} onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); }} noResultsMessage={<div className="text-center text-gray-500 mt-4 text-sm font-bold">No GIFs found</div>} />
      </div>
    </div>
  );
}

export default function Feed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const currentUser = useAuthStore(state => state.user);

  const [feedType, setFeedType] = useState<'global' | 'network'>('global');
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [newSparksAvatars, setNewSparksAvatars] = useState<string[]>([]);
  
  const cursorRef = useRef<number | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifMenuRef = useRef<HTMLDivElement>(null);

  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(gifMenuRef, () => setShowGifPicker(false));

  useEffect(() => {
    cursorRef.current = null;
    setHasMore(true);
    setNewSparksAvatars([]); 
    fetchFeed(true);
  }, [feedType]); 

  // LIVE POLLING FOR NEW POSTS
  useEffect(() => {
    if (posts.length === 0) return;
    const topPostId = posts[0].id;
    
    const pollInterval = setInterval(async () => {
       try {
          const res = await api.get(`/arena/feed/${feedType}?limit=5`);
          const latestPosts = Array.isArray(res) ? res : (res.data || []);
          
          if (latestPosts.length > 0 && latestPosts[0].id > topPostId) {
             const newPosts = latestPosts.filter((p: any) => p.id > topPostId);
             const avatars = Array.from(new Set(newPosts.map((p: any) => p.avatarUrl || `https://ui-avatars.com/api/?name=${p.displayName || 'U'}&background=random`))).slice(0, 3);
             setNewSparksAvatars(avatars as string[]);
          }
       } catch (e) { /* Silent fail */ }
    }, 20000); 
    
    return () => clearInterval(pollInterval);
  }, [posts, feedType]);

  const fetchFeed = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setIsLoadingMore(true);

    try {
      const url = `/arena/feed/${feedType}?limit=20${cursorRef.current && !isInitial ? `&cursor=${cursorRef.current}` : ''}`;
      const res = await api.get(url); 
      const fetchedPosts = Array.isArray(res) ? res : (res.data || []);
      
      if (fetchedPosts.length > 0) {
        setPosts(prev => isInitial ? fetchedPosts : [...prev, ...fetchedPosts]);
        cursorRef.current = fetchedPosts[fetchedPosts.length - 1].id;
        setHasMore(fetchedPosts.length >= 20);
      } else {
        if (isInitial) setPosts([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load feed", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadNewSparks = () => {
    setNewSparksAvatars([]);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    fetchFeed(true);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, clientHeight, scrollHeight } = scrollContainerRef.current;
      
      if (scrollTop > lastScrollY.current && scrollTop > 100) setShowHeader(false); 
      else if (scrollTop < lastScrollY.current) setShowHeader(true);  
      lastScrollY.current = scrollTop;

      if (scrollHeight - scrollTop - clientHeight < 400) {
        if (!isLoadingMoreRef.current && hasMoreRef.current) {
          fetchFeed(false);
        }
      }
    };
    
    const container = scrollContainerRef.current;
    if (container) container.addEventListener('scroll', handleScroll, { passive: true });
    return () => { if (container) container.removeEventListener('scroll', handleScroll); };
  }, []);

  const handlePostDeleted = (deletedPostId: number) => {
    setPosts(prev => prev.filter(p => p.id !== deletedPostId));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGifUrl(''); 
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = ''; 
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
      let uploadedMediaArray: any[] = [];
      if (imageFile) {
        const { blob, type, w, h } = await compressImage(imageFile);
        const presignRes = await api.post(`/arena/media/presign`, { filename: imageFile.name.replace(/\.[^.]+$/, '.webp'), contentType: type });
        const uploadRes = await fetch(presignRes.uploadUrl, { method: 'PUT', headers: { 'Content-Type': type }, body: blob });
        if (!uploadRes.ok) throw new Error("Upload failed.");
        uploadedMediaArray = [{ objectKey: presignRes.objectKey, mediaType: 'image', width: w, height: h, sortOrder: 0 }];
      }

      if (gifUrl) uploadedMediaArray = [{ url: gifUrl, mediaType: 'image', sortOrder: 0 }];

      await api.post('/arena/posts', {
        caption: caption.trim(), visibility: visibility,
        media: uploadedMediaArray.length > 0 ? uploadedMediaArray : undefined
      });
      
      setCaption(''); clearAttachment();
      fetchFeed(true); 
    } catch (err) {
      alert("Failed to create post. Check your connection.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <DashboardLayout>
      <div ref={scrollContainerRef} className="flex-1 h-full w-full flex justify-center bg-gray-50 dark:bg-[#030303] overflow-y-auto scrollbar-hide relative transition-colors duration-300">
        <div className="w-full max-w-[640px] h-max min-h-full flex flex-col pb-36 px-4 md:px-0 relative">
          
          <div className={`sticky top-4 z-50 transition-all duration-300 ease-in-out mb-6 ${showHeader ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0 pointer-events-none'}`}>
            <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-gray-200/50 dark:border-[#272729] rounded-[2rem] p-3 shadow-lg shadow-black/5 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                      <TrendingUp size={16} strokeWidth={3} />
                   </div>
                   <h1 className="text-xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight hidden sm:block">The Arena</h1>
                </div>
                <div className="relative flex bg-gray-200/50 dark:bg-[#1a1a1a] p-1 rounded-xl shadow-inner border border-gray-300/50 dark:border-[#272729] w-64">
                  <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-[#272729] rounded-lg shadow-sm transition-transform duration-300 ease-out ${feedType === 'global' ? 'translate-x-0' : 'translate-x-full'}`}></div>
                  <button onClick={() => { setFeedType('global'); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`relative z-10 w-1/2 px-2 py-1.5 text-xs font-extrabold rounded-lg transition-colors duration-300 ${feedType === 'global' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Global Pulse</button>
                  <button onClick={() => { setFeedType('network'); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`relative z-10 w-1/2 px-2 py-1.5 text-xs font-extrabold rounded-lg transition-colors duration-300 ${feedType === 'network' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Your Network</button>
                </div>
              </div>
            </div>
          </div>

          {/* --- DEV TOOLS (For Testing UI without backend) --- */}
          <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
             <button 
                onClick={() => setNewSparksAvatars(['https://ui-avatars.com/api/?name=Test1&background=random', 'https://ui-avatars.com/api/?name=Test2&background=random'])} 
                className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
             >
                Test Pill Dropdown
             </button>
             <button 
                onClick={() => {
                   setPosts(prev => [{
                      id: Math.random(), username: 'viral_user', displayName: 'Hot Sparker', avatarUrl: '',
                      caption: 'This post was manually injected to test the High Heat UI! Notice the glowing orange border and the flame badge? 🔥',
                      likeCount: 50, commentCount: 5, repostCount: 5, // Total 60 > 20 triggers High Heat
                      createdAt: new Date().toISOString(), hasLiked: false, media: []
                   }, ...prev]);
                }} 
                className="text-[10px] font-extrabold uppercase tracking-widest bg-orange-500/10 text-orange-500 px-3 py-1.5 rounded-lg border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
             >
                Test High Heat
             </button>
             <button 
                onClick={() => navigate('/feed-mock')} 
                className="text-[10px] font-extrabold uppercase tracking-widest bg-gray-500/10 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg border border-gray-500/20 hover:bg-gray-500/20 transition-colors"
             >
                Go to Mock Feed
             </button>
          </div>

          {newSparksAvatars.length > 0 && (
            <div className="sticky top-[88px] z-40 flex justify-center -mt-2 mb-4 pointer-events-none">
               <button 
                 onClick={handleLoadNewSparks}
                 className="pointer-events-auto bg-blue-500 text-white shadow-[0_8px_30px_rgba(59,130,246,0.4)] rounded-full pl-3 pr-4 py-1.5 flex items-center gap-2 hover:bg-blue-600 transition-all hover:-translate-y-1 active:scale-95 animate-in slide-in-from-top-4 fade-in duration-300 border border-blue-400"
               >
                  <ArrowUp size={16} strokeWidth={3} />
                  <div className="flex -space-x-2">
                     {newSparksAvatars.map((url, i) => (
                        <img key={i} src={url} className="w-6 h-6 rounded-full border-2 border-blue-500 object-cover bg-white" alt="Avatar" />
                     ))}
                  </div>
                  <span className="text-sm font-bold ml-1 tracking-wide">posted</span>
               </button>
            </div>
          )}

          <div className="p-5 rounded-[2rem] border border-gray-200 dark:border-[#272729] bg-white dark:bg-[#0f0f0f] shadow-sm flex flex-col gap-4 mb-6 relative z-10">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-[#343536]">
                 <img src={currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${currentUser?.name || 'U'}&background=random`} alt="You" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 pt-1">
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ignite a new discussion..." className="w-full bg-transparent text-gray-900 dark:text-white text-lg resize-none focus:outline-none placeholder:text-gray-400 font-medium min-h-[60px]"/>
                {(gifUrl || imagePreview) && (
                  <div className="relative mt-2 mb-2 inline-block">
                    <img src={gifUrl || imagePreview} alt="Attachment" className="max-h-48 rounded-xl border border-gray-200 dark:border-[#272729] object-cover" />
                    <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"><X size={14}/></button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#1a1a1a]">
              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 mt-2">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                <button onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-full transition-colors ${imageFile ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'}`}><ImageIcon size={20} strokeWidth={2.5} /></button>

                <div className="relative" ref={gifMenuRef}>
                  <button onClick={() => setShowGifPicker(!showGifPicker)} className={`p-2.5 rounded-full transition-colors flex items-center justify-center ${gifUrl ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'}`}>
                     <div className="font-black text-[10px] border-2 border-current px-1 rounded flex items-center justify-center h-[18px]">GIF</div>
                  </button>
                  {showGifPicker && (
                    <div className="absolute top-full left-0 mt-2 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] animate-in slide-in-from-top-2 duration-200 z-50">
                       <GiphyPicker onSelect={(url) => { setGifUrl(url); setImageFile(null); setImagePreview(''); setShowGifPicker(false); }} />
                    </div>
                  )}
                </div>

                <button className="p-2.5 rounded-full transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"><Smile size={20} strokeWidth={2.5} /></button>

                <button onClick={() => setVisibility(prev => prev === 'public' ? 'friends' : 'public')} className="p-2.5 rounded-full transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 flex items-center gap-1.5 ml-1" title="Toggle Visibility">
                   {visibility === 'public' ? <Globe size={20} strokeWidth={2.5} /> : <UserPlus size={20} strokeWidth={2.5} />}
                   <span className="text-[12px] font-bold capitalize hidden sm:inline text-gray-600 dark:text-gray-400">{visibility}</span>
                </button>
              </div>

              <button onClick={handlePostSubmit} disabled={(!caption.trim() && !gifUrl && !imageFile) || isPosting} className="px-6 py-2.5 mt-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full text-sm transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isPosting ? <Loader2 size={16} className="animate-spin" /> : "Post Spark"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-gray-500 font-medium">
               <Sparkles size={32} className="mx-auto mb-4 text-gray-300 dark:text-gray-700" />
               <p>The Arena is quiet today. Be the first to start a spark!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map(post => <PostCard key={post.id} post={post} onDeleted={() => handlePostDeleted(post.id)} />)}
              
              {isLoadingMore && <div className="py-6 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
              {!hasMore && posts.length > 0 && (
                <div className="py-10 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                   <Sparkles size={28} className="mb-3" />
                   <p className="text-sm font-extrabold uppercase tracking-widest">You've caught up with the pulse.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}