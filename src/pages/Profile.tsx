import { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { Mail, Calendar, Phone, Shield, Globe, Loader2, Edit3, Save, Eye, EyeOff, UserCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// 8 premium avatar URLs (replace with your backend CDN URLs later)
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
        const res = await api.get('/users/me'); // [cite: 608, 610]
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
      const res = await api.patch('/users/me', { // [cite: 630, 632]
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
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
          <p>Loading your profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profileData) {
    return (
      <DashboardLayout>
        <div className="p-6 m-6 text-center text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
          <p>{error || 'Could not find profile data.'}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Use editForm avatar dynamically if editing, else use saved profile avatar
  const currentAvatar = isEditing ? editForm.avatar_url : (profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.name}&background=random`);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto scrollbar-hide h-full">
        
        {/* --- PREMIUM HEADER SECTION --- */}
        <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl shadow-xl mb-6 flex flex-col">
          {/* Subtle dark Cover Photo area */}
          <div className="h-28 sm:h-36 bg-[#272729] rounded-t-2xl w-full border-b border-[#343536]"></div>
          
          <div className="px-6 pb-6 relative flex-1">
            <div className="flex justify-between items-start">
              {/* Avatar overlapping the cover */}
              <div className="-mt-12 sm:-mt-16 w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[#1A1A1B] bg-gray-800 relative shadow-lg shrink-0">
                 <img 
                   src={currentAvatar} 
                   alt="Avatar" 
                   className="w-full h-full rounded-full object-cover bg-gray-800"
                 />
              </div>

              {/* Action Button */}
              <div className="mt-4">
                {!isEditing ? (
                  <button 
                    onClick={handleEditClick}
                    className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-full text-sm font-bold transition-colors"
                  >
                    <Edit3 size={16} /> Edit Profile
                  </button>
                ) : (
                  <button 
                    onClick={handleSave}
                    disabled={isSaving || !editForm.name.trim()}
                    className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 px-5 py-2 rounded-full text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Profile Meta Data */}
            <div className="mt-3">
               <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{isEditing ? editForm.name || 'Your Name' : profileData.name}</h1>
               <p className="text-gray-500 font-medium">@{profileData.username}</p>
               
               <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4">
                 {profileData.is_private ? (
                    <span className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 text-xs font-bold px-3 py-1 rounded-full border border-yellow-500/20">
                      <Shield size={14} /> Private Account
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-green-500/10 text-green-500 text-xs font-bold px-3 py-1 rounded-full border border-green-500/20">
                      <Globe size={14} /> Public Account
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                    <Calendar size={14} /> Joined {new Date(profileData.created_at).toLocaleDateString()}
                  </span>
               </div>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC BODY SECTION --- */}
        {isEditing ? (
          <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl shadow-xl animate-in fade-in duration-300">
            <h2 className="px-6 py-4 border-b border-[#272729] font-bold text-white text-lg">Edit Details</h2>
            
            <div className="p-6 space-y-8">
              
              {/* Avatar Selection Grid */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Choose an Avatar</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, avatar_url: url })}
                      className={`w-full aspect-square rounded-full overflow-hidden border-2 transition-all duration-200 ${
                        editForm.avatar_url === url 
                          ? 'border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.4)] z-10' 
                          : 'border-transparent hover:border-gray-500 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover bg-gray-800" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Display Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-[#343536] rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mobile Number</label>
                  <input 
                    type="text" 
                    value={editForm.mobile} 
                    onChange={(e) => setEditForm({...editForm, mobile: e.target.value})}
                    placeholder="+91..."
                    className="w-full bg-[#0a0a0a] border border-[#343536] rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gender</label>
                  <select 
                    value={editForm.gender}
                    onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                    className="w-full bg-[#0a0a0a] border border-[#343536] rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 space-y-4">
                <label className="flex items-center justify-between p-5 bg-[#0a0a0a] border border-[#272729] rounded-xl cursor-pointer hover:border-blue-500/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#1A1A1B] rounded-lg group-hover:bg-[#272729] transition-colors"><Shield className="text-yellow-500 w-5 h-5" /></div>
                    <div>
                      <p className="text-sm font-bold text-white">Private Account</p>
                      <p className="text-xs text-gray-500 mt-0.5">Require approval for direct message requests</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={editForm.is_private}
                    onChange={(e) => setEditForm({...editForm, is_private: e.target.checked})}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 bg-gray-800 border-gray-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-5 bg-[#0a0a0a] border border-[#272729] rounded-xl cursor-pointer hover:border-blue-500/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#1A1A1B] rounded-lg group-hover:bg-[#272729] transition-colors">
                      {editForm.show_last_seen ? <Eye className="text-green-500 w-5 h-5" /> : <EyeOff className="text-gray-500 w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Show Last Seen</p>
                      <p className="text-xs text-gray-500 mt-0.5">Allow friends to see when you're online</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={editForm.show_last_seen}
                    onChange={(e) => setEditForm({...editForm, show_last_seen: e.target.checked})}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 bg-gray-800 border-gray-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="bg-[#0a0a0a] rounded-b-2xl p-4 border-t border-[#272729] flex justify-end gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-full bg-transparent text-gray-300 font-bold hover:bg-[#272729] transition-colors flex items-center justify-center"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving || !editForm.name.trim()}
                className="px-8 py-2.5 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />} 
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in duration-300">
            <h2 className="px-6 py-5 border-b border-[#272729] font-bold text-white text-lg bg-[#1e1e20]/50">Personal Information</h2>
            <div className="divide-y divide-[#272729]">
               <ListRow icon={<Mail />} label="Email Address" value={profileData.email} />
               <ListRow icon={<UserCircle />} label="Gender" value={profileData.gender === 'M' ? 'Male' : profileData.gender === 'F' ? 'Female' : profileData.gender || 'Not specified'} />
               <ListRow icon={<Phone />} label="Mobile Number" value={profileData.mobile || 'Not provided'} />
               <ListRow 
                 icon={profileData.show_last_seen ? <Eye /> : <EyeOff />} 
                 label="Activity Status" 
                 value={profileData.show_last_seen ? "Visible to friends" : "Hidden (Ghost Mode)"} 
                 valueClass={!profileData.show_last_seen ? 'text-orange-400' : 'text-gray-200'}
               />
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

// Clean List Row Component for Read-Only View
const ListRow = ({ icon, label, value, valueClass = "text-gray-200" }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-[#272729]/30 transition-colors gap-2">
    <div className="flex items-center gap-4">
      <div className="text-gray-400">{icon}</div>
      <p className="text-sm font-medium text-gray-400">{label}</p>
    </div>
    <div className="sm:text-right pl-9 sm:pl-0">
      <p className={`text-sm font-bold ${valueClass} truncate max-w-[250px] sm:max-w-xs`}>{value}</p>
    </div>
  </div>
);

export default Profile;