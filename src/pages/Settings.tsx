import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Save, LogOut, Loader2, User, Eye, Globe, CheckCircle2 } from 'lucide-react';
import Modal from '../components/Modal';

// 8 premium avatar URLs
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

const Settings = () => {
  const { user, logout, completeOnboarding } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: user?.name || '',
    avatar_url: user?.avatar_url || AVATAR_PRESETS[0],
    is_private: user?.is_private || false,
    show_last_seen: user?.show_last_seen !== false,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.patch('/users/me', {
        name: formData.name,
        avatar_url: formData.avatar_url,
        is_private: formData.is_private,
        show_last_seen: formData.show_last_seen
      });
      
      const updatedData = res.data || res;
      completeOnboarding(updatedData); 
      setShowSuccessModal(true); 
    } catch (err: any) {
      alert(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      {/* FIX: Reduced bottom padding on desktop to remove dead space */}
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#030303] scrollbar-hide pb-24 md:pb-12 transition-colors duration-300">
        
        {/* FIX: Set to max-w-4xl for the perfect balance of utilizing space without making things too distant */}
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight transition-colors">Settings</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium mt-1 transition-colors">Manage your identity and app preferences.</p>
          </div>

          <div className="space-y-6 md:space-y-8">
            
            {/* --- SECTION: IDENTITY (Full Width) --- */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 transition-colors">Identity</h3>
              <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                
                {/* Avatar Grid */}
                <div className="p-5 md:p-6 border-b border-gray-100 dark:border-[#272729] transition-colors">
                  <label className="block text-[10px] md:text-xs font-extrabold text-gray-500 dark:text-gray-400 mb-3 md:mb-4 uppercase tracking-widest transition-colors">Profile Picture</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 md:gap-4">
                    {AVATAR_PRESETS.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setFormData({ ...formData, avatar_url: url })}
                        className={`aspect-square rounded-full overflow-hidden border-4 transition-all duration-300 ${
                          formData.avatar_url === url 
                          ? 'border-blue-500 scale-110 shadow-[0_4px_15px_rgba(59,130,246,0.4)] z-10' 
                          : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-200 dark:hover:border-[#343536] hover:scale-105'
                        }`}
                      >
                        <img src={url} alt="preset" className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-50 dark:bg-[#1E3A8A] flex items-center justify-center text-blue-600 dark:text-blue-200 shrink-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] transition-colors">
                      <User className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white transition-colors">Display Name</p>
                      <p className="text-[10px] md:text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-colors">How you appear to others</p>
                    </div>
                  </div>
                  {/* 3D Bulged Input */}
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#343536] rounded-xl px-4 py-2.5 md:py-3 font-bold text-sm text-gray-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#1A1A1B] focus:border-blue-500 w-full sm:w-72 lg:w-80 transition-all shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_4px_12px_rgba(59,130,246,0.15)] dark:focus:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_4px_12px_rgba(59,130,246,0.3)]"
                  />
                </div>
              </div>
            </section>

            {/* FIX: Added "items-start" so the Log Out card doesn't stretch to match Privacy's height! */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
              
              {/* --- SECTION: PRIVACY --- */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 transition-colors">Privacy</h3>
                <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 divide-y divide-gray-100 dark:divide-[#272729]">
                  <ToggleRow 
                    icon={<Globe className="w-5 h-5 md:w-5 md:h-5 text-green-600 dark:text-green-500" strokeWidth={2.5} />} 
                    iconBg="bg-green-50 dark:bg-[#14532D]"
                    label="Private Account" 
                    desc="Require approval for message requests"
                    enabled={formData.is_private}
                    onToggle={() => setFormData({...formData, is_private: !formData.is_private})}
                  />
                  <ToggleRow 
                    icon={<Eye className="w-5 h-5 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />} 
                    iconBg="bg-purple-50 dark:bg-[#4C1D95]"
                    label="Online Presence" 
                    desc="Let friends see when you're online"
                    enabled={formData.show_last_seen}
                    onToggle={() => setFormData({...formData, show_last_seen: !formData.show_last_seen})}
                  />
                </div>
              </section>

              {/* --- SECTION: ACCOUNT --- */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1 transition-colors">Account</h3>
                {/* FIX: Removed flex-1/flex-col forcing it to stretch vertically */}
                <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="p-5 md:p-6 flex items-center justify-between group cursor-pointer hover:bg-red-50 dark:hover:bg-[#3f1616] transition-colors" onClick={logout}>
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-50 dark:bg-[#7F1D1D] flex items-center justify-center text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
                          <LogOut className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">Log Out</p>
                          <p className="text-[10px] md:text-[11px] font-medium text-gray-500 dark:text-gray-400 transition-colors">Sign out of your account securely</p>
                        </div>
                     </div>
                  </div>
                </div>
              </section>
              
            </div>
          </div>

          {/* FIX: Tightened the margin above the Save Bar on desktop so it sits nicely below the grid */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-gray-200 dark:border-[#343536] md:relative md:bg-transparent md:dark:bg-transparent md:border-none md:p-0 md:mt-8 flex justify-end z-40 transition-colors duration-300">
             <button 
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="w-full md:w-auto px-8 md:px-10 py-3.5 md:py-4 bg-blue-600 dark:bg-[#1E3A8A] border border-blue-700 dark:border-[#1E40AF] text-white text-sm md:text-base font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_6px_15px_rgba(37,99,235,0.4)] dark:hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_6px_15px_rgba(0,0,0,0.6)]"
             >
                {isSaving ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" strokeWidth={2.5} /> : <Save className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />}
                {isSaving ? 'Saving...' : 'Save All Changes'}
             </button>
          </div>

        </div>
      </div>

      <Modal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
        title="Success"
        footer={
          <button 
            onClick={() => setShowSuccessModal(false)} 
            className="w-full py-3 md:py-3.5 bg-blue-600 dark:bg-[#1E3A8A] border border-blue-700 dark:border-[#1E40AF] text-white text-sm md:text-base font-bold rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
          >
            Great!
          </button>
        }
      >
        <div className="flex flex-col items-center text-center py-4 md:py-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 dark:bg-[#14532D] text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4 md:mb-5 border border-green-200 dark:border-[#166534] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2.5} />
          </div>
          <h4 className="text-lg md:text-xl font-display font-extrabold text-gray-900 dark:text-white mb-1 md:mb-2">Profile Updated</h4>
          <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Your changes have been saved securely.</p>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

const ToggleRow = ({ icon, iconBg, label, desc, enabled, onToggle }: any) => (
  <div className="p-5 md:p-6 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-[#272729] transition-colors cursor-pointer" onClick={onToggle}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] transition-colors ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs md:text-sm font-bold text-gray-900 dark:text-white leading-tight transition-colors">{label}</p>
        <p className="text-[10px] md:text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 transition-colors">{desc}</p>
      </div>
    </div>
    <button 
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`w-12 h-7 md:w-14 md:h-8 rounded-full relative transition-all duration-300 shadow-inner ${enabled ? 'bg-blue-600 dark:bg-[#1E3A8A]' : 'bg-gray-300 dark:bg-[#343536]'}`}
    >
      <div className={`absolute top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full transition-all shadow-[0_2px_4px_rgba(0,0,0,0.2)] ${enabled ? 'left-[1.375rem] md:left-7' : 'left-1'}`}></div>
    </button>
  </div>
);

export default Settings;