import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, Phone, Shield, Globe, Loader2, Edit3, Save, Eye, EyeOff, UserCircle, MoreHorizontal, MapPin, Link as LinkIcon, MessageCircle, Zap, UserPlus } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import PostCard, { type Post } from '../components/feed/PostCard'; 

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

export default function Profile() {
  const { username } = useParams(); 
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);
  const updateStoreUser = useAuthStore((state) => state.completeOnboarding);

  // Safety check: If no username is in the URL, it's our own profile!
  const isOwnProfile = !username || username === currentUser?.username;

  // --- States ---
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'sparks' | 'about'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // --- Edit States ---
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', mobile: '', gender: '', is_private: false, show_last_seen: true, avatar_url: '', bio: ''
  });

  // Calculate dynamic bio limits based on user status (VIP vs Free)
  const maxBioLength = profileData?.total_donated > 0 ? 500 : 200;

  // --- Scroll Header Logic ---
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const currentScrollY = scrollContainerRef.current.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 150) setShowHeader(false); 
      else if (currentScrollY < lastScrollY.current) setShowHeader(true);  
      lastScrollY.current = currentScrollY;
    };
    const container = scrollContainerRef.current;
    if (container) container.addEventListener('scroll', handleScroll, { passive: true });
    return () => { if (container) container.removeEventListener('scroll', handleScroll); };
  }, []);

  // --- Fetch Profile & Feed ---
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      setIsBlockedBy(false);

      try {
        // FIXED ROUTING: Use /users/me for self, /users/{username} for others
        const endpoint = isOwnProfile ? '/users/me' : `/users/${username}`;
        const res = await api.get(endpoint);
        const data = res.data || res;
        
        setProfileData(data);
        if (isOwnProfile) updateStoreUser(data);

        // Fetch Friend Status
        if (!isOwnProfile) {
          try {
            const friendRes = await api.get(`/friends/status/${data.username}`);
            // Check if we are blocked!
            if (friendRes.status === 'blocked_by' || friendRes.isBlockedBy || friendRes.error === 'Blocked') {
               setIsBlockedBy(true);
               setIsLoading(false);
               return; 
            }
            setIsFollowing(friendRes.isFriend || friendRes.status === 'accepted' || friendRes.status === 'pending');
          } catch (e) { /* ignore */ }
        }

        // FETCH POSTS USING THE EXPLICIT USER ID FROM THE NEW API
        const userId = data.id;
        if (userId) {
          const postsRes = await api.get(`/arena/users/${userId}/posts?limit=20&offset=0`);
          let fetchedPosts = Array.isArray(postsRes) ? postsRes : (postsRes.data || []);
          
          fetchedPosts.sort((a: any, b: any) => {
             if (a.isPinned && !b.isPinned) return -1;
             if (!a.isPinned && b.isPinned) return 1;
             return 0; 
          });
          
          setPosts(fetchedPosts);
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username, isOwnProfile, updateStoreUser]);

  // --- Handlers ---
  const handleEditClick = () => {
    setEditForm({
      name: profileData.name || profileData.displayName || '',
      mobile: profileData.mobile || '',
      gender: profileData.gender || 'Unknown',
      is_private: profileData.is_private || false,
      show_last_seen: profileData.show_last_seen !== false, 
      avatar_url: profileData.avatar_url || profileData.avatarUrl || AVATAR_PRESETS[0], 
      bio: profileData.bio || '' // Map the new bio field!
    });
    setActiveTab('about');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // API now accepts bio in the body!
      const res = await api.patch('/users/me', editForm);
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

  const toggleFollow = async () => {
    if (isFollowLoading || !profileData) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/friends/remove/${profileData.username}`);
      } else {
        await api.post(`/friends/request`, { target_username: profileData.username });
      }
      setIsFollowing(!isFollowing);
    } catch (err) {
      alert("Failed to update status.");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handlePostPinned = (pinnedPostId: number, isNowPinned: boolean) => {
     setPosts(prevPosts => {
         const newPosts = prevPosts.map(p => {
             if (p.id === pinnedPostId) return { ...p, isPinned: isNowPinned }; 
             if (isNowPinned) return { ...p, isPinned: false }; 
             return p;
         });
         newPosts.sort((a: any, b: any) => {
             if (a.isPinned && !b.isPinned) return -1;
             if (!a.isPinned && b.isPinned) return 1;
             return b.id - a.id; 
         });
         return newPosts;
     });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-[#030303]">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" strokeWidth={3} />
          <p className="font-bold text-gray-500">Loading profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isBlockedBy) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#030303] text-center p-6 h-full">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6 border-4 border-red-50 dark:border-red-900/10">
            <Shield size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-display font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm">You are blocked by @{profileData?.username || username}. You cannot view their profile, sparks, or network.</p>
          <button onClick={() => navigate(-1)} className="mt-8 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-extrabold hover:opacity-80 transition-opacity shadow-lg">
            Return to Safety
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profileData) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#030303]">
          <div className="p-6 m-6 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/20 font-bold">
            <p>{error || 'Could not find profile data.'}</p>
            <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold">Go Back</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentAvatar = isEditing ? editForm.avatar_url : (profileData.avatar_url || profileData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.name || profileData.username)}&background=random`);
  const displayName = isEditing ? editForm.name : (profileData.name || profileData.displayName || profileData.username);

  return (
    <DashboardLayout>
      <div ref={scrollContainerRef} className="flex-1 h-full w-full flex justify-center bg-gray-50 dark:bg-[#030303] overflow-y-auto scrollbar-hide relative transition-colors duration-300">
        <div className="w-full max-w-[640px] h-max min-h-full flex flex-col pb-36 border-x border-gray-100 dark:border-[#1a1a1a] bg-gray-50 dark:bg-[#030303]">
          
          {/* --- SMART HEADER --- */}
          <div className={`sticky top-0 z-50 pt-3 pb-2 px-3 flex items-center justify-between transition-transform duration-300 ease-in-out bg-gray-50/90 dark:bg-[#030303]/90 backdrop-blur-md border-b border-gray-200 dark:border-[#1a1a1a] ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2.5 bg-white dark:bg-[#1a1a1a] hover:bg-gray-100 dark:hover:bg-[#272729] rounded-2xl shadow-sm transition-colors text-gray-900 dark:text-white border border-gray-200 dark:border-[#272729]">
                <ArrowLeft size={20} />
              </button>
              <div className="flex flex-col">
                <h1 className="font-display text-[17px] font-black text-gray-900 dark:text-white tracking-tight leading-tight">{displayName}</h1>
                <span className="text-[12px] text-gray-500 font-medium">{posts.length} Sparks</span>
              </div>
            </div>
            <button className="p-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#1a1a1a] rounded-xl"><MoreHorizontal size={20} /></button>
          </div>

          {/* --- COVER & AVATAR SECTION --- */}
          <div className="bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-[#1a1a1a]">
            <div className="h-[140px] sm:h-[180px] bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#1E3A8A] dark:to-[#4C1D95] w-full relative overflow-hidden">
               {profileData.cover_url && <img src={profileData.cover_url} className="w-full h-full object-cover opacity-90" alt="Cover" />}
            </div>

            <div className="px-4 sm:px-6 relative">
              <div className="flex justify-between items-start">
                <div className="w-24 h-24 sm:w-32 sm:h-32 -mt-12 sm:-mt-16 rounded-full border-4 border-white dark:border-[#0a0a0a] bg-gray-100 dark:bg-[#272729] relative shrink-0 z-10">
                   <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                </div>

                <div className="pt-4">
                  {isOwnProfile ? (
                    <button onClick={handleEditClick} className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#272729] px-5 py-2.5 rounded-2xl text-[14px] font-bold border border-gray-200 dark:border-[#272729] transition-all">
                      <Edit3 size={16} strokeWidth={2.5} /> Edit Profile
                    </button>
                  ) : (
                    <button 
                      onClick={toggleFollow}
                      disabled={isFollowLoading}
                      className={`flex items-center gap-2 px-6 py-2.5 font-bold rounded-2xl transition-all border text-[14px] ${isFollowing ? 'bg-transparent border-gray-300 dark:border-[#272729] text-gray-900 dark:text-white hover:border-red-500 hover:text-red-500' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent hover:bg-gray-800 dark:hover:bg-gray-200'}`}
                    >
                      {isFollowLoading ? <Loader2 size={16} className="animate-spin" /> : isFollowing ? 'Following' : <><UserPlus size={16} /> Follow</>}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 pb-6">
                <h1 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white leading-tight">{displayName}</h1>
                <span className="text-[15px] text-gray-500 font-medium block mb-4">@{profileData.username}</span>

                {profileData.bio && !isEditing && (
                  <p className="text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed mb-4 whitespace-pre-wrap max-w-xl">
                    {profileData.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {profileData.is_private ? (
                     <span className="flex items-center gap-1.5 bg-yellow-50 dark:bg-[#713F12]/20 text-yellow-700 dark:text-yellow-500 text-xs font-bold px-3 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
                       <Shield size={14} strokeWidth={2.5} /> Private
                     </span>
                   ) : (
                     <span className="flex items-center gap-1.5 bg-green-50 dark:bg-[#14532D]/20 text-green-700 dark:text-green-500 text-xs font-bold px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-500/30">
                       <Globe size={14} strokeWidth={2.5} /> Public
                     </span>
                   )}
                   <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-bold px-3 py-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-[#272729]">
                     <Calendar size={14} strokeWidth={2.5} /> Joined {new Date(profileData.created_at || profileData.joinedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                   </span>
                </div>

                <div className="flex items-center gap-6 text-[15px]">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
                    <span className="font-black text-gray-900 dark:text-white">{profileData.followingCount || 0}</span>
                    <span className="text-gray-500">Following</span>
                  </div>
                  <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
                    <span className="font-black text-gray-900 dark:text-white">{profileData.followerCount || 0}</span>
                    <span className="text-gray-500">Followers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- TABS --- */}
          <div className="flex w-full border-b border-gray-200 dark:border-[#1a1a1a] sticky top-[60px] z-40 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md">
            {['posts', 'replies', 'sparks', 'about'].map((tab) => (
              <button 
                key={tab}
                onClick={() => { setActiveTab(tab as any); setIsEditing(false); }}
                className={`flex-1 py-4 text-[14px] font-bold transition-colors relative capitalize ${activeTab === tab ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-[#111]'}`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-blue-500 rounded-t-full"></div>}
              </button>
            ))}
          </div>

          {/* --- CONTENT AREA --- */}
          <div className="flex-1 pt-4 flex flex-col gap-4">
            
            {activeTab === 'about' && (
              <div className="px-3 sm:px-4 pb-10">
                {isEditing ? (
                  <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#1a1a1a] rounded-[2rem] shadow-sm animate-in fade-in duration-300">
                    <h2 className="px-6 py-5 border-b border-gray-100 dark:border-[#1a1a1a] font-display font-extrabold text-gray-900 dark:text-white text-lg">Edit Profile</h2>
                    <div className="p-6 space-y-8">
                      
                      <div>
                        <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-4">Choose an Avatar</label>
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                          {AVATAR_PRESETS.map((url, idx) => (
                            <button key={idx} type="button" onClick={() => setEditForm({ ...editForm, avatar_url: url })} className={`w-full aspect-square rounded-[1rem] overflow-hidden border-2 transition-all duration-200 ${editForm.avatar_url === url ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100 bg-gray-100 dark:bg-[#1a1a1a]'}`}>
                              <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">Display Name</label>
                          <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">Bio</label>
                          <div className="relative">
                            <textarea 
                              value={editForm.bio} 
                              onChange={(e) => setEditForm({...editForm, bio: e.target.value})} 
                              maxLength={maxBioLength}
                              className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-xl px-4 py-3.5 pb-8 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500 transition-all min-h-[100px] resize-none" 
                            />
                            <span className={`absolute bottom-3 right-4 text-[11px] font-bold ${editForm.bio.length >= maxBioLength ? 'text-red-500' : 'text-gray-400'}`}>
                              {editForm.bio.length} / {maxBioLength}
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">Mobile Number</label>
                          <input type="text" value={editForm.mobile} onChange={(e) => setEditForm({...editForm, mobile: e.target.value})} placeholder="+91..." className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">Gender</label>
                          <select value={editForm.gender} onChange={(e) => setEditForm({...editForm, gender: e.target.value})} className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other / Prefer not to say</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 space-y-4">
                        <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-2xl cursor-pointer hover:border-blue-500 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-[#272729]"><Shield className="text-yellow-500 w-5 h-5" /></div>
                            <div>
                              <p className="text-sm font-extrabold text-gray-900 dark:text-white">Private Account</p>
                              <p className="text-xs font-medium text-gray-500 mt-0.5">Require approval for messages</p>
                            </div>
                          </div>
                          <input type="checkbox" checked={editForm.is_private} onChange={(e) => setEditForm({...editForm, is_private: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </label>
                        <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-2xl cursor-pointer hover:border-blue-500 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-[#272729]">
                              {editForm.show_last_seen ? <Eye className="text-green-500 w-5 h-5" /> : <EyeOff className="text-gray-500 w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-gray-900 dark:text-white">Show Last Seen</p>
                              <p className="text-xs font-medium text-gray-500 mt-0.5">Allow friends to see when online</p>
                            </div>
                          </div>
                          <input type="checkbox" checked={editForm.show_last_seen} onChange={(e) => setEditForm({...editForm, show_last_seen: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1a1a1a]">
                        <button onClick={() => setIsEditing(false)} disabled={isSaving} className="px-6 py-3 rounded-xl text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={isSaving || !editForm.name.trim()} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50">
                          {isSaving && <Loader2 size={18} className="animate-spin" />} Save Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#1a1a1a] rounded-[2rem] shadow-sm flex flex-col overflow-hidden animate-in fade-in">
                    <h2 className="px-6 py-5 border-b border-gray-100 dark:border-[#1a1a1a] font-display font-extrabold text-gray-900 dark:text-white text-lg bg-gray-50/50 dark:bg-[#111]/30">Account Information</h2>
                    <div className="divide-y divide-gray-100 dark:divide-[#1a1a1a]">
                       {isOwnProfile && <ListRow icon={<Mail />} label="Email" value={profileData.email} />}
                       <ListRow icon={<UserCircle />} label="Gender" value={profileData.gender === 'M' ? 'Male' : profileData.gender === 'F' ? 'Female' : profileData.gender || 'Not specified'} />
                       {isOwnProfile && <ListRow icon={<Phone />} label="Mobile" value={profileData.mobile || 'Not provided'} />}
                       <ListRow 
                         icon={profileData.show_last_seen ? <Eye /> : <EyeOff />} 
                         label="Activity Status" 
                         value={profileData.show_last_seen ? "Visible to friends" : "Hidden (Ghost Mode)"} 
                         valueClass={!profileData.show_last_seen ? 'text-orange-500' : 'text-gray-900 dark:text-gray-200'}
                       />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab !== 'about' && (
              <div className="px-3 sm:px-4 flex flex-col gap-4 pb-10">
                {posts.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
                      {activeTab === 'posts' && <Edit3 size={32} className="text-gray-400" />}
                      {activeTab === 'replies' && <MessageCircle size={32} className="text-gray-400" />}
                      {activeTab === 'sparks' && <Zap size={32} className="text-gray-400" />}
                    </div>
                    <h3 className="font-display font-black text-xl text-gray-900 dark:text-white mb-2">No {activeTab} yet</h3>
                    <p className="text-gray-500 text-[15px]">{isOwnProfile ? `When you create ${activeTab}, they will show up here.` : `@${profileData.username} hasn't made any ${activeTab} yet.`}</p>
                  </div>
                ) : (
                  posts.map(post => (
                      <PostCard 
                          key={post.id} 
                          post={post} 
                          isProfileView={true}
                          isOwnProfile={isOwnProfile} 
                          onPinned={(newState) => handlePostPinned(post.id, newState)}
                      />
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const ListRow = ({ icon, label, value, valueClass = "text-gray-900 dark:text-gray-200" }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-[#111] transition-colors gap-2 group">
    <div className="flex items-center gap-4">
      <div className="text-gray-400 group-hover:text-blue-500 transition-colors">{icon}</div>
      <p className="text-sm font-extrabold text-gray-500 uppercase tracking-widest">{label}</p>
    </div>
    <div className="sm:text-right pl-10 sm:pl-0">
      <p className={`text-base font-bold ${valueClass} truncate max-w-[250px] sm:max-w-sm`}>{value}</p>
    </div>
  </div>
);