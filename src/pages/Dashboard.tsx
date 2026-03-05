import { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { MessageSquare, Users, Loader2, FlaskConical, ArrowRight, Video } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ friends: 0, messages: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Time-based greeting logic
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const [friendsRes, roomsRes] = await Promise.all([
          api.get('/friends').catch(() => []),
          api.get('/rooms').catch(() => [])
        ]);

        const friendsList = Array.isArray(friendsRes) ? friendsRes : friendsRes?.data || [];
        const roomsList = Array.isArray(roomsRes) ? roomsRes : roomsRes?.data || [];

        setStats({
          friends: friendsList.length,
          messages: roomsList.length 
        });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="h-16 border-b border-[#272729] flex items-center px-6 justify-between bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-20">
        <h2 className="text-lg font-display font-bold text-white">Overview</h2>
      </header>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide">
        
        {/* Welcome Banner */}
        <div className="w-full bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/10 rounded-2xl p-6 sm:p-8 lg:p-10 mb-8 relative overflow-hidden group shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            
            {/* Left Side: Greeting & Text */}
            <div className="max-w-xl">
              <p className="text-blue-400 font-bold tracking-widest text-[10px] sm:text-xs mb-1.5 uppercase opacity-90">
                {greeting}
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-3 text-white leading-tight">
                {user?.name?.split(' ')[0] || 'Macha'} 👋
              </h1>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                Ready to meet someone new? <span className="text-green-400 font-bold px-1.5 py-0.5 bg-green-500/10 rounded-md">1,240+ people</span> are currently looking for a match right now.
              </p>
            </div>

            {/* Right Side: Action Circles */}
            <div className="flex items-center gap-6 sm:gap-8 md:pr-6 lg:pr-12">
              
              {/* Text Match Circle */}
              <div 
                onClick={() => navigate('/matches')}
                className="flex flex-col items-center gap-3 cursor-pointer group/text"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center group-hover/text:bg-blue-600 group-hover/text:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover/text:shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                   <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 group-hover/text:text-white transition-colors" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-300 group-hover/text:text-white transition-colors">
                  Text Match
                </span>
              </div>

              {/* Video Match Circle (FIXED ROUTE HERE) */}
              <div 
                onClick={() => navigate('/vid-matches')}
                className="flex flex-col items-center gap-3 cursor-pointer group/video"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-purple-600/10 border border-purple-500/30 flex items-center justify-center group-hover/video:bg-purple-600 group-hover/video:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.1)] group-hover/video:shadow-[0_0_30px_rgba(168,85,247,0.5)] relative">
                   <span className="absolute -top-1 -right-2 bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg rotate-12">BETA</span>
                   <Video className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 group-hover/video:text-white transition-colors" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-300 group-hover/video:text-white transition-colors">
                  Video Match
                </span>
              </div>

            </div>
          </div>
          
          <div className="absolute right-[-10%] bottom-[-20%] w-64 h-64 sm:w-96 sm:h-96 bg-blue-600/10 blur-[100px] rounded-full group-hover:bg-purple-600/10 transition-colors duration-1000 pointer-events-none"></div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
           
           {/* Card 1: Action Card (Match Queue) */}
           <div 
             onClick={() => navigate('/matches')}
             className="h-36 relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-indigo-900/20 rounded-2xl border border-blue-500/30 p-5 flex flex-col justify-between group cursor-pointer hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.4)] transition-all"
           >
              <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 animate-pulse pointer-events-none"></div>
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-blue-300 text-xs uppercase font-bold tracking-wider">Live Radar</span>
                <span className="flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
              </div>
              <div className="relative z-10 flex items-center justify-between mt-auto">
                <span className="text-xl font-display font-bold text-white group-hover:text-blue-200 transition-colors">Stranger Chat</span>
                <div className="bg-blue-600/20 p-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ArrowRight size={18} className="text-blue-400 group-hover:text-white" />
                </div>
              </div>
           </div>

           {/* Card 2: Friends */}
           <div 
             onClick={() => navigate('/friends')}
             className="h-36 bg-[#0f0f0f] rounded-2xl border border-white/5 p-5 flex flex-col justify-between hover:bg-[#1a1a1a] hover:border-white/10 transition-colors cursor-pointer group"
           >
              <div className="flex items-center gap-3 text-gray-500 group-hover:text-white transition-colors">
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10"><Users size={16} /></div>
                <span className="text-xs uppercase font-bold tracking-wider">Your Squad</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-display font-bold text-white">
                  {isLoading ? <Loader2 className="w-8 h-8 animate-spin text-gray-600" /> : stats.friends}
                </span>
                <span className="text-xs font-bold text-gray-500 mb-1">Friends</span>
              </div>
           </div>

           {/* Card 3: Messages (Rooms) */}
           <div 
             onClick={() => navigate('/chats')}
             className="h-36 bg-[#0f0f0f] rounded-2xl border border-white/5 p-5 flex flex-col justify-between hover:bg-[#1a1a1a] hover:border-white/10 transition-colors cursor-pointer group"
           >
              <div className="flex items-center gap-3 text-gray-500 group-hover:text-white transition-colors">
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10"><MessageSquare size={16} /></div>
                <span className="text-xs uppercase font-bold tracking-wider">Discussions</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-display font-bold text-white">
                  {isLoading ? <Loader2 className="w-8 h-8 animate-spin text-gray-600" /> : stats.messages}
                </span>
                <span className="text-xs font-bold text-gray-500 mb-1">Active Chats</span>
              </div>
           </div>

           {/* Card 4: NEXT GEN LABS TEASER */}
           <div 
             onClick={() => navigate('/labs')} 
             className="h-36 relative overflow-hidden bg-[#1A1A1B] rounded-2xl border border-purple-500/30 p-5 flex flex-col justify-between group cursor-pointer hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)] transition-all"
           >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-600/10 blur-2xl rounded-full group-hover:bg-purple-600/20 transition-all"></div>
              <div className="relative z-10 flex items-center gap-3 text-purple-400">
                <div className="p-2 rounded-lg bg-purple-500/10"><FlaskConical size={16} /></div>
                <span className="text-xs uppercase font-bold tracking-wider">Next-Gen</span>
              </div>
              <div className="relative z-10 flex items-center justify-between mt-auto">
                <div>
                  <span className="block text-lg font-display font-bold text-white group-hover:text-purple-200 transition-colors leading-tight">zQuab Labs</span>
                  <span className="text-[10px] text-gray-400 font-medium">Coming Soon</span>
                </div>
                <div className="bg-purple-600/20 p-2 rounded-full group-hover:bg-purple-600 transition-all">
                  <ArrowRight size={18} className="text-purple-400 group-hover:text-white" />
                </div>
              </div>
           </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;