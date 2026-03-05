import DashboardLayout from '../layouts/DashboardLayout';
import { FlaskConical, Video, Radio, Mic, Bot, VenetianMask, Sparkles, Rocket } from 'lucide-react';

const LAB_FEATURES = [
  {
    id: 1,
    title: "Squad Video Calls",
    desc: "Take your friendships to the next level. Seamless, high-fidelity group video and audio calls with your entire squad.",
    icon: <Video size={24} />,
    status: "In Development",
    theme: {
      text: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      glow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
      hoverIcon: "group-hover:bg-blue-600 group-hover:text-white"
    }
  },
  {
    id: 2,
    title: "Debate Spaces",
    desc: "Drop-in audio rooms to discuss, debate, and vibe with hundreds of users at once. Your voice, your stage.",
    icon: <Mic size={24} />,
    status: "In Development",
    theme: {
      text: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      glow: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
      hoverIcon: "group-hover:bg-purple-600 group-hover:text-white"
    }
  },
  {
    id: 3,
    title: "zQuab Live",
    desc: "Broadcast yourself to the world. High-quality live streaming for content creators with real-time audience interaction and tipping.",
    icon: <Radio size={24} />,
    status: "Planning",
    theme: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      glow: "group-hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]",
      hoverIcon: "group-hover:bg-red-600 group-hover:text-white"
    }
  },
  {
    id: 4,
    title: "AI Matchmaker",
    desc: "Our next-gen routing algorithm that analyzes conversational vibes to pair you with strangers you actually want to talk to.",
    icon: <Bot size={24} />,
    status: "Research",
    theme: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
      hoverIcon: "group-hover:bg-emerald-600 group-hover:text-white"
    }
  },
  {
    id: 5,
    title: "Incognito Avatars",
    desc: "Show up as a digital VTuber avatar in video chats. Full facial motion capture tracking without revealing your actual face.",
    icon: <VenetianMask size={24} />,
    status: "Concept",
    theme: {
      text: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20",
      glow: "group-hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]",
      hoverIcon: "group-hover:bg-pink-600 group-hover:text-white"
    }
  }
];

const Labs = () => {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-[#0a0a0a] scrollbar-hide">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* --- HERO SECTION --- */}
          <div className="relative mb-10 sm:mb-14 flex flex-col items-center text-center">
             
             {/* Glowing Orb Behind Flask */}
             <div className="absolute top-10 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-48 sm:h-48 bg-blue-600/30 blur-[60px] sm:blur-[80px] rounded-full pointer-events-none"></div>
             
             {/* Flask Icon */}
             <div className="p-3 sm:p-4 bg-[#1a1a1a] border border-[#343536] rounded-2xl mb-5 relative z-10 shadow-2xl">
               <FlaskConical className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 animate-pulse" />
             </div>
             
             {/* Main Title */}
             <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight font-display mb-3">
               zQuab <span className="text-blue-500">Labs</span>
             </h1>
             
             <p className="text-gray-400 max-w-xl text-sm sm:text-base leading-relaxed px-4">
               Sneak a peek at the experimental features we're cooking up. 
               The future of human connection is being built right here.
             </p>
          </div>

          {/* --- FEATURES GRID --- */}
          {/* FIX: Set to lg:grid-cols-3 for better scaling */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 relative z-10">
            {LAB_FEATURES.map((feature) => (
              <div 
                key={feature.id} 
                // FIX: Changed heavy padding to p-5 sm:p-6
                className={`bg-[#1A1A1B] border border-[#272729] rounded-3xl p-5 sm:p-6 flex flex-col h-full group transition-all duration-300 hover:-translate-y-1 hover:border-white/10 ${feature.theme.glow}`}
              >
                 {/* FIX: Added gap-3 to ensure items never touch */}
                 <div className="flex items-start justify-between gap-3 mb-5">
                    {/* FIX: Added shrink-0 so the icon never squishes */}
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-colors duration-300 ${feature.theme.bg} ${feature.theme.text} ${feature.theme.hoverIcon}`}>
                       {feature.icon}
                    </div>
                    
                    {/* FIX: whitespace-nowrap and optimized text sizing ensures pills stay uniformly shaped */}
                    <div className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${feature.theme.bg} ${feature.theme.text} ${feature.theme.border}`}>
                      {feature.status}
                    </div>
                 </div>

                 <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                   {feature.title}
                 </h3>
                 
                 <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-1">
                   {feature.desc}
                 </p>

                 {/* Progress/Hype Bar */}
                 <div className="mt-auto pt-4 border-t border-[#272729]">
                    <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                       <span>Progress</span>
                       <span className={feature.theme.text}>
                         {feature.status === 'In Development' ? '60%' : feature.status === 'Planning' ? '25%' : '10%'}
                       </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#343536]">
                       <div 
                         className={`h-full rounded-full ${feature.theme.bg.replace('/10', '')} opacity-80`} 
                         style={{ width: feature.status === 'In Development' ? '60%' : feature.status === 'Planning' ? '25%' : '10%' }}
                       ></div>
                    </div>
                 </div>
              </div>
            ))}

            {/* --- CALL TO ACTION CARD --- */}
            {/* FIX: Matched padding to other cards */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-dashed border-[#343536] rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center h-full group hover:border-blue-500/50 transition-colors">
               <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                 <Rocket size={28} />
               </div>
               <h3 className="text-lg font-bold text-white mb-2">Have a crazy idea?</h3>
               <p className="text-xs text-gray-500 mb-6 max-w-xs">
                 We are building zQuab for you. Tell us what wild feature you want to see next.
               </p>
               <button className="px-6 py-2.5 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
                 <Sparkles size={16} /> Request Feature
               </button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Labs;