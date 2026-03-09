import { type ReactNode, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { MessageSquare, Heart, Users, LogOut, Settings, Bell, Menu, Search, Home, Loader2, UserPlus, Zap, Video, Rocket, X, CheckCircle2, AlertTriangle, Sun, Moon, Lock, Globe, Volume2, Play } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdCard from '../components/AdCard';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useFriendStore } from '../store/useFriendStore';
import { useThemeStore } from '../store/useThemeStore';
import NotificationsPanel from '../components/NotificationsPanel';
import { api } from '../services/api';
import { useWebSocket } from '../providers/WebSocketProvider';
import { create } from 'zustand'; 

interface DashboardLayoutProps { children: ReactNode; }

interface LayoutCacheState {
  cachedRequestsCount: number;
  hasFetched: boolean;
  hasSeenRequests: boolean;
  setRequestsData: (count: number) => void;
  markRequestsSeen: () => void;
  resetDot: () => void;
}

const useLayoutCache = create<LayoutCacheState>((set) => ({
  cachedRequestsCount: 0,
  hasFetched: false,
  hasSeenRequests: false,
  setRequestsData: (count) => set({ cachedRequestsCount: count, hasFetched: true }),
  markRequestsSeen: () => set({ hasSeenRequests: true }),
  resetDot: () => set({ hasSeenRequests: false }),
}));

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const unreadChatsCount = useNotificationStore((state) => state.unreadChatsCount);
  const pendingFriendsCount = useNotificationStore((state) => state.pendingFriendsCount);
  
  const { friends: sidebarFriends, isLoading: isLoadingFriends, fetchFriends } = useFriendStore();
  const { subscribe } = useWebSocket(); 
  const { theme, toggleTheme } = useThemeStore();
  
  const { cachedRequestsCount, hasFetched, hasSeenRequests, setRequestsData, markRequestsSeen, resetDot } = useLayoutCache();

  const currentYear = new Date().getFullYear();

  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  const handleSidebarScroll = () => {
      if (sidebarScrollRef.current) scrollPositionRef.current = sidebarScrollRef.current.scrollTop;
  };

  useLayoutEffect(() => {
      if (sidebarScrollRef.current) sidebarScrollRef.current.scrollTop = scrollPositionRef.current;
  }, [location.pathname]); 

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'error'|'info'|'warning'} | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const playNotificationSound = () => {
      const audio = new Audio('/notification.mp3'); 
      audio.play().catch(() => {}); 
  };

  const [showSoundTest, setShowSoundTest] = useState(false);
  const soundTestRef = useRef<HTMLDivElement>(null);

  const testSound = (type: 'notification' | 'ringtone' | 'message') => {
     const audio = new Audio(`/${type}.mp3`);
     audio.play().catch(() => showToast(`Missing file: /public/${type}.mp3`, 'error'));
  };

  useEffect(() => {
      const fetchGlobalRequests = async () => {
          if (hasFetched) return; 
          try {
              const dmRes = await api.get('/rooms/requests').catch(() => ({ data: [] }));
              const dmReqs = Array.isArray(dmRes) ? dmRes : dmRes?.data || [];
              setRequestsData(dmReqs.length); 

              const frRes = await api.get('/friends/requests?type=received').catch(() => ({ data: [] }));
              const frReqs = Array.isArray(frRes) ? frRes : frRes?.data || [];
              useNotificationStore.getState().setPendingFriendsCount(frReqs.length);
          } catch (e) {}
      };
      if (user) fetchGlobalRequests();
  }, [user, hasFetched, setRequestsData]);

  useEffect(() => {
      if (!subscribe) return;
      const unsubscribe = subscribe((data: any) => {
          if (data.type === 'friend_request_accepted') {
              fetchFriends(true); 
              playNotificationSound();
          }
          if (data.type === 'friend_request_received') {
              useNotificationStore.getState().incrementPendingFriends();
              playNotificationSound();
              showToast("New friend request received!", "info");
              
              useNotificationStore.getState().addNotification({
                  type: 'FRIEND_REQ',
                  title: 'New Friend Request',
                  message: `Someone wants to connect with you!`,
                  time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  data: data
              });
          }
          if (data.type === 'room_invite') {
              setRequestsData(cachedRequestsCount + 1);
              resetDot(); 
              playNotificationSound();
          }
          
          // FIX: Stop double notification sound on the Stranger Match page!
          if (data.type === 'send_message') {
              const isMe = String(data.from) === String(user?.id) || String(data.sender_id) === String(user?.id);
              const isCurrentlyOnChatsPage = window.location.pathname.includes('/chats');
              const isCurrentlyOnMatchesPage = window.location.pathname.includes('/matches');
              
              // Only play the default message sound if they are NOT the sender, 
              // AND they are NOT actively looking at the DMs page,
              // AND they are NOT actively looking at the Stranger Match page (which handles its own sounds).
              if (!isMe && !isCurrentlyOnChatsPage && !isCurrentlyOnMatchesPage) {
                  playNotificationSound();
              }
          }
      });
      return unsubscribe;
  }, [subscribe, fetchFriends, user?.id, cachedRequestsCount, setRequestsData, resetDot]);

  const totalNotifications = unreadCount + unreadChatsCount + pendingFriendsCount + (hasSeenRequests ? 0 : cachedRequestsCount);
  const showRedDot = totalNotifications > 0;

  const handleOpenNotifications = () => {
      setShowNotifications(true);
      markRequestsSeen(); 
  };
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('sidebarCollapsed') === 'true';
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); 
  
  const searchRef = useRef<HTMLFormElement>(null);
  const mobileSearchRef = useRef<HTMLFormElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clearAndCloseMobileSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setMobileSearchOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSearchDropdown(false);
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
        if (mobileSearchOpen) setMobileSearchOpen(false);
      }
      if (soundTestRef.current && !soundTestRef.current.contains(event.target as Node)) setShowSoundTest(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileSearchOpen]);

  useEffect(() => { if (user) fetchFriends(); }, [user, fetchFriends]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const cleanQuery = searchQuery.trim().replace(/^@/, '');
      if (cleanQuery.length >= 2) {
        setIsSearching(true);
        setShowSearchDropdown(true);
        try {
          const res = await api.get(`/users/search?query=${encodeURIComponent(cleanQuery)}`);
          setSearchResults(Array.isArray(res) ? res : res.data || []);
        } catch (err) { setSearchResults([]); } finally { setIsSearching(false); }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleConnect = async (e: React.MouseEvent | React.FormEvent, rawUsername: string, action: 'message' | 'add') => {
    e.preventDefault(); e.stopPropagation(); 
    const cleanUsername = rawUsername.replace(/^@/, '').trim();
    if (!cleanUsername) return;

    setActionLoading(cleanUsername);
    try {
      const res = await api.post('/rooms', { username: cleanUsername });
      const data = res.data || res;
      setShowSearchDropdown(false); setSearchQuery(''); setMobileSearchOpen(false);

      if (action === 'message') {
         const targetRoomId = data.room_id || data.id;
         if (targetRoomId) navigate('/chats', { state: { autoOpenRoomId: targetRoomId } });
         else navigate('/chats');
      } else {
         if (data.pending) showToast(`Request sent to @${cleanUsername}!`, 'success');
         else showToast(`Connected with @${cleanUsername}!`, 'success');
         fetchFriends(true); 
      }
    } catch (error: any) {
      showToast(error.response?.data?.error || error.message || "User not found or action failed.", 'error');
    } finally { setActionLoading(null); }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) handleConnect(e, searchResults[0].username, 'message');
  };

  const DropdownResults = () => (
    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-80 overflow-y-auto transition-colors">
      {isSearching ? (
        <div className="p-4 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" strokeWidth={2.5} />
          <span className="text-sm font-bold">Searching...</span>
        </div>
      ) : searchResults.length > 0 ? (
        <ul className="py-2">
          {searchResults.map((u) => (
            <li key={u.id} onMouseDown={(e) => handleConnect(e, u.username, 'message')} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#272729] flex items-center justify-between transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                  <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-[#272729]" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-bold text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-[160px]">{u.name}</span>
                      <span title={u.is_private ? "Private Account" : "Public Account"} className="flex items-center shrink-0">
                        {u.is_private ? <Lock size={12} className="text-gray-400" strokeWidth={3} /> : <Globe size={12} className="text-blue-500" strokeWidth={2.5} />}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">@{u.username}</p>
                  </div>
              </div>
              <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                 <button onMouseDown={(e) => handleConnect(e, u.username, 'message')} disabled={actionLoading === u.username} className="p-2 bg-blue-100 dark:bg-[#1E3A8A] text-blue-600 dark:text-blue-100 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white dark:hover:text-white rounded-xl transition-all hover:shadow-[0_4px_10px_rgba(37,99,235,0.3)] dark:hover:shadow-[0_4px_10px_rgba(0,0,0,0.5)] disabled:opacity-50 hover:-translate-y-0.5" title="Send Message">
                    {actionLoading === u.username ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> : <MessageSquare size={16} strokeWidth={2.5} />}
                 </button>
                 <button onMouseDown={(e) => handleConnect(e, u.username, 'add')} disabled={actionLoading === u.username} className="p-2 bg-green-100 dark:bg-[#14532D] text-green-600 dark:text-green-100 hover:bg-green-600 dark:hover:bg-green-500 hover:text-white dark:hover:text-white rounded-xl transition-all hover:shadow-[0_4px_10px_rgba(22,163,74,0.3)] dark:hover:shadow-[0_4px_10px_rgba(0,0,0,0.5)] disabled:opacity-50 hover:-translate-y-0.5" title="Add Connection">
                    {actionLoading === u.username ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> : <UserPlus size={16} strokeWidth={2.5} />}
                 </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4 text-center text-sm text-gray-500 font-medium">
          No users found matching "{searchQuery.replace(/^@/, '')}"
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 dark:bg-[#030303] text-gray-900 dark:text-gray-200 font-sans overflow-hidden relative transition-colors duration-300">
      
      {toastMessage && (
        <div className={`fixed top-20 right-6 z-[99999] px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-5 flex items-center gap-3 font-bold text-white text-xs sm:text-sm ${
           toastMessage.type === 'success' ? 'bg-green-600' : 
           toastMessage.type === 'error' ? 'bg-red-600' : 
           toastMessage.type === 'warning' ? 'bg-gray-800' : 'bg-blue-600'
        }`}>
           {toastMessage.type === 'success' ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <AlertTriangle size={18} strokeWidth={2.5} />}
           {toastMessage.msg}
        </div>
      )}

      {/* NOTIFICATIONS DRAWER */}
      <>
        {showNotifications && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] transition-opacity duration-300" onClick={() => setShowNotifications(false)} />}
        <div className={`fixed inset-y-0 right-0 z-[110] w-full sm:w-[400px] bg-white dark:bg-[#1A1A1B] border-l border-gray-200 dark:border-[#272729] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${showNotifications ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#272729] shrink-0">
            <h2 className="text-lg font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="text-blue-600 dark:text-blue-500" size={20} strokeWidth={2.5} /> Notifications
            </h2>
            <button onClick={() => setShowNotifications(false)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-[#272729] transition-colors"><X size={20} strokeWidth={2.5} /></button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#030303]"><NotificationsPanel /></div>
        </div>
      </>

      <header className="h-16 border-b border-gray-200 dark:border-[#272729] bg-white dark:bg-[#1A1A1B] flex items-center justify-between px-4 sticky top-0 z-50 shrink-0 transition-colors duration-300">
          {!mobileSearchOpen && (
            <>
              <div className="flex items-center gap-4 shrink-0 md:w-[250px]">
                <div className="md:hidden">
                   <button onClick={() => setMobileMenuOpen(true)} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><Menu size={24} strokeWidth={2.5} /></button>
                </div>
                <button onClick={toggleSidebar} className="hidden md:flex p-2 border border-transparent hover:bg-white dark:hover:bg-[#272729] hover:border-gray-200 dark:hover:border-[#343536] rounded-xl text-gray-500 dark:text-gray-400 transition-all hover:-translate-y-0.5"><Menu size={20} strokeWidth={2.5} /></button>
                <div className="flex items-center gap-2 font-display font-bold text-2xl text-gray-900 dark:text-white tracking-tight cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <img src="/logo.svg" alt="zQuab Logo" className="w-12 h-12 object-contain drop-shadow-sm shrink-0" />
                    <span className="hidden md:block">zQuab</span>
                </div>
              </div>

              <form className="hidden md:flex flex-1 max-w-2xl mx-4 relative" ref={searchRef} onSubmit={handleSearchSubmit}>
                 <div className="relative w-full group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" strokeWidth={2.5} /></div>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => { if (searchQuery.length >= 2) setShowSearchDropdown(true); }} className="block w-full pl-12 pr-4 py-2.5 border border-gray-200 dark:border-[#343536] rounded-full leading-5 bg-gray-50 dark:bg-[#111] text-gray-900 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-[#1A1A1B] focus:border-blue-500 transition-all shadow-inner focus:-translate-y-0.5" placeholder="Find friends..." autoComplete="off"/>
                    {showSearchDropdown && <DropdownResults />}
                 </div>
              </form>

              <div className="flex items-center gap-1.5 md:gap-3 md:w-64 justify-end shrink-0">
                  <button className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#272729] rounded-full transition-all hover:shadow-md border border-transparent" onClick={() => setMobileSearchOpen(true)}><Search size={20} strokeWidth={2.5} /></button>
                  <button onClick={toggleTheme} className="p-2 border border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#272729] hover:-translate-y-0.5 rounded-full transition-all">{theme === 'dark' ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}</button>

                  <div className="relative" ref={soundTestRef}>
                    <button onClick={() => setShowSoundTest(!showSoundTest)} className="p-2 border border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#272729] hover:-translate-y-0.5 rounded-full transition-all"><Volume2 size={20} strokeWidth={2.5} /></button>
                    {showSoundTest && (
                       <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-2xl shadow-2xl p-2 z-[100] animate-in slide-in-from-top-2">
                           <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest px-2 pb-2 border-b border-gray-100 dark:border-[#272729] mb-1">Test Sounds</p>
                           <button onClick={() => testSound('notification')} className="w-full text-left px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-xl transition-colors flex items-center gap-2"><Play size={14} /> Notification</button>
                           <button onClick={() => testSound('message')} className="w-full text-left px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-xl transition-colors flex items-center gap-2"><Play size={14} /> Message Pop</button>
                           <button onClick={() => testSound('ringtone')} className="w-full text-left px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#272729] rounded-xl transition-colors flex items-center gap-2"><Play size={14} /> Call Ringtone</button>
                       </div>
                    )}
                  </div>

                  <div className="relative">
                    <button onClick={handleOpenNotifications} className="p-2 border border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#272729] hover:-translate-y-0.5 rounded-full transition-all">
                      <Bell size={20} strokeWidth={2.5} />
                      {showRedDot && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1A1A1B]"></span>}
                    </button>
                  </div>

                  <div onClick={() => navigate('/profile')} className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-[#272729] p-1.5 pr-3 rounded-full border border-transparent hover:border-gray-200 dark:hover:border-[#343536] transition-all hover:-translate-y-0.5">
                     <div className="relative w-8 h-8 shrink-0">
                        <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shadow-sm"><img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=random`} alt="User" className="w-full h-full object-cover" /></div>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#1A1A1B] rounded-full z-10"></div>
                     </div>
                     <div className="hidden lg:block text-left">
                        <p className="text-xs font-bold text-gray-900 dark:text-white max-w-[80px] truncate leading-tight">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">@{user?.username || 'new'}</p>
                     </div>
                  </div>
              </div>
            </>
          )}

          {mobileSearchOpen && (
             <form className="flex w-full items-center gap-2 relative md:hidden animate-in slide-in-from-top-2" ref={mobileSearchRef} onSubmit={handleSearchSubmit}>
                <div className="relative w-full">
                  <input type="text" autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => { if (searchQuery.length >= 2) setShowSearchDropdown(true); }} className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-[#343536] rounded-full bg-gray-100 dark:bg-[#272729] text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 text-sm" placeholder="Find friends..." />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" strokeWidth={2.5} />
                  {showSearchDropdown && <DropdownResults />}
                </div>
                <button type="button" onClick={clearAndCloseMobileSearch} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} strokeWidth={2.5} /></button>
             </form>
          )}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
         {mobileMenuOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] md:hidden transition-opacity duration-300" onClick={() => setMobileMenuOpen(false)} />}

         <aside className={`fixed md:relative inset-y-0 left-0 z-[100] transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-[260px] ${isSidebarCollapsed ? 'md:w-[80px]' : 'md:w-[270px]'} bg-white dark:bg-[#1A1A1B] md:bg-gray-50 md:dark:bg-[#030303] border-r border-gray-200 dark:border-[#272729] flex flex-col transition-all duration-300 ease-in-out shrink-0 h-full md:h-auto`}>
            <div className="flex md:hidden items-center justify-between p-4 border-b border-gray-200 dark:border-[#272729] shrink-0">
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-900 dark:text-white"><img src="/logo.svg" alt="zQuab" className="w-10 h-10" /> zQuab</div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} strokeWidth={2.5} /></button>
            </div>
            <div ref={sidebarScrollRef} onScroll={handleSidebarScroll} className={`flex-1 flex flex-col py-4 scrollbar-hide relative ${isSidebarCollapsed ? 'md:overflow-visible overflow-y-auto' : 'overflow-y-auto'}`}>
              <div className={`px-4 mb-3 transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:h-0 md:overflow-hidden md:mb-0' : 'opacity-100 h-auto'}`}><span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest pl-3">Feeds</span></div>
              <nav className="space-y-1 px-2 shrink-0"><NavItem collapsed={isSidebarCollapsed} icon={<Home size={22} strokeWidth={2.5} />} label="Home" active={location.pathname === '/dashboard'} onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} /></nav>
              <div className="border-t border-gray-200 dark:border-[#272729] my-4 mx-4 shrink-0"></div>
              <div className={`px-4 mb-3 transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:h-0 md:overflow-hidden md:mb-0' : 'opacity-100 h-auto'}`}><span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest pl-3">Social Hangout</span></div>
              <nav className="space-y-1 px-2 shrink-0">
                 <NavItem collapsed={isSidebarCollapsed} icon={<Zap size={22} strokeWidth={2.5} />} label="Stranger Chat" active={location.pathname === '/matches'} onClick={() => { navigate('/matches'); setMobileMenuOpen(false); }} />
                 <NavItem collapsed={isSidebarCollapsed} icon={<Video size={22} strokeWidth={2.5} />} label="Stranger Cam" active={location.pathname === '/vid-matches'} onClick={() => { navigate('/vid-matches'); setMobileMenuOpen(false); }} badge="HOT" />
                 <NavItem collapsed={isSidebarCollapsed} icon={<MessageSquare size={22} strokeWidth={2.5} />} label="Messages" active={location.pathname === '/chats'} onClick={() => { navigate('/chats'); setMobileMenuOpen(false); }} badge={unreadChatsCount > 0 ? unreadChatsCount : undefined} />
                 
                 <NavItem collapsed={isSidebarCollapsed} icon={<Users size={22} strokeWidth={2.5} />} label="Connections" active={location.pathname === '/friends'} onClick={() => { navigate('/friends'); setMobileMenuOpen(false); }} badge={pendingFriendsCount > 0 ? pendingFriendsCount : undefined} />
                 
                 <NavItem collapsed={isSidebarCollapsed} icon={<Settings size={22} strokeWidth={2.5} />} label="Settings" active={location.pathname === '/settings'} onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }} />
              </nav>
              <div className="border-t border-gray-200 dark:border-[#272729] my-4 mx-4 shrink-0"></div>
              <div className={`px-4 mb-3 transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:h-0 md:overflow-hidden md:mb-0' : 'opacity-100 h-auto'}`}><span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest pl-3">Platform</span></div>
              <nav className="space-y-1 px-2 shrink-0">
                 <NavItem collapsed={isSidebarCollapsed} icon={<Rocket size={22} strokeWidth={2.5} />} label="Coming Soon" active={location.pathname === '/labs'} onClick={() => { navigate('/labs'); setMobileMenuOpen(false); }} highlight={true} />
                 <NavItem collapsed={isSidebarCollapsed} icon={<Heart size={22} strokeWidth={2.5} className={location.pathname === '/donations' ? "text-blue-600 dark:text-blue-500" : "text-gray-400 dark:text-gray-500"} />} label="Support Us" active={location.pathname === '/donations'} onClick={() => { navigate('/donations'); setMobileMenuOpen(false); }} />
              </nav>
               <div className="mt-auto px-2 pb-4 relative group pt-4 shrink-0">
                   {isSidebarCollapsed && (
                       <div className="absolute left-[70px] top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-extrabold px-3 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[9999] whitespace-nowrap translate-x-1 group-hover:translate-x-0 hidden md:block border border-gray-700 dark:border-gray-200">
                           Log Out<div className="absolute top-1/2 -translate-y-1/2 -left-[4px] border-y-[5px] border-y-transparent border-r-[5px] border-r-gray-900 dark:border-r-white"></div>
                       </div>
                   )}
                   <button onClick={handleLogout} className={`flex items-center transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:justify-center md:px-0 px-4' : 'px-4 gap-4'} text-red-600 dark:text-red-500 border border-transparent hover:bg-white dark:hover:bg-[#3f1616] hover:border-red-200 dark:hover:border-[#5c1c1c] hover:-translate-y-0.5 w-full py-3 rounded-2xl overflow-hidden font-bold`}>
                      <div className="shrink-0 flex items-center justify-center w-6"><LogOut size={22} strokeWidth={2.5} /></div>
                      <span className={`text-sm whitespace-nowrap transition-all duration-300 origin-left flex-1 text-left ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:h-0 md:flex-none md:overflow-hidden md:scale-95' : 'opacity-100 scale-100'}`}>Log Out</span>
                   </button>
               </div>
            </div>
         </aside>

         <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-[#030303] relative overflow-hidden transition-colors duration-300">
            {children}
         </main>

         <aside className="w-[350px] bg-gray-50 dark:bg-[#030303] border-l border-gray-200 dark:border-[#272729] hidden lg:flex flex-col p-6 transition-colors duration-300 h-full overflow-hidden">
            <div className="bg-white dark:bg-[#1A1A1B] rounded-3xl border border-gray-200 dark:border-[#343536] p-4 flex flex-col flex-1 min-h-0 shadow-sm hover:shadow-md transition-all duration-300">
               <div className="flex items-center gap-3 mb-2 shrink-0">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-[#1E3A8A] rounded-full flex items-center justify-center text-blue-600 dark:text-blue-100 font-bold text-sm">
                    <Users size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Your Connections</h3>
               </div>
               <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 shrink-0 font-medium px-1">People you've interacted with.</p>
               <div className="space-y-1.5 overflow-y-auto scrollbar-hide pr-1 flex-1 min-h-0">
                   {isLoadingFriends ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" strokeWidth={2.5} /></div>
                   ) : sidebarFriends.length > 0 ? (
                      sidebarFriends.map(friend => (
                        <FriendRow 
                          key={friend.id} name={friend.name} avatar={friend.avatar_url} status={friend.is_online ? "Online" : "Offline"} 
                          onClick={() => {
                              api.post('/rooms', { username: friend.username }).then((res) => {
                                  navigate('/chats', { state: { autoOpenRoomId: res.data?.room_id || res.data?.id } });
                              }).catch(() => showToast("Failed to open DM", "error"));
                          }}
                        />
                      ))
                   ) : (
                      <div className="text-center py-4 rounded-xl border border-dashed border-gray-200 dark:border-[#272729]"><p className="text-xs font-bold text-gray-500">No connections yet.</p></div>
                   )}
               </div>
               <button onClick={() => navigate('/friends')} className="w-full mt-3 py-2.5 bg-white dark:bg-[#272729] text-gray-900 dark:text-white font-bold text-sm rounded-xl border border-gray-200 dark:border-[#343536] transition-all hover:-translate-y-0.5 shrink-0">Manage Connections</button>
            </div>
            <div className="mt-4 shrink-0 hover:shadow-lg transition-shadow duration-300 rounded-3xl">
              <div className="bg-white dark:bg-[#1A1A1B] rounded-3xl border border-gray-200 dark:border-[#343536] p-5 relative overflow-hidden group shadow-sm transition-colors">
                 <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-2xl">PROMO</div>
                 <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 tracking-wider">Sponsored</h3>
                 <AdCard />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] font-medium text-gray-500 px-2 shrink-0">
               <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">Terms</span>
               <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">Privacy</span>
               <span className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors">Help</span>
               <span>© {currentYear} zQuab</span>
            </div>
         </aside>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, badge, onClick, collapsed, highlight = false }: any) => (
  <div className="relative group w-full">
      {collapsed && (
         <div className="absolute left-[70px] top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-extrabold px-3 py-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[9999] whitespace-nowrap translate-x-1 group-hover:translate-x-0 hidden md:block border border-gray-700 dark:border-gray-200">
            {label}<div className="absolute top-1/2 -translate-y-1/2 -left-[4px] border-y-[5px] border-y-transparent border-r-[5px] border-r-gray-900 dark:border-r-white"></div>
         </div>
      )}
      <button onClick={onClick} className={`flex items-center relative rounded-2xl transition-all duration-300 ease-in-out w-full cursor-pointer border ${collapsed ? 'md:justify-center md:px-0 px-4' : 'px-4 gap-3 md:gap-4'} py-3 md:py-3.5 ${highlight ? 'bg-blue-100 dark:bg-[#1E3A8A] text-blue-600 dark:text-blue-100 border-blue-200 dark:border-[#1E3A8A] hover:bg-blue-200 dark:hover:bg-[#1E40AF] hover:-translate-y-0.5 hover:shadow-md' : active ? 'bg-white dark:bg-[#272729] border-gray-200 dark:border-[#343536] text-blue-600 dark:text-white font-extrabold hover:-translate-y-0.5' : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-[#1A1A1B] hover:border-gray-200/50 dark:hover:border-[#272729] hover:text-gray-900 dark:hover:text-gray-200 hover:-translate-y-0.5'}`}>
        <div className="shrink-0 flex items-center justify-center w-6">{icon}</div>
        <span className={`text-sm font-bold whitespace-nowrap transition-all duration-300 ease-in-out origin-left ${collapsed ? 'md:opacity-0 md:w-0 md:h-0 md:flex-none md:overflow-hidden md:scale-95' : 'opacity-100 flex-1 text-left scale-100 truncate pr-2'}`}>{label}</span>
        {badge && (
            <>
                <div className={`hidden absolute top-2 right-2 w-2 h-2 rounded-full border border-white dark:border-[#030303] ${highlight ? 'bg-blue-500 dark:bg-blue-400 animate-pulse' : 'bg-red-500'} ${collapsed ? 'md:block' : ''}`}></div>
                <span className={`ml-auto shrink-0 border text-[10px] rounded-full font-bold shadow-sm transition-all duration-300 flex items-center justify-center ${collapsed ? 'md:opacity-0 md:w-0 md:h-0 md:p-0 md:m-0 md:border-0 md:overflow-hidden' : 'opacity-100 w-auto px-2.5 py-0.5'} ${highlight ? 'bg-blue-600 dark:bg-[#1E3A8A] text-white border-blue-600 dark:border-blue-400 animate-pulse' : 'bg-red-100 dark:bg-[#7F1D1D] text-red-600 dark:text-red-100 border-red-200 dark:border-[#7F1D1D]'}`}>{badge}</span>
            </>
        )}
      </button>
  </div>
);

const FriendRow = ({ name, avatar, status, onClick }: any) => (
  <div onClick={onClick} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white dark:hover:bg-[#272729] cursor-pointer transition-all hover:-translate-y-0.5 border border-transparent hover:border-gray-200 dark:hover:border-transparent group">
    <div className="relative shrink-0 w-10 h-10">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shadow-sm border border-gray-300 dark:border-[#343536]"><img src={avatar || `https://ui-avatars.com/api/?name=${name}&background=random`} alt={name} className="w-full h-full object-cover" /></div>
      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#1A1A1B] z-10 ${status === 'Online' ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`}></div>
    </div>
    <div className="overflow-hidden flex-1">
      <p className="text-[14px] font-bold text-gray-900 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-white transition-colors">{name}</p>
      <p className={`text-[11px] font-medium truncate ${status === 'Online' ? 'text-green-600 dark:text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>{status}</p>
    </div>
  </div>
);

export default DashboardLayout;