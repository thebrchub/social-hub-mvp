import { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuthStore } from '../store/useAuthStore';
import { Camera, Save, Bell, Volume2, Shield, LogOut, Trash2 } from 'lucide-react';

const Settings = () => {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Mock Save Function
  const handleSave = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500); // Fake API call
  };

  return (
    <DashboardLayout>
       <div className="h-full overflow-y-auto p-6 bg-[#0a0a0a] scrollbar-hide">
          
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-display font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400 text-sm mb-8">Manage your profile and app preferences.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- LEFT COL: Profile Edit --- */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Profile Card */}
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                            <div className="relative group cursor-pointer">
                                <div className="w-28 h-28 rounded-full bg-gray-800 overflow-hidden border-4 border-[#0a0a0a] shadow-xl">
                                    <img src={user?.avatar} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div className="text-center sm:text-left">
                                <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                                <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Free Plan</span>
                                    <span className="text-xs text-gray-500">Member since 2026</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Display Name</label>
                                    <input type="text" defaultValue={user?.name} className="w-full mt-1.5 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email (Locked)</label>
                                    <input type="text" defaultValue={user?.email} disabled className="w-full mt-1.5 bg-[#1a1a1a]/50 border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm cursor-not-allowed" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bio</label>
                                <textarea rows={3} placeholder="Tell us about yourself..." className="w-full mt-1.5 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"></textarea>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-end">
                                <button 
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-70"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
                        <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                            <Trash2 size={18} /> Danger Zone
                        </h3>
                        <p className="text-gray-400 text-xs mb-4">
                            Deleting your account will remove all your match history, friends, and messages. This cannot be undone.
                        </p>
                        <button className="text-xs font-bold text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                            Delete Account
                        </button>
                    </div>

                </div>

                {/* --- RIGHT COL: Preferences --- */}
                <div className="space-y-6">
                    
                    {/* General Settings */}
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">App Preferences</h3>
                        
                        <div className="space-y-4">
                            <ToggleOption icon={<Bell size={16} />} label="Push Notifications" />
                            <ToggleOption icon={<Volume2 size={16} />} label="Sound Effects" />
                            <ToggleOption icon={<Shield size={16} />} label="Show Online Status" />
                        </div>
                    </div>

                    {/* Account Actions */}
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                         <button onClick={logout} className="w-full flex items-center justify-between text-gray-400 hover:text-white transition-colors group">
                            <span className="flex items-center gap-3 text-sm font-medium">
                                <LogOut size={16} /> Log Out
                            </span>
                            <span className="text-xs bg-white/5 px-2 py-1 rounded group-hover:bg-white/10">v1.0.0</span>
                         </button>
                    </div>

                </div>

            </div>
          </div>
       </div>
    </DashboardLayout>
  );
};

// Simple Toggle Component
const ToggleOption = ({ icon, label }: any) => {
    const [enabled, setEnabled] = useState(true);
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-gray-300 text-sm">
                {icon} {label}
            </div>
            <button 
                onClick={() => setEnabled(!enabled)}
                className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${enabled ? 'left-6' : 'left-1'}`}></div>
            </button>
        </div>
    );
};

export default Settings;