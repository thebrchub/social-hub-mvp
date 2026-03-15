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
      <div className="min-h-[100dvh] w-full bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden font-sans transition-colors duration-500">
        
        {/* --- THEME TOGGLE --- */}
        <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
        >
          {theme === 'light' ? <Moon size={20} strokeWidth={2.5} /> : <Sun size={20} strokeWidth={2.5} />}
        </button>

        {/* --- LAYER 1: Background --- */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-gray-50/80 dark:from-[#0a0a0a] dark:via-transparent dark:to-[#0a0a0a/80] pointer-events-none"></div>

        {/* --- LAYER 2: Floating Elements --- */}
        <div className="absolute top-20 left-10 md:left-1/4 animate-bounce duration-[3000ms] hidden md:flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] px-4 py-2 rounded-full shadow-lg transition-colors">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">1,204 Online</span>
        </div>

        <div className="absolute bottom-32 right-10 md:right-1/4 animate-pulse duration-[4000ms] hidden md:flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] px-4 py-2 rounded-full shadow-lg transition-colors">
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">New Match found</span>
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
              The place where <span className="text-gray-900 dark:text-gray-200 font-extrabold">India</span> meets the world. 
              Chat, stream, and vibe.
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
    </GoogleOAuthProvider>
  );
};

export default Login;