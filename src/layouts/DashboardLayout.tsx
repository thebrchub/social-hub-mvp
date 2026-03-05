import { type ReactNode, useState, useEffect, useRef } from 'react';
import { MessageSquare, Heart, Users, LogOut, Settings, Bell, Menu, Search, Home, Loader2, UserPlus, Zap, Video, Rocket, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdCard from '../components/AdCard';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useFriendStore } from '../store/useFriendStore';
import NotificationsPanel from '../components/NotificationsPanel';
import { api } from '../services/api';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  
  const { friends: sidebarFriends, isLoading: isLoadingFriends, fetchFriends } = useFriendStore();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
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
  const searchRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // FIX: Explicit function to clear and close search completely
  const clearAndCloseMobileSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setMobileSearchOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
        if (mobileSearchOpen) setMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user, fetchFriends]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        setShowSearchDropdown(true);
        try {
          const res = await api.get(`/users/search?query=${encodeURIComponent(searchQuery)}`);
          setSearchResults(Array.isArray(res) ? res : res.data || []);
        } catch (err) {
          console.error("Search failed:", err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleUserClick = async (username: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    setMobileSearchOpen(false);
    try {
      await api.post('/rooms', { username });
      navigate('/chats');
    } catch (err) {
      console.error("Failed to create DM:", err);
    }
  };

  const handleSendFriendRequest = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation(); 
    try {
      await api.post('/friends/request', { username });
      alert(`Friend request sent to ${username}!`);
      setShowSearchDropdown(false);
      setSearchQuery('');
      setMobileSearchOpen(false);
    } catch (error: any) {
      alert(error.message || "Failed to send request.");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#030303] text-gray-200 font-sans overflow-hidden relative">
      
      {/* RIGHT-SIDE SLIDING NOTIFICATION DRAWER */}
      <>
        {showNotifications && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] transition-opacity duration-300"
            onClick={() => setShowNotifications(false)}
          />
        )}
        <div className={`
          fixed inset-y-0 right-0 z-[110] w-full sm:w-[400px] bg-[#1A1A1B] border-l border-[#272729] shadow-2xl
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${showNotifications ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div className="flex items-center justify-between p-5 border-b border-[#272729] shrink-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" /> Notifications
            </h2>
            <button onClick={() => setShowNotifications(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#272729] transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#030303]">
             <NotificationsPanel onClose={() => setShowNotifications(false)} />
          </div>
        </div>
      </>

      <header className="h-16 border-b border-[#272729] bg-[#1A1A1B] flex items-center justify-between px-4 sticky top-0 z-50 shrink-0">
          
          {!mobileSearchOpen && (
            <>
              <div className="flex items-center gap-4 md:w-64 shrink-0 transition-all duration-300">
                <div className="md:hidden">
                   <button onClick={() => setMobileMenuOpen(true)} className="p-1 text-gray-400 hover:text-white transition-colors">
                      <Menu size={24} />
                   </button>
                </div>

                <button 
                    onClick={toggleSidebar} 
                    className="hidden md:flex p-2 hover:bg-[#272729] rounded-full text-gray-400 transition-colors"
                >
                    <Menu size={20} />
                </button>

                <div
                    className="flex items-center gap-2 font-display font-bold text-xl text-white tracking-tight cursor-pointer"
                    onClick={() => navigate('/dashboard')}
                >
                    <img src="/logo.svg" alt="zQuab Logo" className="w-11 h-11 md:w-12 md:h-12 object-contain" />
                    <span className="hidden md:block">zQuab</span>
                </div>
              </div>

              <div className="hidden md:flex flex-1 max-w-2xl mx-4 relative" ref={searchRef}>
                 <div className="relative w-full group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Search className="h-5 w-5 text-gray-500 group-focus-within:text-white transition-colors" />
                    </div>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => { if (searchQuery.length >= 2) setShowSearchDropdown(true); }}
                      className="block w-full pl-10 pr-3 py-2 border border-[#343536] rounded-full leading-5 bg-[#272729] text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-[#1A1A1B] focus:border-white focus:placeholder-gray-400 sm:text-sm transition-all hover:bg-[#1A1A1B] hover:border-[#343536]" 
                      placeholder="Search Zquab" 
                      autoComplete="off"
                    />
                 </div>
              </div>

              <div className="flex items-center gap-3 md:gap-4 md:w-64 justify-end shrink-0">
                  <button 
                    className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-[#272729] rounded-full transition-colors"
                    onClick={() => setMobileSearchOpen(true)}
                  >
                     <Search size={20} />
                  </button>

                  <div className="relative">
                     <button onClick={() => setShowNotifications(true)} className="p-2 text-gray-400 hover:bg-[#272729] rounded-full relative">
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1A1A1B]"></span>}
                     </button>
                  </div>

                  <div 
                     onClick={() => navigate('/profile')}
                     className="flex items-center gap-2 cursor-pointer hover:bg-[#272729] p-1 pr-3 rounded-lg border border-transparent hover:border-[#343536] transition-all"
                  >
                     <div className="relative w-8 h-8">
                        <div className="w-8 h-8 rounded-lg bg-gray-800 overflow-hidden">
                            <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=random`} alt="User" />
                        </div>
                        <div className="absolute bottom-[-2px] right-[-2px] w-3 h-3 bg-green-500 border-2 border-[#1A1A1B] rounded-full"></div>
                     </div>
                     <div className="hidden lg:block text-left">
                        <p className="text-xs font-bold text-white max-w-[80px] truncate">{user?.name || 'User'}</p>
                        <p className="text-[10px] text-gray-400 truncate">@{user?.username || 'new'}</p>
                     </div>
                  </div>
              </div>
            </>
          )}

          {mobileSearchOpen && (
             <div className="flex w-full items-center gap-2 relative md:hidden animate-in slide-in-from-top-2" ref={searchRef}>
                <div className="relative w-full">
                  <input 
                    type="text" 
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchQuery.length >= 2) setShowSearchDropdown(true); }}
                    className="block w-full pl-10 pr-3 py-2 border border-[#343536] rounded-full bg-[#272729] text-white focus:outline-none focus:border-blue-500 text-sm" 
                    placeholder="Search users..." 
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <button onClick={clearAndCloseMobileSearch} className="p-2 text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
             </div>
          )}

          {showSearchDropdown && (
             <div className={`absolute top-full left-0 right-0 mt-2 bg-[#1A1A1B] border border-[#343536] rounded-xl shadow-2xl overflow-hidden z-[100] max-h-80 overflow-y-auto ${mobileSearchOpen ? 'mx-4' : 'md:w-full md:max-w-2xl md:mx-auto md:left-1/2 md:-translate-x-1/2'}`}>
               {isSearching ? (
                 <div className="p-4 flex items-center justify-center gap-2 text-gray-400">
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span className="text-sm">Searching...</span>
                 </div>
               ) : searchResults.length > 0 ? (
                 <ul className="py-2">
                   {searchResults.map((u) => (
                     <li 
                       key={u.id} 
                       onClick={() => handleUserClick(u.username)}
                       className="px-4 py-3 hover:bg-[#272729] cursor-pointer flex items-center justify-between transition-colors group"
                     >
                       <div className="flex items-center gap-3">
                           <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt={u.name} className="w-8 h-8 rounded-full object-cover bg-gray-700" />
                           <div>
                             <p className="text-sm font-bold text-white">{u.name}</p>
                             <p className="text-xs text-gray-500">@{u.username}</p>
                           </div>
                       </div>
                       <button onClick={(e) => handleSendFriendRequest(e, u.username)} className="p-1.5 text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all">
                          <UserPlus size={16} />
                       </button>
                     </li>
                   ))}
                 </ul>
               ) : (
                 <div className="p-4 text-center text-sm text-gray-500">
                   No users found matching "{searchQuery}"
                 </div>
               )}
             </div>
          )}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
         
         {mobileMenuOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] md:hidden transition-opacity duration-300" onClick={() => setMobileMenuOpen(false)} />
         )}

         {/* FIX 3: STATIC MOBILE HEADER, SCROLLABLE INTERNAL NAV */}
         <aside className={`
            fixed md:static inset-y-0 left-0 z-[100] md:z-auto
            transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            ${isSidebarCollapsed ? 'md:w-[80px]' : 'md:w-[270px]'}
            w-[270px] bg-[#1A1A1B] md:bg-[#030303] border-r border-[#272729] flex flex-col 
            transition-all duration-300 ease-in-out shrink-0 h-full md:h-auto
         `}>
            
            {/* Static Mobile Header */}
            <div className="flex md:hidden items-center justify-between p-4 border-b border-[#272729] shrink-0">
                <div className="flex items-center gap-2 font-display font-bold text-xl text-white">
                   <img src="/logo.svg" alt="zQuab" className="w-11 h-11" />
                   zQuab
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-white">
                   <X size={20} />
                </button>
            </div>

            {/* Scrollable Navigation Area */}
            <div className={`flex-1 flex flex-col py-4 ${isSidebarCollapsed ? 'md:overflow-y-visible' : 'md:overflow-y-auto'} overflow-y-auto scrollbar-hide`}>
              
              {/* --- FEEDS SECTION --- */}
              <div className={`px-4 mb-4 transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:h-0 md:overflow-hidden md:mb-0' : 'opacity-100 h-auto'}`}>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-3">Feeds</span>
              </div>
              <nav className="space-y-1 px-2 shrink-0">
                 <NavItem collapsed={isSidebarCollapsed} icon={<Home size={22} />} label="Home" active={location.pathname === '/dashboard'} onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} />
              </nav>

              <div className="border-t border-[#272729] my-4 mx-4 shrink-0"></div>

              {/* --- SOCIAL SECTION --- */}
              <div className={`px-4 mb-4 transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:h-0 md:overflow-hidden md:mb-0' : 'opacity-100 h-auto'}`}>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-3">Social</span>
              </div>
              <nav className="space-y-1 px-2 shrink-0">
                 <NavItem collapsed={isSidebarCollapsed} icon={<Zap size={22} />} label="Stranger Chat" active={location.pathname === '/matches'} onClick={() => { navigate('/matches'); setMobileMenuOpen(false); }} />
                 <NavItem collapsed={isSidebarCollapsed} icon={<Video size={22} />} label="Stranger Cam" active={location.pathname === '/vid-matches'} onClick={() => { navigate('/vid-matches'); setMobileMenuOpen(false); }} badge="HOT" />
                 <NavItem collapsed={isSidebarCollapsed} icon={<MessageSquare size={22} />} label="Chat Rooms" active={location.pathname === '/chats'} onClick={() => { navigate('/chats'); setMobileMenuOpen(false); }} />
                 <NavItem collapsed={isSidebarCollapsed} icon={<Users size={22} />} label="Friends" active={location.pathname === '/friends'} onClick={() => { navigate('/friends'); setMobileMenuOpen(false); }} />
                 <NavItem collapsed={isSidebarCollapsed} icon={<Settings size={22} />} label="Settings" active={location.pathname === '/settings'} onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }} />
              </nav>

              <div className="border-t border-[#272729] my-4 mx-4 shrink-0"></div>
              
              {/* --- PLATFORM / EXTRAS SECTION --- */}
              <div className={`px-4 mb-4 transition-all duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:h-0 md:overflow-hidden md:mb-0' : 'opacity-100 h-auto'}`}>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-3">Platform</span>
              </div>
              <nav className="space-y-1 px-2 shrink-0">
                 <NavItem 
                    collapsed={isSidebarCollapsed} 
                    icon={<Rocket size={22} />} 
                    label="Coming Soon" 
                    active={location.pathname === '/labs'} 
                    onClick={() => { navigate('/labs'); setMobileMenuOpen(false); }} 
                    highlight={true}
                 />
                 <NavItem 
                    collapsed={isSidebarCollapsed} 
                    icon={<Heart size={22} className={location.pathname === '/donations' ? "text-black" : "text-blue-500"} />} 
                    label="Support Us" 
                    active={location.pathname === '/donations'} 
                    onClick={() => { navigate('/donations'); setMobileMenuOpen(false); }} 
                 />
              </nav>

           

               {/* FIX 4: Red Logout Button */}
               <div className="mt-auto px-2 pb-4 relative group pt-4 shrink-0">
                   <button 
                      onClick={handleLogout} 
                      className={`flex items-center transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:justify-center md:px-0 px-4' : 'px-4 gap-4'} text-red-500 hover:text-red-400 hover:bg-red-500/10 w-full py-3 rounded-lg overflow-hidden`}
                   >
                      <div className="shrink-0 flex items-center justify-center w-6"><LogOut size={22} /></div>
                      
                      <span className={`text-sm font-bold whitespace-nowrap transition-all duration-300 origin-left flex-1 text-left ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:h-0 md:flex-none md:overflow-hidden md:scale-95' : 'opacity-100 scale-100'}`}>
                        Log Out
                      </span>
                   </button>
                   
                   {isSidebarCollapsed && (
                      <div className="hidden md:flex absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#272729] text-white text-xs font-bold rounded-lg shadow-xl border border-[#343536] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity items-center">
                        Log Out
                        <div className="absolute top-1/2 -translate-y-1/2 -left-[5px] w-2 h-2 bg-[#272729] border-l border-b border-[#343536] rotate-45"></div>
                      </div>
                   )}
               </div>
            </div>
         </aside>

         <main className="flex-1 flex flex-col min-w-0 bg-[#030303] relative overflow-hidden">
            {children}
         </main>

         {/* Right Sidebar */}
         <aside className="w-[350px] bg-[#030303] border-l border-[#272729] hidden xl:flex flex-col p-6 overflow-y-auto shrink-0">
            <div className="bg-[#1A1A1B] rounded-lg border border-[#343536] p-4 mb-4 flex flex-col max-h-[50vh]">
               <div className="flex items-center gap-2 mb-2 shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">z/</div>
                  <h3 className="font-bold text-gray-200 text-sm">Your Friends</h3>
               </div>
               <p className="text-xs text-gray-500 mb-4 shrink-0">Your actual friends list from Zquab.</p>
               
               <div className="space-y-3 overflow-y-auto scrollbar-hide pr-2 flex-1 min-h-0">
                   {isLoadingFriends ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-gray-500 animate-spin" /></div>
                   ) : sidebarFriends.length > 0 ? (
                      sidebarFriends.map(friend => (
                        <FriendRow 
                          key={friend.id} 
                          name={friend.name} 
                          avatar={friend.avatar_url}
                          status="Online" 
                          onClick={() => {
                            api.post('/rooms', { username: friend.username })
                               .then(() => navigate('/chats'))
                               .catch(() => alert("Failed to DM"));
                          }}
                        />
                      ))
                   ) : (
                      <p className="text-xs text-gray-600 text-center py-2">No friends yet. Add some!</p>
                   )}
               </div>

               <button onClick={() => navigate('/friends')} className="w-full mt-4 py-2 bg-white text-black font-bold text-sm rounded-full hover:bg-gray-200 transition-colors shrink-0">
                 View All Friends
               </button>
            </div>

            <div className="bg-[#1A1A1B] rounded-lg border border-[#343536] p-4 relative overflow-hidden group shrink-0">
               <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg">AD</div>
               <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Sponsored</h3>
               <AdCard />
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-gray-500 px-2 shrink-0">
               <span>Terms</span>
               <span>Privacy</span>
               <span>Help</span>
               <span>© 2026 Zquab</span>
            </div>
         </aside>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, badge, onClick, collapsed, highlight = false }: any) => (
  <button 
    onClick={onClick} 
    className={`
        flex items-center relative rounded-lg transition-all duration-300 ease-in-out group w-full cursor-pointer
        ${collapsed ? 'md:justify-center md:px-0 px-4' : 'px-4 gap-4'}
        py-3.5 md:py-3
        ${highlight 
          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 hover:border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
          : active 
            ? 'bg-[#272729] text-gray-100' 
            : 'text-gray-400 hover:bg-[#1A1A1B] hover:text-gray-200'}
    `}
  >
    <div className="shrink-0 flex items-center justify-center w-6">
       {icon}
    </div>

    {/* FIX 1 & 2: Added flex-1 and text-left to force spacing and alignment */}
    <span className={`
        text-sm font-medium whitespace-nowrap transition-all duration-300 ease-in-out origin-left
        ${collapsed ? 'md:opacity-0 md:w-0 md:h-0 md:flex-none md:overflow-hidden md:scale-95' : 'opacity-100 flex-1 text-left scale-100'}
    `}>
        {label}
    </span>

    {badge && (
        <>
            <div className={`hidden absolute top-2 right-2 w-2 h-2 rounded-full border border-[#030303] ${highlight ? 'bg-blue-400 animate-pulse' : 'bg-red-500'} ${collapsed ? 'md:block' : ''}`}></div>

            <span className={`
                border text-[10px] rounded-full font-bold shadow-sm transition-all duration-300 flex items-center justify-center
                ${collapsed ? 'md:opacity-0 md:w-0 md:h-0 md:p-0 md:m-0 md:border-0 md:overflow-hidden' : 'opacity-100 w-auto px-2 py-0.5'}
                ${highlight ? 'bg-blue-500 text-white border-blue-400 animate-pulse' : 'bg-red-500/20 text-red-500 border-red-500/30'}
            `}>
                {badge}
            </span>
        </>
    )}

    {collapsed && (
      <div className="hidden md:flex absolute left-full ml-4 px-3 py-1.5 bg-[#272729] text-white text-xs font-bold rounded-lg shadow-xl border border-[#343536] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity items-center">
        {label}
        <div className="absolute top-1/2 -translate-y-1/2 -left-[5px] w-2 h-2 bg-[#272729] border-l border-b border-[#343536] rotate-45"></div>
      </div>
    )}
  </button>
);

const FriendRow = ({ name, avatar, status, onClick }: any) => (
  <div onClick={onClick} className="flex items-center gap-3 p-1 rounded hover:bg-[#272729] cursor-pointer transition-colors group">
    <div className="w-8 h-8 rounded-full bg-gray-700 relative overflow-hidden shrink-0">
        <img src={avatar || `https://ui-avatars.com/api/?name=${name}&background=random`} alt={name} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1A1A1B]"></div>
    </div>
    <div className="overflow-hidden">
      <p className="text-sm font-medium text-gray-300 truncate group-hover:text-white">{name}</p>
      <p className="text-[10px] text-gray-500 truncate">{status}</p>
    </div>
  </div>
);

export default DashboardLayout;