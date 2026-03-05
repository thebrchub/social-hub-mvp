import { useState, useEffect } from 'react';
import { useNotificationStore, type Notification } from '../store/useNotificationStore';
import { Check, X, MessageCircle, Info, Loader2, CheckCircle2, Bell} from 'lucide-react';
import { api } from '../services/api';

const NotificationsPanel = ({ onClose }: { onClose?: () => void }) => {
  // Store notifications (for WebSocket events like SYSTEM or regular MESSAGE)
  const { notifications: storeNotifications, markAllRead, removeNotification } = useNotificationStore();
  
  // API State for actual DM Requests
  const [dmRequests, setDmRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. Fetch real DM requests from the API defined in your Swagger
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.get('/rooms/requests');
        setDmRequests(Array.isArray(res) ? res : res.data || []);
      } catch (error) {
        console.error('Failed to fetch DM requests:', error);
      } finally {
        setIsLoadingRequests(false);
      }
    };

    fetchRequests();
  }, []);

  // 2. Handle Accept/Reject hitting the exact /rooms/{roomId} endpoints
  const handleDMAction = async (roomId: string, action: 'accept' | 'reject') => {
    setProcessingId(roomId);
    try {
      await api.post(`/rooms/${roomId}/${action}`);
      
      // Remove from local API state immediately on success
      setDmRequests((prev) => prev.filter((req) => req.room_id !== roomId));
    } catch (error: any) {
      console.error(`Failed to ${action} DM request:`, error);
      alert(error.message || `Failed to ${action} request. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  // FIX: Explicitly cast as Notification[] and use "data" instead of "raw"
  const formattedDmRequests: Notification[] = dmRequests.map((req) => ({
    id: req.room_id,
    type: 'DM_REQ',
    title: `Message Request: ${req.sender_name}`,
    message: req.last_message_preview || `Wants to connect with you.`,
    time: req.last_message_at ? new Date(req.last_message_at).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    read: false,
    data: req, // Using data to match the store interface perfectly
  }));

  // Merge API requests with any WebSocket store notifications
  const allNotifications = [...formattedDmRequests, ...storeNotifications];

  return (
    <div className="flex flex-col h-full w-full">
      {/* --- FIX: Updated Header Controls with onClose --- */}
      <div className="flex items-center justify-between p-3.5 border-b border-[#272729] bg-[#1a1a1a]/50 shrink-0">
        <h3 className="text-sm font-bold text-white tracking-wide">Notifications</h3>
        <div className="flex items-center gap-3">
          {allNotifications.length > 0 && (
            <button 
              onClick={() => {
                markAllRead();
              }} 
              className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-blue-400 transition-colors"
            >
              <CheckCircle2 size={14} />
              Mark all read
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* The Scrollable List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#030303]">
         {isLoadingRequests ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
               <Loader2 className="w-6 h-6 animate-spin mb-3 text-blue-500" />
               <p className="text-sm font-medium">Loading requests...</p>
            </div>
         ) : allNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
               <div className="w-12 h-12 rounded-full bg-[#1A1A1B] flex items-center justify-center mb-3 border border-[#272729]">
                 <Bell size={20} className="text-gray-600" />
               </div>
               <p className="text-sm font-medium">No new notifications</p>
               <p className="text-[10px] mt-1">You're all caught up!</p>
            </div>
         ) : (
            allNotifications.map((notif) => (
               <div 
                 key={notif.id} 
                 className={`p-4 border-b border-[#272729] hover:bg-[#1A1A1B] transition-colors ${!notif.read ? 'bg-blue-900/5' : ''}`}
               >
                  <div className="flex gap-3">
                     
                     {/* Dynamic Icon Avatar/Type */}
                     <div className="mt-1 shrink-0">
                        {notif.type === 'DM_REQ' ? (
                          <img 
                            src={notif.data?.sender_avatar || `https://ui-avatars.com/api/?name=${notif.data?.sender_name || 'User'}&background=random`} 
                            alt={notif.data?.sender_name || 'User'} 
                            className="w-10 h-10 rounded-full object-cover border border-[#272729]"
                          />
                        ) : notif.type === 'MESSAGE' ? (
                          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20"><MessageCircle size={18}/></div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-400 border border-gray-500/20"><Info size={18}/></div>
                        )}
                     </div>

                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="text-sm font-bold text-gray-200 truncate">{notif.title}</h4>
                            {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                        <span className="text-[10px] text-gray-600 mt-2 block font-medium">{notif.time}</span>

                        {/* Action Buttons specifically mapped to DM Request logic */}
                        {notif.type === 'DM_REQ' && (
                           <div className="flex gap-2 mt-3">
                              <button 
                                onClick={() => handleDMAction(notif.id, 'accept')}
                                disabled={processingId === notif.id}
                                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-blue-900/20"
                              >
                                 {processingId === notif.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Accept</>}
                              </button>
                              <button 
                                onClick={() => handleDMAction(notif.id, 'reject')}
                                disabled={processingId === notif.id}
                                className="flex-1 bg-[#272729] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-transparent disabled:opacity-50 text-gray-300 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                              >
                                 <X size={14} /> Reject
                              </button>
                           </div>
                        )}

                        {/* Dismiss generic store notifications */}
                        {notif.type !== 'DM_REQ' && (
                           <div className="mt-3 flex justify-end">
                              <button 
                                onClick={() => removeNotification(notif.id)}
                                className="text-[10px] font-bold text-gray-500 hover:text-gray-300"
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