import { Flame, MessageCircle, Repeat2, Share2, MoreHorizontal, Zap, Loader2, X, Pencil, Check, Link, Share, Mail, Search, UserPlus, Flag, Pin, Bookmark, BarChart2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import QuoteRippleModal from './QuoteRippleModal'; 
import ReportModal from '../ReportModal'; 
import { useAuthStore } from '../../store/useAuthStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useBookmarkStore } from '../../store/useBookmarkStore';

export interface MediaItem {
  url: string;
  mediaType: 'image' | 'video';
  width: number;
  height: number;
  previewHash: string;
}

export interface Comment {
  id: number;
  username: string;
  displayName: string;
  media: MediaItem[];
  body: string;
  createdAt: string;
  likeCount: number;
  hasLiked: boolean;
  replyCount?: number;
}

export interface Post {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  caption: string;
  media: MediaItem[];
  hasLiked: boolean;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  postType?: 'post' | 'repost'; 
  originalPost?: Post; 
  isPinned?: boolean;
  isBookmarked?: boolean;
  viewCount?: number;
  hasReposted?: boolean;
}

interface PostCardProps {
  post: Post;
  isProfileView?: boolean;
  isOwnProfile?: boolean; 
  onDeleted?: () => void;
  onPinned?: (newPinState: boolean) => void;
  onBookmarkToggled?: (isBookmarked: boolean) => void;
}

// --- EXPORTED SHARE TO CHAT MODAL ---
export function ShareToChatModal({ isOpen, onClose, post }: { isOpen: boolean, onClose: () => void, post: Post | null }) {
  const currentUser = useAuthStore(state => state.user);
  const { sendRaw, isConnected } = useWebSocket();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'groups'>('all'); 
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.get('/rooms?limit=50')
        .then(res => {
          const rawRoomsData = res.data || res;
          let fetchedRooms = rawRoomsData.rooms || (Array.isArray(rawRoomsData) ? rawRoomsData : []);
          const usersMap = rawRoomsData.users || {};

          fetchedRooms = fetchedRooms.map((room: any) => {
            if (room.member_ids && Array.isArray(room.member_ids)) {
              room.members = room.member_ids.map((id: string) => {
                const userDetails = usersMap[id];
                return userDetails ? { id, ...userDetails } : { id };
              });
            }

            if ((room.type === 'DM' || !room.type || room.type === 'private' || room.type === 'private_dm') && room.members) {
              const partner = room.members.find((m: any) => String(m.id) !== String(currentUser?.id));
              if (partner) {
                room.name = partner.name || partner.displayName || partner.username;
                room.friend_username = partner.username;
                room.avatar_url = partner.avatar_url || partner.avatarUrl;
              }
            } else if (room.type === 'group' || room.type === 'GROUP') {
              room.name = room.name || room.group_name;
              room.avatar_url = room.group_avatar || room.avatarUrl || room.avatar_url;
            }
            return room;
          });

          setRooms(fetchedRooms);
        })
        .catch(() => console.error("Failed to load rooms for sharing"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentUser?.id]);

  if (!isOpen || !post) return null;

  const handleSend = async (roomId: string) => {
    if (!isConnected) { alert("You are currently offline. Cannot send message."); return; }
    setSendingTo(roomId);
    try {
      const postUrl = `${window.location.origin}/post/${post.id}`;
      const messageText = `Check out this post by @${post.username}:\n${postUrl}`;
      sendRaw({ type: 'send_message', roomId: roomId, text: messageText, tempId: `tmp_${Date.now()}` });
      setTimeout(() => { setSendingTo(null); alert("Post shared to chat successfully!"); onClose(); }, 400);
    } catch (err) {
      alert("Failed to share post. Please try again."); setSendingTo(null);
    }
  };

  const filteredRooms = rooms.filter(r => {
    const isGroup = r.type === 'group' || r.type === 'GROUP';
    const isDM = r.type === 'DM' || !r.type || r.type === 'private' || r.type === 'private_dm';
    if (activeTab === 'friends' && !isDM) return false;
    if (activeTab === 'groups' && !isGroup) return false;
    const name = (r.name || r.friend_username || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-[#0a0a0a] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-[#272729]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1a1a1a] shrink-0">
          <h2 className="font-display font-bold text-gray-900 dark:text-white text-lg">Send to Chat</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] rounded-full transition-colors text-gray-900 dark:text-white"><X size={20} /></button>
        </div>
        <div className="p-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search active chats or groups..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all shadow-inner" />
          </div>
        </div>
        <div className="flex w-full border-b border-gray-100 dark:border-[#1a1a1a] shrink-0">
          {['all', 'friends', 'groups'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 text-[13px] font-bold transition-colors relative capitalize ${activeTab === tab ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-[#111]'}`}>
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-blue-500 rounded-t-full"></div>}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={24} /></div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm font-medium">No chats found.</div>
          ) : (
            filteredRooms.map(room => {
              const displayName = room.name || `User_${room.room_id.substring(0,4)}`;
              const isGroup = room.type === 'group' || room.type === 'GROUP';
              return (
                <div key={room.room_id || room.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#111] rounded-2xl transition-colors cursor-pointer" onClick={() => handleSend(room.room_id || room.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0 border ${isGroup ? 'bg-blue-600 border-blue-700' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-[#272729]'}`}>
                      {room.avatar_url || room.avatarUrl ? <img src={room.avatar_url || room.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">{isGroup ? 'Squad' : 'Direct Message'}</p>
                    </div>
                  </div>
                  <button disabled={sendingTo === (room.room_id || room.id)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-all disabled:opacity-50 shrink-0">
                    {sendingTo === (room.room_id || room.id) ? <Loader2 size={14} className="animate-spin" /> : "Send"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN POST CARD
// ============================================================================
export default function PostCard({ post, isProfileView = false, isOwnProfile = false, onDeleted, onPinned, onBookmarkToggled }: PostCardProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  
  // 1. Identify the post type BEFORE defining targetPost
  const isRepost = post.postType === 'repost';
  const isPlainRepost = isRepost && (!post.caption || post.caption.trim().length === 0);
  // --- UPGRADED: A Quote Ripple has text, OR media, OR a GIF! ---
  const isQuoteRipple = isRepost && (
    (post.caption && post.caption.trim().length > 0) || 
    (post.media && post.media.length > 0) || 
    (post as any).gifUrl
  );
  const isFastRipple = isPlainRepost && post.originalPost;
  
  // 2. Identify the TRUE target post for stats!
  const targetPost = (isPlainRepost && post.originalPost) ? post.originalPost : post;
  
  // 3. Set up display variables
  const displayAuthor = isFastRipple && post.originalPost ? post.originalPost : post;
  const displayCaption = isFastRipple && post.originalPost ? post.originalPost.caption : post.caption;
  const displayMedia = isFastRipple && post.originalPost ? post.originalPost.media : post.media;

  // Initialize all engagement states using targetPost!
  const [hasLiked, setHasLiked] = useState(targetPost.hasLiked || false);
  const [likeCount, setLikeCount] = useState(targetPost.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);

  const [hasReposted, setHasReposted] = useState(targetPost.hasReposted || false);
  const [repostCount, setRepostCount] = useState(targetPost.repostCount || 0);
  const [isReposting, setIsReposting] = useState(false);


  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showRippleMenu, setShowRippleMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isShareChatModalOpen, setIsShareChatModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [isFriend, setIsFriend] = useState(false);
  const [friendRequested, setFriendRequested] = useState(false);

  const postMenuRef = useRef<HTMLDivElement>(null);
  const rippleMenuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) setShowPostMenu(false);
      if (rippleMenuRef.current && !rippleMenuRef.current.contains(event.target as Node)) setShowRippleMenu(false);
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) setShowShareMenu(false);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleSpark = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (isLiking) return;
    const newStatus = !hasLiked; setHasLiked(newStatus); setLikeCount(prev => newStatus ? prev + 1 : Math.max(0, prev - 1)); setIsLiking(true);
    try {
      if (newStatus) await api.post(`/arena/posts/${targetPost.id}/like`);
      else await api.delete(`/arena/posts/${targetPost.id}/like`);
    } catch { setHasLiked(!newStatus); setLikeCount(prev => !newStatus ? prev + 1 : Math.max(0, prev - 1)); }
    finally { setIsLiking(false); }
  };

  const handleRippleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    if (isReposting) return; 
    
    setIsReposting(true); 
    setShowRippleMenu(false);
    
    if (hasReposted) {
      // --- UPGRADED UNDO LOGIC (Hits the parent post directly!) ---
      try { 
        await api.delete(`/arena/posts/${targetPost.id}/repost`); 
        setHasReposted(false); 
        setRepostCount(prev => Math.max(0, prev - 1)); 
        
      } catch {
        alert("Failed to undo ripple.");
      }
    } else {
      try {
        await api.post(`/arena/posts/${targetPost.id}/repost`, { caption: "" });
        
        setHasReposted(true); 
        setRepostCount(prev => prev + 1);
      } catch {
        alert("Failed to ripple.");
      }
    }
    
    setIsReposting(false);
  };

  const handleDeletePost = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setShowPostMenu(false);
    if (!window.confirm("Are you sure you want to permanently delete this post?")) return;
    try { await api.delete(`/arena/posts/${post.id}`); if (onDeleted) onDeleted(); }
    catch { alert("Failed to delete post."); }
  };

  const [isPinning, setIsPinning] = useState(false);

  const handlePinPost = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setShowPostMenu(false);
    setIsPinning(true);
    
    // Force it to a strict boolean!
    const isCurrentlyPinned = !!(post as any).isPinned;
    
    try {
      if (isCurrentlyPinned) {
        await api.delete(`/arena/posts/${post.id}/pin`);
      } else {
        await api.post(`/arena/posts/${post.id}/pin`);
      }
      
      if (onPinned) onPinned(!isCurrentlyPinned);
    } catch (err) {
      alert(`Failed to ${isCurrentlyPinned ? 'unpin' : 'pin'} post. Please try again.`);
    } finally {
      setIsPinning(false);
    }
  };

  // --- REPLACED LOCAL STATE WITH GLOBAL STORE ---
  const { bookmarkedIds, toggleBookmark, syncInitialState } = useBookmarkStore();
  const [toastMsg, setToastMsg] = useState<{text: string, icon: 'check' | 'bookmark'} | null>(null);

  // Sync with backend on load, but global store takes priority
  useEffect(() => {
    syncInitialState(targetPost.id, targetPost.isBookmarked || false);
  }, [targetPost.id, targetPost.isBookmarked, syncInitialState]);

  // Read the live status from the global store
  const isBookmarked = bookmarkedIds[targetPost.id] || false;

  const showLocalToast = (text: string, icon: 'check' | 'bookmark' = 'check') => {
    setToastMsg({ text, icon });
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const newStatus = !isBookmarked;
    
    // 1. Optimistically update the GLOBAL store immediately!
    toggleBookmark(targetPost.id, newStatus);
    if (onBookmarkToggled) onBookmarkToggled(newStatus);

    try {
      if (newStatus) {
        await api.post(`/arena/posts/${targetPost.id}/bookmark`);
        showLocalToast("Post bookmarked", "bookmark");
      } else {
        await api.delete(`/arena/posts/${targetPost.id}/bookmark`);
        showLocalToast("Post removed from bookmarks", "bookmark");
      }
    } catch {
      // Revert global store on failure
      toggleBookmark(targetPost.id, !newStatus);
      if (onBookmarkToggled) onBookmarkToggled(!newStatus);
      alert("Failed to update bookmark.");
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    // Fire the analytics endpoint silently in the background
    api.post(`/arena/posts/${post.id}/profile-click`).catch(() => {});
    navigate(`/profile/${displayAuthor.username}`);
  };

  const handleAddFriend = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setShowPostMenu(false);
    try {
      await api.post(`/friends/request`, { target_username: post.username });
      setIsFriend(true); setFriendRequested(true);
    } catch { alert("Failed to send request."); }
  };

  const getPostUrl = () => `${window.location.origin}/post/${targetPost.id}`;

  // Change this function
const handleCopyLink = (e: React.MouseEvent) => {
  e.preventDefault(); e.stopPropagation();
  navigator.clipboard.writeText(getPostUrl()).then(() => {
    showLocalToast("Link copied to clipboard", "check"); // <-- Use the new toast!
    setShowShareMenu(false);
  }).catch(() => alert("Failed to copy link."));
};

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setShowShareMenu(false);
    const shareData = { title: `zQuab Post`, text: post.caption ? `"${post.caption}"` : 'Check out this discussion!', url: getPostUrl() };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err: any) { if (err.name !== 'AbortError') handleCopyLink(e); }
    } else { handleCopyLink(e); }
  };

  const handleSendChatClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setShowShareMenu(false); setIsShareChatModalOpen(true);
  };

  const engagementScore = likeCount + (targetPost.commentCount || 0) + repostCount;
  const isHot = engagementScore > 20;
  const isOwnPost = currentUser?.username === displayAuthor.username;

  return (
    <>
      <div
        onClick={() => navigate(`/post/${targetPost.id}`)}
        className={`relative rounded-[2rem] p-5 transition-all duration-300 bg-white dark:bg-[#0a0a0a] border cursor-pointer hover:-translate-y-1 ${
          isHot
            ? 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)] mt-3'
            : 'border-gray-200 dark:border-[#272729] shadow-sm hover:shadow-md'
        }`}
      >
        
        {/* ── Copied toast ── */}
        {toastMsg && (
          <div className="absolute top-4 right-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-2 fade-in duration-200 z-50">
            {toastMsg.icon === 'check' ? <Check size={16} className="text-green-500" /> : <Bookmark size={16} className="text-blue-500 fill-blue-500" />}
            {toastMsg.text}
          </div>
        )}

        {/* ── High Heat badge ── */}
        {isHot && (
          <div className="absolute -top-3.5 left-6 bg-gradient-to-r from-[#FF512F] to-[#DD2476] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-lg z-10 border-2 border-white dark:border-[#0a0a0a]">
            <Flame size={12} className="animate-pulse fill-white" /> High Heat
          </div>
        )}

        {/* ── Repost label ── */}
        {/* ONLY show the ripple header for plain ripples (no caption) */}
      {isRepost && !isQuoteRipple && (
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-gray-500 px-4 pt-3 pb-1">
          <Repeat2 size={14} /> {post.displayName || post.username} rippled
        </div>
      )}

        {/* ══ HEADER: avatar + name + actions ══════════════════════════════ */}
        <div className="flex items-center justify-between mb-4 mt-1">

          {/* Left: avatar + name */}
          <div
            className="flex items-center gap-3"
            onClick={handleProfileClick}
          >
            <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-[#343536] hover:opacity-80 transition-opacity">
              <img src={displayAuthor.avatarUrl || `https://ui-avatars.com/api/?name=${displayAuthor.displayName || 'U'}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col hover:opacity-80 transition-opacity">
              <span className="font-bold text-[15px] text-gray-900 dark:text-white leading-tight">{displayAuthor.displayName}</span>
              <div className="flex items-center gap-1 text-[12px] text-gray-500 font-medium">
                {/* CHANGED: Use targetPost.createdAt so it shows the original author's timestamp! */}
                <span>@{displayAuthor.username}</span><span>·</span><span>{formatTimeAgo(targetPost.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Right: actions — responsive */}
          <div className="flex items-center gap-1">

            {/* --- NEW CLEAN PIN ICON --- */}
            {/* ONLY show the pin if we are on a profile page! */}
            {post.isPinned && isProfileView && (
              <div className="text-blue-500 flex items-center justify-center p-1.5" title="Pinned Post">
                <Pin size={18} className="fill-current" />
              </div>
            )}

            {/* ── DESKTOP: inline icon buttons (sm and up) ── */}
            {!isOwnPost && (
              <>
                {/* Add Friend — only if not already sent */}
                {!isFriend && (
                  <button
                    onClick={handleAddFriend}
                    title={friendRequested ? 'Request sent' : 'Add friend'}
                    className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-150 ${
                      friendRequested
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default'
                        : 'border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:border-blue-700 dark:hover:text-blue-400'
                    }`}
                  >
                    <UserPlus size={14} strokeWidth={2.5} />
                  </button>
                )}

                {/* Report */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsReportModalOpen(true); }}
                  title="Report post"
                  className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl border border-gray-200 dark:border-[#2A2A2A] bg-gray-50 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:border-red-700 dark:hover:text-red-400 transition-all duration-150"
                >
                  <Flag size={14} strokeWidth={2.5} />
                </button>
              </>
            )}

            {/* ── THREE DOTS: always on mobile, only for own-post actions on desktop ── */}
            <div className="relative" ref={postMenuRef}>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPostMenu(!showPostMenu); setShowShareMenu(false); setShowRippleMenu(false); }}
                className={`flex items-center justify-center w-8 h-8 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-[#2A2A2A] text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-150 ${
                  // On desktop, only show three dots for own posts (delete action). For others, the inline buttons cover it.
                  // On mobile, always show three dots.
                  !isOwnPost ? 'sm:hidden' : ''
                }`}
              >
                <MoreHorizontal size={18} />
              </button>

              {showPostMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] rounded-[1.2rem] shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                {isOwnPost ? (
                  <>
                    {/* --- ADD THIS PIN BUTTON --- */}
                    {isOwnProfile && (
                       <button onClick={handlePinPost} disabled={isPinning} className="w-full flex items-center gap-2 text-left px-5 py-3.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]">
                         {isPinning ? <Loader2 size={16} className="animate-spin" /> : "📌"} 
                         {post.isPinned ? "Unpin Post" : "Pin to profile"}
                       </button>
                    )}
                    {/* Existing delete button */}
                    <button
                      onClick={handleDeletePost}
                      className="w-full text-left px-5 py-3.5 text-[14px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      Delete Post
                    </button>
                  </>
                ) : (
                    // Mobile only — other user's post: add friend + report in dropdown
                    <>
                      {!isFriend && (
                        <button
                          onClick={handleAddFriend}
                          className="w-full flex items-center gap-2 px-5 py-3 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]"
                        >
                          <UserPlus size={16} /> Add Friend
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsReportModalOpen(true); setShowPostMenu(false); }}
                        className="w-full flex items-center gap-2 text-left px-5 py-3.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <Flag size={16} /> Report Post
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
        {/* ══ END HEADER ══════════════════════════════════════════════════ */}

        {displayCaption && (
          <p className="text-[16px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap mb-4">{displayCaption}</p>
        )}

        {isQuoteRipple && post.originalPost && (
          <div
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/post/${post.originalPost?.id}`); }}
            className="border border-gray-200 dark:border-[#272729] rounded-2xl p-4 bg-gray-50 dark:bg-[#030303] mb-4 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gray-800 overflow-hidden shrink-0">
                <img src={post.originalPost.avatarUrl || `https://ui-avatars.com/api/?name=${post.originalPost.displayName}&background=random`} className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-[14px] text-gray-900 dark:text-white truncate">{post.originalPost.displayName}</span>
              <span className="text-[13px] text-gray-500 truncate">@{post.originalPost.username} · {formatTimeAgo(post.originalPost.createdAt)}</span>
            </div>
            {post.originalPost.caption && <p className="text-[15px] text-gray-800 dark:text-gray-200 mb-3 line-clamp-3">{post.originalPost.caption}</p>}
            {post.originalPost.media && post.originalPost.media.length > 0 && (
              <div className="w-full h-32 md:h-48 rounded-xl overflow-hidden bg-black">
                {post.originalPost.media[0].mediaType === 'video'
                  ? <video src={post.originalPost.media[0].url} className="w-full h-full object-cover" />
                  : <img src={post.originalPost.media[0].url} className="w-full h-full object-cover" />}
              </div>
            )}
          </div>
        )}

        {displayMedia && displayMedia.length > 0 && (
          <div className="w-full h-64 md:h-[350px] rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-[#272729] bg-black">
            {displayMedia[0].mediaType === 'video'
              ? <video src={displayMedia[0].url} controls onClick={(e) => e.stopPropagation()} className="w-full h-full object-cover" />
              : <img src={displayMedia[0].url} alt="Post media" className="w-full h-full object-cover" loading="lazy" />}
          </div>
        )}

        {/* ── Engagement bar ── */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#1a1a1a] text-gray-400 dark:text-gray-500">

          {/* Spark / Like */}
          <div className="flex items-center group cursor-pointer" onClick={handleSpark}>
            <button className={`p-1.5 transition-colors group-hover:text-amber-500 dark:group-hover:text-amber-400 ${hasLiked ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
              <Zap size={18} strokeWidth={hasLiked ? 2.5 : 2} className={hasLiked ? "fill-amber-500" : ""} />
            </button>
            <span className={`text-xs font-extrabold pr-2 transition-colors group-hover:text-amber-500 dark:group-hover:text-amber-400 ${hasLiked ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {likeCount > 0 ? likeCount.toLocaleString() : ''}
            </span>
          </div>

          {/* Comment */}
          <div className="flex items-center group">
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/post/${targetPost.id}`); }} className="p-1.5 rounded-full transition-colors hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500">
              <MessageCircle size={18} strokeWidth={2} />
            </button>
            <span className="text-xs font-extrabold px-2">
              {(targetPost.commentCount || 0) > 0 ? targetPost.commentCount.toLocaleString() : ''}
            </span>
          </div>

          {/* Ripple */}
          <div className="flex items-center group relative cursor-pointer" ref={rippleMenuRef}>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRippleMenu(!showRippleMenu); setShowShareMenu(false); setShowPostMenu(false); }} 
              disabled={isReposting} 
              className={`p-1.5 transition-colors group-hover:text-green-500 dark:group-hover:text-green-400 ${hasReposted ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}
            >
              {isReposting ? <Loader2 size={18} className="animate-spin" /> : <Repeat2 size={18} strokeWidth={2} />}
            </button>
            
            <span className={`text-xs font-extrabold pr-2 transition-colors group-hover:text-green-500 dark:group-hover:text-green-400 ${hasReposted ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {repostCount > 0 ? repostCount.toLocaleString() : ''}
            </span>
            
            {showRippleMenu && (
              <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-2 w-44 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] rounded-[1.2rem] shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 cursor-default">
                
                {/* 1. Toggle between Undo Ripple and Ripple */}
                {hasReposted ? (
                  <button onClick={handleRippleToggle} className="w-full flex items-center gap-2 text-left px-4 py-3.5 text-[13px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors border-b border-gray-100 dark:border-[#272729]">
                    <X size={16} /> Undo Ripple
                  </button>
                ) : (
                  <button onClick={handleRippleToggle} className="w-full flex items-center gap-2 text-left px-4 py-3.5 text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]">
                    <Repeat2 size={16} /> Ripple
                  </button>
                )}
                
                {/* 2. ALWAYS show Quote Ripple */}
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsQuoteModalOpen(true); setShowRippleMenu(false); }} className="w-full flex items-center gap-2 text-left px-4 py-3.5 text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <Pencil size={16} /> Quote Ripple
                </button>
                
              </div>
            )}
          </div>

          {/* Views */}
          <div className="flex items-center group cursor-default hidden sm:flex">
            <div className="p-1.5">
               <BarChart2 size={18} strokeWidth={2} />
            </div>
            <span className="text-xs font-extrabold px-1">
              {(targetPost.viewCount || 0) > 0 ? targetPost.viewCount?.toLocaleString() : ''}
            </span>
          </div>

          {/* Bookmark & Share container */}
          <div className="flex items-center gap-1">
             <button onClick={handleBookmark} className={`p-1.5 rounded-full transition-colors ${isBookmarked ? 'text-blue-500' : 'hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500'}`}>
                <Bookmark size={18} strokeWidth={2} className={isBookmarked ? "fill-current" : ""} />
             </button>
             
             <div className="relative" ref={shareMenuRef}>
               <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowShareMenu(!showShareMenu); setShowRippleMenu(false); setShowPostMenu(false); }} className="p-1.5 rounded-full transition-colors hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-500">
                 <Share2 size={18} strokeWidth={2} />
               </button>
               {showShareMenu && (
                 <div className="absolute bottom-[100%] right-0 mb-2 w-56 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#272729] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                   <button onClick={handleCopyLink} className="w-full flex items-center gap-3 text-left px-4 py-3 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]">
                     <Link size={18} /> Copy link
                   </button>
                   <button onClick={handleNativeShare} className="w-full flex items-center gap-3 text-left px-4 py-3 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-[#272729]">
                     <Share size={18} /> Share post via ...
                   </button>
                   <button onClick={handleSendChatClick} className="w-full flex items-center gap-3 text-left px-4 py-3 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                     <Mail size={18} /> Send via Chat
                   </button>
                 </div>
               )}
             </div>
          </div>

        </div>
      </div>

      <QuoteRippleModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} post={targetPost} onSuccess={() => { setHasReposted(true); setRepostCount(prev => prev + 1); }} />
      <ShareToChatModal isOpen={isShareChatModalOpen} onClose={() => setIsShareChatModalOpen(false)} post={targetPost} />
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} username={post.username} />
    </>
  );
}