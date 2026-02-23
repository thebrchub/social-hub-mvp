import { type ReactNode, useState } from 'react';
import { MessageSquare, Users, Radio, LogOut, Settings, Bell, Menu, Search, Plus, Home, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdCard from '../components/AdCard';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import NotificationsPanel from '../components/NotificationsPanel';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const { unreadCount } = useNotificationStore();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // --- NEW STATE FOR COLLAPSE ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#030303] text-gray-200 font-sans overflow-hidden">
      
      {/* --- REDDIT-STYLE TOP NAVBAR --- */}
      <header className="h-16 border-b border-[#272729] bg-[#1A1A1B] flex items-center justify-between px-4 sticky top-0 z-50 shrink-0">
         {/* Logo Area */}
         <div className="flex items-center gap-4 w-64">
            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
               <button onClick={() => setMobileMenuOpen(true)}><Menu className="text-gray-400" /></button>
            </div>

            {/* Desktop Collapse Trigger (Visible now on desktop) */}
            <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
                className="hidden md:flex p-2 hover:bg-[#272729] rounded-full text-gray-400 transition-colors"
            >
                <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 font-display font-bold text-xl text-white tracking-tight cursor-pointer" onClick={() => navigate('/dashboard')}>
               <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg">S</div>
               <span className={`hidden md:block transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>SocialHub</span>
            </div>
         </div>

         {/* Center Search (Reddit Style) */}
         <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <div className="relative w-full group">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-500 group-focus-within:text-white transition-colors" />
               </div>
               <input 
                 type="text" 
                 className="block w-full pl-10 pr-3 py-2 border border-[#343536] rounded-full leading-5 bg-[#272729] text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-[#1A1A1B] focus:border-white focus:placeholder-gray-400 sm:text-sm transition-all hover:bg-[#1A1A1B] hover:border-[#343536]" 
                 placeholder="Search SocialHub" 
               />
            </div>
         </div>

         {/* Right Actions */}
         <div className="flex items-center gap-4 w-64 justify-end">
             <button className="hidden md:flex items-center gap-2 text-white hover:bg-[#272729] px-3 py-2 rounded-full transition-colors">
                <Plus size={20} />
                <span className="text-sm font-bold hidden lg:block">Create</span>
             </button>
             
             <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-400 hover:bg-[#272729] rounded-full relative">
                   <Bell size={20} />
                   {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1A1A1B]"></span>}
                </button>
                {showNotifications && (
                   <div className="absolute right-0 top-12 z-50 w-80">
                      <NotificationsPanel onClose={() => setShowNotifications(false)} />
                   </div>
                )}
             </div>

             <div className="flex items-center gap-2 cursor-pointer hover:bg-[#272729] p-1 pr-3 rounded-lg border border-transparent hover:border-[#343536] transition-all">
                <div className="relative w-8 h-8">
                   <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-yellow-500 overflow-hidden">
                       <img src="https://ui-avatars.com/api/?name=Srikanth+Raj&background=random" alt="User" />
                   </div>
                   <div className="absolute bottom-[-2px] right-[-2px] w-3 h-3 bg-green-500 border-2 border-[#1A1A1B] rounded-full"></div>
                </div>
                <div className="hidden lg:block text-left">
                   <p className="text-xs font-bold text-white">Srikanth</p>
                   <p className="text-[10px] text-gray-400">1.2k Karma</p>
                </div>
             </div>
         </div>
      </header>

      {/* --- MAIN LAYOUT GRID --- */}
      <div className="flex flex-1 overflow-hidden">
         
         {/* LEFT SIDEBAR (Navigation) */}
         {/* Updated width logic with transition */}
         <aside className={`${isSidebarCollapsed ? 'w-[72px]' : 'w-[270px]'} bg-[#030303] border-r border-[#272729] flex-col overflow-y-auto py-4 hidden md:flex transition-all duration-300 ease-in-out`}>
            
            <div className={`px-4 mb-4 transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-3">Feeds</span>
            </div>
            
            <nav className="space-y-1 px-2">
               <NavItem collapsed={isSidebarCollapsed} icon={<Home size={22} />} label="Home" active={location.pathname === '/dashboard'} onClick={() => navigate('/dashboard')} />
               <NavItem collapsed={isSidebarCollapsed} icon={<TrendingUp size={22} />} label="Popular" />
               <NavItem collapsed={isSidebarCollapsed} icon={<Radio size={22} />} label="Live Now" active={location.pathname === '/live'} onClick={() => navigate('/live')} badge="LIVE" />
            </nav>

            <div className="border-t border-[#272729] my-4 mx-4"></div>

            <div className={`px-4 mb-4 transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-3">Social</span>
            </div>
            <nav className="space-y-1 px-2">
               <NavItem collapsed={isSidebarCollapsed} icon={<Users size={22} />} label="Match Queue" active={location.pathname === '/matches'} onClick={() => navigate('/matches')} />
               <NavItem collapsed={isSidebarCollapsed} icon={<MessageSquare size={22} />} label="Chat Rooms" active={location.pathname === '/chats'} onClick={() => navigate('/chats')} badge="3" />
               <NavItem collapsed={isSidebarCollapsed} icon={<Settings size={22} />} label="Settings" active={location.pathname === '/settings'} onClick={() => navigate('/settings')} />
            </nav>

             <div className="mt-auto px-2 pb-4">
                 <button 
                    onClick={handleLogout} 
                    className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} text-gray-400 hover:text-white hover:bg-[#272729] transition-colors w-full py-3 rounded-lg`}
                    title="Log Out"
                 >
                    <LogOut size={22} />
                    {!isSidebarCollapsed && <span className="text-sm font-bold">Log Out</span>}
                 </button>
             </div>
         </aside>

         {/* CENTER CONTENT */}
         <main className="flex-1 overflow-y-auto bg-[#030303] relative scrollbar-hide">
            <div className="max-w-[1000px] mx-auto w-full">
               {children}
            </div>
         </main>

         {/* RIGHT SIDEBAR (Community & Ads) */}
         <aside className="w-[350px] bg-[#030303] border-l border-[#272729] hidden lg:flex flex-col p-6 overflow-y-auto">
            {/* Community Card */}
            <div className="bg-[#1A1A1B] rounded-lg border border-[#343536] p-4 mb-4">
               <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">r/</div>
                  <h3 className="font-bold text-gray-200 text-sm">Online Friends</h3>
               </div>
               <p className="text-xs text-gray-500 mb-4">Your friends currently active on SocialHub.</p>
               
               <div className="space-y-3">
                   <FriendRow name="Anjali Sharma" status="Watching Movie..." />
                   <FriendRow name="Rahul Dev" status="In a Match" />
                   <FriendRow name="Sarah K." status="Online" />
               </div>

               <button className="w-full mt-4 py-2 bg-white text-black font-bold text-sm rounded-full hover:bg-gray-200 transition-colors">
                  View All Friends
               </button>
            </div>

            {/* Premium Ad */}
            <div className="bg-[#1A1A1B] rounded-lg border border-[#343536] p-4 relative overflow-hidden group">
               <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg">AD</div>
               <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Sponsored</h3>
               <AdCard />
            </div>

            {/* Footer Links */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-gray-500 px-2">
               <span>Terms</span>
               <span>Privacy</span>
               <span>Help</span>
               <span>© 2026 SocialHub</span>
            </div>
         </aside>

      </div>
    </div>
  );
};

// --- UPDATED NAV ITEM ---
const NavItem = ({ icon, label, active = false, badge, onClick, collapsed }: any) => (
  <button 
    onClick={onClick} 
    className={`
        flex items-center relative
        ${collapsed ? 'justify-center px-0 py-3' : 'gap-4 px-4 py-3'}
        rounded-lg transition-all duration-200 group w-full cursor-pointer
        ${active ? 'bg-[#272729] text-gray-100' : 'text-gray-400 hover:bg-[#1A1A1B] hover:text-gray-200'}
    `}
    title={collapsed ? label : ''} // Tooltip on hover when collapsed
  >
    {icon}
    
    {/* Label with Fade Transition */}
    <span className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
        {label}
    </span>
    
    {/* Badge Logic */}
    {badge && (
        collapsed ? (
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#030303]"></div>
        ) : (
            <span className="ml-auto bg-[#272729] text-gray-300 border border-[#343536] text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {badge}
            </span>
        )
    )}
  </button>
);

const FriendRow = ({ name, status }: any) => (
  <div className="flex items-center gap-3 p-1 rounded hover:bg-[#272729] cursor-pointer transition-colors group">
    <div className="w-8 h-8 rounded-full bg-gray-700 relative">
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1A1A1B]"></div>
    </div>
    <div className="overflow-hidden">
      <p className="text-sm font-medium text-gray-300 truncate group-hover:text-white">{name}</p>
      <p className="text-[10px] text-gray-500 truncate">{status}</p>
    </div>
  </div>
);

export default DashboardLayout;