import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useFriendStore } from '../store/useFriendStore';
import { UserPlus, MessageSquare, UserMinus, Loader2, ArrowLeft, ShieldCheck, Clock } from 'lucide-react';

interface PublicUser {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  is_private?: boolean;
}

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  const { friends, fetchFriends } = useFriendStore();
  
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if this user is already in our friends list
  const existingFriend = friends.find(f => f.username === username);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      setIsLoading(true);
      try {
        // SMART FETCHER: 
        // 1. Try standard REST endpoint first
        let data = null;
        try {
            const res = await api.get(`/users/${username}`);
            data = res.data || res;
        } catch (e: any) {
            // 2. If 404, fallback to search API to grab public details
            if (e.response?.status === 404 || e.message.includes('404')) {
                const searchRes = await api.get(`/users/search?query=${username}`);
                const results = Array.isArray(searchRes) ? searchRes : searchRes.data || [];
                data = results.find((u: any) => u.username === username);
            } else {
                throw e;
            }
        }
        
        if (data) setProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    fetchFriends(); // Ensure local friends list is up to date
  }, [username, fetchFriends]);

 const handleConnect = async (action: 'message' | 'add') => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const res = await api.post('/rooms', { username: profile.username });
      const data = res.data || res;

      // The backend either returns an existing room_id or creates a new one
      const targetRoomId = data.room_id || data.id;

      if (action === 'message') {
         if (targetRoomId) {
             // Pass the room_id in the state so Chats.tsx knows what to open
             navigate('/chats', { state: { autoOpenRoomId: targetRoomId } });
         } else {
             // Fallback if backend doesn't return ID immediately
             navigate('/chats');
         }
      } else {
         if (data.pending) {
            alert(`Request sent to @${profile.username}!`);
         } else {
            alert(`Connected with @${profile.username}!`);
         }
         await fetchFriends(true); 
      }
    } catch (error: any) {
      alert(error.message || "Action failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (!existingFriend) return;
    if (!confirm(`Remove ${profile?.name} from your connections?`)) return;
    
    setIsProcessing(true);
    try {
      await api.post(`/rooms/${existingFriend.room_id}/reject`);
      alert("Connection removed.");
      await fetchFriends(true);
    } catch (error: any) {
      alert(error.message || "Failed to remove connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full flex flex-col bg-[#0a0a0a] overflow-y-auto scrollbar-hide relative animate-in fade-in">
         
         {/* Top Navigation Bar */}
         <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-20 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
               <ArrowLeft size={20} />
            </button>
         </div>

         {isLoading ? (
           <div className="flex-1 flex flex-col items-center justify-center text-blue-500">
              <Loader2 size={32} className="animate-spin mb-4" />
           </div>
         ) : !profile ? (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <UserMinus size={48} className="mb-4 text-[#272729]" />
              <h2 className="text-xl font-bold text-white mb-2">User Not Found</h2>
              <p className="text-sm">The user you are looking for does not exist.</p>
           </div>
         ) : (
           <div className="w-full max-w-3xl mx-auto pb-24">
              
              {/* Cover Banner */}
              <div className="w-full h-48 md:h-64 bg-[#111] relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 to-[#0a0a0a]"></div>
              </div>

              {/* Profile Info Section */}
              <div className="px-6 md:px-10 relative -mt-16 md:-mt-20">
                 
                 {/* Avatar */}
                 <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#0a0a0a] bg-gray-800 shadow-2xl overflow-hidden relative z-10 mb-4">
                    <img 
                      src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.name}&background=random`} 
                      alt={profile.name} 
                      className="w-full h-full object-cover"
                    />
                 </div>

                 {/* Name & Username */}
                 <div className="mb-8">
                    <h1 className="text-2xl md:text-4xl font-display font-bold text-white flex items-center gap-2">
                       {profile.name}
                    </h1>
                    <p className="text-sm md:text-base text-blue-400 font-medium">@{profile.username}</p>
                 </div>

                 {/* Action Buttons */}
                 <div className="flex flex-wrap items-center gap-3">
                    
                    {/* MESSAGE BUTTON (Always visible) */}
                    <button 
                       onClick={() => handleConnect('message')}
                       disabled={isProcessing}
                       className="flex-1 sm:flex-none min-w-[140px] px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50"
                    >
                       {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <><MessageSquare size={18} /> Message</>}
                    </button>

                    {/* CONNECTION BUTTON (Dynamic) */}
                    {existingFriend ? (
                       <button 
                         onClick={handleRemove}
                         disabled={isProcessing}
                         className="flex-1 sm:flex-none min-w-[140px] px-6 py-3.5 bg-[#1A1A1B] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-gray-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-[#343536] disabled:opacity-50"
                       >
                          <UserMinus size={18} /> Remove
                       </button>
                    ) : (
                       <button 
                         onClick={() => handleConnect('add')}
                         disabled={isProcessing}
                         className="flex-1 sm:flex-none min-w-[140px] px-6 py-3.5 bg-[#1A1A1B] hover:bg-[#272729] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-[#343536] disabled:opacity-50"
                       >
                          <UserPlus size={18} /> Add Friend
                       </button>
                    )}
                 </div>

                 {/* Extra Info Tiles */}
                 <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1B] border border-[#272729] p-4 rounded-2xl flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500"><ShieldCheck size={20}/></div>
                       <div>
                          <p className="text-sm font-bold text-white">zQuab Member</p>
                          <p className="text-xs text-gray-500">Verified account</p>
                       </div>
                    </div>
                    {existingFriend && (
                      <div className="bg-[#1A1A1B] border border-[#272729] p-4 rounded-2xl flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500"><Clock size={20}/></div>
                         <div>
                            <p className="text-sm font-bold text-white">Connected</p>
                            <p className="text-xs text-gray-500">You are friends</p>
                         </div>
                      </div>
                    )}
                 </div>

              </div>
           </div>
         )}
      </div>
    </DashboardLayout>
  );
};

export default PublicProfile;