import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Calendar, User, CheckCircle, AlertCircle, Sparkles, AtSign, Loader2, XCircle } from 'lucide-react';
import { api } from '../services/api';

// The same 8 premium avatar URLs used in the Profile section
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
  
  const user = useAuthStore((state) => state.user);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);

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
    avatar_url: AVATAR_PRESETS[0] // Default to first avatar
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Real-time username checking state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // --- REAL-TIME USERNAME CHECKER ---
  useEffect(() => {
    const username = formData.username.trim().toLowerCase();
    
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    
    // Debounce the API call by 500ms so we don't spam the server while typing
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
        // If API fails, we return to idle to not hard-block the user incorrectly
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
      // Sent exactly matching the UpdateMeRequest in Swagger JSON
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
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-4 font-sans relative overflow-hidden overflow-y-auto">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000 pointer-events-none"></div>

      {/* --- MAIN CARD --- */}
      <div className="w-full max-w-md relative z-10 my-8">
        
        {/* Card Header Decoration */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 rounded-full"></div>
                <div className="relative w-16 h-16 bg-[#0f0f0f] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                </div>
            </div>
        </div>

        <div className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 pt-10 shadow-2xl relative">
            
            <div className="text-center mb-5">
                <h1 className="text-2xl font-display font-bold text-white mb-1">Welcome!</h1>
                <p className="text-gray-400 text-xs px-2">
                    Let's set up your profile. <strong className="text-blue-400">Your username cannot be changed later.</strong>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 0. Avatar Picker (NEW) */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Choose your Avatar</label>
                    <div className="grid grid-cols-4 gap-2">
                        {AVATAR_PRESETS.map((url, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setFormData({ ...formData, avatar_url: url })}
                                className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                                    formData.avatar_url === url 
                                        ? 'border-blue-500 scale-105 shadow-[0_0_15px_rgba(59,130,246,0.4)] z-10' 
                                        : 'border-transparent hover:border-gray-500 opacity-60 hover:opacity-100'
                                }`}
                            >
                                <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover bg-gray-800" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* 1. Username Input */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Unique Username</label>
                    <div className="relative group">
                        <AtSign className="absolute left-4 top-3 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                            maxLength={30}
                            className={`w-full bg-[#1a1a1a] border rounded-xl pl-11 pr-10 py-2.5 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600 ${
                               usernameStatus === 'taken' ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' :
                               usernameStatus === 'available' ? 'border-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500' :
                               'border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            }`}
                            placeholder="cool_user_99"
                            disabled={isLoading}
                        />
                        {/* Real-time Status Indicator */}
                        <div className="absolute right-4 top-3">
                           {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                           {usernameStatus === 'available' && <CheckCircle className="w-4 h-4 text-green-500" />}
                           {usernameStatus === 'taken' && <XCircle className="w-4 h-4 text-red-500" />}
                        </div>
                    </div>
                    {usernameStatus === 'taken' && <p className="text-[10px] text-red-400 ml-1 font-medium">Username already taken</p>}
                    {usernameStatus === 'available' && <p className="text-[10px] text-green-400 ml-1 font-medium">Username is available!</p>}
                </div>

                {/* 2. Name Input */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Display Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            maxLength={50}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                            placeholder="Your Name"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 3. Custom Gender Tiles */}
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">I Identify As</label>
                      <div className="grid grid-cols-3 gap-2">
                          {GENDER_OPTIONS.map((option) => (
                              <button
                                  key={option.id}
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => setFormData({...formData, gender: option.id})}
                                  className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all duration-200 ${
                                      formData.gender === option.id 
                                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_-3px_rgba(59,130,246,0.4)]' 
                                      : 'bg-[#1a1a1a] border-white/5 text-gray-400 hover:bg-[#222] hover:border-white/10'
                                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                  <span className="text-xl">{option.emoji}</span>
                                  <span className="text-[9px] font-bold">{option.label}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* 4. Date of Birth */}
                  <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Birthday</label>
                      <div className="relative group h-[58px]">
                          <input 
                              type="date" 
                              max={today}
                              value={formData.dob}
                              onChange={handleDateChange}
                              disabled={isLoading}
                              className={`w-full h-full bg-[#1a1a1a] border rounded-xl pl-4 pr-10 text-sm text-white focus:outline-none transition-all appearance-none ${error && formData.dob && !isAdult(formData.dob) ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                              style={{ colorScheme: 'dark' }} 
                          />
                          <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-focus-within:text-blue-500" />
                      </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex gap-2 items-center animate-in slide-in-from-top-2 fade-in mt-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-[11px] text-red-400 font-bold leading-tight">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit"
                    disabled={!formData.username || usernameStatus === 'taken' || !formData.name || !formData.gender || !formData.dob || !!error || isLoading}
                    className="w-full bg-white hover:bg-gray-100 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] mt-6 text-sm"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            {formData.gender && formData.dob && !error && usernameStatus === 'available' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <User className="w-4 h-4" />}
                            <span>Enter SocialHub</span>
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