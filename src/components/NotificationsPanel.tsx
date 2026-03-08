import { useState, useEffect } from 'react';
import { useNotificationStore, type Notification } from '../store/useNotificationStore';
import { Check, X, MessageCircle, Info, Loader2, CheckCircle2, Bell } from 'lucide-react';
import { api } from '../services/api';

const NotificationsPanel = () => {
  const { notifications: storeNotifications, markAllRead, removeNotification } = useNotificationStore();
  
  const [dmRequests, setDmRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handleDMAction = async (roomId: string, action: 'accept' | 'reject') => {
    setProcessingId(roomId);
    try {
      await api.post(`/rooms/${roomId}/${action}`);
      setDmRequests((prev) => prev.filter((req) => req.room_id !== roomId));
    } catch (error: any) {
      console.error(`Failed to ${action} DM request:`, error);
      alert(error.message || `Failed to ${action} request. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  // FIX: Unambiguous, automatically localized Date format (e.g., "6 Mar 2026, 11:29 PM")
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
    title: `Message Request: ${req.sender_name}`,
    message: req.last_message_preview || `Wants to connect with you.`,
    time: formatNotificationTime(req.last_message_at),
    read: false,
    data: req, 
  }));

  const allNotifications = [...formattedDmRequests, ...storeNotifications];

  return (
    <div className="flex flex-col h-full w-full bg-transparent">
      
      {/* FIX: Removed double "Notifications" header! Just a clean "Mark all read" action bar */}
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

      {/* The Scrollable List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
         {isLoadingRequests ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
               <Loader2 className="w-6 h-6 animate-spin mb-3 text-blue-500" strokeWidth={3} />
               <p className="text-sm font-bold">Loading requests...</p>
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
                     
                     {/* Dynamic Icon Avatar/Type */}
                     <div className="mt-1 shrink-0">
                        {notif.type === 'DM_REQ' ? (
                          <img 
                            src={notif.data?.sender_avatar || `https://ui-avatars.com/api/?name=${notif.data?.sender_name || 'User'}&background=random`} 
                            alt={notif.data?.sender_name || 'User'} 
                            className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-[#272729] shadow-sm"
                          />
                        ) : notif.type === 'MESSAGE' ? (
                          <div className="w-11 h-11 rounded-full bg-green-100 dark:bg-[#14532D] flex items-center justify-center text-green-600 dark:text-green-400 border border-green-200 dark:border-[#166534] shadow-sm"><MessageCircle size={20} strokeWidth={2.5} /></div>
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-[#272729] flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#343536] shadow-sm"><Info size={20} strokeWidth={2.5} /></div>
                        )}
                     </div>

                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{notif.title}</h4>
                            {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1 shrink-0 shadow-sm"></div>}
                        </div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                        
                        {/* Beautifully formatted timestamp */}
                        <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-2 block font-bold uppercase tracking-widest">{notif.time}</span>

                        {/* Action Buttons with Light/Dark 3D Bulge Effect */}
                        {notif.type === 'DM_REQ' && (
                           <div className="flex gap-3 mt-4">
                              {/* Accept Button - Blue Bulge */}
                              <button 
                                onClick={() => handleDMAction(notif.id, 'accept')}
                                disabled={processingId === notif.id}
                                className="flex-1 bg-blue-600 dark:bg-[#1E3A8A] hover:bg-blue-500 dark:hover:bg-[#1E40AF] disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_8px_rgba(37,99,235,0.2)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_0_4px_8px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
                              >
                                 {processingId === notif.id ? <Loader2 size={16} className="animate-spin" strokeWidth={2.5} /> : <><Check size={16} strokeWidth={3} /> Accept</>}
                              </button>
                              
                              {/* Reject Button - Gray/Red Bulge */}
                              <button 
                                onClick={() => handleDMAction(notif.id, 'reject')}
                                disabled={processingId === notif.id}
                                className="flex-1 bg-gray-100 dark:bg-[#272729] hover:bg-red-50 dark:hover:bg-[#3f1616] border border-gray-200 dark:border-[#343536] hover:border-red-200 dark:hover:border-[#5c1c1c] disabled:opacity-50 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,1),_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),_0_2px_4px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
                              >
                                 <X size={16} strokeWidth={3} /> Reject
                              </button>
                           </div>
                        )}

                        {/* Dismiss generic store notifications */}
                        {notif.type !== 'DM_REQ' && (
                           <div className="mt-3 flex justify-end">
                              <button 
                                onClick={() => removeNotification(notif.id)}
                                className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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