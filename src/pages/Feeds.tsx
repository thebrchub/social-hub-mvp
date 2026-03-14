import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';
import { Flame, MessageCircle, Repeat2, Share2, MoreHorizontal, Image as ImageIcon, Smile, Zap, Globe, Sparkles, TrendingUp } from 'lucide-react';

// --- MOCK DATA: GLOBAL PULSE (15 Posts) ---
const GLOBAL_POSTS = [
  {
    id: 101,
    author: { name: "Cinephile Daily", username: "cine_verse", avatar: "https://ui-avatars.com/api/?name=Cinephile&background=random" },
    content: "The cinematic universe they are building with the new Dhurandhar movie is absolutely insane. The VFX budget alone is rumored to be 300+ crores. Are we finally seeing Indian cinema take over the global VFX stage? 🎬🔥",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2525&auto=format&fit=crop",
    time: "2h ago",
    sparks: 1240,
    ripples: 89,
    isHot: true,
    hasBacked: false
  },
  {
    id: 102,
    author: { name: "Global Insights", username: "global_macro", avatar: "https://ui-avatars.com/api/?name=Global&background=0D8ABC&color=fff" },
    content: "Supply chains are taking another massive hit this week due to the ongoing geopolitical tensions and the new blockades. If this continues, we'll see a domino effect on tech manufacturing by Q3. It's no longer just a regional issue, it's a global economic bottleneck. Thoughts?",
    time: "5h ago",
    sparks: 342,
    ripples: 124,
    isHot: false,
    hasBacked: true
  },
  {
    id: 103,
    author: { name: "Aam Aadmi Voice", username: "common_man_india", avatar: "https://ui-avatars.com/api/?name=Aam&background=D97706&color=fff" },
    content: "LPG cylinder prices hiked again for the third time this year. While the global crude market stabilizes, the middle class is still bearing the brunt of domestic inflation. When does the relief actually trickle down? 📉⛽",
    time: "8h ago",
    sparks: 890,
    ripples: 456,
    isHot: true,
    hasBacked: false
  },
  {
    id: 104,
    author: { name: "TechCruncher", username: "tech_crunch", avatar: "https://ui-avatars.com/api/?name=Tech&background=10B981&color=fff" },
    content: "Apple just silently dropped a new AI model on HuggingFace that outperforms GPT-4 on edge devices. The race for on-device AI is officially the most important battle in tech right now.",
    time: "9h ago",
    sparks: 5430,
    ripples: 892,
    isHot: true,
    hasBacked: true
  },
  {
    id: 105,
    author: { name: "Sports Analyst", username: "sports_guru", avatar: "https://ui-avatars.com/api/?name=Sports&background=random" },
    content: "Kohli's captaincy era will be studied in sports psychology classes. The sheer aggression he brought to the test team changed the DNA of Indian cricket forever. Unmatched legacy. 🏏",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2667&auto=format&fit=crop",
    time: "11h ago",
    sparks: 2100,
    ripples: 340,
    isHot: false,
    hasBacked: false
  },
  {
    id: 106,
    author: { name: "Eco Warrior", username: "green_earth", avatar: "https://ui-avatars.com/api/?name=Eco&background=16A34A&color=fff" },
    content: "Bangalore's water crisis is a warning to the world. We cannot keep paving over lakes to build IT parks and expect nature to just cope. Rainwater harvesting needs to be mandatory for all buildings immediately. 💧",
    time: "12h ago",
    sparks: 4320,
    ripples: 920,
    isHot: true,
    hasBacked: true
  },
  {
    id: 107,
    author: { name: "Startup India", username: "startup_ind", avatar: "https://ui-avatars.com/api/?name=Startup&background=random" },
    content: "Funding winter is over. Q1 2026 has seen a 40% spike in seed funding compared to last year. Investors are looking for deep tech and AI-first consumer apps. If you are building, now is the time to pitch! 🚀",
    time: "14h ago",
    sparks: 780,
    ripples: 56,
    isHot: false,
    hasBacked: false
  },
  {
    id: 108,
    author: { name: "Gamer Zone", username: "gg_wp", avatar: "https://ui-avatars.com/api/?name=Gamer&background=8B5CF6&color=fff" },
    content: "GTA 6 trailer 3 just leaked on Reddit and Rockstar is taking down links fast. The map looks 3x bigger than Los Santos. My PC is going to melt trying to render this. 🎮🔥",
    time: "15h ago",
    sparks: 8900,
    ripples: 1200,
    isHot: true,
    hasBacked: true
  },
  {
    id: 109,
    author: { name: "Finance Bro", username: "bull_market", avatar: "https://ui-avatars.com/api/?name=Finance&background=random" },
    content: "Nifty crossing 25k is psychological. Retail investors are pouring money via SIPs like never before. The Indian middle class is finally moving away from just FDs and Gold. Massive wealth transfer happening right now. 📈",
    time: "18h ago",
    sparks: 1540,
    ripples: 210,
    isHot: false,
    hasBacked: false
  },
  {
    id: 110,
    author: { name: "Space Nerds", username: "astro_daily", avatar: "https://ui-avatars.com/api/?name=Space&background=000000&color=fff" },
    content: "ISRO just announced the timeline for the next lunar rover. What they are achieving on a fraction of NASA's budget is a masterclass in frugal engineering. Proud moment! 🚀🌕",
    image: "https://images.unsplash.com/photo-1517976487492-5750f3195933?q=80&w=2670&auto=format&fit=crop",
    time: "20h ago",
    sparks: 6700,
    ripples: 450,
    isHot: true,
    hasBacked: false
  },
  {
    id: 111,
    author: { name: "Meme Central", username: "dank_memes", avatar: "https://ui-avatars.com/api/?name=Meme&background=random" },
    content: "Me telling myself I'll sleep early tonight vs Me at 3 AM debugging a CSS div that won't center. 😭💀",
    time: "1d ago",
    sparks: 3200,
    ripples: 150,
    isHot: false,
    hasBacked: true
  },
  {
    id: 112,
    author: { name: "Health & Fitness", username: "fit_life", avatar: "https://ui-avatars.com/api/?name=Fit&background=EF4444&color=fff" },
    content: "Stop buying expensive protein powders with 20 unpronounceable ingredients. Sattu, eggs, paneer, and chicken. Keep it simple, keep it consistent. The fitness industry thrives on complicating things. 🏋️‍♂️",
    time: "1d ago",
    sparks: 1120,
    ripples: 89,
    isHot: false,
    hasBacked: false
  },
  {
    id: 113,
    author: { name: "Music Junkie", username: "indie_beats", avatar: "https://ui-avatars.com/api/?name=Music&background=random" },
    content: "The indie music scene in India right now is producing better tracks than mainstream Bollywood. Artists are experimenting with synth-wave mixed with classical instruments and it sounds heavenly. 🎧🎶",
    time: "1d ago",
    sparks: 890,
    ripples: 45,
    isHot: false,
    hasBacked: true
  },
  {
    id: 114,
    author: { name: "Automotive India", username: "auto_heads", avatar: "https://ui-avatars.com/api/?name=Auto&background=3B82F6&color=fff" },
    content: "EV infrastructure is growing, but range anxiety is still real on highways. Until we have 15-minute fast chargers every 50km, hybrids make more sense for the Indian market. Agree? 🚗⚡",
    time: "1d ago",
    sparks: 2340,
    ripples: 410,
    isHot: true,
    hasBacked: false
  },
  {
    id: 115,
    author: { name: "Design Thinker", username: "ui_ux_daily", avatar: "https://ui-avatars.com/api/?name=Design&background=random" },
    content: "Minimalism is dying. Brutalism and maximalism are taking over web design. Users are bored of white space and gray text. They want personality, harsh borders, and bold colors. Look at what zQuab is doing! 🎨✨",
    time: "2d ago",
    sparks: 1890,
    ripples: 112,
    isHot: false,
    hasBacked: true
  }
];

