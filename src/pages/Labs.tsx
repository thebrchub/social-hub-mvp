import DashboardLayout from '../layouts/DashboardLayout';
import { FlaskConical, Video, Radio, Mic, Bot, VenetianMask, Sparkles, Rocket } from 'lucide-react';

const LAB_FEATURES = [
  {
    id: 1,
    title: "Squad Video Calls",
    desc: "Take your friendships to the next level. Seamless, high-fidelity group video and audio calls with your entire squad.",
    icon: <Video size={24} strokeWidth={2.5} />,
    status: "In Development",
    progress: '60%',
    theme: {
      text: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-[#1E3A8A]",
      border: "border-blue-200 dark:border-[#1E40AF]",
      glow: "hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-[0_8px_30px_-10px_rgba(59,130,246,0.3)]",
      fill: "bg-blue-500"
    }
  },
  {
    id: 2,
    title: "Debate Spaces",
    desc: "Drop-in audio rooms to discuss, debate, and vibe with hundreds of users at once. Your voice, your stage.",
    icon: <Mic size={24} strokeWidth={2.5} />,
    status: "In Development",
    progress: '45%',
    theme: {
      text: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-[#4C1D95]",
      border: "border-purple-200 dark:border-[#5B21B6]",
      glow: "hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-[0_8px_30px_-10px_rgba(168,85,247,0.3)]",
      fill: "bg-purple-500"
    }
  },
  {
    id: 3,
    title: "zQuab Live",
    desc: "Broadcast yourself to the world. High-quality live streaming for content creators with real-time audience interaction and tipping.",
    icon: <Radio size={24} strokeWidth={2.5} />,
    status: "Planning",
    progress: '25%',
    theme: {
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-[#7F1D1D]",
      border: "border-red-200 dark:border-[#991B1B]",
      glow: "hover:border-red-400 dark:hover:border-red-500 hover:shadow-[0_8px_30px_-10px_rgba(239,68,68,0.3)]",
      fill: "bg-red-500"
    }
  },
  {
    id: 4,
    title: "AI Matchmaker",
    desc: "Our next-gen routing algorithm that analyzes conversational vibes to pair you with strangers you actually want to talk to.",
    icon: <Bot size={24} strokeWidth={2.5} />,
    status: "Research",
    progress: '15%',
    theme: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-[#064E3B]",
      border: "border-emerald-200 dark:border-[#065F46]",
      glow: "hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-[0_8px_30px_-10px_rgba(16,185,129,0.3)]",
      fill: "bg-emerald-500"
    }
  },
  {
    id: 5,
    title: "Incognito Avatars",
    desc: "Show up as a digital VTuber avatar in video chats. Full facial motion capture tracking without revealing your actual face.",
    icon: <VenetianMask size={24} strokeWidth={2.5} />,
    status: "Concept",
    progress: '5%',
    theme: {
      text: "text-pink-600 dark:text-pink-400",
      bg: "bg-pink-50 dark:bg-[#831843]",
      border: "border-pink-200 dark:border-[#9D174D]",
      glow: "hover:border-pink-400 dark:hover:border-pink-500 hover:shadow-[0_8px_30px_-10px_rgba(236,72,153,0.3)]",
      fill: "bg-pink-500"
    }
  }
];

const Labs = () => {
  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#030303] scrollbar-hide transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* --- HERO SECTION --- */}
          <div className="relative mb-12 sm:mb-16 flex flex-col items-center text-center">
             
             {/* Glowing Orb Behind Flask */}
             <div className="absolute top-10 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-56 sm:h-56 bg-blue-400/20 dark:bg-blue-600/20 blur-[60px] sm:blur-[80px] rounded-full pointer-events-none"></div>
             
             {/* 3D Bulge Flask Icon */}
             <div className="p-4 sm:p-5 bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] md:rounded-[2rem] mb-6 relative z-10 shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_10px_20px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_10px_30px_rgba(0,0,0,0.5)]">
               <FlaskConical className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 dark:text-blue-500 animate-pulse" strokeWidth={2.5} />
             </div>
             
             {/* Main Title */}
             <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight font-display mb-4 transition-colors">
               zQuab <span className="text-blue-600 dark:text-blue-500">Labs</span>
             </h1>
             
             <p className="text-gray-500 dark:text-gray-400 max-w-xl text-sm sm:text-base font-medium leading-relaxed px-4 transition-colors">
               Sneak a peek at the experimental features we're cooking up. 
               The future of human connection is being built right here.
             </p>
          </div>

          {/* --- FEATURES GRID --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 relative z-10">
            {LAB_FEATURES.map((feature) => (
              <div 
                key={feature.id} 
                className={`bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] rounded-[2rem] p-6 sm:p-8 flex flex-col h-full group transition-all duration-300 hover:-translate-y-1.5 shadow-sm hover:shadow-xl ${feature.theme.glow}`}
              >
                 <div className="flex items-start justify-between gap-4 mb-6">
                    {/* 3D Icon Container */}
                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center transition-colors duration-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] border ${feature.theme.bg} ${feature.theme.text} ${feature.theme.border}`}>
                       {feature.icon}
                    </div>
                    
                    {/* Status Pill */}
                    <div className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border shadow-sm shrink-0 ${feature.theme.bg} ${feature.theme.text} ${feature.theme.border}`}>
                      {feature.status}
                    </div>
                 </div>

                 <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 transition-colors">
                   {feature.title}
                 </h3>
                 
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-8 flex-1 transition-colors">
                   {feature.desc}
                 </p>

                 {/* Progress Bar */}
                 <div className="mt-auto pt-5 border-t border-gray-100 dark:border-[#272729] transition-colors">
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest mb-2.5">
                       <span>Progress</span>
                       <span className={feature.theme.text}>
                         {feature.progress}
                       </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-[#0a0a0a] rounded-full overflow-hidden border border-gray-200 dark:border-[#343536] shadow-inner">
                       <div 
                         className={`h-full rounded-full ${feature.theme.fill} transition-all duration-1000 ease-out`} 
                         style={{ width: feature.progress }}
                       ></div>
                    </div>
                 </div>
              </div>
            ))}

            {/* --- CALL TO ACTION CARD --- */}
            <div className="bg-gray-50 dark:bg-[#111] border-2 border-dashed border-gray-200 dark:border-[#343536] rounded-[2rem] p-6 sm:p-8 flex flex-col items-center justify-center text-center h-full group hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-[#1a1a1a] transition-all duration-300">
               <div className="w-16 h-16 rounded-[1.5rem] bg-blue-100 dark:bg-[#1E3A8A] flex items-center justify-center text-blue-600 dark:text-blue-400 mb-5 group-hover:scale-110 transition-transform shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] border border-blue-200 dark:border-[#1E40AF]">
                 <Rocket size={32} strokeWidth={2.5} />
               </div>
               <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 transition-colors">Have a crazy idea?</h3>
               <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 max-w-xs transition-colors">
                 We are building zQuab for you. Tell us what wild feature you want to see next.
               </p>
               <button className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 dark:bg-[#1E3A8A] text-white font-extrabold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 border border-blue-700 dark:border-[#1E40AF] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5">
                 <Sparkles size={18} strokeWidth={2.5} /> Request Feature
               </button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Labs;