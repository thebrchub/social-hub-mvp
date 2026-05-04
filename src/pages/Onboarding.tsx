import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { Calendar, User, CheckCircle, AlertCircle, AtSign, Loader2, XCircle, Sun, Moon, Heart, Lock, PenTool, MessageSquare, Users, Zap, Globe, Moon as MoonIcon, Gamepad2, Camera } from 'lucide-react';
import { api } from '../services/api';
import AvatarCropperModal from '../components/AvatarCropperModal';

// 9 premium avatar URLs to allow 1 slot for custom upload (10 total = 5x2 grid)
const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Nala&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jade&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver&backgroundColor=d1d4f9",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=ffdfbf",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Cropper States
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

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
    return age >= 7;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const date = e.target.value;
     setFormData({ ...formData, dob: date });
     
     if (date && !isAdult(date)) {
        setError("You must be at least 7 years old to use this app.");
     } else {
        setError(null);
     }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setRawImageSrc(imageUrl);
      setIsCropperOpen(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setCustomAvatar(croppedImageUrl);
    setFormData({ ...formData, avatar_url: croppedImageUrl });
    setIsCropperOpen(false);
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
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
];

  if (user?.username) return null;

  return (
    <div className="min-h-[100dvh] w-full bg-gray-50 dark:bg-[#050505] flex items-center justify-center font-sans overflow-x-hidden overflow-y-auto transition-colors duration-300 relative">
      
      {/* --- THEME TOGGLE --- */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#272729] rounded-full text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 transition-colors shadow-sm"
        title="Toggle Theme"
      >
        {theme === 'light' ? <Moon size={20} strokeWidth={2.5} /> : <Sun size={20} strokeWidth={2.5} />}
      </button>

      {/* --- BACKGROUND EFFECTS --- */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none transition-colors duration-500"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* --- RESPONSIVE LAYOUT WRAPPER --- */}
      {/* Changed flex-row to flex-col on mobile/tablet, and lg:flex-row on large desktops */}
      <div className="relative z-10 w-full max-w-[1400px] py-12 flex flex-col xl:flex-row items-center justify-center xl:justify-between px-6 lg:px-10 xl:px-16 gap-12 xl:gap-8">

        {/* --- LEFT COLUMN: Content (Hidden on smaller screens, shown on XL) --- */}
        <div className="hidden xl:flex flex-col justify-center gap-8 w-full max-w-[340px] shrink-0">
           
          

           <div>
               <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight font-display text-gray-900 dark:text-white leading-[1.15]">
                  Your voice.<br/>
                  Your people.<br/>
                  <span className="text-blue-600 dark:text-blue-500">Your world.</span>
               </h1>
               <p className="text-xs xl:text-sm text-gray-500 dark:text-gray-400 font-medium mt-4 leading-relaxed max-w-[300px]">
                  Micro-blog, chat, join communities and connect with millions across the globe. All in one place.
               </p>
           </div>

           <div className="flex items-center justify-between gap-2 xl:gap-4 pr-4">
               <div className="flex flex-col items-center gap-1 text-center">
                   <PenTool className="w-4 h-4 xl:w-5 xl:h-5 text-blue-500" />
                   <span className="text-[9px] xl:text-[10px] font-bold text-gray-900 dark:text-gray-200">Micro Blogs</span>
               </div>
               <div className="flex flex-col items-center gap-1 text-center">
                   <MessageSquare className="w-4 h-4 xl:w-5 xl:h-5 text-indigo-500" />
                   <span className="text-[9px] xl:text-[10px] font-bold text-gray-900 dark:text-gray-200">Chat</span>
               </div>
               <div className="flex flex-col items-center gap-1 text-center">
                   <Users className="w-4 h-4 xl:w-5 xl:h-5 text-green-500" />
                   <span className="text-[9px] xl:text-[10px] font-bold text-gray-900 dark:text-gray-200">Communities</span>
               </div>
               <div className="flex flex-col items-center gap-1 text-center">
                   <Zap className="w-4 h-4 xl:w-5 xl:h-5 text-yellow-500" />
                   <span className="text-[9px] xl:text-[10px] font-bold text-gray-900 dark:text-gray-200">Instant</span>
               </div>
           </div>

           <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-4 mt-2 max-w-[280px]">
               <div className="flex items-center mb-3">
                   {[0, 1, 2, 3].map((i) => (
                      <img key={i} src={AVATAR_PRESETS[i+1]} className="w-7 h-7 xl:w-8 xl:h-8 rounded-full border-2 border-white dark:border-[#0a0a0a] -ml-2 first:ml-0 bg-gray-200" alt="user" />
                   ))}
                   <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-full border-2 border-white dark:border-[#0a0a0a] -ml-2 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[8px] xl:text-[9px] font-bold text-gray-600 dark:text-gray-300">
                      +100K
                   </div>
               </div>
               <p className="text-[11px] xl:text-xs font-bold text-gray-900 dark:text-gray-200">Join 100,000+ amazing people</p>
               <p className="text-[9px] xl:text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">from 180+ countries <Globe className="w-3 h-3 text-blue-500" /></p>
           </div>
        </div>

        {/* --- CENTER COLUMN: The Onboarding Form (Visible on all screens) --- */}
        <div className="w-full max-w-[500px] shrink-0 animate-in zoom-in-95 duration-500 relative">
          
          <div className="bg-white/90 dark:bg-[#0c0c0c]/90 backdrop-blur-2xl border border-gray-200 dark:border-[#272729] rounded-[2rem] p-6 lg:p-8 shadow-2xl relative z-10 transition-colors duration-500">
              
              <div className="text-center mb-8">
                  <h2 className="text-3xl lg:text-4xl font-display font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">Create your profile</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium px-2 transition-colors">
                      Customize how others see you. <strong className="text-blue-600 dark:text-blue-500">Your username cannot be changed later.</strong>
                  </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* 0. Avatar Grid with Upload */}
                  <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 mb-3 transition-colors">Choose your Avatar</label>
                      <div className="grid grid-cols-5 gap-2 sm:gap-3">
                          
                          {/* Upload Custom Image */}
                          <div className="relative">
                              <input type="file" ref={fileInputRef} id="avatar-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                              <label 
                                htmlFor="avatar-upload" 
                                className={`cursor-pointer w-full aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 relative ${
                                  formData.avatar_url === customAvatar 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105 z-10' 
                                    : 'border-dashed border-gray-300 dark:border-[#444] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] opacity-80 hover:opacity-100 hover:scale-105'
                                }`}
                              >
                                  {customAvatar ? (
                                      <img src={customAvatar} alt="Custom" className="w-full h-full object-cover rounded-[14px]" />
                                  ) : (
                                      <Camera className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                  )}
                                  {formData.avatar_url === customAvatar && (
                                      <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-0.5 shadow-sm">
                                          <CheckCircle className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                      </div>
                                  )}
                              </label>
                          </div>

                          {/* 9 Presets */}
                          {AVATAR_PRESETS.map((url, idx) => (
                              <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setFormData({ ...formData, avatar_url: url })}
                                  className={`w-full aspect-square rounded-2xl overflow-hidden transition-all duration-300 relative border-2 ${
                                      formData.avatar_url === url 
                                          ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105 z-10' 
                                          : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105 bg-gray-100 dark:bg-gray-800'
                                  }`}
                              >
                                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                                  {formData.avatar_url === url && (
                                      <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-0.5 shadow-sm">
                                          <CheckCircle className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                                      </div>
                                  )}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* 1 & 2. Username and Display Name Row (Stacked vertically to ensure 100% width) */}
                  <div className="flex flex-col gap-6">
                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Unique Username</label>
                          <div className="relative group">
                              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" />
                              <input 
                                  type="text" 
                                  value={formData.username}
                                  onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                                  maxLength={30}
                                  className={`w-full bg-gray-50 dark:bg-[#111] border rounded-xl pl-10 pr-9 py-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none transition-all placeholder:text-gray-400 ${
                                      usernameStatus === 'taken' ? 'border-red-500 focus:ring-1 focus:ring-red-500' :
                                      usernameStatus === 'available' ? 'border-green-500 focus:ring-1 focus:ring-green-500' :
                                      'border-gray-200 dark:border-[#272729] focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                  }`}
                                  placeholder="cool_user_99"
                                  disabled={isLoading}
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                                  {usernameStatus === 'available' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                  {usernameStatus === 'taken' && <XCircle className="w-4 h-4 text-red-500" />}
                              </div>
                          </div>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Display Name</label>
                          <div className="relative group">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors" />
                              <input 
                                  type="text" 
                                  value={formData.name}
                                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                                  maxLength={50}
                                  className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-xl pl-10 pr-4 py-3 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                                  placeholder="Your Name"
                                  disabled={isLoading}
                              />
                          </div>
                      </div>
                  </div>

                  {/* 3 & 4. Gender and DOB Row (Side-by-side) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Gender Selection */}
                  <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="text-[9px] lg:text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">I Identify As</label>
                      <div className="flex gap-2 h-[42px]">
                          {GENDER_OPTIONS.map((option) => (
                              <button
                                  key={option.id}
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => setFormData({...formData, gender: option.id})}
                                  className={`flex-1 flex items-center justify-center rounded-xl border transition-all duration-200 ${
                                      formData.gender === option.id 
                                      ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400' 
                                      : 'bg-gray-50 dark:bg-[#111] border-gray-200 dark:border-[#272729] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a1a]'
                                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                  <span className="text-[10px] font-bold tracking-widest uppercase">{option.label}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="text-[9px] lg:text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest ml-1 transition-colors">Date of Birth</label>
                      <div className="relative group h-[42px] flex items-center bg-gray-50 dark:bg-[#111] border rounded-xl transition-all shadow-inner overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 dark:focus-within:border-blue-500 border-gray-200 dark:border-[#272729]">
                          <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-500 transition-colors">
                              <Calendar className="w-4 h-4" />
                          </div>
                          <input 
                              type="date" 
                              max={today}
                              value={formData.dob}
                              onChange={handleDateChange}
                              disabled={isLoading}
                              className={`flex-1 h-full bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:outline-none appearance-none`}
                              style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }} 
                          />
                      </div>
                  </div>
                </div>
                  

                  {/* Error Banner */}
                  {error && (
                      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-2.5 rounded-xl flex gap-2 items-center animate-in fade-in mt-1">
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                          <p className="text-[11px] text-red-600 dark:text-red-400 font-bold leading-tight">{error}</p>
                      </div>
                  )}

                  {/* Submit Button */}
                  <button 
                      type="submit"
                      disabled={!formData.username || usernameStatus === 'taken' || !formData.name || !formData.gender || !formData.dob || !!error || isLoading}
                      className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 disabled:hover:translate-y-0 text-sm"
                  >
                      {isLoading ? (
                          <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Creating Profile...</span>
                          </>
                      ) : (
                          <>
                              
                              <span>Enter zQuab</span>
                          </>
                      )}
                  </button>
                  
                  <p className="text-center flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-medium pt-1">
                      <Lock className="w-3 h-3" /> Your privacy is our priority. You can change this anytime.
                  </p>

              </form>
          </div>
        </div>

        {/* --- RIGHT COLUMN: Floating Cards (Hidden on smaller screens, shown on XL) --- */}
        <div className="hidden xl:flex flex-col justify-center gap-12 w-[320px] shrink-0 relative z-0">
            
            <div className="relative self-end animate-in fade-in slide-in-from-right-4 duration-700 delay-100 z-10">
               <div className="absolute top-1/2 -left-4 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
               <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-2xl p-4 shadow-xl w-[260px]">
                   <div className="flex items-center gap-3">
                       <img src={AVATAR_PRESETS[7]} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800" alt="avatar" />
                       <div>
                           <p className="text-xs font-bold text-gray-900 dark:text-gray-200 flex items-center gap-1">Travel Diaries <Globe className="w-3 h-3 text-green-500" /></p>
                           <p className="text-[10px] text-gray-500">Exploring the mountains</p>
                       </div>
                   </div>
                   <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500 font-medium ml-11">
                       <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> 212</span>
                       <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> 48</span>
                   </div>
               </div>
            </div>

            <div className="relative self-start -ml-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-200 z-10">
               <div className="absolute top-1/2 -right-4 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
               <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-2xl p-4 shadow-xl w-[260px]">
                   <div className="flex items-center gap-3">
                       <img src={AVATAR_PRESETS[3]} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800" alt="avatar" />
                       <div>
                           <p className="text-xs font-bold text-gray-900 dark:text-gray-200 flex items-center gap-1">Late night talks <MoonIcon className="w-3 h-3 text-yellow-500" /></p>
                           <p className="text-[10px] text-gray-500">Best conversations happen at night.</p>
                       </div>
                   </div>
                   <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500 font-medium ml-11">
                       <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> 156</span>
                       <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> 23</span>
                   </div>
               </div>
            </div>

            <div className="relative self-center ml-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-300 z-10">
               <div className="absolute top-1/2 -left-4 w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
               <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-2xl p-4 shadow-xl w-[260px]">
                   <div className="flex items-center gap-3">
                       <img src={AVATAR_PRESETS[8]} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800" alt="avatar" />
                       <div>
                           <p className="text-xs font-bold text-gray-900 dark:text-gray-200 flex items-center gap-1">Gamers Squad <Gamepad2 className="w-3 h-3 text-purple-500" /></p>
                           <p className="text-[10px] text-gray-500">Who's up for a match?</p>
                       </div>
                   </div>
                   <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500 font-medium ml-11">
                       <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> 98</span>
                       <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> 16</span>
                   </div>
               </div>
            </div>

        </div>

      </div>

      {/* RENDER THE IMAGE CROPPER MODAL HERE */}
      <AvatarCropperModal 
        isOpen={isCropperOpen}
        imageSrc={rawImageSrc}
        onClose={() => setIsCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default Onboarding;