// --- MOCK DATA: YOUR NETWORK (15 Posts) ---
const NETWORK_POSTS = [
  {
    id: 201,
    author: { name: "Raj Millennium Raj", username: "raj_millennium", avatar: "https://ui-avatars.com/api/?name=Raj&background=random" },
    content: "Just pushed the new WebSocket architecture to prod. If the server doesn't crash in the next 10 minutes, we are going for beers! 🍻💻",
    time: "10m ago",
    sparks: 45,
    ripples: 12,
    isHot: false,
    hasBacked: true
  },
  {
    id: 202,
    author: { name: "Ninja Coder", username: "ninja_dev", avatar: "https://ui-avatars.com/api/?name=Ninja&background=random" },
    content: "Anyone else noticing LiveKit acting weird with Firefox today? Video feeds are dropping frames. Might need to adjust the ICE servers. 🛠️",
    time: "45m ago",
    sparks: 12,
    ripples: 3,
    isHot: false,
    hasBacked: false
  },
  {
    id: 203,
    author: { name: "Satish Chauhan", username: "satish_c", avatar: "https://ui-avatars.com/api/?name=Satish&background=random" },
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2670&auto=format&fit=crop",
    content: "New desk setup for the weekend hackathon. 2 monitors, 3 liters of coffee, 0 distractions. Let's go! 🚀",
    time: "2h ago",
    sparks: 89,
    ripples: 14,
    isHot: false,
    hasBacked: true
  },
  {
    id: 204,
    author: { name: "Priya Sharma", username: "priya_designs", avatar: "https://ui-avatars.com/api/?name=Priya&background=random" },
    content: "Working on the new 'Pulse' animations. Trying to make the glow look organic and not just like a cheap CSS shadow. Figma file is getting heavy! 🎨",
    time: "3h ago",
    sparks: 112,
    ripples: 22,
    isHot: true,
    hasBacked: false
  },
  {
    id: 205,
    author: { name: "Amit Kumar", username: "amit_backend", avatar: "https://ui-avatars.com/api/?name=Amit&background=random" },
    content: "Postgres index optimization is basically black magic. I just reduced a query time from 400ms to 12ms by moving two words around. I feel like a wizard. 🧙‍♂️🐘",
    time: "4h ago",
    sparks: 230,
    ripples: 45,
    isHot: true,
    hasBacked: true
  },
  {
    id: 206,
    author: { name: "BRC Hub", username: "brc_official", avatar: "https://ui-avatars.com/api/?name=BRC&background=random" },
    content: "Squad 'weekend' is currently live in a 10-person audio room debating whether React or Vue is better. It's getting heated. Join in! 🎙️🔥",
    time: "5h ago",
    sparks: 56,
    ripples: 18,
    isHot: false,
    hasBacked: false
  },
  {
    id: 207,
    author: { name: "Neha Gupta", username: "neha_g", avatar: "https://ui-avatars.com/api/?name=Neha&background=random" },
    content: "Does anyone have a spare invite code for the beta testing group? I have a friend who wants to test the Stranger Cam feature.",
    time: "6h ago",
    sparks: 14,
    ripples: 8,
    isHot: false,
    hasBacked: false
  },
  {
    id: 208,
    author: { name: "Vikram Singh", username: "vikram_sec", avatar: "https://ui-avatars.com/api/?name=Vikram&background=random" },
    content: "Just implemented rate limiting on the auth routes. Please don't spam the login button during your tests guys, you will get locked out for 15 mins! 🔒🛡️",
    time: "7h ago",
    sparks: 88,
    ripples: 12,
    isHot: false,
    hasBacked: true
  },
  {
    id: 209,
    author: { name: "Rahul Dev", username: "rahul_js", avatar: "https://ui-avatars.com/api/?name=Rahul&background=random" },
    content: "I finally understand how useEffect dependencies actually work. It only took me 3 years and countless infinite loops. 😅",
    time: "8h ago",
    sparks: 340,
    ripples: 67,
    isHot: true,
    hasBacked: false
  },
  {
    id: 210,
    author: { name: "Raj Millennium Raj", username: "raj_millennium", avatar: "https://ui-avatars.com/api/?name=Raj&background=random" },
    image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2670&auto=format&fit=crop",
    content: "Coding late night. The silence is the best soundtrack. 🌙",
    time: "12h ago",
    sparks: 145,
    ripples: 23,
    isHot: false,
    hasBacked: true
  },
  {
    id: 211,
    author: { name: "Kavya R", username: "kavya_pm", avatar: "https://ui-avatars.com/api/?name=Kavya&background=random" },
    content: "User feedback on the new floating call widget has been 95% positive. We are definitely keeping the PIP mode for desktop. Great job team! 📊📞",
    time: "14h ago",
    sparks: 210,
    ripples: 34,
    isHot: true,
    hasBacked: false
  },
  {
    id: 212,
    author: { name: "Ninja Coder", username: "ninja_dev", avatar: "https://ui-avatars.com/api/?name=Ninja&background=random" },
    content: "Reminder: Tomorrow is code freeze for V1. Commit your changes by 5 PM or they aren't going into the final build! ⏰🚨",
    time: "1d ago",
    sparks: 78,
    ripples: 11,
    isHot: false,
    hasBacked: false
  },
  {
    id: 213,
    author: { name: "Satish Chauhan", username: "satish_c", avatar: "https://ui-avatars.com/api/?name=Satish&background=random" },
    content: "Who wants to jump on a quick group call to test the latency? Need 4 people right now.",
    time: "1d ago",
    sparks: 12,
    ripples: 4,
    isHot: false,
    hasBacked: true
  },
  {
    id: 214,
    author: { name: "Amit Kumar", username: "amit_backend", avatar: "https://ui-avatars.com/api/?name=Amit&background=random" },
    content: "The Firebase FCM integration is complete. Background notifications should now be working even if the browser tab is closed. Let me know if anyone finds bugs. 🔔",
    time: "1d ago",
    sparks: 156,
    ripples: 28,
    isHot: false,
    hasBacked: false
  },
  {
    id: 215,
    author: { name: "Priya Sharma", username: "priya_designs", avatar: "https://ui-avatars.com/api/?name=Priya&background=random" },
    content: "Just completely redesigned the 'Matches' loading screen. It now has a sick pulsing 3D globe effect while searching for a stranger. You guys are going to love it! 🌍✨",
    time: "2d ago",
    sparks: 312,
    ripples: 45,
    isHot: true,
    hasBacked: true
  }
];

