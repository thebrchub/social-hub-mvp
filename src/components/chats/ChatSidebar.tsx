import { Search, Plus, Loader2, Users, PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, Video } from 'lucide-react';

export const ChatSidebar = ({ 
  rooms, requests, groupInvites, callHistory, activeTab, setActiveTab, selectedRoomId, setSelectedRoomId, 
  presence, user, formatTime, newUsername, setNewUsername, isCreating, handleCreateDM,
  isLoadingSidebar, handleGroupInviteAction, setShowGroupModal, handleCallLogClick
}: any) => {
  
  const groupRooms = rooms.filter((r: any) => r.type === 'group' || r.type === 'GROUP');
  const dmRooms = rooms.filter((r: any) => r.type === 'DM' || !r.type);
  const messageRequests = requests.filter((req: any) => req.last_message_preview && req.last_message_preview.trim() !== '');

  const totalRequests = messageRequests.length + (groupInvites?.length || 0);

  const formatDuration = (seconds: number | null | undefined) => {
      if (!seconds || seconds === 0) return '—';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {!selectedRoomId && (
         <div 
           className="md:hidden fixed inset-0 z-40 bg-gray-900/50 dark:bg-black/50 backdrop-blur-sm"
           onClick={() => setSelectedRoomId(rooms[0]?.room_id || null)} 
         />
      )}

      <div className={`w-full md:w-80 lg:w-[360px] border-r border-gray-200 dark:border-[#272729] flex flex-col bg-gray-50 dark:bg-[#0a0a0a] shrink-0 z-50 transition-transform duration-300 ${selectedRoomId ? 'hidden md:flex' : 'flex absolute md:relative inset-y-0 left-0'}`}>
        
        <div className="p-4 border-b border-gray-200 dark:border-[#272729] shadow-sm shrink-0 bg-white dark:bg-[#0f0f0f] transition-colors">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-display font-extrabold text-gray-900 dark:text-white tracking-wide">Discussions</h2>
              <div className="flex bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-xl shadow-inner border border-gray-200 dark:border-[#272729]">
                <button onClick={() => setActiveTab('chats')} className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${activeTab === 'chats' ? 'bg-white dark:bg-[#272729] text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Chats</button>
                <button onClick={() => setActiveTab('calls')} className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${activeTab === 'calls' ? 'bg-white dark:bg-[#272729] text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Calls</button>
                <button onClick={() => setActiveTab('requests')} className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all relative ${activeTab === 'requests' ? 'bg-white dark:bg-[#272729] text-blue-600 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  Requests {totalRequests > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-[#272729]"></span>}
                </button>
              </div>
           </div>
           
           {activeTab === 'chats' ? (
              <form onSubmit={handleCreateDM} className="relative group flex items-center">
                <Plus className="absolute left-3.5 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" strokeWidth={3} />
                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="New DM or Group Code..." className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#272729] rounded-2xl pl-11 pr-12 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-[#111] transition-all placeholder:text-gray-500 shadow-inner" disabled={isCreating} />
                <button type="submit" disabled={isCreating || !newUsername.trim()} className="absolute right-2 p-2 bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-600/40 disabled:opacity-50 transition-colors">
                  {isCreating ? <Loader2 size={16} className="animate-spin" strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                </button>
              </form>
           ) : (
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors" strokeWidth={3} />
                <input type="text" placeholder="Search..." className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#272729] rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none transition-all placeholder:text-gray-500 opacity-50 cursor-not-allowed shadow-inner" disabled />
              </div>
           )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col min-h-0 bg-gray-50 dark:bg-[#0a0a0a] transition-colors">
           {isLoadingSidebar ? (
               <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={3} /></div>
           ) : activeTab === 'chats' ? (
             <>
               <div className="p-3 border-b border-gray-200 dark:border-[#272729] shrink-0 bg-white dark:bg-[#0f0f0f] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest ml-1">Your Squads</h3>
                      <button onClick={() => setShowGroupModal(true)} className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-200 dark:border-transparent shadow-sm">
                          <Plus size={14} strokeWidth={3} />
                      </button>
                  </div>
                  
                  {groupRooms.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x pb-2">
                     {groupRooms.map((room: any) => (
                       <div key={room.room_id} onClick={() => setSelectedRoomId(room.room_id)} className={`snap-start shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center p-2 cursor-pointer transition-all border-2 ${selectedRoomId === room.room_id ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 dark:border-blue-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]' : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#272729] hover:border-blue-300 dark:hover:border-gray-500 shadow-sm'}`}>
                         
                         <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-bold text-white mb-1 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] overflow-hidden border border-blue-700">
                           {room.avatarUrl || room.avatar_url ? (
                               <img src={room.avatarUrl || room.avatar_url} alt={room.name} className="w-full h-full object-cover" />
                           ) : (
                               (room.name || 'G').charAt(0).toUpperCase()
                           )}
                         </div>

                         <span className={`text-[9px] text-center truncate w-full font-extrabold ${selectedRoomId === room.room_id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{room.name || 'Group'}</span>
                         {room.unread_count > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#1a1a1a] shadow-sm"></span>}
                       </div>
                     ))}
                   </div>
                  ) : (
                    <div className="text-center text-[11px] font-bold text-gray-500 dark:text-gray-600 py-3 bg-gray-50 dark:bg-[#0a0a0a] border-2 border-dashed border-gray-200 dark:border-[#272729] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" onClick={() => setShowGroupModal(true)}>
                       No squads yet. Create one!
                    </div>
                  )}
               </div>

               <div className="p-2 flex-1 bg-white dark:bg-[#0a0a0a] transition-colors">
                 <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-3 mb-2 mt-2">Direct Messages</h3>
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
                           <div key={room.room_id} onClick={() => setSelectedRoomId(room.room_id)} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all border ${selectedRoomId === room.room_id ? 'bg-blue-50 dark:bg-white/10 border-blue-200 dark:border-white/10 shadow-sm' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 border-transparent'}`}>
                               <div className="relative shrink-0">
                                   <div className={`w-10 h-10 rounded-[1rem] flex items-center justify-center text-sm font-extrabold text-white overflow-hidden border ${selectedRoomId === room.room_id ? 'bg-blue-600 border-blue-700 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' : 'bg-gray-200 dark:bg-[#2a2a2a] border-gray-300 dark:border-[#343536] text-gray-500 dark:text-gray-400'}`}>
                                       {roomAvatar ? (
                                           <img src={roomAvatar} alt={displayName} className="w-full h-full object-cover" />
                                       ) : (
                                           displayName.charAt(0).toUpperCase()
                                       )}
                                   </div>
                                   {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-[#0f0f0f] shadow-sm"></div>}
                               </div>
                               <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-center mb-0.5">
                                       <span className={`text-[14px] truncate ${selectedRoomId === room.room_id ? 'text-blue-700 dark:text-blue-400 font-extrabold' : room.unread_count > 0 ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-700 dark:text-gray-200 font-bold'}`}>{displayName}</span>
                                       <span className={`text-[9px] shrink-0 font-bold ${room.unread_count > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>{formatTime(room.last_message_at)}</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <span className={`text-[11px] truncate pr-2 font-medium ${room.unread_count > 0 ? 'text-gray-900 dark:text-gray-200' : 'text-gray-500'}`}>{room.last_message_preview || 'No messages'}</span>
                                       {room.unread_count > 0 && (
                                           <div className="min-w-[18px] h-[18px] bg-blue-600 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white px-1 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_2px_8px_rgba(37,99,235,0.4)] shrink-0">
                                             {room.unread_count > 99 ? '99+' : room.unread_count}
                                           </div>
                                       )}
                                   </div>
                               </div>
                           </div>
                         )
                     }) : <div className="text-center text-xs font-bold text-gray-500 mt-4">No active DMs.</div>}
                 </div>
               </div>
             </>
           ) : activeTab === 'calls' ? (
             <div className="p-2 flex-1 bg-white dark:bg-[#0a0a0a] transition-colors">
                <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-3 mb-2 mt-2">Recent Calls</h3>
                <div className="space-y-1">
                    {callHistory?.length > 0 ? callHistory.map((call: any) => {
                        
                        // FIX: Correct Mapping based on Swagger Spec
                        const isOutgoing = String(call.initiatedBy) === String(user?.id);
                        const isIncoming = !isOutgoing;
                        const isMissed = !call.durationSeconds || call.durationSeconds === 0;
                        const isVideo = call.callType === 'video';
                        
                        const peerName = call.callerName || 'Unknown';
                        const peerAvatar = call.callerAvatar;
                        const callTime = call.startedAt || call.created_at || new Date().toISOString();
                        
                        return (
                            <div key={call.callId || Math.random()} onClick={() => handleCallLogClick && handleCallLogClick(call)} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer border border-transparent group">
                                <div className="w-10 h-10 rounded-[1rem] overflow-hidden bg-gray-200 dark:bg-[#2a2a2a] flex items-center justify-center text-sm font-bold text-gray-500 border border-gray-300 dark:border-[#343536] shrink-0">
                                    {peerAvatar ? (
                                        <img src={peerAvatar} alt="" className="w-full h-full object-cover"/>
                                    ) : (
                                        peerName.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[14px] font-bold truncate ${isMissed ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}>{peerName}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-0.5">
                                        {isMissed ? <PhoneMissed size={12} className="text-red-500 shrink-0"/> : isIncoming ? <PhoneIncoming size={12} className="text-green-500 shrink-0"/> : <PhoneOutgoing size={12} className="text-blue-500 shrink-0"/>}
                                        <span className="truncate">{formatTime(callTime)}</span>
                                        <span className="mx-0.5">•</span>
                                        <span className="shrink-0">Duration: {formatDuration(call.durationSeconds)}</span>
                                    </div>
                                </div>
                                <div className="p-2 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0">
                                    {isVideo ? <Video size={16} strokeWidth={2.5}/> : <Phone size={16} strokeWidth={2.5}/>}
                                </div>
                            </div>
                        )
                    }) : <div className="text-center text-xs font-bold text-gray-500 mt-4">No recent calls.</div>}
                </div>
             </div>
           ) : (
             <div className="p-3 space-y-4 bg-white dark:bg-[#0a0a0a] min-h-full transition-colors">
                 
                 {groupInvites?.length > 0 && (
                   <div>
                     <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-2 mb-2">Squad Invites</h3>
                     <div className="space-y-2">
                       {groupInvites.map((inv: any) => (
                          <div key={inv.roomId} className="rounded-[1.25rem] p-3 border bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/20 shadow-sm transition-colors">
                             <div className="flex items-center gap-3 mb-3">
                                 <div className="w-10 h-10 rounded-[1rem] bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-white text-sm font-extrabold overflow-hidden border border-blue-300 dark:border-blue-700">
                                     {inv.avatarUrl ? (
                                         <img src={inv.avatarUrl} alt={inv.groupName} className="w-full h-full object-cover" />
                                     ) : (
                                         <Users size={20} strokeWidth={2.5} />
                                     )}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <p className="text-sm font-extrabold text-blue-900 dark:text-blue-100 truncate">{inv.groupName}</p>
                                     <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5">Invited by @{inv.inviterName}</p>
                                 </div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => handleGroupInviteAction(inv.roomId, 'decline')} className="flex-1 py-2.5 bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-xl font-extrabold transition-all shadow-sm text-xs border border-gray-200 dark:border-[#272729]">Decline</button>
                                <button onClick={() => handleGroupInviteAction(inv.roomId, 'accept')} className="flex-1 py-2.5 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-extrabold transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] text-xs">Join Squad</button>
                             </div>
                          </div>
                       ))}
                     </div>
                   </div>
                 )}

                 <div>
                    {messageRequests.length > 0 || groupInvites?.length > 0 ? (
                       messageRequests.length > 0 && (
                          <>
                            <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-2 mb-2 mt-2">Direct Messages</h3>
                            <div className="space-y-2">
                               {messageRequests.map((req: any) => (
                                <div key={req.room_id} onClick={() => setSelectedRoomId(req.room_id)} className={`rounded-2xl p-3 border cursor-pointer transition-all shadow-sm ${selectedRoomId === req.room_id ? 'bg-blue-50 dark:bg-white/10 border-blue-200 dark:border-white/10' : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#272729] hover:border-gray-300 dark:hover:bg-white/5'}`}>
                                       <div className="flex items-center gap-3 mb-2">
                                           <div className="w-10 h-10 rounded-[1rem] bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-white text-sm font-extrabold overflow-hidden border border-gray-300 dark:border-[#272729]">
                                               {req.sender_avatar ? (
                                                   <img src={req.sender_avatar} alt={req.sender_name} className="w-full h-full object-cover" />
                                               ) : (
                                                   req.sender_name?.charAt(0) || 'U'
                                               )}
                                           </div>
                                           <div className="flex-1 min-w-0">
                                               <p className="text-sm font-extrabold text-gray-900 dark:text-gray-200 truncate">{req.sender_name || 'Unknown'}</p>
                                               <p className="text-[10px] font-bold text-gray-500 truncate mt-0.5">@{req.sender_username}</p>
                                           </div>
                                       </div>
                                       <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium italic bg-white dark:bg-black/20 border border-gray-200 dark:border-transparent p-2.5 rounded-xl line-clamp-2 shadow-inner">"{req.last_message_preview}"</p>
                                    </div>
                               ))}
                            </div>
                          </>
                       )
                    ) : (
                       <div className="text-center text-xs font-bold text-gray-500 mt-4">No pending requests.</div>
                    )}
                 </div>
             </div>
           )}
        </div>
      </div>
    </>
  );
};