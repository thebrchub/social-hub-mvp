import DashboardLayout from '../layouts/DashboardLayout';
import { Sparkles, MessageSquare, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  // 1. Get the dynamic User data from our store
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center px-6 justify-between bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-lg font-display font-bold text-white">Overview</h2>
        <div className="md:hidden">
            {/* Mobile Menu Trigger */}
            <span className="text-xs text-gray-500">Menu</span>
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        
        {/* Welcome Banner */}
        <div className="w-full bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/10 rounded-2xl p-8 mb-8 relative overflow-hidden group">
          <div className="relative z-10">
            {/* Dynamic Name Usage */}
            <h1 className="text-3xl font-display font-bold mb-2 text-white">
              Welcome back, {user?.name.split(' ')[0] || 'Macha'}! 👋
            </h1>
            <p className="text-gray-400 max-w-lg text-sm leading-relaxed">
              Ready to meet someone new? <span className="text-green-400 font-bold">1,240 people</span> are currently looking for a match in India.
            </p>
            
            <button 
              onClick={() => navigate('/matches')} 
              className="mt-6 bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-200 transition-all flex items-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-yellow-600 fill-yellow-600" /> 
              Start Matching
            </button>
          </div>
          
          {/* Decorative BG element that moves on hover */}
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full group-hover:bg-purple-600/20 transition-colors duration-1000"></div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           
           {/* Card 1: Friends */}
           <div className="h-32 bg-[#0f0f0f] rounded-xl border border-white/5 p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3 text-gray-500">
                <Users className="w-4 h-4" />
                <span className="text-xs uppercase font-bold tracking-wider">Total Friends</span>
              </div>
              <span className="text-3xl font-display font-bold text-white">24</span>
           </div>

           {/* Card 2: Messages */}
           <div className="h-32 bg-[#0f0f0f] rounded-xl border border-white/5 p-5 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3 text-gray-500">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs uppercase font-bold tracking-wider">Messages</span>
              </div>
              <span className="text-3xl font-display font-bold text-white">892</span>
           </div>

           {/* Card 3: Action Card (Match Queue) */}
           <div 
             onClick={() => navigate('/matches')}
             className="h-32 relative overflow-hidden bg-gradient-to-br from-blue-900/40 to-slate-900 rounded-xl border border-blue-500/30 p-5 flex flex-col justify-between group cursor-pointer hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] transition-all"
           >
              {/* Animated Background Pulse */}
              <div className="absolute top-0 left-0 w-full h-full bg-blue-500/10 animate-pulse"></div>

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-blue-300 text-xs uppercase font-bold tracking-wider">
                  Live Matching
                </span>
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </div>

              <div className="relative z-10 flex items-center justify-between mt-auto">
                <span className="text-2xl font-display font-bold text-white group-hover:text-blue-200 transition-colors">
                  Find Stranger
                </span>
                <div className="bg-blue-600/20 p-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <span className="text-blue-400 group-hover:text-white text-lg">→</span>
                </div>
              </div>
           </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;