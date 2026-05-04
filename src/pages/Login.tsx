import { useState, useEffect } from 'react';
import { Zap, Heart, Loader2, Sun, Moon } from 'lucide-react';
import { useAuthStore, type User } from '../store/useAuthStore'; 
import { useThemeStore } from '../store/useThemeStore'; 
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { api } from '../services/api'; 
import { InteractiveLogo } from '../components/InteractiveLogo';

const GOOGLE_CLIENT_ID = "1024944888869-9356nb9mq73ki2u2tch6ebtaoic7q3bg.apps.googleusercontent.com";

const Login = () => {
  const login = useAuthStore((state) => state.login);
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Send Google Token to backend
      const authData = await api.post('/auth/google', { 
        google_id_token: credentialResponse.credential 
      });

      if (!authData || !authData.access_token) {
        throw new Error("Failed to authenticate with the server.");
      }

      // 2. Save tokens securely in localStorage
      localStorage.setItem('zquab_access_token', authData.access_token);
      if (authData.refresh_token) {
        localStorage.setItem('zquab_refresh_token', authData.refresh_token);
      }

      // 3. Fetch the user's profile
      const profileData = await api.get('/users/me');
      const user: User = profileData.data || profileData;

      // 4. Update Global State
      login(user);

      // Route them based on username
      if (!user.username) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }

    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* 1. Parent container: locked to h-[100dvh] with overflow-hidden */}
      <div className="flex h-[100dvh] w-full font-sans bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-500 overflow-hidden">
        
        {/* --- DESKTOP LEFT PANEL: Static & Pinned --- */}
        {/* 2. Added h-full to explicitly fill the parent */}
        <div className="hidden lg:flex w-1/2 h-full relative bg-blue-950 flex-col justify-end p-12 xl:p-20 shadow-2xl z-20">
           <img 
             src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2000&auto=format&fit=crop" 
             alt="zQuab Community" 
             className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay pointer-events-none" 
           />
           {/* Darker gradient overlay to deepen the blue and make the text pop */}
           <div className="absolute inset-0 bg-gradient-to-t from-[#040b16] via-blue-950/60 to-blue-950/20 pointer-events-none"></div>

           <div className="relative z-10 max-w-xl">
             <h2 className="text-4xl xl:text-5xl font-display font-extrabold text-white leading-tight mb-6 drop-shadow-lg">
               The next generation of <br/><span className="text-blue-400">social connection.</span>
             </h2>
             <p className="text-lg text-blue-100/90 font-medium leading-relaxed mb-8">
               Dive into high-performance chat rooms, lightning-fast matching, and a premium community experience. Find your squad today.
             </p>

             <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                   <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" className="w-10 h-10 rounded-full border-2 border-blue-900" alt="user"/>
                   <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf" className="w-10 h-10 rounded-full border-2 border-blue-900" alt="user"/>
                   <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi&backgroundColor=c0aede" className="w-10 h-10 rounded-full border-2 border-blue-900" alt="user"/>
                </div>
                <div className="text-sm font-bold text-blue-200">
                  Join 100,000+ others online
                </div>
             </div>
           </div>
        </div>

        {/* --- RIGHT PANEL: Scrollable independently if needed --- */}
        {/* 3. Added h-full and overflow-y-auto */}
        <div className="w-full lg:w-1/2 h-full flex items-center justify-center relative overflow-y-auto">
          
          {/* --- THEME TOGGLE --- */}
          <button 
            onClick={toggleTheme}
            className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
          >
            {theme === 'light' ? <Moon size={20} strokeWidth={2.5} /> : <Sun size={20} strokeWidth={2.5} />}
          </button>

          {/* --- LAYER 1: Background --- */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-gray-50/80 dark:from-[#0a0a0a] dark:via-transparent dark:to-[#0a0a0a/80] pointer-events-none"></div>

          {/* --- LAYER 2: Floating Elements --- */}
          <div className="absolute top-24 left-4 md:left-8 lg:left-10 xl:left-20 animate-bounce duration-[3000ms] hidden md:flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] px-4 py-2 rounded-full shadow-lg transition-colors z-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">1,240+ Active Now</span>
          </div>

          <div className="absolute top-150 right-4 md:right-8 lg:right-10 xl:right-20 animate-pulse duration-[4000ms] hidden md:flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] px-4 py-2 rounded-full shadow-lg transition-colors z-0">
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Instant Connections</span>
          </div>

          {/* --- LAYER 3: Main UI Content --- */}
          <div className="relative z-10 w-full max-w-[450px] px-6 sm:px-8 py-10 flex flex-col items-center">
            
            <div className="flex flex-col items-center text-center mb-10 w-full">
              <InteractiveLogo />
              
              <h1 className="mt-4 text-5xl sm:text-6xl font-extrabold tracking-tight font-display transition-colors drop-shadow-md">
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600">z</span>
                <span className="text-gray-900 dark:text-white">Quab</span>
              </h1>
              
              <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed max-w-[280px] transition-colors">
                 Share your voice. Find your people.
                <p></p>Chat, stream, and vibe.
              </p>
            </div>

            {error && (
              <div className="mb-6 w-full p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold text-center animate-in fade-in transition-colors">
                {error}
              </div>
            )}

            {/* Authentication Section */}
            <div className="flex flex-col gap-5 items-center w-full max-w-[350px]">
              {isLoading ? (
                <div className="w-full flex justify-center py-5 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm transition-colors">
                   <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin" strokeWidth={3} />
                </div>
              ) : (
                <div className="w-full flex justify-center shadow-lg rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google Sign-In failed.")}
                    theme={theme === 'dark' ? "filled_black" : "outline"}
                    size="large"
                    shape="rectangular"
                    width={windowWidth < 400 ? "300" : "350"} 
                    text="continue_with"
                  />
                </div>
              )}

              <p className="text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-2 px-4 transition-colors">
                By clicking continue, you agree to our <span className="underline cursor-pointer hover:text-gray-900 dark:hover:text-gray-300 font-bold">Terms</span> and <span className="underline cursor-pointer hover:text-gray-900 dark:hover:text-gray-300 font-bold">Privacy Policy</span>.
              </p>
            </div>
            
            <div className="mt-12 w-full flex justify-center gap-8 border-t border-gray-200 dark:border-[#272729] pt-8 transition-colors">
                <div className="text-center">
                    <p className="text-xl font-extrabold text-gray-900 dark:text-white transition-colors">100k+</p>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1 transition-colors">Users</p>
                </div>
                <div className="w-[2px] rounded-full bg-gray-200 dark:bg-[#272729] transition-colors"></div>
                <div className="text-center">
                    <p className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-1.5 transition-colors">
                        <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500 drop-shadow-sm" strokeWidth={2.5} /> Fast
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1 transition-colors">Matching</p>
                </div>
            </div>

          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;