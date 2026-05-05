import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Repeat2, Share2, MoreHorizontal, Send, Loader2, Zap, UserPlus, Image as ImageIcon, X, Pencil, Check, Link, Share, Mail, Flame, Flag, Bookmark, BarChart2 } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import PostCard, { type Post, type Comment as CommentType, ShareToChatModal } from '../components/feed/PostCard';
import ReportModal from '../components/ReportModal'; 
import QuoteRippleModal from '../components/feed/QuoteRippleModal'; 
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { useBookmarkStore } from '../store/useBookmarkStore';

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

function SmartAvatar({ username, displayName, initialUrl, sizeClass = "w-10 h-10" }: { username?: string, displayName?: string, initialUrl?: string, sizeClass?: string }) {
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    if (!initialUrl && username && !hasError) {
      api.get(`/users/${username}`).then(res => {
        if (res.avatar_url || res.user?.avatar_url) setFetchedUrl(res.avatar_url || res.user?.avatar_url);
      }).catch(() => setHasError(true));
    }
  }, [username, initialUrl, hasError]);
  const activeUrl = initialUrl || fetchedUrl;
  const safeName = encodeURIComponent(displayName || username || 'U');
  const finalUrl = activeUrl && !hasError ? activeUrl : `https://ui-avatars.com/api/?name=${safeName}&background=random&font-family=Inter`;
  return (
    <div className={`${sizeClass} rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-200 dark:border-[#272729]`}>
      <img src={finalUrl} alt={username || 'User'} className="w-full h-full object-cover" onError={() => setHasError(true)} />
    </div>
  );
}

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

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequested, setFriendRequested] = useState(false);

  const [postHasReposted, setPostHasReposted] = useState(false);
  const [postRepostCount, setPostRepostCount] = useState(0);
  const [isPostReposting, setIsPostReposting] = useState(false);


  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showRippleMenu, setShowRippleMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isShareChatModalOpen, setIsShareChatModalOpen] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  // --- NEW: POST ACTIVITY STATES ---
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityData, setActivityData] = useState<any>(null);

  const handleViewActivity = async () => {
    if (!post) return;
    setIsActivityModalOpen(true);
    setLoadingActivity(true);
    try {
      const res = await api.get(`/arena/posts/${post.id}/activity`);
      setActivityData(res.data || res);
    } catch {
      alert("Failed to load activity stats.");
      setIsActivityModalOpen(false);
    } finally {
      setLoadingActivity(false);
    }
  };
  
  // --- NEW: BOOKMARK & USER LIST STATES ---
  const { bookmarkedIds, toggleBookmark, syncInitialState } = useBookmarkStore();
  const [userListConfig, setUserListConfig] = useState<{isOpen: boolean, type: 'likes' | 'reposts', title: string}>({isOpen: false, type: 'likes', title: ''});
  const [userList, setUserList] = useState<any[]>([]);
  const isBookmarked = post ? (bookmarkedIds[post.id] || false) : false;
  
  // --- REPOST MODAL STATES ---
  const [repostStats, setRepostStats] = useState<{plain: number, quotes: number}>({ plain: 0, quotes: 0 });
  const [quoteList, setQuoteList] = useState<any[]>([]); // Store the actual quote posts here
  const [activeRepostTab, setActiveRepostTab] = useState<'plain' | 'quotes'>('plain'); // Toggle state

  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (post) syncInitialState(post.id, post.isBookmarked || false);
  }, [post, syncInitialState]);

  const handleBookmark = async () => {
    if (!post) return;
    const newStatus = !isBookmarked;
    
    // Update global store instantly
    toggleBookmark(post.id, newStatus); 
    
    try {
      if (newStatus) await api.post(`/arena/posts/${post.id}/bookmark`);
      else await api.delete(`/arena/posts/${post.id}/bookmark`);
    } catch {
      // Revert the global store on failure
      toggleBookmark(post.id, !newStatus); 
      alert("Failed to update bookmark.");
    }
  };

  const fetchUsersList = async (type: 'likes' | 'reposts') => {
    if (!post) return;
    setUserListConfig({ isOpen: true, type, title: type === 'likes' ? 'Sparked by' : 'Quotes & Ripples' });
    setLoadingUsers(true);
    try {
      const res = await api.get(`/arena/posts/${post.id}/${type}`);
      const data = res.data || res;
      
      if (type === 'reposts') {
         // Backend returns { repostCount, quoteCount, quotes: [...] }
         setQuoteList(data.quotes || []);
         setUserList(data.reposters || []); // Assuming plain reposters are returned here. If not, this defaults empty.
         setRepostStats({ plain: data.repostCount || 0, quotes: data.quoteCount || 0 });
         setActiveRepostTab('plain'); // Default to plain ripples when opened
      } else {
         setUserList(Array.isArray(data) ? data : []);
      }
    } catch {
      alert(`Failed to load ${type}.`);
      setUserListConfig(prev => ({ ...prev, isOpen: false }));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleModalConnect = async (e: React.MouseEvent, targetUsername: string) => {
    e.stopPropagation();
    try {
      await api.post('/friends/request', { target_username: targetUsername });
      setUserList(prev => prev.map(u => u.username === targetUsername ? { ...u, isRequested: true } : u));
    } catch {
      alert("Failed to send request");
    }
  };

  const menuRef = useRef<HTMLDivElement>(null);
  const gifMenuRef = useRef<HTMLDivElement>(null);
  const rippleMenuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => setShowPostMenu(false));
  useOnClickOutside(gifMenuRef, () => setShowGifPicker(false));
  useOnClickOutside(rippleMenuRef, () => setShowRippleMenu(false));
  useOnClickOutside(shareMenuRef, () => setShowShareMenu(false));

  const [replyText, setReplyText] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [activeReplyParentId, setActiveReplyParentId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

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
    const fetchPostAndComments = async () => {
      try {
        const [postRes, commentsRes] = await Promise.all([
          api.get(`/arena/posts/${postId}`),
          api.get(`/arena/posts/${postId}/comments?limit=50`)
        ]);
        const fetchedPost = postRes.post || postRes;
        setPost(fetchedPost);
        setPostHasReposted((fetchedPost as any).hasReposted || false);
        setPostRepostCount(fetchedPost.repostCount || 0);
        setComments(Array.isArray(commentsRes) ? commentsRes : (commentsRes.data || []));
        if (fetchedPost?.username && fetchedPost.username !== currentUser?.username) {
          try {
            const friendRes = await api.get(`/friends/status/${fetchedPost.username}`);
            setIsFriend(friendRes.isFriend || friendRes.status === 'accepted' || friendRes.status === 'pending');
          } catch { /* ignore */ }
        }
      } catch { console.error("Failed to load details"); } finally { setLoading(false); }
    };
    fetchPostAndComments();
  }, [postId, currentUser?.username]);

  // Polling
  useEffect(() => {
    if (!postId) return;
    const poll = setInterval(async () => {
      try {
        const res = await api.get(`/arena/posts/${postId}/comments?limit=50`);
        const fresh = Array.isArray(res) ? res : (res.data || []);
        if (fresh.length > 0) setComments(fresh);
      } catch { }
    }, 15000);
    return () => clearInterval(poll);
  }, [postId]);

  useEffect(() => {
    if (!postId) return;
    const poll = setInterval(async () => {
      try {
        const res = await api.get(`/arena/posts/${postId}`);
        const fresh = res.post || res;
        setPost(prev => prev ? {
          ...prev,
          likeCount: fresh.likeCount ?? prev.likeCount,
          commentCount: fresh.commentCount ?? prev.commentCount,
          repostCount: fresh.repostCount ?? prev.repostCount,
        } : prev);
      } catch { }
    }, 15000);
    return () => clearInterval(poll);
  }, [postId]);

  const handlePostSpark = async () => {
    if (!post) return;
    const newStatus = !post.hasLiked;
    setPost(prev => prev ? { ...prev, hasLiked: newStatus, likeCount: newStatus ? prev.likeCount + 1 : Math.max(0, prev.likeCount - 1) } : null);
    try {
      if (newStatus) await api.post(`/arena/posts/${post.id}/like`);
      else await api.delete(`/arena/posts/${post.id}/like`);
    } catch {
      setPost(prev => prev ? { ...prev, hasLiked: !newStatus, likeCount: !newStatus ? prev.likeCount + 1 : Math.max(0, prev.likeCount - 1) } : null);
    }
  };

  const handleRippleToggle = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (isPostReposting || !post) return;
    
    setIsPostReposting(true); 
    if (typeof setShowRippleMenu === 'function') setShowRippleMenu(false);

    if (postHasReposted) {
      // --- UPGRADED UNDO LOGIC ---
      try { 
        // Tell the backend directly to un-ripple the parent post!
        await api.delete(`/arena/posts/${post.id}/repost`); 
        setPostHasReposted(false); 
        setPostRepostCount(prev => Math.max(0, prev - 1)); 
      }
      catch { 
        alert("Failed to undo ripple."); 
      }
    } else {
      // Create a plain ripple
      try {
        await api.post(`/arena/posts/${post.id}/repost`, { caption: "" });
        setPostHasReposted(true); 
        setPostRepostCount(prev => prev + 1);
      } catch { 
        alert("Failed to ripple."); 
      }
    }
    setIsPostReposting(false);
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this post?")) return;
    try { await api.delete(`/arena/posts/${post?.id}`); navigate(-1); }
    catch { alert("Failed to delete post."); }
  };

  const handleAddFriend = async (e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    setShowPostMenu(false);
    try {
      await api.post(`/friends/request`, { target_username: post?.username });
      setIsFriend(true); setFriendRequested(true);
    } catch { alert("Failed to send request."); }
  };

  const getPostUrl = () => `${window.location.origin}/post/${post?.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPostUrl()).then(() => {
      setShowCopiedToast(true); setShowShareMenu(false); setTimeout(() => setShowCopiedToast(false), 2500);
    }).catch(() => alert("Failed to copy link."));
  };

  const handleNativeShare = async () => {
    setShowShareMenu(false);
    if (!post) return;
    const shareData = { title: `zQuab Post by ${post.displayName || post.username}`, text: post.caption ? `"${post.caption}"` : 'Check out this discussion on zQuab!', url: getPostUrl() };
    if (navigator.share) {
      try { await navigator.share(shareData); }
      catch (err: any) { if (err.name !== 'AbortError') handleCopyLink(); }
    } else { handleCopyLink(); }
  };

  const handleSendChatClick = () => { setShowShareMenu(false); setIsShareChatModalOpen(true); };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setGifUrl(''); setImageFile(file); setImagePreview(URL.createObjectURL(file)); e.target.value = '';
  };

  const clearAttachment = () => {
    setGifUrl(''); setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
  };

  const handleSubmitReply = async () => {
    if ((!replyText.trim() && !gifUrl && !imageFile) || isReplying || !post) return;
    setIsReplying(true);
    
    try {
      // Create flexible variables that will hold EITHER the Giphy URL or our S3 Image URL
      let finalMediaUrl = gifUrl;
      let finalWidth = 0;
      let finalHeight = 0;

      if (imageFile) {
        const { blob, type, w, h } = await compressImage(imageFile);
        
        // 1. Clean the filename to prevent S3 encoding errors (403s)
        const safeFilename = `comment_${Date.now()}.webp`; 
        
        const presignRes = await api.post(`/arena/media/presign`, { filename: safeFilename, contentType: type });
        const presignData = presignRes.data || presignRes;
        
        // 2. CHECK YOUR CONSOLE FOR THIS LOG! 
        console.log("🔥 PRESIGN BACKEND RESPONSE:", presignData);

        // 3. Grab the URL (we are looking for the one with the secure AWS tokens)
        const actualUploadUrl = presignData.uploadUrl || presignData.presignedUrl || presignData.upload_url || presignData.url;
        
        // Safety check to ensure we aren't uploading to a public link
        if (!actualUploadUrl || !actualUploadUrl.includes('X-Amz')) {
           console.error("Missing secure tokens in URL:", actualUploadUrl);
           throw new Error("Backend did not return a secure presigned URL with X-Amz tokens.");
        }

        // Upload directly to the secure S3 link
        const uploadRes = await fetch(actualUploadUrl, { method: 'PUT', headers: { 'Content-Type': type }, body: blob });
        if (!uploadRes.ok) throw new Error("Upload failed with status: " + uploadRes.status);
        
        // Strip the security tokens to get the clean public URL for the GIF disguise
        const cleanPublicUrl = actualUploadUrl.split('?')[0]; 
        
        finalMediaUrl = cleanPublicUrl;
        finalWidth = w;
        finalHeight = h;
      }
      // Build the payload (body is now optional if media exists!)
      const payload: any = {};
      
      // Only attach body if there's actual text
      if (replyText.trim()) payload.body = replyText.trim();
      
      if (activeReplyParentId) payload.parentId = activeReplyParentId;
      
      if (finalMediaUrl) {
        payload.gifUrl = finalMediaUrl;
        if (finalWidth) payload.gifWidth = finalWidth;
        if (finalHeight) payload.gifHeight = finalHeight;
      }

      const res = await api.post(`/arena/posts/${post.id}/comments`, payload);
      const newComment = res.comment || res;
      
      if (!activeReplyParentId) {
        setComments(prev => [newComment, ...prev]);
      } 
      
      // Silently fetch fresh comments to ensure exact backend sync
      api.get(`/arena/posts/${post.id}/comments?limit=50`).then(fresh => {
        setComments(Array.isArray(fresh) ? fresh : (fresh.data || []));
      }).catch(() => {});

      setReplyText(''); 
      clearAttachment(); 
      setActiveReplyParentId(null); 
      setShowGifPicker(false);
      
    } catch { 
      alert("Failed to post reply."); 
    } finally { 
      setIsReplying(false); 
    }
  };

  const handleInitiateReply = (parentId: number, username: string) => {
    setActiveReplyParentId(parentId); setReplyText(`@${username} `); inputRef.current?.focus();
  };

  if (loading) return <DashboardLayout><div className="flex-1 flex items-center justify-center h-full bg-gray-50 dark:bg-[#030303]"><Loader2 className="animate-spin text-blue-500" size={32} /></div></DashboardLayout>;
  if (!post) return <DashboardLayout><div className="text-center mt-20 font-bold text-xl">Post not found.</div></DashboardLayout>;

  const isRepost = post.postType === 'repost';
  const isQuoteRipple = isRepost && (
    (post.caption && post.caption.trim().length > 0) || 
    (post.media && post.media.length > 0) || 
    (post as any).gifUrl
  );
  const isFastRipple = isRepost && !isQuoteRipple && post.originalPost;
  const displayAuthor = isFastRipple && post.originalPost ? post.originalPost : post;
  const displayCaption = isFastRipple && post.originalPost ? post.originalPost.caption : post.caption;
  const displayMedia = isFastRipple && post.originalPost ? post.originalPost.media : post.media;
  const engagementScore = (post.likeCount || 0) + (post.commentCount || 0) + (post.repostCount || 0);
  const isHot = engagementScore > 20;
  const isOwnPost = currentUser?.username === displayAuthor.username;

  return (
    <DashboardLayout>
      <div ref={scrollContainerRef} className="flex-1 h-full w-full flex justify-center bg-gray-50 dark:bg-[#030303] overflow-y-auto scrollbar-hide relative transition-colors duration-300">

        {showCopiedToast && (
          <div className="fixed top-20 right-4 sm:right-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 rounded-xl text-[15px] font-bold flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 z-[100]">
            <Check size={18} className="text-green-500" /> Link Copied to Clipboard
          </div>
        )}

        <div className="w-full max-w-[600px] h-max min-h-full flex flex-col pb-36 px-3 lg:px-0">

          {/* ── Sticky back header ── */}
          <div className={`sticky top-0 z-40 pt-3 pb-2 flex items-center justify-between transition-transform duration-300 ease-in-out bg-gray-50/90 dark:bg-[#030303]/90 backdrop-blur-md ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
            <button onClick={() => navigate(-1)} className="p-2.5 bg-white dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#272729] rounded-2xl shadow-sm transition-colors text-gray-900 dark:text-white border border-gray-100 dark:border-[#272729]">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display text-lg font-black text-gray-900 dark:text-white tracking-tight">Discussion</h1>
            <div className="w-10" />
          </div>

          {/* ── Post card ── */}
          <div className={`bg-white dark:bg-[#0a0a0a] rounded-[2rem] p-5 md:p-6 shadow-sm border border-gray-100 dark:border-[#1a1a1a] mt-2 mb-6 relative z-10 ${isHot ? 'border-orange-500/50 dark:border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] mt-4' : ''}`}>

            {isHot && (
              <div className="absolute -top-3.5 left-6 bg-gradient-to-r from-[#FF512F] to-[#DD2476] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-lg z-10 border-2 border-white dark:border-[#0a0a0a]">
                <Flame size={12} className="animate-pulse fill-white" /> High Heat
              </div>
            )}

            {/* ONLY show the ripple header for plain/fast ripples */}
            {isFastRipple && (
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 mb-4 ml-1">
                <Repeat2 size={15} /> {post.displayName || post.username} rippled
              </div>
            )}

            {/* ══ HEADER: avatar + name + responsive actions ══════════════ */}
            <div className="flex items-start justify-between mb-5 relative">
              {/* Left: avatar + name */}
              <div className="flex items-center gap-3.5">
                <div className="cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/profile/${displayAuthor.username}`); }}>
                   <SmartAvatar username={displayAuthor.username} displayName={displayAuthor.displayName} initialUrl={displayAuthor.avatarUrl} sizeClass="w-12 h-12" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[16px] text-gray-900 dark:text-white hover:underline leading-tight cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/profile/${displayAuthor.username}`); }}>
                    {displayAuthor.displayName || displayAuthor.username}
                  </span>
                  <span className="text-[14px] text-gray-500 cursor-pointer font-medium hover:underline" onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/profile/${displayAuthor.username}`); }}>
                    @{displayAuthor.username}
                  </span>
                </div>
              </div>

              {/* Right: responsive actions */}
              <div className="flex items-center gap-1.5 shrink-0 mt-1">
                {!isOwnPost && (
                  <>
                    {!isFriend && (
                      <button
                        onClick={handleAddFriend}
                        title={friendRequested ? 'Request sent' : 'Add friend'}
                        className={`hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-150 ${
                          friendRequested
                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default'
                            : 'border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:border-blue-700 dark:hover:text-blue-400'
                        }`}
                      >
                        <UserPlus size={15} strokeWidth={2.5} />
                      </button>
                    )}
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      title="Report post"
                      className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:border-red-700 dark:hover:text-red-400 transition-all duration-150"
                    >
                      <Flag size={15} strokeWidth={2.5} />
                    </button>
                  </>
                )}

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowPostMenu(!showPostMenu)}
                    className={`flex items-center justify-center w-9 h-9 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-[#2A2A2A] text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-all duration-150 ${
                      !isOwnPost ? 'sm:hidden' : ''
                    }`}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {showPostMenu && (
                    <div className="absolute right-0 top-10 w-44 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] rounded-[1.2rem] shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                      {isOwnPost ? (
                        <button onClick={handleDeletePost} className="w-full text-left px-5 py-3.5 text-[14px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                          Delete Post
                        </button>
                      ) : (
                        <>
                          {!isFriend && (
                            <button onClick={handleAddFriend} className="w-full flex items-center gap-2 px-5 py-3 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]">
                              <UserPlus size={16} /> Connect
                            </button>
                          )}
                          <button onClick={() => { setIsReportModalOpen(true); setShowPostMenu(false); }} className="w-full flex items-center gap-2 text-left px-5 py-3.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <Flag size={16} /> Report Post
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {displayCaption && (
              <p className="text-[17px] md:text-[19px] text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap mb-5">{displayCaption}</p>
            )}

            {isQuoteRipple && post.originalPost && (
              <div onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.originalPost?.id}`); }} className="border border-gray-200 dark:border-[#272729] rounded-2xl p-4 bg-gray-50 dark:bg-[#030303] mb-5 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <SmartAvatar username={post.originalPost.username} displayName={post.originalPost.displayName} initialUrl={post.originalPost.avatarUrl} sizeClass="w-6 h-6" />
                  <span className="font-bold text-[14px] text-gray-900 dark:text-white truncate">{post.originalPost.displayName}</span>
                  <span className="text-[13px] text-gray-500 truncate">@{post.originalPost.username}</span>
                </div>
                {post.originalPost.caption && <p className="text-[15px] text-gray-800 dark:text-gray-200 mb-3 line-clamp-3">{post.originalPost.caption}</p>}
                {post.originalPost.media && post.originalPost.media.length > 0 && (
                  <div className="w-full h-32 md:h-48 rounded-xl overflow-hidden bg-black">
                    {post.originalPost.media[0].mediaType === 'video' ? <video src={post.originalPost.media[0].url} className="w-full h-full object-cover" /> : <img src={post.originalPost.media[0].url} className="w-full h-full object-cover" />}
                  </div>
                )}
              </div>
            )}

            {displayMedia && displayMedia.length > 0 && (
              <div className="w-full rounded-[1.5rem] overflow-hidden mb-5 border border-gray-100 dark:border-[#272729] bg-gray-50 dark:bg-[#030303]">
                {displayMedia[0].mediaType === 'video' ? <video src={displayMedia[0].url} controls className="w-full h-full object-contain max-h-[500px]" /> : <img src={displayMedia[0].url} alt="Media" className="w-full h-full object-cover max-h-[500px]" />}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[14px] text-gray-500 font-medium mb-5">
              <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span>·</span>
              <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              
              {/* --- NEW: AUTHOR-ONLY ACTIVITY BUTTON --- */}
              {isOwnPost && (
                <>
                  <span>·</span>
                  <button onClick={handleViewActivity} className="flex items-center gap-1.5 font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                    <BarChart2 size={16} strokeWidth={2.5} /> View Activity
                  </button>
                </>
              )}
            </div>

            {/* ── Engagement Stats & Actions ── */}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-[#1a1a1a]">
              
              {/* Clickable Stats Row */}
              <div className="flex items-center gap-5 text-[14px] text-gray-500 font-medium px-2 py-2 border-b border-gray-100 dark:border-[#1a1a1a]">
                 <span className="cursor-pointer hover:underline" onClick={() => fetchUsersList('likes')}><strong className="text-gray-900 dark:text-white font-black">{post.likeCount || 0}</strong> Sparks</span>
                 <span className="cursor-pointer hover:underline" onClick={() => fetchUsersList('reposts')}><strong className="text-gray-900 dark:text-white font-black">{postRepostCount || 0}</strong> Ripples</span>
                 <span><strong className="text-gray-900 dark:text-white font-black">{post.viewCount || 0}</strong> Views</span>
              </div>

              {/* ACTION BUTTONS (NO BACKGROUND CONTAINERS) */}
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-500 px-1 py-1">
                 
                 <div className="flex items-center group cursor-pointer" onClick={handlePostSpark}>
                    <button className={`p-1.5 transition-colors group-hover:text-amber-500 dark:group-hover:text-amber-400 ${post.hasLiked ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      <Zap size={22} className={post.hasLiked ? 'fill-amber-500' : ''} />
                    </button>
                 </div>

                 <button onClick={() => inputRef.current?.focus()} className="flex items-center justify-center p-2 transition-all hover:text-blue-500 dark:hover:text-blue-400 text-gray-400 dark:text-gray-500">
                    <MessageCircle size={22} />
                 </button>

                 <div className="relative" ref={rippleMenuRef}>
                    <button onClick={() => setShowRippleMenu(!showRippleMenu)} disabled={isPostReposting} className={`flex items-center justify-center p-2 transition-all hover:text-green-500 dark:hover:text-green-400 ${postHasReposted ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                       {isPostReposting ? <Loader2 size={22} className="animate-spin" /> : <Repeat2 size={22} />}
                    </button>
                    {showRippleMenu && (
                      <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 w-44 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] rounded-[1.2rem] shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* 1. Toggle Ripple / Undo Ripple */}
                        {postHasReposted ? (
                          <button onClick={handleRippleToggle} className="w-full flex items-center gap-2 text-left px-5 py-3.5 text-[14px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-b border-gray-100 dark:border-[#272729]">
                            <X size={16} /> Undo Ripple
                          </button>
                        ) : (
                          <button onClick={handleRippleToggle} className="w-full flex items-center gap-2 text-left px-5 py-3.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]">
                            <Repeat2 size={16} /> Ripple
                          </button>
                        )}
                        
                        {/* 2. ALWAYS Show Quote Ripple - Safely Outside the Condition! */}
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsQuoteModalOpen(true); setShowRippleMenu(false); }} className="w-full flex items-center gap-2 text-left px-5 py-3.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <Pencil size={16} /> Quote Ripple
                        </button>

                      </div>
                    )}
                 </div>

                 <button onClick={handleBookmark} className={`flex items-center justify-center p-2 transition-all hover:text-blue-500 dark:hover:text-blue-400 ${isBookmarked ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <Bookmark size={22} className={isBookmarked ? 'fill-current' : ''} />
                 </button>

                 <div className="relative" ref={shareMenuRef}>
                    <button onClick={() => { setShowShareMenu(!showShareMenu); setShowRippleMenu(false); setShowPostMenu(false); }} className="flex items-center justify-center p-2 transition-all hover:text-purple-500 dark:hover:text-purple-400 text-gray-400 dark:text-gray-500">
                       <Share2 size={22} />
                    </button>
                    {showShareMenu && (
                      <div className="absolute bottom-[110%] right-0 mb-2 w-56 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] rounded-[1.2rem] shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={handleCopyLink} className="w-full flex items-center gap-3 text-left px-4 py-3.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]"><Link size={18} /> Copy link</button>
                        <button onClick={handleNativeShare} className="w-full flex items-center gap-3 text-left px-4 py-3.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]"><Share size={18} /> Share post via ...</button>
                        <button onClick={handleSendChatClick} className="w-full flex items-center gap-3 text-left px-4 py-3.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"><Mail size={18} /> Send via Chat</button>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>

          {/* ── Comments ── */}
          <div className="flex flex-col">
            {comments.length === 0
              ? <div className="py-10 text-center text-gray-400 font-medium text-[15px]">No replies yet. Start the discussion.</div>
              : comments.map(comment => <RecursiveComment key={`${comment.id}-${comment.likeCount}-${comment.hasLiked}`} postId={post.id} comment={comment} level={0} onReplyClick={handleInitiateReply} />)
            }
          </div>
        </div>

        {/* ── Floating composer ── */}
        <div className="fixed bottom-6 w-[calc(100%-24px)] max-w-[580px] z-50">
          <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-xl border border-gray-200 dark:border-[#272729] rounded-[2rem] p-2.5 shadow-2xl transition-all">
            {activeReplyParentId && (
              <div className="text-[12px] text-blue-600 dark:text-blue-400 font-bold mb-2 flex items-center justify-between px-3 pt-1">
                <span>Replying to thread...</span>
                <button onClick={() => { setActiveReplyParentId(null); setReplyText(''); }} className="text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium">Cancel</button>
              </div>
            )}
            {(gifUrl || imagePreview) && (
              <div className="relative mb-2 ml-3">
                <img src={gifUrl || imagePreview} alt="Attachment" className="h-32 rounded-xl border border-gray-200 dark:border-[#272729] object-cover" />
                <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1"><X size={14} /></button>
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* --- NEW: GHOST DIV MENTION HIGHLIGHTING --- */}
              <div className="relative flex-1 h-10 overflow-hidden bg-gray-50/50 dark:bg-[#111]/50 rounded-xl border border-gray-200 dark:border-[#272729]">
                
                {/* 1. Background "Ghost" Div for Colored Text */}
                <div 
                  ref={ghostRef}
                  className="absolute inset-0 px-3 flex items-center whitespace-pre overflow-hidden text-[15px] font-medium pointer-events-none"
                >
                  {!replyText ? (
                    <span className="text-gray-400">Add to the discussion...</span>
                  ) : (
                    replyText.split(/(@[a-zA-Z0-9_]+)/g).map((part, i) =>
                      part.startsWith('@') 
                        ? <span key={i} className="text-blue-600 dark:text-blue-400">{part}</span> 
                        : <span key={i} className="text-gray-900 dark:text-white">{part}</span>
                    )
                  )}
                </div>
                
                {/* 2. Invisible Input on Top (Only Caret is Visible) */}
                <input 
                  ref={inputRef} 
                  type="text" 
                  value={replyText} 
                  onChange={(e) => setReplyText(e.target.value)} 
                  onScroll={(e) => { if (ghostRef.current) ghostRef.current.scrollLeft = e.currentTarget.scrollLeft; }}
                  className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-blue-600 dark:caret-blue-400 border-none px-3 focus:outline-none text-[15px] font-medium z-10" 
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()} 
                  spellCheck={false}
                />
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
              <button onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-full transition-colors ${imageFile ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}><ImageIcon size={20} /></button>
              <div className="relative" ref={gifMenuRef}>
                <button onClick={() => setShowGifPicker(!showGifPicker)} className={`p-2.5 rounded-full transition-colors flex items-center justify-center ${gifUrl ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#272729]'}`}>
                  <div className="font-black text-[10px] border-2 border-current px-1 rounded flex items-center justify-center h-[20px]">GIF</div>
                </button>
                {showGifPicker && (
                  <div className="absolute bottom-full right-0 mb-4 shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] animate-in slide-in-from-bottom-2 duration-200 z-50">
                    <GiphyPicker onSelect={(url) => { setGifUrl(url); setImageFile(null); setImagePreview(''); setShowGifPicker(false); }} />
                  </div>
                )}
              </div>
              <button onClick={handleSubmitReply} disabled={(!replyText.trim() && !gifUrl && !imageFile) || isReplying} className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.1rem] flex items-center justify-center transition-all disabled:opacity-50 disabled:bg-gray-200 dark:disabled:bg-[#272729] shrink-0">
                {isReplying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
              </button>
            </div>
          </div>
        </div>

      </div>

      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} username={post.username} />
      <QuoteRippleModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} post={post} onSuccess={() => { setPostHasReposted(true); setPostRepostCount(prev => prev + 1); }} />
      <ShareToChatModal isOpen={isShareChatModalOpen} onClose={() => setIsShareChatModalOpen(false)} post={post} />

      {/* --- LIKERS / REPOSTERS MODAL --- */}
      {userListConfig.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setUserListConfig(prev => ({...prev, isOpen: false}))}}></div>
          
          {/* Note: max-w-xl and max-h-[85vh] to accommodate full post cards beautifully */}
          <div className="relative bg-white dark:bg-[#0a0a0a] w-full max-w-xl rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-[#272729]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1a1a1a] shrink-0">
              <h2 className="font-display font-bold text-gray-900 dark:text-white text-lg">{userListConfig.title}</h2>
              <button onClick={() => setUserListConfig(prev => ({...prev, isOpen: false}))} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-full transition-colors text-gray-900 dark:text-white"><X size={20} /></button>
            </div>

            {/* Stats Header & Toggle for Reposts */}
            {userListConfig.type === 'reposts' && (
               <div className="flex w-full border-b border-gray-100 dark:border-[#1a1a1a] shrink-0">
                  <button onClick={() => setActiveRepostTab('plain')} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors relative ${activeRepostTab === 'plain' ? 'bg-blue-50/50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-[#111]'}`}>
                    <span className="text-gray-900 dark:text-white text-lg font-black">{repostStats.plain}</span>
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${activeRepostTab === 'plain' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Ripples</span>
                    {activeRepostTab === 'plain' && <div className="absolute bottom-0 w-1/2 h-[3px] bg-blue-500 rounded-t-full"></div>}
                  </button>
                  <div className="w-[1px] bg-gray-100 dark:bg-[#1a1a1a]"></div>
                  <button onClick={() => setActiveRepostTab('quotes')} className={`flex-1 py-3 flex flex-col items-center justify-center transition-colors relative ${activeRepostTab === 'quotes' ? 'bg-blue-50/50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-[#111]'}`}>
                    <span className="text-gray-900 dark:text-white text-lg font-black">{repostStats.quotes}</span>
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${activeRepostTab === 'quotes' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Quotes</span>
                    {activeRepostTab === 'quotes' && <div className="absolute bottom-0 w-1/2 h-[3px] bg-blue-500 rounded-t-full"></div>}
                  </button>
               </div>
            )}

            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#030303]">
              {loadingUsers ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
              ) : userListConfig.type === 'reposts' && activeRepostTab === 'quotes' ? (
                quoteList.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 text-sm font-medium">No quotes yet.</div>
                ) : (
                  quoteList.map(q => {
                    // MAPPING HACK: We map the lightweight quote object from the backend into a full Post object.
                    // By passing `originalPost: post`, PostCard will automatically embed the current post inside it, exactly like Twitter!
                    const quotePost: Post = {
                      id: q.postId || q.id || Math.random(),
                      username: q.username || 'unknown',
                      displayName: q.displayName || q.username,
                      avatarUrl: q.avatarUrl,
                      caption: q.caption || q.body || '',
                      media: q.media || [],
                      likeCount: q.likeCount || 0,
                      commentCount: q.commentCount || 0,
                      repostCount: q.repostCount || 0,
                      viewCount: q.viewCount || 0,
                      hasLiked: q.hasLiked || false,
                      createdAt: q.createdAt || new Date().toISOString(),
                      postType: 'repost',
                      originalPost: post 
                    };

                    return (
                      <div 
                        key={quotePost.id} 
                        // The [&>*] targets the PostCard inside and strips its background, borders, and rounded corners!
                        className="border-b border-gray-100 dark:border-[#1a1a1a] [&>*]:!bg-transparent [&>*]:!rounded-none [&>*]:!border-none [&>*]:!shadow-none [&>*]:!mb-0"
                      >
                        <PostCard post={quotePost} />
                      </div>
                    );
                  })
                )
              ) : (
                <div className="p-2">
                  {userList.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm font-medium">No users found.</div>
                  ) : (
                    userList.map(u => (
                      <div key={u.id || u.username} onClick={() => { setUserListConfig(prev => ({...prev, isOpen: false})); navigate(`/profile/${u.username}`); }} className="flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-[#111] rounded-2xl transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-[#272729]">
                            <img src={u.avatarUrl || u.avatar_url || `https://ui-avatars.com/api/?name=${u.displayName || u.name || 'U'}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{u.displayName || u.name}</p>
                            <p className="text-[12px] font-medium text-gray-500 truncate">@{u.username}</p>
                          </div>
                        </div>
                        
                        <div className="shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                          {currentUser?.username === u.username ? (
                            <span className="px-3 py-1 bg-gray-200 dark:bg-[#272729] text-gray-500 dark:text-gray-400 text-[11px] font-extrabold rounded-full uppercase tracking-wider">YOU</span>
                          ) : u.isFriend ? (
                            null
                          ) : (
                            <button
                              onClick={(e) => handleModalConnect(e, u.username)}
                              disabled={u.isRequested}
                              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${u.isRequested ? 'bg-gray-100 dark:bg-[#272729] text-gray-500 cursor-default' : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'}`}
                            >
                              {u.isRequested ? 'Sent' : 'Connect'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PREMIUM POST ACTIVITY MODAL --- */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setIsActivityModalOpen(false)}}></div>
          <div className="relative bg-white dark:bg-[#0a0a0a] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-[#272729]" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#1a1a1a] shrink-0">
              <h2 className="font-display font-extrabold text-gray-900 dark:text-white text-xl tracking-tight">Post Analytics</h2>
              <button onClick={() => setIsActivityModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-full transition-colors text-gray-900 dark:text-white"><X size={20} strokeWidth={2.5} /></button>
            </div>

            <div className="p-6">
              {loadingActivity ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
              ) : activityData ? (
                <div className="space-y-6">
                  
                  {/* --- Mini Post Preview --- */}
                  {post && (
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-[#272729]">
                      <div className="flex items-center gap-2 mb-2">
                         <div className="w-5 h-5 rounded-full overflow-hidden shrink-0"><img src={post.avatarUrl || `https://ui-avatars.com/api/?name=${post.displayName}`} className="w-full h-full object-cover" /></div>
                         <span className="font-bold text-[13px] text-gray-900 dark:text-white truncate">{post.displayName}</span>
                         <span className="text-[12px] text-gray-500 truncate">
                           @{post.username} · {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                         </span>
                      </div>
                      <p className="text-[13px] text-gray-700 dark:text-gray-300 line-clamp-2">{post.caption || "Media post"}</p>
                    </div>
                  )}

                  {/* --- Core Engagement Stats --- */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#272729]">
                       <Zap size={18} strokeWidth={2.5} className="text-amber-500 mb-1.5" />
                       <span className="text-xl font-black text-gray-900 dark:text-white">{activityData.likeCount || 0}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#272729]">
                       <Repeat2 size={18} strokeWidth={2.5} className="text-green-500 mb-1.5" />
                       <span className="text-xl font-black text-gray-900 dark:text-white">{(activityData.repostCount || 0) + (activityData.quoteCount || 0)}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#272729]">
                       <MessageCircle size={18} strokeWidth={2.5} className="text-blue-500 mb-1.5" />
                       <span className="text-xl font-black text-gray-900 dark:text-white">{activityData.commentCount || 0}</span>
                    </div>
                  </div>

                  {/* --- Deep Analytics Grid --- */}
                  <div className="grid grid-cols-2 gap-y-8 gap-x-6 pt-4 px-2">
                    <div className="flex flex-col">
                       <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                         <span className="text-[10px] font-extrabold uppercase tracking-widest">Impressions</span>
                       </div>
                       <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{activityData.impressions?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex flex-col">
                       <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                         <span className="text-[10px] font-extrabold uppercase tracking-widest">Engagements</span>
                       </div>
                       <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{activityData.engagements?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex flex-col">
                       <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                         <span className="text-[10px] font-extrabold uppercase tracking-widest">Profile Visits</span>
                       </div>
                       <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{activityData.profileVisits?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex flex-col">
                       <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                         <span className="text-[10px] font-extrabold uppercase tracking-widest">Detail Expands</span>
                       </div>
                       <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{activityData.detailExpands?.toLocaleString() || 0}</span>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-10 text-gray-500 text-sm font-medium">No activity data found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ============================================================================
// RECURSIVE COMMENT
// ============================================================================
function RecursiveComment({ postId, comment, level, onReplyClick }: { postId: number, comment: CommentType, level: number, onReplyClick: (parentId: number, username: string) => void }) {
  const currentUser = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [replies, setReplies] = useState<CommentType[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [hasLiked, setHasLiked] = useState(comment.hasLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRequested, setIsRequested] = useState(false); 
  
  const [hasReposted, setHasReposted] = useState((comment as any).hasReposted || false);
  const [isReposting, setIsReposting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setShowMenu(false));

  const replyCount = (comment as any).replyCount || 0;

  const handleSpark = async () => {
    const newStatus = !hasLiked; setHasLiked(newStatus); setLikeCount(prev => newStatus ? prev + 1 : Math.max(0, prev - 1));
    try { if (newStatus) await api.post(`/arena/comments/${comment.id}/like`); else await api.delete(`/arena/comments/${comment.id}/like`); } catch { }
  };

  const handleCommentRipple = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReposting) return;
    setIsReposting(true);
    try {
      if (hasReposted) {
        alert("Undoing ripples on comments is not supported yet.");
      } else {
        await api.post(`/arena/comments/${comment.id}/repost`);
        setHasReposted(true);
        alert("Comment rippled to your feed!");
      }
    } catch {
      alert("Failed to ripple comment.");
    } finally {
      setIsReposting(false);
    }
  };

  const fetchReplies = async () => {
    if (showReplies) return setShowReplies(false);
    setShowReplies(true);
    if (replies.length === 0) {
      setLoadingReplies(true);
      try {
        const res = await api.get(`/arena/posts/${postId}/comments?parentId=${comment.id}&limit=20`);
        setReplies(Array.isArray(res) ? res : (res.data || []));
      } finally { setLoadingReplies(false); }
    }
  };

  const handleDeleteComment = async () => {
    if (!window.confirm("Delete this comment?")) return;
    try { await api.delete(`/arena/posts/${postId}/comments/${comment.id}`); setIsDeleted(true); } catch { }
  };

  const handleConnectClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    try {
      await api.post('/friends/request', { target_username: comment.username });
      setIsRequested(true);
      alert("Connection request sent!");
    } catch {
      alert("Failed to send request.");
    }
  };

  if (isDeleted) return null;

  // REMOVED: if (isDeleted) return null;

  return (
    <div className={`px-2 ${level === 0 ? 'py-4 border-b border-gray-100 dark:border-[#1a1a1a]' : 'pt-3'}`}>
      <div className="flex gap-3">
        
        {/* --- Avatar Column --- */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" onClick={(e) => { if(!isDeleted) { e.stopPropagation(); navigate(`/profile/${comment.username}`); } }}>
          {isDeleted ? (
            <div className={`rounded-full bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-[#272729] flex items-center justify-center shrink-0 ${level === 0 ? "w-10 h-10" : "w-8 h-8"}`}>
               <X size={16} className="text-gray-400" strokeWidth={2} />
            </div>
          ) : (
            <SmartAvatar username={comment.username} displayName={comment.displayName} initialUrl={(comment as any).avatarUrl} sizeClass={level === 0 ? "w-10 h-10" : "w-8 h-8"} />
          )}
          {showReplies && replies.length > 0 && <div className="w-[2px] flex-1 bg-gray-300 dark:bg-[#272729] rounded-full my-1" />}
        </div>

        {/* --- Content Column --- */}
        <div className="flex-1 pb-1">
          
          {isDeleted ? (
            // --- DELETED TOMBSTONE UI ---
            <div className="py-1 mb-2">
               <span className="bg-gray-100 dark:bg-[#111] text-gray-500 dark:text-gray-400 text-[13px] italic px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#272729]">
                 This comment was deleted by the user.
               </span>
            </div>
          ) : (
            // --- NORMAL COMMENT UI ---
            <>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${comment.username}`); }}>
                  <span className="font-bold text-[15px] text-gray-900 dark:text-white leading-tight hover:underline cursor-pointer">{comment.displayName || comment.username}</span>
                  <span className="text-[14px] text-gray-500 font-medium">@{comment.username}</span>
                </div>
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a1a1a]">
                    <MoreHorizontal size={16} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-6 w-44 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] rounded-xl shadow-lg z-50 overflow-hidden">
                      {currentUser?.username === comment.username ? (
                        <button onClick={handleDeleteComment} className="w-full flex items-center gap-2 text-left px-4 py-3 text-[13px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">Delete</button>
                      ) : (
                        <>
                          {!isRequested && (
                            <button onClick={handleConnectClick} className="w-full flex items-center gap-2 text-left px-4 py-3 text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-[#272729] transition-colors">
                              <UserPlus size={15} /> Connect
                            </button>
                          )}
                          <button onClick={() => { setIsReportModalOpen(true); setShowMenu(false); }} className="w-full flex items-center gap-2 text-left px-4 py-3 text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <Flag size={15} /> Report
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {(comment as any).gifUrl && <img src={(comment as any).gifUrl} alt="GIF" className="max-w-[200px] rounded-xl border border-gray-200 dark:border-[#272729] mt-2 mb-1" />}
              {comment.media && comment.media.length > 0 && <img src={comment.media[0].url} alt="Media" className="max-w-[250px] rounded-xl border border-gray-200 dark:border-[#272729] mt-2 mb-1 object-cover" />}

              <p className="text-[15px] text-gray-800 dark:text-gray-200 mt-1 mb-2.5 whitespace-pre-wrap leading-normal">
                {comment.body.split(/(@[a-zA-Z0-9_]+)/g).map((part, i) =>
                  part.startsWith('@') ? <span key={i} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{part}</span> : part
                )}
              </p>

              <div className="flex items-center gap-4 text-gray-500">
                <button onClick={handleSpark} className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${hasLiked ? 'text-amber-500 dark:text-amber-400' : 'hover:text-amber-500 dark:hover:text-amber-400'}`}>
                  <Zap size={15} className={hasLiked ? 'fill-amber-500' : ''} /> {likeCount > 0 && likeCount}
                </button>
                <button onClick={() => onReplyClick(level >= 2 ? (comment as any).parentId || comment.id : comment.id, comment.username)} className="flex items-center gap-1.5 text-[13px] font-bold hover:text-blue-500 transition-colors">
                  <MessageCircle size={15} /> Reply
                </button>
                <button onClick={handleCommentRipple} disabled={isReposting} className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${hasReposted ? 'text-green-500 dark:text-green-400' : 'hover:text-green-500 dark:hover:text-green-400'}`}>
                  {isReposting ? <Loader2 size={15} className="animate-spin" /> : <Repeat2 size={15} className={hasReposted ? 'text-green-500' : ''} />} 
                  Ripple
                </button>
              </div>
            </>
          )}

          {/* --- ALWAYS RENDER REPLY TOGGLE (Even if parent is deleted!) --- */}
          {replyCount > 0 && (
            <button onClick={fetchReplies} className={`text-[13px] font-bold text-blue-600 dark:text-blue-400 hover:underline ${isDeleted ? 'mt-0' : 'mt-2 block'}`}>
              {loadingReplies ? <Loader2 size={12} className="animate-spin inline mr-1" /> : showReplies ? 'Hide replies' : `View ${replyCount} repl${replyCount > 1 ? 'ies' : 'y'}`}
            </button>
          )}
        </div>
      </div>
      
      {/* --- REPLIES CONTAINER (Remains untouched by deletion!) --- */}
      {showReplies && <div className="ml-[1.15rem]">{replies.map(r => <RecursiveComment key={`${r.id}-${r.likeCount}-${r.hasLiked}`} postId={postId} comment={r} level={level + 1} onReplyClick={onReplyClick} />)}</div>}
      
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} username={comment.username} />
    </div>
  );
}