import { Chrome, Globe, Zap, MessageCircle, Heart, Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore'; 
import { useNavigate } from 'react-router-dom';

const Login = () => {
  // 1. Get the login function from our global store
  const login = useAuthStore((state) => state.login);
  
  // 2. Get the navigation hook
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
        console.log("Redirecting to Google Auth...");
        
        // TEST MODE: Set 'true' to simulate a NEW USER. 
        // Set 'false' to simulate an EXISTING USER.
        login(true); 

        // The App.tsx router will automatically detect "needsOnboarding" 
        // and send us to /onboarding. We don't need to manually navigate.
    };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* --- LAYER 1: The Grid Background (The "Network" Feel) --- */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Radial fade to make the center focus pop */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a/80] pointer-events-none"></div>

      {/* --- LAYER 2: Floating "Social Activity" Elements (The "Alive" Feel) --- */}
      {/* Top Left Bubble */}
      <div className="absolute top-20 left-10 md:left-1/4 animate-bounce duration-[3000ms] hidden md:flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded-full shadow-2xl">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-400">1,204 Online</span>
      </div>

      {/* Bottom Right Bubble */}
      <div className="absolute bottom-32 right-10 md:right-1/4 animate-pulse duration-[4000ms] hidden md:flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded-full shadow-2xl opacity-70">
        <Heart className="w-3 h-3 text-red-500 fill-red-500" />
        <span className="text-xs text-gray-400">New Match found</span>
      </div>

      {/* Random Floating Icons */}
      <MessageCircle className="absolute top-1/3 right-[15%] w-12 h-12 text-blue-500/20 rotate-12 blur-[1px]" />
      <Users className="absolute bottom-1/3 left-[15%] w-16 h-16 text-purple-500/20 -rotate-12 blur-[2px]" />


      {/* --- LAYER 3: The Main Interface --- */}
      <div className="relative z-10 w-full max-w-[400px] px-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative w-20 h-20 bg-black border border-gray-800 rounded-full flex items-center justify-center">
              <Globe className="w-10 h-10 text-white" />
            </div>
            {/* Notification Badge */}
            <div className="absolute top-0 right-0 w-6 h-6 bg-red-500 border-4 border-black rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              1
            </div>
          </div>
          
          <h1 className="mt-6 text-4xl font-extrabold text-white tracking-tight font-display">
            Social<span className="text-blue-500">Hub</span>
          </h1>
          <p className="mt-3 text-gray-400 text-sm leading-relaxed max-w-[280px]">
            The place where <span className="text-gray-200 font-medium">India</span> meets the world. 
            Chat, stream, and vibe.
          </p>
        </div>

        {/* The Action Card */}
        <div className="flex flex-col gap-4">
          <button 
            onClick={handleGoogleLogin}
            className="group relative w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-bold py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] cursor-pointer"
          >
            <Chrome className="w-5 h-5 text-blue-600" />
            <span>Continue with Google</span>
            
            {/* Shine Effect on Hover */}
            <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/50 transition-all"></div>
          </button>

          <p className="text-center text-[11px] text-gray-600 mt-4">
            By clicking continue, you agree to our <span className="underline cursor-pointer hover:text-gray-400">Terms</span> and <span className="underline cursor-pointer hover:text-gray-400">Privacy Policy</span>.
          </p>
        </div>
        
        {/* Footer Stats (Social Proof) */}
        <div className="mt-12 flex justify-center gap-8 border-t border-white/5 pt-8">
            <div className="text-center">
                <p className="text-xl font-bold text-white">100k+</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Users</p>
            </div>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="text-center">
                <p className="text-xl font-bold text-white flex items-center gap-1">
                    <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Fast
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Matching</p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Login;