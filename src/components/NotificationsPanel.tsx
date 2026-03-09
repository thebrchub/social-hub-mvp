import { useState, useEffect } from 'react';
import { useNotificationStore, type Notification } from '../store/useNotificationStore';
import { Check, X, MessageCircle, Info, Loader2, CheckCircle2, Bell } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const NotificationsPanel = () => {
  const { notifications: storeNotifications, markAllRead, removeNotification, setNotifications } = useNotificationStore();
  const navigate = useNavigate();
  
  const [dmRequests, setDmRequests] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]); 
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        // Fetching both types to ensure the panel is never empty if requests exist
        const [dmRes, frRes] = await Promise.all([
            api.get('/rooms/requests').catch(() => ({ data: [] })),
            api.get('/friends/requests?type=received').catch(() => ({ data: [] }))
        ]);
        setDmRequests(Array.isArray(dmRes) ? dmRes : dmRes.data || []);
        setFriendRequests(Array.isArray(frRes) ? frRes : frRes.data || []);
      } catch (error) {
        console.error('Failed to fetch requests:', error);
      } finally {
        setIsLoadingRequests(false);
      }
    };

    fetchRequests();
  }, []);

  // Correct API for DM/Message requests: /rooms/{roomId}/{action}
  const handleDMAction = async (roomId: string, action: 'accept' | 'reject') => {
    setProcessingId(roomId);
    try {
      await api.post(`/rooms/${roomId}/${action}`);
      setDmRequests((prev) => prev.filter((req) => req.room_id !== roomId));
      if (action === 'accept') {
          navigate('/chats', { state: { autoOpenRoomId: roomId } });
      }
    } catch (error: any) {
      alert(error.response?.data?.message || `Failed to ${action} DM request.`);
    } finally {
      setProcessingId(null);
    }
  };

  // ✅ CORRECT API for Friend Requests: /friends/{username}/{action}
  // This matches your Raj test exactly: /api/v1/friends/raj_1233/accept
  // FIX: Dedicated action handler for Friend Requests
  const handleFriendAction = async (username: string, action: 'accept' | 'reject') => {
    setProcessingId(username);
    try {
      // ✅ Correct: POST /api/v1/friends/accept with { username: "..." }
      await api.post(`/friends/${action}`, { username });
      
      // Update local state to remove from UI instantly
      setFriendRequests((prev) => prev.filter((req) => req.username !== username));
      
      // Also clear it from the live websocket notifications if present
      const remainingStoreNotifs = storeNotifications.filter(n => 
        !(n.type === 'FRIEND_REQ' && (n.data?.username === username || n.data?.from === username))
      );
      setNotifications(remainingStoreNotifs);
      
    } catch (error: any) {
      const backendMsg = error.response?.data?.message || `Failed to ${action} friend request.`;
      alert(backendMsg);
    } finally {
      setProcessingId(null);
    }
  };

  const formatNotificationTime = (isoString: string) => {
    if (!isoString) return 'Just now';
    return new Date(isoString).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formattedDmRequests: Notification[] = dmRequests.map((req) => ({
    id: req.room_id,
    type: 'DM_REQ',
    title: `Message Request: ${req.sender_name || 'Someone'}`,
    message: req.last_message_preview || `Wants to connect with you.`,
    time: formatNotificationTime(req.last_message_at),
    read: false,
    data: req, 
  }));

  const formattedFriendRequests: Notification[] = friendRequests.map((req) => ({
    id: `fr_${req.username}`,
    type: 'FRIEND_REQ',
    title: `Friend Request: ${req.name || 'User'}`,
    message: `@${req.username} wants to be your friend!`,
    time: formatNotificationTime(req.created_at),
    read: false,
    data: req,
  }));

  // Prevent duplicate entries between API fetch and Live WebSocket store
  const filteredStoreNotifs = storeNotifications.filter(n => 
      n.type !== 'FRIEND_REQ' || !friendRequests.some(fr => fr.username === (n.data?.username || n.data?.from))
  );

  const allNotifications = [...formattedDmRequests, ...formattedFriendRequests, ...filteredStoreNotifs];

  return (
    <div className="flex flex-col h-full w-full bg-transparent">
      
      {allNotifications.length > 0 && (
        <div className="flex justify-end px-5 py-3 border-b border-gray-200 dark:border-[#272729] bg-gray-50/80 dark:bg-[#111]/50 shrink-0 transition-colors">
          <button 
            onClick={() => markAllRead()} 
            className="flex items-center gap-1.5 text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <CheckCircle2 size={14} strokeWidth={2.5} />
            Mark all read
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide">
         {isLoadingRequests ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
               <Loader2 className="w-6 h-6 animate-spin mb-3 text-blue-500" strokeWidth={3} />
               <p className="text-sm font-bold">Checking notifications...</p>
            </div>
         ) : allNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
               <div className="w-14 h-14 rounded-full bg-white dark:bg-[#1A1A1B] flex items-center justify-center mb-4 border border-gray-200 dark:border-[#272729] shadow-sm">
                 <Bell size={24} className="text-gray-400 dark:text-gray-500" strokeWidth={2.5} />
               </div>
               <p className="text-sm font-bold text-gray-900 dark:text-white">No new notifications</p>
               <p className="text-xs mt-1 font-medium">You're all caught up!</p>
            </div>
         ) : (
            allNotifications.map((notif) => (
               <div 
                 key={notif.id} 
                 className={`p-5 border-b border-gray-200 dark:border-[#272729] hover:bg-white dark:hover:bg-[#1A1A1B] transition-colors ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
               >
                 <div className="flex gap-4">
                     <div className="mt-1 shrink-0">
                        {notif.type === 'DM_REQ' ? (
                          <img 
                            src={notif.data?.sender_avatar || `https://ui-avatars.com/api/?name=${notif.data?.sender_name || 'U'}&background=random`} 
                            className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-[#272729] shadow-sm"
                          />
                        ) : notif.type === 'FRIEND_REQ' ? (
                          <img 
                            src={notif.data?.avatar_url || `https://ui-avatars.com/api/?name=${notif.data?.name || 'U'}&background=random`} 
                            className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-[#272729] shadow-sm"
                          />
                        ) : notif.type === 'MESSAGE' ? (
                          <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-[#14532D] flex items-center justify-center text-green-600 dark:text-green-400 shadow-sm"><MessageCircle size={20} strokeWidth={2.5} /></div>
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-[#272729] flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-sm"><Info size={20} strokeWidth={2.5} /></div>
                        )}
                     </div>

                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{notif.title}</h4>
                            {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0"></div>}
                        </div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                        <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-2 block font-bold uppercase tracking-widest">{notif.time}</span>

                        {(notif.type === 'DM_REQ' || notif.type === 'FRIEND_REQ') && (
                           <div className="flex gap-3 mt-4">
                              <button 
                                onClick={() => {
                                  if (notif.type === 'DM_REQ') handleDMAction(notif.id, 'accept');
                                  else handleFriendAction(notif.data.username || notif.data.from, 'accept');
                                }}
                                disabled={processingId !== null}
                                className="flex-1 bg-blue-600 dark:bg-[#1E3A8A] hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md hover:-translate-y-0.5"
                              >
                                 {processingId === (notif.type === 'DM_REQ' ? notif.id : (notif.data.username || notif.data.from)) ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} strokeWidth={3} /> Accept</>}
                              </button>
                              
                              <button 
                                onClick={() => {
                                  if (notif.type === 'DM_REQ') handleDMAction(notif.id, 'reject');
                                  else handleFriendAction(notif.data.username || notif.data.from, 'reject');
                                }}
                                disabled={processingId !== null}
                                className="flex-1 bg-gray-100 dark:bg-[#272729] hover:bg-red-50 text-gray-700 dark:text-gray-300 hover:text-red-600 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm border border-gray-200 dark:border-transparent hover:-translate-y-0.5"
                              >
                                 <X size={16} strokeWidth={3} /> Reject
                              </button>
                           </div>
                        )}

                        {notif.type !== 'DM_REQ' && notif.type !== 'FRIEND_REQ' && (
                           <div className="mt-3 flex justify-end">
                              <button 
                                onClick={() => removeNotification(notif.id)}
                                className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white"
                              >
                                Dismiss
                              </button>
                           </div>
                        )}
                     </div>
                 </div>
               </div>
            ))
         )}
      </div>
    </div>
  );
};

export default NotificationsPanel;