import { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { Mail, Calendar, Phone, Shield, Globe, Loader2, Edit3, Save, Eye, EyeOff, UserCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// Premium avatar URLs
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

const Profile = () => {
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    gender: '',
    is_private: false,
    show_last_seen: true,
    avatar_url: '',
  });
  
  const updateStoreUser = useAuthStore((state) => state.completeOnboarding);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/users/me'); 
        const data = res.data || res;
        setProfileData(data);
        updateStoreUser(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [updateStoreUser]);

  const handleEditClick = () => {
    setEditForm({
      name: profileData.name || '',
      mobile: profileData.mobile || '',
      gender: profileData.gender || 'Unknown',
      is_private: profileData.is_private || false,
      show_last_seen: profileData.show_last_seen !== false, 
      avatar_url: profileData.avatar_url || AVATAR_PRESETS[0], 
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.patch('/users/me', { 
        name: editForm.name,
        mobile: editForm.mobile,
        gender: editForm.gender,
        is_private: editForm.is_private,
        show_last_seen: editForm.show_last_seen,
        avatar_url: editForm.avatar_url
      });
      
      const updatedData = res.data || res;
      setProfileData(updatedData);
      updateStoreUser(updatedData);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#030303] transition-colors duration-300">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" strokeWidth={3} />
          <p className="font-bold">Loading your profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profileData) {
    return (
      <DashboardLayout>
        <div className="p-6 m-6 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/20 font-bold">
          <p>{error || 'Could not find profile data.'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const currentAvatar = isEditing ? editForm.avatar_url : (profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.name}&background=random`);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto scrollbar-hide h-full bg-gray-50 dark:bg-[#030303] transition-colors duration-300">
        
        {/* --- PREMIUM HEADER SECTION --- */}
        <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 mb-6 flex flex-col">
          {/* Cover Photo area - Premium Gradient */}
          <div className="h-28 sm:h-36 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-[#1E3A8A] dark:to-[#4C1D95] rounded-t-3xl w-full border-b border-gray-200 dark:border-[#343536] relative overflow-hidden">
             <div className="absolute inset-0 bg-white/20 dark:bg-black/20 mix-blend-overlay"></div>
          </div>
          
          <div className="px-6 pb-8 relative flex-1">
            <div className="flex justify-between items-start">
              {/* Avatar overlapping the cover */}
              <div className="-mt-12 sm:-mt-16 w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-[#1A1A1B] bg-gray-100 dark:bg-[#272729] relative shadow-lg shrink-0">
                 <img 
                   src={currentAvatar} 
                   alt="Avatar" 
                   className="w-full h-full rounded-full object-cover"
                 />
              </div>

              {/* Action Button - 3D Bulge */}
              <div className="mt-4">
                {!isEditing ? (
                  <button 
                    onClick={handleEditClick}
                    className="flex items-center gap-2 bg-gray-100 dark:bg-[#272729] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#343536] px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-[#343536] shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_4px_8px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all"
                  >
                    <Edit3 size={16} strokeWidth={2.5} /> Edit Profile
                  </button>
                ) : (
                  <button 
                    onClick={handleSave}
                    disabled={isSaving || !editForm.name.trim()}
                    className="flex items-center gap-2 bg-blue-600 dark:bg-[#1E3A8A] text-white hover:bg-blue-700 dark:hover:bg-blue-500 px-6 py-2.5 rounded-xl text-sm font-bold border border-blue-700 dark:border-[#1E40AF] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" strokeWidth={2.5} /> : <Save size={16} strokeWidth={2.5} />} 
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Profile Meta Data */}
            <div className="mt-4">
               <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight transition-colors">{isEditing ? editForm.name || 'Your Name' : profileData.name}</h1>
               <p className="text-gray-500 dark:text-gray-400 font-bold mt-1 transition-colors">@{profileData.username}</p>
               
               <div className="flex flex-wrap items-center gap-3 mt-5">
                 {profileData.is_private ? (
                    <span className="flex items-center gap-1.5 bg-yellow-100 dark:bg-[#713F12] text-yellow-700 dark:text-yellow-400 text-xs font-bold px-3.5 py-1.5 rounded-lg border border-yellow-200 dark:border-[#854D0E] shadow-sm">
                      <Shield size={14} strokeWidth={2.5} /> Private Account
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-green-100 dark:bg-[#14532D] text-green-700 dark:text-green-400 text-xs font-bold px-3.5 py-1.5 rounded-lg border border-green-200 dark:border-[#166534] shadow-sm">
                      <Globe size={14} strokeWidth={2.5} /> Public Account
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-bold px-3.5 py-1.5 bg-gray-100 dark:bg-[#272729] rounded-lg border border-gray-200 dark:border-[#343536] shadow-sm">
                    <Calendar size={14} strokeWidth={2.5} /> Joined {new Date(profileData.created_at).toLocaleDateString()}
                  </span>
               </div>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC BODY SECTION --- */}
        {isEditing ? (
          <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-3xl shadow-sm animate-in fade-in duration-300 transition-colors">
            <h2 className="px-8 py-5 border-b border-gray-100 dark:border-[#272729] font-display font-extrabold text-gray-900 dark:text-white text-xl">Edit Details</h2>
            
            <div className="p-8 space-y-8">
              
              {/* Avatar Selection Grid */}
              <div>
                <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Choose an Avatar</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, avatar_url: url })}
                      className={`w-full aspect-square rounded-full overflow-hidden border-4 transition-all duration-200 ${
                        editForm.avatar_url === url 
                          ? 'border-blue-500 scale-110 shadow-[0_4px_15px_rgba(59,130,246,0.4)] z-10' 
                          : 'border-transparent hover:border-gray-300 dark:hover:border-[#343536] opacity-70 hover:opacity-100 bg-gray-100 dark:bg-[#272729]'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#343536] rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:bg-white dark:focus:bg-[#1A1A1B] focus:border-blue-500 transition-all shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_4px_12px_rgba(59,130,246,0.15)] dark:focus:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_4px_12px_rgba(59,130,246,0.3)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Mobile Number</label>
                  <input 
                    type="text" 
                    value={editForm.mobile} 
                    onChange={(e) => setEditForm({...editForm, mobile: e.target.value})}
                    placeholder="+91..."
                    className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#343536] rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:bg-white dark:focus:bg-[#1A1A1B] focus:border-blue-500 transition-all shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_4px_12px_rgba(59,130,246,0.15)] dark:focus:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_4px_12px_rgba(59,130,246,0.3)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Gender</label>
                  <select 
                    value={editForm.gender}
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#343536] rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:bg-white dark:focus:bg-[#1A1A1B] focus:border-blue-500 transition-all shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_4px_12px_rgba(59,130,246,0.15)] dark:focus:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_4px_12px_rgba(59,130,246,0.3)] appearance-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Toggles - 3D Bulge Interactive Elements */}
              <div className="pt-4 space-y-4">
                <label className="flex items-center justify-between p-5 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white dark:bg-[#1A1A1B] rounded-xl shadow-sm group-hover:scale-105 transition-transform border border-gray-100 dark:border-[#272729]"><Shield className="text-yellow-500 w-5 h-5" strokeWidth={2.5} /></div>
                    <div>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white">Private Account</p>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Require approval for direct message requests</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={editForm.is_private}
                    onChange={(e) => setEditForm({...editForm, is_private: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 cursor-pointer shadow-sm"
                  />
                </label>

                <label className="flex items-center justify-between p-5 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-white dark:bg-[#1A1A1B] rounded-xl shadow-sm group-hover:scale-105 transition-transform border border-gray-100 dark:border-[#272729]">
                      {editForm.show_last_seen ? <Eye className="text-green-500 w-5 h-5" strokeWidth={2.5} /> : <EyeOff className="text-gray-400 dark:text-gray-500 w-5 h-5" strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white">Show Last Seen</p>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Allow friends to see when you're online</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={editForm.show_last_seen}
                    onChange={(e) => setEditForm({...editForm, show_last_seen: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 cursor-pointer shadow-sm"
                  />
                </label>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#111] rounded-b-3xl p-5 border-t border-gray-200 dark:border-[#272729] flex justify-end gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-transparent text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-[#272729] transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !editForm.name.trim()}
                className="px-8 py-3 rounded-xl bg-blue-600 dark:bg-[#1E3A8A] text-white font-bold hover:bg-blue-700 dark:hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-blue-700 dark:border-[#1E40AF] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_10px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_10px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
              >
                {isSaving && <Loader2 size={18} className="animate-spin" strokeWidth={2.5} />} 
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-3xl shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300 transition-colors">
            <h2 className="px-8 py-5 border-b border-gray-100 dark:border-[#272729] font-display font-extrabold text-gray-900 dark:text-white text-xl bg-gray-50/50 dark:bg-[#1e1e20]/30">Personal Information</h2>
            <div className="divide-y divide-gray-100 dark:divide-[#272729]">
               <ListRow icon={<Mail strokeWidth={2.5} />} label="Email Address" value={profileData.email} />
               <ListRow icon={<UserCircle strokeWidth={2.5} />} label="Gender" value={profileData.gender === 'M' ? 'Male' : profileData.gender === 'F' ? 'Female' : profileData.gender || 'Not specified'} />
               <ListRow icon={<Phone strokeWidth={2.5} />} label="Mobile Number" value={profileData.mobile || 'Not provided'} />
               <ListRow 
                 icon={profileData.show_last_seen ? <Eye strokeWidth={2.5} /> : <EyeOff strokeWidth={2.5} />} 
                 label="Activity Status" 
                 value={profileData.show_last_seen ? "Visible to friends" : "Hidden (Ghost Mode)"} 
                 valueClass={!profileData.show_last_seen ? 'text-orange-500 dark:text-orange-400' : 'text-gray-900 dark:text-gray-200'}
               />
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

// Clean List Row Component for Read-Only View
const ListRow = ({ icon, label, value, valueClass = "text-gray-900 dark:text-gray-200" }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-[#272729]/30 transition-colors gap-2 group">
    <div className="flex items-center gap-4">
      <div className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors">{icon}</div>
      <p className="text-sm font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
    <div className="sm:text-right pl-10 sm:pl-0">
      <p className={`text-base font-bold ${valueClass} truncate max-w-[250px] sm:max-w-sm`}>{value}</p>
    </div>
  </div>
);

export default Profile;