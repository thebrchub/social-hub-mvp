import { Search, Plus, Loader2 } from 'lucide-react';

export const ChatSidebar = ({ 
  rooms, requests, activeTab, setActiveTab, selectedRoomId, setSelectedRoomId, 
  presence, user, formatTime, newUsername, setNewUsername, isCreating, handleCreateDM,
  isLoadingSidebar, handleRequestAction, setShowGroupModal 
}: any) => {
  
  const groupRooms = rooms.filter((r: any) => r.type === 'group' || r.type === 'GROUP');
  const dmRooms = rooms.filter((r: any) => r.type === 'DM' || !r.type);

  return (
    <>
      {/* MOBILE OVERLAY: Clicking this closes the sidebar when a room is selected */}
      {!selectedRoomId && (
         <div 
           className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
           onClick={() => setSelectedRoomId(rooms[0]?.room_id || null)} // Hack to close sidebar
         />
      )}

      <div className={`w-full md:w-80 lg:w-[380px] border-r border-[#272729] flex flex-col bg-[#0f0f0f] shrink-0 z-50 transition-transform duration-300 ${selectedRoomId ? 'hidden md:flex' : 'flex absolute md:relative inset-y-0 left-0'}`}>
        <div className="p-4 border-b border-[#272729] shadow-sm shrink-0 bg-[#0f0f0f]">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-display font-bold text-white tracking-wide">Discussions</h2>
              <div className="flex bg-[#1a1a1a] p-1 rounded-lg">
                <button onClick={() => setActiveTab('chats')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'chats' ? 'bg-[#272729] text-white' : 'text-gray-500 hover:text-gray-300'}`}>Chats</button>
                <button onClick={() => setActiveTab('requests')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative ${activeTab === 'requests' ? 'bg-[#272729] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  Requests {requests.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>}
                </button>
              </div>
           </div>
           
           {activeTab === 'chats' ? (
              <form onSubmit={handleCreateDM} className="relative group flex items-center">
                <Plus className="absolute left-3 w-4 h-4 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="New DM or Group Code..." className="w-full bg-[#1a1a1a] border border-[#272729] rounded-lg pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-600" disabled={isCreating} />
                <button type="submit" disabled={isCreating || !newUsername.trim()} className="absolute right-2 p-1.5 text-indigo-500 hover:text-indigo-400 disabled:opacity-50 transition-colors">
                  {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                </button>
              </form>
           ) : (
              <div className="relative group">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500 transition-colors" />
                <input type="text" placeholder="Search requests..." className="w-full bg-[#1a1a1a] border border-[#272729] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600 opacity-50 cursor-not-allowed" disabled />
              </div>
           )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col min-h-0 bg-[#0f0f0f]">
           {isLoadingSidebar ? (
               <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-gray-500 animate-spin" /></div>
           ) : activeTab === 'chats' ? (
             <>
               <div className="p-4 border-b border-[#272729]/50 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Your Squads</h3>
                      <button onClick={() => setShowGroupModal(true)} className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                          <Plus size={12} strokeWidth={3} />
                      </button>
                  </div>
                  
                  {groupRooms.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x pb-2">
                     {groupRooms.map((room: any) => (
                       <div key={room.room_id} onClick={() => setSelectedRoomId(room.room_id)} className={`snap-start shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center p-2 cursor-pointer transition-all border ${selectedRoomId === room.room_id ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-[#1a1a1a] border-[#272729] hover:border-gray-500'}`}>
                         
                         {/* Group Icon/Image */}
                         <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold text-white mb-1.5 shadow-md overflow-hidden">
                           {room.avatarUrl || room.avatar_url ? (
                               <img src={room.avatarUrl || room.avatar_url} alt={room.name} className="w-full h-full object-cover" />
                           ) : (
                               (room.name || 'G').charAt(0).toUpperCase()
                           )}
                         </div>

                         <span className="text-[10px] text-gray-300 text-center truncate w-full font-medium">{room.name || 'Group'}</span>
                         {room.unread_count > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00e676] rounded-full border-2 border-[#1a1a1a]"></span>}
                       </div>
                     ))}
                   </div>
                  ) : (
                    <div className="text-center text-xs text-gray-600 py-3 border border-dashed border-[#272729] rounded-xl cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setShowGroupModal(true)}>
                       No squads yet. Create one!
                    </div>
                  )}
               </div>

               <div className="p-3 flex-1">
                 <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2 mt-2">Direct Messages</h3>
                 <div className="space-y-1">
                     {dmRooms.length > 0 ? dmRooms.map((room: any) => {
                         const displayName = room.name || `User_${room.room_id.substring(0,4)}`;
                         let isOnline = false;
                         if (room.partner_id && presence[room.partner_id]) {
                            isOnline = presence[room.partner_id].online;
                         } else if (room.members) {
                            isOnline = room.members.find((m: any) => m.id !== user?.id)?.is_online || false;
                         }
                         
                         const roomAvatar = room.avatar_url || room.avatarUrl;

                         return (
                           <div key={room.room_id} onClick={() => setSelectedRoomId(room.room_id)} className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${selectedRoomId === room.room_id ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}>
                               <div className="relative shrink-0">
                                   
                                   {/* FIX: Render DM Avatar Image */}
                                   <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white overflow-hidden ${selectedRoomId === room.room_id ? 'bg-indigo-600' : 'bg-[#2a2a2a]'}`}>
                                       {roomAvatar ? (
                                           <img src={roomAvatar} alt={displayName} className="w-full h-full object-cover" />
                                       ) : (
                                           displayName.charAt(0).toUpperCase()
                                       )}
                                   </div>

                                   {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00e676] rounded-full border-2 border-[#0f0f0f]"></div>}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-center mb-1">
                                       <span className={`text-[15px] truncate ${selectedRoomId === room.room_id ? 'text-indigo-400 font-bold' : room.unread_count > 0 ? 'text-white font-bold' : 'text-gray-200 font-medium'}`}>{displayName}</span>
                                       <span className={`text-[10px] shrink-0 ${room.unread_count > 0 ? 'text-indigo-400 font-bold' : 'text-gray-500'}`}>{formatTime(room.last_message_at)}</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <span className={`text-xs truncate pr-2 ${room.unread_count > 0 ? 'text-gray-200 font-semibold' : 'text-gray-500'}`}>{room.last_message_preview || 'No messages'}</span>
                                       {room.unread_count > 0 && (
                                           <div className="min-w-[18px] h-[18px] bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 shadow-[0_0_8px_rgba(99,102,241,0.4)] shrink-0">
                                             {room.unread_count > 99 ? '99+' : room.unread_count}
                                           </div>
                                       )}
                                   </div>
                               </div>
                           </div>
                         )
                     }) : <div className="text-center text-xs text-gray-600 mt-4">No active DMs.</div>}
                 </div>
               </div>
             </>
           ) : (
             <div className="p-3 space-y-2">
                 {requests.length > 0 ? requests.map((req: any) => (
                     <div key={req.room_id} className="bg-[#1a1a1a] rounded-xl p-3 border border-[#272729]">
                         <div className="flex items-center gap-3 mb-2">
                             
                             {/* FIX: Render Requests Avatar */}
                             <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white text-sm font-bold overflow-hidden border border-[#272729]">
                                 {req.sender_avatar ? (
                                     <img src={req.sender_avatar} alt={req.sender_name} className="w-full h-full object-cover" />
                                 ) : (
                                     req.sender_name?.charAt(0) || 'U'
                                 )}
                             </div>

                             <div className="flex-1 min-w-0">
                                 <p className="text-sm font-medium text-gray-200 truncate">{req.sender_name || 'Unknown'}</p>
                                 <p className="text-[10px] text-gray-500 truncate">@{req.sender_username}</p>
                             </div>
                         </div>
                         <p className="text-xs text-gray-400 italic mb-3 bg-black/20 p-2 rounded line-clamp-2">"{req.last_message_preview || 'Wants to send you a message'}"</p>
                         <div className="flex gap-2">
                             <button onClick={() => handleRequestAction(req.room_id, 'accept')} className="flex-1 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded text-xs font-bold transition-colors">Accept</button>
                             <button onClick={() => handleRequestAction(req.room_id, 'reject')} className="flex-1 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded text-xs font-bold transition-colors">Reject</button>
                         </div>
                     </div>
                 )) : <div className="text-center text-xs text-gray-600 mt-4">Inbox is clean!</div>}
             </div>
           )}
        </div>
      </div>
    </>
  );
};