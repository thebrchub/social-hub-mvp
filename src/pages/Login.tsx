import { useState, useEffect } from 'react';
import { Zap, MessageCircle, Heart, Users, Loader2 } from 'lucide-react';
import { useAuthStore, type User } from '../store/useAuthStore'; 
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { api } from '../services/api'; 

const GOOGLE_CLIENT_ID = "1024944888869-9356nb9mq73ki2u2tch6ebtaoic7q3bg.apps.googleusercontent.com";

const Login = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track window width for the Google Login button sizing
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

      const { access_token, refresh_token } = authData;

      // 2. Save tokens securely in localStorage
      localStorage.setItem('aarpaar_access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('aarpaar_refresh_token', refresh_token);
      }

      // 3. Fetch the user's profile
      const profileData = await api.get('/users/me');
      
      // Handle direct object response from backend
      const user: User = profileData.data || profileData;

      // 4. Update Global State
      login(user);

      // Route them based on whether they have set a username
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
      <div className="min-h-[100dvh] w-full bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden font-sans">
        
        {/* --- LAYER 1: The Grid Background --- */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a/80] pointer-events-none"></div>

        {/* --- LAYER 2: Floating Elements (Hidden on mobile for cleaner look) --- */}
        <div className="absolute top-20 left-10 md:left-1/4 animate-bounce duration-[3000ms] hidden md:flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded-full shadow-2xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">1,204 Online</span>
        </div>

        <div className="absolute bottom-32 right-10 md:right-1/4 animate-pulse duration-[4000ms] hidden md:flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded-full shadow-2xl opacity-70">
          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          <span className="text-xs text-gray-400">New Match found</span>
        </div>

        <MessageCircle className="absolute top-1/4 right-[10%] w-12 h-12 text-blue-500/20 rotate-12 blur-[1px] hidden sm:block" />
        <Users className="absolute bottom-1/4 left-[10%] w-16 h-16 text-indigo-500/20 -rotate-12 blur-[2px] hidden sm:block" />

        {/* --- LAYER 3: The Main Interface --- */}
        <div className="relative z-10 w-full max-w-[400px] px-6 sm:px-8 py-10 flex flex-col items-center">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-8 sm:mb-10 w-full">
            <div className="relative group cursor-pointer flex justify-center mb-2">
              
              {/* Pure blue glow directly behind the image */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-28 sm:h-28 bg-blue-600 rounded-full blur-[40px] opacity-50 group-hover:opacity-80 transition duration-500"></div>
              
              {/* Logo container - Removed background & borders, completely transparent */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center z-10">
                <img 
                  src="/logo.png" 
                  alt="zQuab Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                {/* Fallback Z */}
                <span className="hidden text-6xl sm:text-7xl font-black text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">Z</span>
              </div>
            </div>
            
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
              z<span className="text-blue-500">Quab</span>
            </h1>
            <p className="mt-3 text-gray-400 text-xs sm:text-sm leading-relaxed max-w-[280px]">
              The place where <span className="text-gray-200 font-medium">India</span> meets the world. 
              Chat, stream, and vibe.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 w-full p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm text-center animate-in fade-in">
              {error}
            </div>
          )}

          {/* The Action Card */}
          <div className="flex flex-col gap-4 items-center w-full max-w-[350px]">
            {isLoading ? (
              <div className="w-full flex justify-center py-4 bg-white/5 rounded-2xl border border-white/10">
                 <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="w-full flex justify-center shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)] rounded-xl overflow-hidden">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google Sign-In was cancelled or failed.")}
                  theme="filled_black"
                  size="large"
                  shape="rectangular"
                  // Adjusts width dynamically so it doesn't break on tiny screens like iPhone SE
                  width={windowWidth < 400 ? "300" : "350"} 
                  text="continue_with"
                />
              </div>
            )}

            <p className="text-center text-[10px] sm:text-[11px] text-gray-600 mt-4 px-4">
              By clicking continue, you agree to our <span className="underline cursor-pointer hover:text-gray-400">Terms</span> and <span className="underline cursor-pointer hover:text-gray-400">Privacy Policy</span>.
            </p>
          </div>
          
          {/* Footer Stats */}
          <div className="mt-10 sm:mt-12 w-full flex justify-center gap-6 sm:gap-8 border-t border-white/5 pt-8">
              <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-white">100k+</p>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Users</p>
              </div>
              <div className="h-8 w-[1px] bg-white/10"></div>
              <div className="text-center">
                  <p className="text-lg sm:text-xl font-bold text-white flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" /> Fast
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Matching</p>
              </div>
          </div>

        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;