export default function Feeds() {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState<'pulse' | 'network'>('pulse');
  
  // Keep separate state for both feeds so sparks are maintained
  const [pulsePosts, setPulsePosts] = useState(GLOBAL_POSTS);
  const [networkPosts, setNetworkPosts] = useState(NETWORK_POSTS);

  // --- SMART SCROLL HEADER LOGIC ---
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const currentScrollY = scrollContainerRef.current.scrollTop;
      
      // If scrolling DOWN, hide header. If scrolling UP, show header.
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY.current) {
        setShowHeader(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    const container = scrollContainerRef.current;
    if (container) container.addEventListener('scroll', handleScroll, { passive: true });
    return () => { if (container) container.removeEventListener('scroll', handleScroll); };
  }, []);


  // Dynamic feed selector
  const activePosts = activeTab === 'pulse' ? pulsePosts : networkPosts;
  
  const handleSpark = (postId: number) => {
    if (activeTab === 'pulse') {
        setPulsePosts(pulsePosts.map(p => {
          if (p.id === postId) { const isBacking = !p.hasBacked; return { ...p, hasBacked: isBacking, sparks: p.sparks + (isBacking ? 1 : -1) }; }
          return p;
        }));
    } else {
        setNetworkPosts(networkPosts.map(p => {
          if (p.id === postId) { const isBacking = !p.hasBacked; return { ...p, hasBacked: isBacking, sparks: p.sparks + (isBacking ? 1 : -1) }; }
          return p;
        }));
    }
  };

  return (
    <DashboardLayout>
      <div 
         ref={scrollContainerRef}
         className="flex-1 h-full flex justify-center bg-gray-100 dark:bg-[#030303] overflow-y-auto scrollbar-hide relative transition-colors duration-300"
      >
        
        {/* MAIN FEED COLUMN */}
        <div className="w-full max-w-[640px] min-h-full flex flex-col pb-20 px-4 md:px-0 gap-6 relative">
          
          {/* SMART HEADER (Vanishes on scroll down) */}
          <div className={`sticky top-4 z-50 transition-all duration-300 ease-in-out ${showHeader ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0 pointer-events-none'}`}>
              
              {/* HEADER & TABS inside a floating glassmorphism pill */}
              <div className="bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border border-gray-200/50 dark:border-[#272729] rounded-[2rem] p-3 shadow-lg shadow-black/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2">
                     <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <TrendingUp size={16} strokeWidth={3} />
                         </div>
                         <h1 className="text-xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight">The Arena</h1>
                     </div>
                     
                     <div className="flex bg-gray-200/50 dark:bg-[#1a1a1a] p-1 rounded-xl shadow-inner border border-gray-300/50 dark:border-[#272729]">
                       <button 
                         onClick={() => { setActiveTab('pulse'); window.scrollTo({top: 0, behavior: 'smooth'}); }} 
                         className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all ${activeTab === 'pulse' ? 'bg-white dark:bg-[#272729] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                       >
                         Global Pulse
                       </button>
                       <button 
                         onClick={() => { setActiveTab('network'); window.scrollTo({top: 0, behavior: 'smooth'}); }} 
                         className={`px-4 py-1.5 text-xs font-extrabold rounded-lg transition-all ${activeTab === 'network' ? 'bg-white dark:bg-[#272729] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                       >
                         Your Network
                       </button>
                     </div>
                  </div>
              </div>
          </div>

          {/* COMPOSER (Create Post) */}
          <div className="p-5 rounded-[2rem] border border-gray-200 dark:border-[#272729] bg-white dark:bg-[#0f0f0f] shadow-sm flex flex-col gap-4 mt-2">
            <div className="flex gap-4">
               <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-[#343536]">
                 <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
               </div>
               <textarea 
                 placeholder="Ignite a new discussion..." 
                 className="w-full bg-transparent text-gray-900 dark:text-white text-lg resize-none focus:outline-none placeholder:text-gray-400 font-medium mt-2"
                 rows={2}
               />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#1a1a1a]">
              <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mt-2">
                <button className="p-2.5 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 rounded-full transition-colors"><ImageIcon size={20} strokeWidth={2.5} /></button>
                <button className="p-2.5 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 rounded-full transition-colors"><Smile size={20} strokeWidth={2.5} /></button>
                <button className="p-2.5 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 rounded-full transition-colors"><Globe size={20} strokeWidth={2.5} /></button>
              </div>
              <button className="px-6 py-2.5 mt-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white font-extrabold rounded-full text-sm transition-all active:scale-95 shadow-md">
                Post Spark
              </button>
            </div>
          </div>

          {/* POSTS FEED */}
          <div className="flex flex-col gap-6">
            {activePosts.map((post) => (
              <div 
                key={post.id} 
                className={`relative rounded-[2rem] p-5 transition-all duration-300 bg-white dark:bg-[#0f0f0f] border cursor-pointer hover:-translate-y-1 ${
                  post.isHot 
                    ? 'border-orange-500/30 dark:border-orange-500/20 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.2)] dark:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.1)]' 
                    : 'border-gray-200 dark:border-[#272729] shadow-sm hover:shadow-md'
                }`}
              >
                
                {/* HOT POST GLOW INDICATOR */}
                {post.isHot && (
                  <div className="absolute -top-3 left-6 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-orange-500/30">
                    <Flame size={12} className="animate-pulse" /> High Heat
                  </div>
                )}

                <div className="flex items-center justify-between mb-4 mt-1">
                   <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 border border-gray-100 dark:border-[#343536]">
                        <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                         <span className="font-bold text-[15px] text-gray-900 dark:text-white hover:underline leading-tight">{post.author.name}</span>
                         <div className="flex items-center gap-1 text-[12px] text-gray-500 font-medium">
                            <span>@{post.author.username}</span>
                            <span>·</span>
                            <span>{post.time}</span>
                         </div>
                      </div>
                   </div>
                   <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2"><MoreHorizontal size={20} /></button>
                </div>

                <p className="text-[16px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap mb-4">
                  {post.content}
                </p>

                {post.image && (
                  <div className="w-full h-64 md:h-[350px] rounded-2xl overflow-hidden mb-4 border border-gray-100 dark:border-[#272729] shadow-inner">
                    <img src={post.image} className="w-full h-full object-cover" alt="Post attachment" />
                  </div>
                )}

                {/* ACTION BAR (Sparks & Ripples) */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#1a1a1a]">
                  
                  {/* SPARK (Like Replacement) */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSpark(post.id); }}
                    className={`flex items-center gap-2 group transition-all px-3 py-1.5 rounded-full ${post.hasBacked ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' : 'hover:bg-yellow-50 dark:hover:bg-yellow-500/10 text-gray-500 hover:text-yellow-500'}`}
                  >
                    {post.hasBacked ? (
                      <Zap size={20} strokeWidth={2.5} className="fill-yellow-500 scale-110 transition-transform" />
                    ) : (
                      <Zap size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-sm font-extrabold">{post.sparks.toLocaleString()}</span>
                  </button>

                  {/* Ripple (Comment/Reply) */}
                  <button className="flex items-center gap-2 group hover:text-blue-500 text-gray-500 transition-colors px-3 py-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10">
                    <MessageCircle size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">{post.ripples.toLocaleString()}</span>
                  </button>

                  {/* Repost */}
                  <button className="flex items-center gap-2 group hover:text-green-500 text-gray-500 transition-colors px-3 py-1.5 rounded-full hover:bg-green-50 dark:hover:bg-green-500/10">
                    <Repeat2 size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                  </button>

                  {/* Share */}
                  <button className="flex items-center gap-2 group hover:text-purple-500 text-gray-500 transition-colors px-3 py-1.5 rounded-full hover:bg-purple-50 dark:hover:bg-purple-500/10">
                    <Share2 size={20} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                  </button>

                </div>
              </div>
            ))}
          </div>

          <div className="py-10 flex flex-col items-center justify-center text-gray-500">
             <Sparkles size={28} className="mb-3 text-gray-400" />
             <p className="text-sm font-extrabold uppercase tracking-widest">You've caught up with the pulse.</p>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}