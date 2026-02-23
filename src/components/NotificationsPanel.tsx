import { useNotificationStore } from '../store/useNotificationStore';
import { Bell, Check, X, MessageCircle, UserPlus, Info } from 'lucide-react';

const NotificationsPanel = ({ onClose }: { onClose: () => void }) => {
  const { notifications, markAllRead, removeNotification } = useNotificationStore();

  const handleAction = (id: string, action: 'accept' | 'decline') => {
    // Here you would call your Backend API
    console.log(`${action} friend request ${id}`);
    removeNotification(id); // Remove from list after action
  };

  return (
    <div className="absolute left-20 bottom-10 md:bottom-auto md:top-0 w-80 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-left-5 fade-in duration-200">
      
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1a1a1a]">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
           <Bell size={14} className="text-blue-500" /> Notifications
        </h3>
        <button onClick={markAllRead} className="text-[10px] text-gray-400 hover:text-white underline">
           Mark all read
        </button>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
         {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
               No new notifications.
            </div>
         ) : (
            notifications.map((notif) => (
               <div key={notif.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${!notif.read ? 'bg-blue-900/10' : ''}`}>
                  <div className="flex gap-3">
                     
                     {/* Icon based on Type */}
                     <div className="mt-1">
                        {notif.type === 'FRIEND_REQ' && <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500"><UserPlus size={14}/></div>}
                        {notif.type === 'MESSAGE' && <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500"><MessageCircle size={14}/></div>}
                        {notif.type === 'SYSTEM' && <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-400"><Info size={14}/></div>}
                     </div>

                     <div className="flex-1">
                        <h4 className="text-xs font-bold text-gray-200">{notif.title}</h4>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{notif.message}</p>
                        <span className="text-[10px] text-gray-600 mt-2 block">{notif.time}</span>

                        {/* Action Buttons for Friend Requests */}
                        {notif.type === 'FRIEND_REQ' && (
                           <div className="flex gap-2 mt-3">
                              <button 
                                onClick={() => handleAction(notif.id, 'accept')}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                              >
                                 <Check size={12} /> Confirm
                              </button>
                              <button 
                                onClick={() => handleAction(notif.id, 'decline')}
                                className="flex-1 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 text-[10px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                              >
                                 <X size={12} /> Delete
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