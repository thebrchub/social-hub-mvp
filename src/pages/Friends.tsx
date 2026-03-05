import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { UserPlus, Check, X, MessageSquare, Trash2, Search, Users, Clock, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Modal from '../components/Modal';

// --- INTERFACES ---
interface Friend {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  friends_since: string;
}

interface FriendRequest {
  request_id: number;
  status: string;
  created_at: string;
  user_id: string;
  name: string;
  username: string;
  avatar_url: string;
}

const Friends = () => {
  const navigate = useNavigate();

  // --- API STATES ---
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedReqs, setReceivedReqs] = useState<FriendRequest[]>([]);
  const [sentReqs, setSentReqs] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent'>('friends');
  const [searchUsername, setSearchUsername] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- MODAL & TOAST STATES ---
  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{title: string, desc: string, actionLabel: string, isDanger: boolean, onConfirm: () => void} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- FETCH ALL DATA ---
  const fetchAllFriendsData = async () => {
    try {
      const [friendsRes, receivedRes, sentRes] = await Promise.all([
        api.get('/friends').catch(() => []),
        api.get('/friends/requests?type=received').catch(() => []),
        api.get('/friends/requests?type=sent').catch(() => [])
      ]);
      
      setFriends(Array.isArray(friendsRes) ? friendsRes : friendsRes?.data || []);
      setReceivedReqs(Array.isArray(receivedRes) ? receivedRes : receivedRes?.data || []);
      setSentReqs(Array.isArray(sentRes) ? sentRes : sentRes?.data || []);
    } catch (error) {
      console.error("Failed to fetch friends data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFriendsData();
  }, []);

  // --- SEND FRIEND REQUEST ---
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setIsSending(true);
    try {
      await api.post('/friends/request', { username: searchUsername.trim() });
      showToast(`Friend request sent to @${searchUsername.trim()}!`, 'success');
      setSearchUsername('');
      await fetchAllFriendsData(); 
      setActiveTab('sent');
    } catch (error: any) {
      showToast(error.message || "Failed to send friend request.", 'error');
    } finally {
      setIsSending(false);
    }
  };

  // --- ACCEPT / REJECT / REMOVE ---
  const handleAction = async (action: 'accept' | 'reject' | 'remove', username: string) => {
    setProcessingId(username);
    try {
      await api.post(`/friends/${action}`, { username });
      showToast(`Successfully ${action}ed user.`, 'success');
      await fetchAllFriendsData(); 
    } catch (error: any) {
      showToast(error.message || `Failed to ${action} user.`, 'error');
    } finally {
      setProcessingId(null);
      setConfirmConfig(null);
    }
  };

  // --- MESSAGE FRIEND ---
  const handleMessageFriend = async (username: string) => {
    try {
      await api.post('/rooms', { username });
      navigate('/chats'); 
    } catch (error: any) {
      showToast("Failed to start conversation.", 'error');
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <DashboardLayout>
      {/* FIXED CONTAINER HEIGHT: 
        Using h-full flex flex-col ensures the container takes the exact available height.
        overflow-hidden forces only the inner list to scroll, preventing the page from cutting off.
      */}
      <div className="w-full max-w-5xl mx-auto h-full flex flex-col bg-[#0a0a0a] p-4 md:p-8 animate-in fade-in overflow-hidden">
        
        {/* Header & Add Friend Bar */}
        <div className="bg-[#1A1A1B] border border-[#343536] rounded-3xl p-5 sm:p-6 shadow-2xl mb-4 sm:mb-6 shrink-0 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
           
           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div>
                 <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-3">
                   <Users className="text-blue-500" size={26} /> Your Squad
                 </h1>
                 <p className="text-xs sm:text-sm text-gray-400 mt-1.5">Manage your connections and pending requests.</p>
              </div>
              
              {/* FIXED SEARCH BAR: Fixed height and right padding to prevent text cut-off */}
              <form onSubmit={handleSendRequest} className="relative w-full lg:w-96 flex items-center group">
                 <Search className="absolute left-4 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                 <input 
                   type="text" 
                   value={searchUsername}
                   onChange={(e) => setSearchUsername(e.target.value)}
                   placeholder="Add friend by username..."
                   className="w-full bg-[#0a0a0a] border border-[#343536] rounded-xl pl-11 pr-24 h-12 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                   disabled={isSending}
                 />
                 <button 
                   type="submit" 
                   disabled={isSending || !searchUsername.trim()}
                   className="absolute right-1.5 px-4 h-9 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md"
                 >
                   {isSending ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={14} /> Add</>}
                 </button>
              </form>
           </div>

           {/* FIXED TABS: Switched from overflow-x to flex-wrap so the Sent tab never hides off screen */}
           <div className="flex flex-wrap gap-2 mt-6 pt-1">
              <TabButton 
                active={activeTab === 'friends'} 
                onClick={() => setActiveTab('friends')} 
                icon={<Users size={14} />} 
                label={`My Friends (${friends.length})`} 
              />
              <TabButton 
                active={activeTab === 'received'} 
                onClick={() => setActiveTab('received')} 
                icon={<Clock size={14} />} 
                label="Received"
                badge={receivedReqs.length}
              />
              <TabButton 
                active={activeTab === 'sent'} 
                onClick={() => setActiveTab('sent')} 
                icon={<UserPlus size={14} />} 
                label={`Sent (${sentReqs.length})`} 
              />
           </div>
        </div>

        {/* FIXED CONTENT AREA: Added min-h-0 and proper padding-bottom to fix scroll cut-offs */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-24 md:pb-8">
           {isLoading ? (
             <div className="flex flex-col items-center justify-center h-48 text-gray-500">
               <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
               <p className="font-medium text-sm">Loading your social circle...</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                
                {/* --- TAB: MY FRIENDS --- */}
                {activeTab === 'friends' && (
                  friends.length > 0 ? friends.map((friend) => (
                    <div key={friend.id} className="bg-[#1A1A1B] border border-[#272729] p-4 sm:p-5 rounded-2xl flex items-center justify-between hover:border-gray-600 transition-colors group shadow-md">
                       <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <img 
                            src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.name}&background=random`} 
                            alt={friend.name} 
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-800 object-cover border border-[#343536] shrink-0"
                          />
                          <div className="min-w-0 pr-2">
                             <h3 className="text-white font-bold text-sm sm:text-base truncate">{friend.name}</h3>
                             <p className="text-xs text-gray-400 truncate">@{friend.username}</p>
                             <p className="text-[10px] text-gray-500 mt-1 font-medium">Friends since {formatDate(friend.friends_since)}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => handleMessageFriend(friend.username)}
                            className="p-2 sm:p-2.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-colors"
                            title="Send Message"
                          >
                             <MessageSquare size={16} className="sm:w-5 sm:h-5" />
                          </button>
                          <button 
                            onClick={() => setConfirmConfig({
                              title: "Remove Friend",
                              desc: `Are you sure you want to remove ${friend.name} from your friends list? You will no longer be able to message them.`,
                              actionLabel: "Remove",
                              isDanger: true,
                              onConfirm: () => handleAction('remove', friend.username)
                            })}
                            className="p-2 sm:p-2.5 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-colors"
                            title="Remove Friend"
                          >
                             <Trash2 size={16} className="sm:w-5 sm:h-5" />
                          </button>
                       </div>
                    </div>
                  )) : (
                    <EmptyState icon={<Users size={40} />} title="No friends yet" description="Use the search bar above to add your friends by their username!" />
                  )
                )}

                {/* --- TAB: RECEIVED REQUESTS --- */}
                {activeTab === 'received' && (
                  receivedReqs.length > 0 ? receivedReqs.map((req) => (
                    <div key={req.request_id} className="bg-[#1A1A1B] border border-[#272729] p-4 sm:p-5 rounded-2xl flex flex-col gap-4 hover:border-gray-600 transition-colors shadow-md">
                       <div className="flex items-center gap-3 sm:gap-4">
                          <img 
                            src={req.avatar_url || `https://ui-avatars.com/api/?name=${req.name}&background=random`} 
                            alt={req.name} 
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-800 object-cover border border-[#343536]"
                          />
                          <div className="flex-1 min-w-0">
                             <h3 className="text-white font-bold text-sm sm:text-base truncate">{req.name}</h3>
                             <p className="text-xs text-gray-400 truncate">@{req.username}</p>
                             <p className="text-[10px] text-blue-400 mt-1 font-medium">Sent {formatDate(req.created_at)}</p>
                          </div>
                       </div>
                       <div className="flex gap-2 sm:gap-3">
                          <button 
                            onClick={() => handleAction('accept', req.username)}
                            disabled={processingId === req.username}
                            className="flex-1 py-2 sm:py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-green-900/20"
                          >
                            {processingId === req.username ? <Loader2 size={14} className="animate-spin" /> : <><Check size={16} /> Accept</>}
                          </button>
                          <button 
                            onClick={() => handleAction('reject', req.username)}
                            disabled={processingId === req.username}
                            className="flex-1 py-2 sm:py-2.5 bg-[#272729] hover:bg-red-500/10 hover:text-red-400 text-gray-300 disabled:opacity-50 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <X size={16} /> Reject
                          </button>
                       </div>
                    </div>
                  )) : (
                    <EmptyState icon={<Clock size={40} />} title="You're all caught up" description="You don't have any pending friend requests right now." />
                  )
                )}

                {/* --- TAB: SENT REQUESTS --- */}
                {activeTab === 'sent' && (
                  sentReqs.length > 0 ? sentReqs.map((req) => (
                    <div key={req.request_id} className="bg-[#1A1A1B] border border-[#272729] p-4 sm:p-5 rounded-2xl flex items-center justify-between hover:border-gray-600 transition-colors shadow-md opacity-80 hover:opacity-100">
                       <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <img 
                            src={req.avatar_url || `https://ui-avatars.com/api/?name=${req.name}&background=random`} 
                            alt={req.name} 
                            className="w-12 h-12 rounded-full bg-gray-800 object-cover border border-[#343536] grayscale"
                          />
                          <div className="min-w-0 pr-2">
                             <h3 className="text-gray-200 font-bold text-sm sm:text-base truncate">{req.name}</h3>
                             <p className="text-xs text-gray-500 truncate">@{req.username}</p>
                             <p className="text-[10px] text-orange-400 mt-1 font-medium">Pending since {formatDate(req.created_at)}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => setConfirmConfig({
                           title: "Cancel Request",
                           desc: `Cancel your friend request to @${req.username}?`,
                           actionLabel: "Cancel Request",
                           isDanger: true,
                           onConfirm: () => handleAction('remove', req.username)
                         })}
                         className="p-2 sm:p-2.5 bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-colors shrink-0"
                         title="Cancel Request"
                       >
                         <X size={18} />
                       </button>
                    </div>
                  )) : (
                    <EmptyState icon={<UserPlus size={40} />} title="No sent requests" description="You haven't sent out any friend requests recently." />
                  )
                )}

             </div>
           )}
        </div>

      </div>

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      <Modal 
        isOpen={confirmConfig !== null} 
        onClose={() => setConfirmConfig(null)} 
        title={confirmConfig?.title || "Confirm Action"}
        footer={
           <>
            <button onClick={() => setConfirmConfig(null)} className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button 
              onClick={confirmConfig?.onConfirm} 
              disabled={!!processingId}
              className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg ${confirmConfig?.isDanger ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}`}
            >
              {processingId ? <Loader2 size={16} className="animate-spin" /> : confirmConfig?.actionLabel}
            </button>
           </>
        }>
         <div className="flex flex-col items-center text-center py-2">
            {confirmConfig?.isDanger && (
               <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
               </div>
            )}
            <p className="text-gray-300 text-sm">{confirmConfig?.desc}</p>
         </div>
      </Modal>

      {/* --- TOAST NOTIFICATIONS --- */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-[99999] px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 flex items-center gap-3 font-bold text-white text-xs sm:text-sm ${toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
           {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
           {toastMessage.msg}
        </div>
      )}

    </DashboardLayout>
  );
};

// --- Reusable UI Components ---
const TabButton = ({ active, onClick, icon, label, badge }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all relative shrink-0 ${active ? 'bg-white text-black shadow-lg' : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#272729]'}`}
  >
    {icon} {label}
    {badge > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse border-2 border-[#1A1A1B]"></span>}
  </button>
);

const EmptyState = ({ icon, title, description }: any) => (
  <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-[#1A1A1B] border border-[#272729] rounded-3xl border-dashed mt-2 sm:mt-4">
     <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0a0a0a] rounded-full flex items-center justify-center text-blue-500 mb-4 sm:mb-5 border border-[#343536] shadow-inner">
       {icon}
     </div>
     <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 sm:mb-2">{title}</h3>
     <p className="text-xs sm:text-sm text-gray-500 max-w-sm">{description}</p>
  </div>
);

export default Friends;