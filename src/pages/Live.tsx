import DashboardLayout from '../layouts/DashboardLayout';
import { Mic, AudioLines } from 'lucide-react';

const Live = () => {
  return (
    <DashboardLayout>
      {/* FIX: Changed 'h-full' to 'h-[calc(100vh-4rem)]' to eliminate bottom gap */}
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center relative overflow-hidden p-6 text-center bg-[#0a0a0a]">
        
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 bg-[#0f0f0f] border border-white/5 p-12 rounded-3xl max-w-lg shadow-2xl">
           
           {/* Icon Animation */}
           <div className="mx-auto w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 rounded-full border border-rose-500/30 animate-ping"></div>
              <Mic className="w-10 h-10 text-rose-400 relative z-10" />
           </div>

           <h1 className="text-4xl font-display font-bold text-white mb-4">
             Voice Rooms <span className="text-rose-500">Coming Soon</span>
           </h1>
           
           <p className="text-gray-400 leading-relaxed mb-8">
             Drop-in audio conversations with friends and strangers. 
             Host talk shows, debate nights, or just hang out.
             <br /><span className="text-gray-500 italic text-sm mt-2 block">No camera required. Just your voice.</span>
           </p>

           <div className="flex flex-col gap-3">
             <button className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
               <AudioLines size={18} />
               Notify Me When Ready
             </button>
             <p className="text-xs text-gray-500">Expected Launch: March 2026</p>
           </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Live;