import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Calendar, User, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  
  // Form State
  const [formData, setFormData] = useState({
    name: 'Srikanth Raj', 
    gender: '',
    dob: ''
  });
  
  const [error, setError] = useState<string | null>(null);

  // Helper: Calculate Age
  const isAdult = (dateString: string) => {
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
     
     if (!isAdult(date)) {
        setError("You must be at least 18 years old to use this app.");
     } else {
        setError(null);
     }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

    completeOnboarding(formData);
    navigate('/dashboard');
  };

  const today = new Date().toISOString().split('T')[0];

  // Gender Options for the new "Tile" UI
  const GENDER_OPTIONS = [
    { id: 'male', label: 'Male', emoji: '👨' },
    { id: 'female', label: 'Female', emoji: '👩' },
    { id: 'other', label: 'Other', emoji: '🌈' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* --- BACKGROUND EFFECTS --- */}
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>

      {/* --- MAIN CARD --- */}
      <div className="w-full max-w-lg relative z-10">
        
        {/* Card Header Decoration */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 rounded-full"></div>
                <div className="relative w-20 h-20 bg-[#0f0f0f] border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Sparkles className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                </div>
            </div>
        </div>

        <div className="bg-[#0f0f0f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 pt-12 shadow-2xl">
            
            <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome, Macha!</h1>
                <p className="text-gray-400 text-sm">
                    Let's set up your profile so you can start matching.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Name Input */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Display Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            maxLength={30}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                            placeholder="Your Name"
                        />
                    </div>
                </div>

                {/* 2. Custom Gender Tiles (Replaces Dropdown) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">I Identify As</label>
                    <div className="grid grid-cols-3 gap-3">
                        {GENDER_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setFormData({...formData, gender: option.id})}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
                                    formData.gender === option.id 
                                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_15px_-3px_rgba(59,130,246,0.4)]' 
                                    : 'bg-[#1a1a1a] border-white/5 text-gray-400 hover:bg-[#222] hover:border-white/10'
                                }`}
                            >
                                <span className="text-2xl">{option.emoji}</span>
                                <span className="text-xs font-bold">{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Date of Birth */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Birthday</label>
                    <div className="relative group">
                        <input 
                            type="date" 
                            max={today}
                            value={formData.dob}
                            onChange={handleDateChange}
                            className={`w-full bg-[#1a1a1a] border rounded-xl pl-4 pr-4 py-3.5 text-white focus:outline-none transition-all appearance-none ${error && formData.dob ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                            style={{ colorScheme: 'dark' }} // Forces calendar icon to be white in Chrome
                        />
                        <Calendar className="absolute right-4 top-3.5 w-5 h-5 text-gray-500 pointer-events-none group-focus-within:text-blue-500" />
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex gap-3 items-center animate-in slide-in-from-top-2 fade-in">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-400 font-bold">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit"
                    disabled={!formData.gender || !formData.dob || !!error}
                    className="w-full bg-white hover:bg-gray-100 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] mt-2"
                >
                    {formData.gender && formData.dob && !error ? <CheckCircle className="w-5 h-5 text-green-600" /> : <User className="w-5 h-5" />}
                    <span>Enter SocialHub</span>
                </button>

            </form>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;