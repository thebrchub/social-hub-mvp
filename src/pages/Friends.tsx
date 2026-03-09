import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useFriendStore } from '../store/useFriendStore';
import { useWebSocket } from '../providers/WebSocketProvider'; 
import { Check, X, MessageSquare, Trash2, Users, Clock, Loader2, AlertTriangle, CheckCircle2, Send, Search, LayoutGrid, List } from 'lucide-react';
import Modal from '../components/Modal';

interface FriendRequest {
  request_id?: number;
  name?: string;
  username?: string;
  avatar_url?: string;
  // Kept for fallback, though based on JSON they might not be needed
  sender_name?: string;
  sender_username?: string;
  sender_avatar?: string;
  receiver_name?: string;
  receiver_username?: string;
  receiver_avatar?: string;
  created_at?: string;
  last_message_at?: string;
}

const Friends = () => {
  const navigate = useNavigate();
  const { friends, fetchFriends } = useFriendStore();
  const { subscribe } = useWebSocket(); 

  const [receivedReqs, setReceivedReqs] = useState<FriendRequest[]>([]);
  const [sentReqs, setSentReqs] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent'>('friends');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{title: string, desc: string, actionLabel: string, isDanger: boolean, onConfirm: () => void} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await fetchFriends(true); 

      const [recRes, sentRes] = await Promise.all([
        api.get('/friends/requests?type=received'),
        api.get('/friends/requests?type=sent')
      ]);

      // FIX: Robust array extraction
      setReceivedReqs(Array.isArray(recRes) ? recRes : recRes?.data || []);
      setSentReqs(Array.isArray(sentRes) ? sentRes : sentRes?.data || []);

    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequestsSilent = async () => {
    try {
      const [recRes, sentRes] = await Promise.all([
        api.get('/friends/requests?type=received'),
        api.get('/friends/requests?type=sent')
      ]);

      // FIX: Robust array extraction
      setReceivedReqs(Array.isArray(recRes) ? recRes : recRes?.data || []);
      setSentReqs(Array.isArray(sentRes) ? sentRes : sentRes?.data || []);

    } catch (error) {
      console.error("Failed to silently sync requests:", error);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  useEffect(() => {
    if (!subscribe) return;
    const unsubscribe = subscribe((msg: any) => {
      if (msg.type === 'friend_request_withdrawn' || msg.type === 'friend_request_received') {
         fetchRequestsSilent();
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribe]);

  const filteredFriends = useMemo(() => {
    return friends.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, searchQuery]);

  const handleAction = async (action: 'accept' | 'reject', username: string) => {
    if (!username) return showToast("Error: Missing Username", "error");

    setProcessingId(username);

    try {
      await api.post(`/friends/${action}`, { username });

      showToast(
        action === 'reject' ? "Request rejected." : "Request accepted!",
        "success"
      );

      await fetchAllData();

    } catch (error: any) {
      const backendMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        `API Error ${error.response?.status}: Failed to ${action}`;

      showToast(backendMsg, 'error');

    } finally {
      setProcessingId(null);
      setConfirmConfig(null);
    }
  };

  const handleRemoveFriend = async (username: string) => {
    if (!username) return;

    setProcessingId(username);

    try {
      await api.delete(`/friends/${username}`);

      showToast("Friend removed successfully.", "success");

      await fetchAllData();

    } catch (error: any) {
      const backendMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to remove friend.";

      showToast(backendMsg, "error");

    } finally {
      setProcessingId(null);
      setConfirmConfig(null);
    }
  };

  const handleWithdraw = async (username: string) => {
    if (!username) return;

    setProcessingId(username);

    try {
      await api.delete(`/friends/request/${username}`);

      showToast("Friend request withdrawn.", "success");

      // Update state immediately to reflect UI change
      setSentReqs(prev =>
        prev.filter(
          req =>
            req.username !== username &&
            req.receiver_username !== username
        )
      );

    } catch (error: any) {
      const backendMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to withdraw request.";

      showToast(backendMsg, "error");

    } finally {
      setProcessingId(null);
    }
  };

  const handleMessageFriend = async (username: string) => {
    try {
      const res = await api.post("/rooms", { username });
      const targetRoomId = res.data?.room_id || res.data?.id;

      navigate("/chats", {
        state: { autoOpenRoomId: targetRoomId }
      });

    } catch (error: any) {
      showToast("Failed to start conversation.", "error");
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return 'Recently';
    return new Date(isoString).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-[#030303] transition-colors duration-300 overflow-hidden">
        
        <div className="px-3 pt-4 md:px-8 md:pt-8 shrink-0">
          <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-xl md:text-3xl font-display font-extrabold text-gray-900 dark:text-white flex items-center gap-2 md:gap-3">
                    <Users className="text-blue-600 dark:text-blue-500 w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} /> Your Squad
                  </h1>
                  <p className="text-[10px] md:text-sm font-medium text-gray-500 dark:text-gray-400">Manage network and connections.</p>
                </div>

                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                  <input 
                    type="text"
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 md:pl-11 pr-4 py-2.5 md:py-3 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#343536] rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#111] transition-all shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] focus:shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_4px_12px_rgba(59,130,246,0.15)] dark:focus:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_4px_12px_rgba(59,130,246,0.3)]"
                  />
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 md:mt-8">
                <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-2 w-full sm:w-auto pb-1">
                  <TabButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} icon={<Users className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />} label={`Friends (${friends.length})`} />
                  <TabButton active={activeTab === 'received'} onClick={() => setActiveTab('received')} icon={<Clock className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />} label="Received" badge={receivedReqs.length} />
                  <TabButton active={activeTab === 'sent'} onClick={() => setActiveTab('sent')} icon={<Send className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />} label="Sent" badge={sentReqs.length} />
                </div>

                <div className="flex bg-gray-100 dark:bg-[#0a0a0a] p-1 rounded-xl border border-gray-200 dark:border-[#343536] shadow-inner shrink-0 self-end sm:self-auto">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 md:p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#272729] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400'}`}>
                    <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 md:p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#272729] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-400'}`}>
                    <List className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                  </button>
                </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pt-4 md:px-8 md:pt-6 scrollbar-hide pb-32 transition-all">
           {isLoading ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
               <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" strokeWidth={3} />
               <p className="font-bold text-sm">Syncing squad...</p>
             </div>
           ) : (
             <div className={viewMode === 'grid' 
               ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4" 
               : "flex flex-col gap-2 md:gap-3 max-w-4xl mx-auto w-full pb-10"
             }>
                {activeTab === 'friends' && (
                  filteredFriends.length > 0 ? filteredFriends.map((f) => (
                    <FriendCard key={f.id} f={f} viewMode={viewMode} formatDate={formatDate} onMessage={handleMessageFriend} onRemove={(friend: any) => setConfirmConfig({ title: "Remove Connection", desc: `Remove ${friend.name}? Chat history will be lost.`, actionLabel: "Remove", isDanger: true, onConfirm: () => handleRemoveFriend(friend.username) })} />
                  )) : <EmptyState icon={<Users className="w-10 h-10 md:w-12 md:h-12" strokeWidth={2.5} />} title={searchQuery ? "No results" : "Quiet here..."} description={searchQuery ? "No one matches that name." : "Connect with people to fill your squad!"} />
                )}

                {(activeTab === 'received' || activeTab === 'sent') && (
                  (activeTab === 'received' ? receivedReqs : sentReqs).length > 0 ? (activeTab === 'received' ? receivedReqs : sentReqs).map((req, i) => (
                    <RequestCard 
                       key={req.request_id || req.username || i} 
                       req={req} 
                       type={activeTab} 
                       formatDate={formatDate} 
                       onAction={handleAction} 
                       onWithdraw={handleWithdraw}
                       processingId={processingId} 
                       viewMode={viewMode} 
                    />
                  )) : <EmptyState icon={<Clock className="w-10 h-10 md:w-12 md:h-12" strokeWidth={2.5} />} title="All Clear" description="No pending requests at the moment." />
                )}
             </div>
           )}
        </div>
      </div>

      <Modal isOpen={confirmConfig !== null} onClose={() => setConfirmConfig(null)} title={confirmConfig?.title || "Confirm Action"} footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setConfirmConfig(null)} className="flex-1 py-2.5 md:py-3 text-xs md:text-sm font-extrabold text-gray-500">Cancel</button>
            <button onClick={confirmConfig?.onConfirm} className={`flex-1 py-2.5 md:py-3 text-xs md:text-sm font-extrabold rounded-xl md:rounded-2xl shadow-lg ${confirmConfig?.isDanger ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>{processingId ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : confirmConfig?.actionLabel}</button>
          </div>
        }>
        <div className="flex flex-col items-center text-center py-2 md:py-4">
          {confirmConfig?.isDanger && <div className="w-12 h-12 md:w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-3 md:mb-4"><AlertTriangle className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} /></div>}
          <p className="text-gray-600 dark:text-gray-300 font-medium text-xs md:text-base">{confirmConfig?.desc}</p>
        </div>
      </Modal>

      {toastMessage && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] px-5 py-3 md:px-6 md:py-3.5 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-3 font-extrabold text-white text-xs md:text-sm animate-in slide-in-from-bottom-10 ${toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} /> : <AlertTriangle className="w-5 h-5" strokeWidth={2.5} />}{toastMessage.msg}
        </div>
      )}
    </DashboardLayout>
  );
};

const FriendCard = ({ f, viewMode, formatDate, onMessage, onRemove }: any) => (
  <div className={`bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] rounded-[1.5rem] md:rounded-[2rem] hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-md group flex ${viewMode === 'grid' ? 'flex-col p-4 md:p-6 items-center text-center' : 'p-3 md:p-4 items-center justify-between'}`}>
    <div className={`flex items-center gap-3 md:gap-4 ${viewMode === 'grid' ? 'flex-col' : 'min-w-0 flex-1'}`}>
      <div className="relative shrink-0">
        <img src={f.avatar_url || `https://ui-avatars.com/api/?name=${f.name}&background=random`} alt={f.name} className={`${viewMode === 'grid' ? 'w-16 h-16 md:w-20 md:h-20' : 'w-10 h-10 md:w-14 md:h-14'} rounded-2xl md:rounded-3xl bg-gray-100 dark:bg-gray-800 object-cover border border-gray-200 dark:border-[#343536]`} />
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border-2 border-white dark:border-[#1A1A1B] shadow-sm ${f.is_online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
      </div>
      <div className="min-w-0 overflow-hidden">
        <h3 className="text-gray-900 dark:text-white font-extrabold text-xs md:text-base truncate">{f.name}</h3>
        <p className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 truncate">@{f.username}</p>
        <p className="text-[8px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 md:mt-1 uppercase tracking-widest truncate">Last seen {formatDate(f.last_seen_at)}</p>
      </div>
    </div>
    <div className={`flex items-center gap-1.5 md:gap-2 shrink-0 ${viewMode === 'grid' ? 'mt-4 md:mt-6 w-full' : ''}`}>
      <button onClick={() => onMessage(f.username)} className={`p-2 md:p-3 bg-blue-50 dark:bg-[#1E3A8A] text-blue-600 dark:text-blue-100 hover:bg-blue-600 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-none ${viewMode === 'grid' ? 'flex-1 flex justify-center' : ''}`}><MessageSquare className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} /></button>
      <button onClick={() => onRemove(f)} className={`p-2 md:p-3 bg-red-50 dark:bg-[#451212] text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-xl md:rounded-2xl transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-none ${viewMode === 'grid' ? 'flex-1 flex justify-center' : ''}`}><Trash2 className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} /></button>
    </div>
  </div>
);

const RequestCard = ({ req, type, formatDate, onAction, onWithdraw, processingId, viewMode }: any) => {
  // FIX: Always use name/username/avatar_url regardless of 'type' based on JSON
  const name = req.name || req.sender_name || req.receiver_name || 'Unknown User';
  const username = req.username || req.sender_username || req.receiver_username || '';
  const avatar = req.avatar_url || req.avatarUrl || req.sender_avatar || req.receiver_avatar;

  return (
    <div className={`bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] rounded-[1.5rem] md:rounded-[2rem] hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm hover:shadow-md group flex ${viewMode === 'grid' ? 'flex-col p-4 md:p-6 items-center text-center' : 'p-3 md:p-4 items-center justify-between'}`}>
      
      <div className={`flex items-center gap-3 md:gap-4 ${viewMode === 'grid' ? 'flex-col' : 'min-w-0 flex-1'}`}>
        <img src={avatar || `https://ui-avatars.com/api/?name=${name}&background=random`} alt="Avatar" className={`${viewMode === 'grid' ? 'w-16 h-16 md:w-20 md:h-20' : 'w-10 h-10 md:w-14 md:h-14'} rounded-2xl md:rounded-3xl bg-gray-100 dark:bg-gray-800 object-cover border border-gray-200 dark:border-[#343536] shrink-0`} />
        <div className="min-w-0 overflow-hidden">
          <h3 className="text-gray-900 dark:text-white font-extrabold text-xs md:text-base truncate">{name}</h3>
          <p className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 truncate">@{username}</p>
          <p className="text-[8px] md:text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 md:mt-1 uppercase tracking-widest truncate">{type === 'received' ? 'Received' : 'Sent'} {formatDate(req.created_at || req.last_message_at)}</p>
        </div>
      </div>
      
      <div className={`flex flex-col gap-2 md:gap-2.5 ${viewMode === 'grid' ? 'mt-4 md:mt-5 w-full' : 'shrink-0 ml-2 w-28 md:w-32'}`}>
        {type === 'received' ? (
          <>
            <button onClick={() => onAction('accept', username)} disabled={processingId === username} className={`py-2 md:py-2.5 bg-blue-600 dark:bg-[#1E3A8A] text-white rounded-xl md:rounded-2xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-1 md:gap-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all ${viewMode === 'grid' ? 'flex-1' : 'w-full px-4'}`}>
              {processingId === username ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin mx-auto" /> : <><Check size={16} strokeWidth={3} /> Accept</>}
            </button>
            <button onClick={() => onAction('reject', username)} disabled={processingId === username} className={`py-2 md:py-2.5 bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-300 rounded-xl md:rounded-2xl text-xs md:text-sm font-extrabold border border-gray-200 dark:border-[#343536] flex items-center justify-center gap-1 md:gap-2 transition-all ${viewMode === 'grid' ? 'flex-1' : 'w-full px-4'}`}>
              <X size={16} strokeWidth={3} /> Reject
            </button>
          </>
        ) : (
          <button onClick={() => onWithdraw(username)} disabled={processingId === username} className={`py-2 md:py-2.5 bg-red-50 dark:bg-[#451212] text-red-600 dark:text-red-400 rounded-xl md:rounded-2xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-1 md:gap-2 border border-red-100 dark:border-[#5c1c1c] shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-none hover:bg-red-600 hover:text-white transition-all ${viewMode === 'grid' ? 'w-full' : 'w-full px-4'}`}>
            {processingId === username ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin mx-auto" /> : <><Trash2 size={16} strokeWidth={2.5} /> Cancel</>}
          </button>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label, badge }: any) => (
  <button onClick={onClick} className={`flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-3 text-[10px] md:text-sm font-extrabold rounded-xl md:rounded-2xl transition-all relative shrink-0 border-2 ${active ? 'bg-blue-600 dark:bg-[#1E3A8A] text-white border-blue-500 dark:border-[#1E40AF] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' : 'bg-white dark:bg-[#272729] text-gray-500 dark:text-gray-400 border-gray-100 dark:border-[#343536] hover:bg-gray-50 dark:hover:bg-[#343536]'}`}>
    {icon} <span className="truncate max-w-[60px] md:max-w-none">{label}</span>
    {badge > 0 && <span className="ml-0.5 md:ml-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-[8px] md:text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#1A1A1B]">{badge}</span>}
  </button>
);

const EmptyState = ({ icon, title, description }: any) => (
  <div className="col-span-full flex flex-col items-center justify-center text-center p-8 md:p-10 bg-white dark:bg-[#1A1A1B] border-2 border-gray-200 dark:border-[#272729] rounded-[2rem] md:rounded-[2.5rem] border-dashed mt-2 md:mt-4">
    <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-50 dark:bg-[#030303] rounded-2xl md:rounded-3xl flex items-center justify-center text-blue-500 mb-4 md:mb-5 border-2 border-gray-100 dark:border-[#343536] shadow-inner">{icon}</div>
    <h3 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white mb-1 md:mb-2">{title}</h3>
    <p className="text-[10px] md:text-sm font-medium text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
  </div>
);

export default Friends;