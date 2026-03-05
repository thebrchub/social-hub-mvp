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
      // Exactly matching the UpdateMeRequest API schema from swagger
      const res = await api.patch('/users/me', {
        name: formData.name,
        avatar_url: formData.avatar_url,
        is_private: formData.is_private,
        show_last_seen: formData.show_last_seen
      });
      
      const updatedData = res.data || res;
      completeOnboarding(updatedData); // Update global store
      setShowSuccessModal(true); // Open custom modal instead of alert
    } catch (err: any) {
      alert(err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-[#0a0a0a] scrollbar-hide pb-32">
        <div className="max-w-2xl mx-auto p-4 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your identity and app preferences.</p>
          </div>

          <div className="space-y-8">
            
            {/* --- SECTION: IDENTITY --- */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-1">Identity</h3>
              <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl overflow-hidden shadow-xl">
                
                {/* Avatar Grid */}
                <div className="p-6 border-b border-[#272729]">
                  <label className="block text-xs font-bold text-gray-400 mb-4 uppercase">Profile Picture</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {AVATAR_PRESETS.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setFormData({ ...formData, avatar_url: url })}
                        className={`aspect-square rounded-full overflow-hidden border-2 transition-all ${
                          formData.avatar_url === url 
                          ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20 z-10' 
                          : 'border-transparent opacity-40 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><User size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-white">Display Name</p>
                      <p className="text-[10px] text-gray-500">How you appear to others</p>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-[#0a0a0a] border border-[#343536] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-full sm:w-64 transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* --- SECTION: PRIVACY --- */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-1">Privacy</h3>
              <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl overflow-hidden shadow-xl divide-y divide-[#272729]">
                <ToggleRow 
                  icon={<Globe size={20} className="text-green-500" />} 
                  label="Private Account" 
                  desc="Require approval for message requests"
                  enabled={formData.is_private}
                  onToggle={() => setFormData({...formData, is_private: !formData.is_private})}
                />
                <ToggleRow 
                  icon={<Eye size={20} className="text-indigo-400" />} 
                  label="Online Presence" 
                  desc="Let friends see when you're online"
                  enabled={formData.show_last_seen}
                  onToggle={() => setFormData({...formData, show_last_seen: !formData.show_last_seen})}
                />
              </div>
            </section>

            {/* --- SECTION: ACCOUNT --- */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-1">Account</h3>
              <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl overflow-hidden shadow-xl divide-y divide-[#272729]">
                <div className="p-5 sm:p-6 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-colors" onClick={logout}>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all"><LogOut size={20} /></div>
                      <div>
                        <p className="text-sm font-bold text-white">Log Out</p>
                        <p className="text-[10px] text-gray-500">Sign out of your account securely</p>
                      </div>
                   </div>
                </div>
                {/* DELETE ACCOUNT COMMENTED OUT - API NOT READY
                <div className="p-5 sm:p-6 flex items-center justify-between group cursor-pointer hover:bg-red-500/5 transition-colors">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#272729] flex items-center justify-center text-gray-500"><Trash2 size={20} /></div>
                      <div>
                        <p className="text-sm font-bold text-gray-500 group-hover:text-red-400">Delete Account</p>
                        <p className="text-[10px] text-gray-500">This action is irreversible</p>
                      </div>
                   </div>
                </div> 
                */}
              </div>
            </section>
          </div>

          {/* Floating Save Bar for Mobile/Desktop */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-[#343536] md:relative md:bg-transparent md:border-none md:p-0 md:mt-12 flex justify-end z-40">
             <button 
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="w-full md:w-auto px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 disabled:opacity-50"
             >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? 'Saving...' : 'Save All Changes'}
             </button>
          </div>

        </div>
      </div>

      {/* --- CUSTOM SUCCESS MODAL --- */}
      <Modal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
        title="Success"
        footer={
          <button 
            onClick={() => setShowSuccessModal(false)} 
            className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors"
          >
            Great!
          </button>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h4 className="text-lg font-bold text-white mb-1">Profile Updated</h4>
          <p className="text-sm text-gray-400">Your changes have been saved successfully.</p>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

const ToggleRow = ({ icon, label, desc, enabled, onToggle }: any) => (
  <div className="p-5 sm:p-6 flex items-center justify-between group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-[#272729] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-white leading-tight">{label}</p>
        <p className="text-[11px] text-gray-500 mt-1">{desc}</p>
      </div>
    </div>
    <button 
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative transition-all duration-300 ${enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${enabled ? 'left-6' : 'left-1'}`}></div>
    </button>
  </div>
);

export default Settings;