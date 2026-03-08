import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Calendar, User, CheckCircle, AlertCircle, Sparkles, AtSign, Loader2, XCircle, Sun, Moon } from 'lucide-react';
import { api } from '../services/api';

// The 8 premium avatar URLs
const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Nala&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jade&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&backgroundColor=d1d4f9",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    if (user?.username) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState({
    username: '',
    name: user?.name || '', 
    gender: '',
    dob: '',
    avatar_url: AVATAR_PRESETS[0] 
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // --- REAL-TIME USERNAME CHECKER ---
  useEffect(() => {
    const username = formData.username.trim().toLowerCase();
    
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    
    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get(`/users/check-username?username=${username}`);
        const status = res.data?.status || res.status;
        
        if (status === 'taken') {
           setUsernameStatus('taken');
        } else {
           setUsernameStatus('available');
        }
      } catch (err) {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  const isAdult = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age >= 18;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const date = e.target.value;
     setFormData({ ...formData, dob: date });
     
     if (date && !isAdult(date)) {
        setError("You must be at least 18 years old to use this app.");
     } else {
        setError(null);
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || formData.username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      return;
    }
    if (usernameStatus === 'taken') {
      setError("That username is already taken. Please choose another.");
      return;
    }
    if (!formData.name.trim() || formData.name.length < 3) {
        setError("Name must be at least 3 characters.");
        return;
    }
    if (!formData.gender) {
        setError("Please select your gender.");
        return;
    }
    if (!formData.dob || !isAdult(formData.dob)) {
        setError("You must be 18+ to join.");
        return;
    }

    const backendGender = formData.gender === 'male' ? 'M' : formData.gender === 'female' ? 'F' : 'Any';

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.patch('/users/me', {
        username: formData.username.toLowerCase(),
        name: formData.name,
        gender: backendGender,
        avatar_url: formData.avatar_url
      });

      const updatedUser = res.data || res;
      completeOnboarding(updatedUser);
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message || "Failed to save profile. That username might be taken.");
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const GENDER_OPTIONS = [
    { id: 'male', label: 'Male', emoji: '👨' },
    { id: 'female', label: 'Female', emoji: '👩' },
    { id: 'other', label: 'Other', emoji: '🌈' },
  ];

  if (user?.username) return null;

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50 dark:bg-[#030303] flex items-center justify-center p-4 font-sans relative overflow-hidden overflow-y-auto transition-colors duration-500">
      
      {/* --- THEME TOGGLE --- */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] rounded-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm hover:shadow-md hover:scale-105"
        title="Toggle Theme"
      >
        {theme === 'light' ? <Moon size={20} strokeWidth={2.5} /> : <Sun size={20} strokeWidth={2.5} />}
      </button>

      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none transition-colors duration-500"></div>
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000 pointer-events-none"></div>

      {/* --- MAIN CARD --- */}
      <div className="w-full max-w-md relative z-10 my-8">
        
        {/* Card Header Decoration */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 rounded-[1.5rem]"></div>
                <div className="relative w-16 h-16 bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Sparkles className="w-7 h-7 text-yellow-500 fill-yellow-500" strokeWidth={2} />
                </div>
            </div>
        </div>

        <div className="bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border border-gray-200 dark:border-[#272729] rounded-[2rem] p-6 sm:p-8 pt-12 shadow-2xl relative transition-colors duration-500">
            
            <div className="text-center mb-6">
                <h1 className="text-3xl font-display font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">Welcome!</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium px-2 transition-colors">
                    Let's set up your profile. <strong className="text-blue-600 dark:text-blue-400">Your username cannot be changed later.</strong>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* 0. Avatar Picker */}
                <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Choose your Avatar</label>
                    <div className="grid grid-cols-4 gap-3">
                        {AVATAR_PRESETS.map((url, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setFormData({ ...formData, avatar_url: url })}
                                className={`w-full aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
                                    formData.avatar_url === url 
                                        ? 'border-blue-500 scale-110 shadow-[0_4px_15px_rgba(59,130,246,0.4)] z-10' 
                                        : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105 hover:border-gray-200 dark:hover:border-[#343536]'
                                }`}
                            >
                                <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* 1. Username Input */}
                <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Unique Username</label>
                    <div className="relative group">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" strokeWidth={2.5} />
                        <input 
                            type="text" 
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                            maxLength={30}
                            className={`w-full bg-gray-50 dark:bg-[#111] border rounded-xl pl-11 pr-10 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none transition-all placeholder:text-gray-400 shadow-inner ${
                               usernameStatus === 'taken' ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' :
                               usernameStatus === 'available' ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20' :
                               'border-gray-200 dark:border-[#343536] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                            }`}
                            placeholder="cool_user_99"
                            disabled={isLoading}
                        />
                        {/* Real-time Status Indicator */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                           {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" strokeWidth={3} />}
                           {usernameStatus === 'available' && <CheckCircle className="w-5 h-5 text-green-500" strokeWidth={2.5} />}
                           {usernameStatus === 'taken' && <XCircle className="w-5 h-5 text-red-500" strokeWidth={2.5} />}
                        </div>
                    </div>
                    {usernameStatus === 'taken' && <p className="text-[10px] text-red-600 dark:text-red-400 ml-1 font-bold tracking-wide">Username already taken</p>}
                    {usernameStatus === 'available' && <p className="text-[10px] text-green-600 dark:text-green-400 ml-1 font-bold tracking-wide">Username is available!</p>}
                </div>

                {/* 2. Name Input */}
                <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Display Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" strokeWidth={2.5} />
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            maxLength={50}
                            className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#343536] rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400 shadow-inner"
                            placeholder="Your Name"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* 3. Custom Gender Tiles */}
                  <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">I Identify As</label>
                      <div className="grid grid-cols-3 gap-2">
                          {GENDER_OPTIONS.map((option) => (
                              <button
                                  key={option.id}
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => setFormData({...formData, gender: option.id})}
                                  className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border-2 transition-all duration-300 ${
                                      formData.gender === option.id 
                                      ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 dark:border-blue-500 text-blue-700 dark:text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]' 
                                      : 'bg-gray-50 dark:bg-[#111] border-gray-200 dark:border-[#343536] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] shadow-inner'
                                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                  <span className="text-xl drop-shadow-sm">{option.emoji}</span>
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider">{option.label}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* 4. Date of Birth */}
                  <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Birthday</label>
                      <div className="relative group h-[72px]">
                          <input 
                              type="date" 
                              max={today}
                              value={formData.dob}
                              onChange={handleDateChange}
                              disabled={isLoading}
                              className={`w-full h-full bg-gray-50 dark:bg-[#111] border rounded-xl pl-4 pr-10 text-sm font-bold text-gray-900 dark:text-white focus:outline-none transition-all appearance-none shadow-inner ${error && formData.dob && !isAdult(formData.dob) ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-gray-200 dark:border-[#343536] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`}
                              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }} 
                          />
                          <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" strokeWidth={2.5} />
                      </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 rounded-xl flex gap-3 items-center animate-in slide-in-from-top-2 fade-in mt-4 shadow-inner">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0" strokeWidth={2.5} />
                        <p className="text-[11px] text-red-600 dark:text-red-400 font-bold leading-tight">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit"
                    disabled={!formData.username || usernameStatus === 'taken' || !formData.name || !formData.gender || !formData.dob || !!error || isLoading}
                    className="w-full bg-blue-600 dark:bg-white hover:bg-blue-700 dark:hover:bg-gray-200 text-white dark:text-black font-extrabold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_6px_15px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_0_20px_rgba(255,255,255,0.2)] mt-8 text-sm hover:-translate-y-0.5 disabled:hover:translate-y-0"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                            <span>Creating Profile...</span>
                        </>
                    ) : (
                        <>
                            {formData.gender && formData.dob && !error && usernameStatus === 'available' ? <CheckCircle className="w-5 h-5 text-blue-200 dark:text-green-600" strokeWidth={3} /> : <User className="w-5 h-5" strokeWidth={2.5} />}
                            <span>Enter zQuab</span>
                        </>
                    )}
                </button>

            </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;