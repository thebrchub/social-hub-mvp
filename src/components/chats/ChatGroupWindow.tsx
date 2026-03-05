import { useState, useEffect } from 'react';
import { Search, ArrowLeft, Loader2, Reply, Users, Info, Copy, LogOut, Trash2, Shield, UserMinus, Link, Plus, Send, Smile, Clock, Check, CheckCheck, X, Edit2 } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { api } from '../../services/api';
import Modal from '../Modal';

export const ChatGroupWindow = ({ 
  activeRoom, selectedRoomId, setSelectedRoomId, messages, user, presence, typingData,
  isMessagesLoading, isLoadingOlder, hasMoreMessages, fetchMessages, messagesEndRef,
  isSearchingMessages, setIsSearchingMessages, messageSearchQuery, setMessageSearchQuery, scrollToBottom, renderTextWithHighlights,
  handleSendMessage, inputValue, handleInput, replyingTo, setReplyingTo, showEmojiPicker, setShowEmojiPicker, onEmojiClick,
  formatTime, showInfoPanel, setShowInfoPanel, activeRoomDetails, isLoadingDetails, showToast, refreshChats, onPanelAction 
}: any) => {

  const typingNames = typingData?.userIds.map((id: string) => {
     const member = activeRoom?.members?.find((m: any) => m.id === id);
     return member ? member.name : 'Someone';
  }).join(', ');

  // --- Admin Verification ---
  const activeMembers = activeRoomDetails?.members || activeRoom?.members || [];
  const creatorId = activeRoomDetails?.createdBy || activeRoom?.created_by;
  
  const amICreator = creatorId === user?.id;
  const myMemberData = activeMembers.find((m: any) => m.id === user?.id);
  const amIAdmin = amICreator || myMemberData?.role?.toLowerCase() === 'admin';

  // --- LOGICAL FIX: Prevent last admin from leaving ---
  const adminCount = activeMembers.filter((m: any) => m.role?.toLowerCase() === 'admin' || creatorId === m.id).length;
  // A user can leave IF they are NOT an admin, OR if they are an admin but there is at least one other admin.
  const canLeaveGroup = !amIAdmin || adminCount > 1;

  // Add Members Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Group Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editVisibility, setEditVisibility] = useState("public");
  const [isEditing, setIsEditing] = useState(false);

  // Auto-close panels if room changes
  useEffect(() => {
     setShowAddModal(false);
     setShowEditModal(false);
  }, [selectedRoomId]);

  // --- ADD MEMBERS LOGIC ---
  const openAddMembersModal = async () => {
      setShowAddModal(true);
      setIsLoadingFriends(true);
      setSelectedFriends([]);
      try {
          const res = await api.get('/friends');
          const allFriends = Array.isArray(res) ? res : res.data || [];
          const existingMemberIds = activeMembers.map((m: any) => m.id);
          const availableFriends = allFriends.filter((f: any) => !existingMemberIds.includes(f.id));
          setFriends(availableFriends);
      } catch (e) {
          showToast("Failed to load friends", "error");
      } finally {
          setIsLoadingFriends(false);
      }
  };

  const toggleFriendSelection = (id: string) => {
      setSelectedFriends(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  };

  const submitAddMembers = async () => {
      if (selectedFriends.length === 0) return;
      setIsAdding(true);
      try {
          await api.post(`/groups/${selectedRoomId}/members`, { memberIds: selectedFriends });
          showToast(`${selectedFriends.length} members added!`, "success");
          setShowAddModal(false);
          refreshChats(); 
      } catch (e: any) {
          showToast(e.message || "Failed to add members", "error");
      } finally {
          setIsAdding(false);
      }
  };

  // --- EDIT GROUP LOGIC ---
  const openEditModal = () => {
      setEditName(activeRoomDetails?.name || activeRoom?.name || "");
      setEditAvatarUrl(activeRoomDetails?.avatarUrl || activeRoom?.avatar_url || "");
      setEditVisibility(activeRoomDetails?.visibility || "public");
      setShowEditModal(true);
  };

  const submitEditGroup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editName.trim()) return;
      setIsEditing(true);
      try {
          await api.patch(`/groups/${selectedRoomId}`, {
              name: editName.trim(),
              avatarUrl: editAvatarUrl.trim(),
              visibility: editVisibility
          });
          showToast("Squad updated successfully!", "success");
          setShowEditModal(false);
          refreshChats(); // Re-fetch group details so the UI updates instantly
      } catch (err: any) {
          showToast(err.message || "Failed to update squad", "error");
      } finally {
          setIsEditing(false);
      }
  };

  return (
    <div className={`flex-1 flex bg-[#0a0a0a] relative min-w-0 ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
      
      {/* INVISIBLE OVERLAY TO CLOSE PANEL WHEN CLICKING OUTSIDE */}
      {showInfoPanel && (
         <div 
           className="absolute inset-0 z-40 bg-transparent"
           onClick={() => setShowInfoPanel(false)}
         />
      )}

      {/* --- MAIN CHAT COLUMN --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        
        {/* Header (NO CALL BUTTONS) */}
        <div className="h-16 border-b border-[#272729] flex items-center justify-between px-4 md:px-6 bg-[#0f0f0f]/90 backdrop-blur-md shrink-0">
           <div className="flex items-center gap-3 min-w-0 cursor-pointer z-50" onClick={() => setShowInfoPanel(true)}>
              <button onClick={(e) => { e.stopPropagation(); setSelectedRoomId(null); }} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white shrink-0">
                <ArrowLeft size={20} />
              </button>
              
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-blue-500 font-bold shrink-0 border border-[#272729] bg-blue-900/30 overflow-hidden">
                 {activeRoomDetails?.avatarUrl || activeRoom?.avatar_url ? (
                     <img src={activeRoomDetails?.avatarUrl || activeRoom?.avatar_url} alt="Group DP" className="w-full h-full object-cover" />
                 ) : (
                     <Users size={18} />
                 )}
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                 <h3 className="font-bold text-white text-[15px] flex items-center gap-2 truncate leading-tight">
                    {activeRoom.name || `Squad_${selectedRoomId.substring(0,4)}`} 
                 </h3>
                 {typingData?.roomId === selectedRoomId && typingNames ? (
                    <p className="text-[11px] text-[#4ade80] italic truncate font-medium animate-pulse">{typingNames} typing...</p>
                 ) : (
                    <p className="text-[11px] text-gray-400 truncate hover:underline">{activeMembers.length} members</p>
                 )}
              </div>
           </div>
           
           <div className="flex items-center gap-1 sm:gap-2 text-gray-400 shrink-0 z-50">
              <button onClick={() => { setIsSearchingMessages(!isSearchingMessages); setMessageSearchQuery(""); }} className={`p-2 rounded-full transition-colors ${isSearchingMessages ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 hover:text-white'}`} title="Search Chat"><Search size={18} /></button>
              <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={`p-2 rounded-full transition-colors hidden sm:block ${showInfoPanel ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 hover:text-white'}`} title="Group Info"><Info size={18} /></button>
           </div>
        </div>

        {isSearchingMessages && (
          <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#272729] flex items-center gap-3 shrink-0 shadow-lg z-20">
             <Search size={16} className="text-gray-500" />
             <input type="text" placeholder="Search in squad..." value={messageSearchQuery} onChange={(e) => setMessageSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none text-[15px] text-white focus:outline-none" autoFocus />
             <button onClick={() => { setIsSearchingMessages(false); setMessageSearchQuery(""); scrollToBottom(); }} className="text-sm font-bold text-blue-400">Cancel</button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 flex flex-col scrollbar-hide z-0">
           {hasMoreMessages && !isSearchingMessages && (
             <button onClick={() => fetchMessages(selectedRoomId, true)} disabled={isLoadingOlder} className="mx-auto mb-6 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-medium rounded-full flex items-center gap-2">
               {isLoadingOlder ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />} Load older
             </button>
           )}

           {isMessagesLoading ? (
              <div className="m-auto flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
           ) : (
              <>
                 <div className="mt-auto"></div>
                 <div className="flex flex-col gap-2.5">
                   {messages.map((msg: any, idx: number) => {
                      const isMe = msg.sender_id === user?.id || msg.from === user?.id;
                      const isSystemMsg = msg.type === 'system' || msg.sender_id === 'system' || msg.from === 'system';
                      const msgText = msg.text || msg.content || "";
                      const msgId = msg.id || msg.message_id || msg._tempId || `temp-${idx}`;

                      if (isSystemMsg) {
                        return (
                          <div id={`msg-${msgId}`} key={msgId} className="flex justify-center my-3">
                             <span className="bg-white/5 border border-white/10 text-gray-400 text-[11px] px-4 py-1.5 rounded-full font-medium shadow-sm backdrop-blur-sm text-center">
                                {msgText}
                             </span>
                          </div>
                        );
                      }
                      
                      let senderName = "User";
                      if (!isMe && activeMembers) {
                         const member = activeMembers.find((m: any) => m.id === (msg.sender_id || msg.from));
                         if (member) senderName = member.name;
                      }

                      const isReply = msgText.startsWith('> ');
                      const splitMsg = isReply ? msgText.split('\n\n') : [];
                      const quoteText = isReply ? splitMsg[0].substring(2) : '';
                      const actualText = isReply ? splitMsg.slice(1).join('\n\n') : msgText;

                      return (
                        <div id={`msg-${msgId}`} key={msgId} onDoubleClick={() => setReplyingTo(msg)} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group cursor-pointer scroll-mt-20`}>
                           <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm flex flex-col ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1a1a1a] text-gray-200 border border-[#272729] rounded-bl-none'}`}>
                              {!isMe && <span className="text-[10px] font-bold text-blue-400 mb-1">{senderName}</span>}
                              {isReply && (
                                <div className={`border-l-2 pl-2 mb-2 text-xs opacity-80 ${isMe ? 'border-white/40 bg-black/20' : 'border-blue-500 bg-black/20'} p-2 rounded-lg`}>
                                  {renderTextWithHighlights(quoteText)}
                                </div>
                              )}
                              <span className="break-words whitespace-pre-wrap">{renderTextWithHighlights(actualText)}</span>
                              <div className={`flex items-center gap-1 text-[10px] mt-1.5 ${isMe ? 'text-white/70 justify-end' : 'text-gray-500 justify-start'}`}>
                                 <span>{formatTime(msg.created_at)}</span>
                                 {isMe && (
                                   <span className="ml-1 flex items-center">
                                     {msg.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin text-white/70" />}
                                     {(msg.status === 'sent' || !msg.status) && <Check className="w-3.5 h-3.5 text-white/70" />}
                                     {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-white/70" />}
                                     {msg.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-[#4ade80] drop-shadow-[0_0_2px_rgba(74,222,128,0.4)]" />}
                                   </span>
                                 )}
                              </div>
                           </div>
                        </div>
                      );
                   })}
                   <div ref={messagesEndRef} className="h-1 shrink-0" />
                 </div>
              </>
           )}
        </div>

        {/* Input Area */}
        <div className="border-t border-[#272729] bg-[#0a0a0a] shrink-0 flex flex-col z-20 relative">
           {showEmojiPicker && (
             <div className="absolute bottom-full right-4 mb-2 z-[100] shadow-2xl rounded-xl overflow-hidden border border-[#272729]">
               <EmojiPicker theme={Theme.DARK} onEmojiClick={onEmojiClick} width={320} height={350} />
             </div>
           )}
           {replyingTo && (
             <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#272729]">
                 <div className="flex items-center gap-3 overflow-hidden border-l-2 border-blue-500 pl-3">
                    <Reply size={16} className="text-gray-400 shrink-0" />
                    <div className="truncate">
                       <p className="text-xs text-blue-400 font-bold mb-0.5">{replyingTo.sender_id === user?.id ? 'Replying to yourself' : 'Replying to member'}</p>
                       <p className="text-gray-400 text-xs truncate max-w-[200px] md:max-w-md">{replyingTo.text || replyingTo.content}</p>
                    </div>
                 </div>
                 <button onClick={() => setReplyingTo(null)} className="p-1.5 text-gray-500 hover:text-white rounded-full bg-white/5 transition-colors"><X size={14}/></button>
             </div>
           )}
           <form onSubmit={handleSendMessage} className="p-4">
              <div className="bg-[#1a1a1a] rounded-2xl flex items-center px-4 py-2 border border-[#272729] focus-within:border-blue-500/50 transition-colors shadow-inner">
                <input type="text" value={inputValue} onChange={handleInput} placeholder="Message squad..." className="flex-1 bg-transparent text-white text-[15px] py-2 focus:outline-none placeholder:text-gray-600" autoFocus />
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 transition-colors mr-2 ${showEmojiPicker ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}><Smile size={22} /></button>
                <button type="submit" disabled={!inputValue.trim()} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"><Send size={18} className="ml-0.5" /></button>
              </div>
           </form>
        </div>
      </div>

      {/* --- RIGHT SIDEBAR: GROUP INFO PANEL --- */}
      <div 
        className={`absolute top-0 right-0 bottom-0 w-full sm:w-[350px] border-l border-[#272729] bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col z-50 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${showInfoPanel && selectedRoomId ? 'translate-x-0' : 'translate-x-full'}`}
      >
         <div className="h-16 border-b border-[#272729] flex items-center justify-between px-4 bg-[#1a1a1a] shrink-0">
            <div className="flex items-center">
                <button onClick={() => setShowInfoPanel(false)} className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white shrink-0 transition-transform active:scale-95">
                   <X size={20} />
                </button>
                <h2 className="font-bold text-white">Squad Info</h2>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto scrollbar-hide">
            {isLoadingDetails ? (
               <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
            ) : (
               <>
                 <div className="p-6 flex flex-col items-center text-center border-b border-[#272729]">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold mb-4 shadow-xl border-4 border-[#1a1a1a] bg-blue-900/30 text-blue-500 overflow-hidden">
                       {activeRoomDetails?.avatarUrl || activeRoom?.avatar_url ? (
                           <img src={activeRoomDetails?.avatarUrl || activeRoom?.avatar_url} alt="Group DP" className="w-full h-full object-cover" />
                       ) : (
                           <Users size={40} />
                       )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{activeRoomDetails?.name || activeRoom?.name}</h3>
                    <p className="text-sm text-gray-400 mb-2">{activeMembers.length} Participants</p>
                    
                    {/* Add Description if available */}
                    {activeRoomDetails?.description && (
                        <p className="text-xs text-gray-500 mb-3 px-4 italic">"{activeRoomDetails.description}"</p>
                    )}

                    {activeRoomDetails?.visibility === 'private' && <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] font-bold rounded uppercase tracking-wider">Private Squad</span>}
                 </div>

                 <div className="flex flex-col pb-6">
                    {/* Admin Actions: Edit, Share, Add Members */}
                    {amIAdmin && (
                      <div className="p-4 border-b border-[#272729] space-y-3">
                        <div className="flex gap-2">
                            <button onClick={openEditModal} className="flex-1 bg-[#1a1a1a] border border-[#272729] hover:bg-[#272729] text-gray-300 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm">
                               <Edit2 size={16} /> Edit Squad
                            </button>
                            <button onClick={openAddMembersModal} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-900/20">
                               <Plus size={16} strokeWidth={3} /> Add Members
                            </button>
                        </div>
                        
                        <div className="bg-[#1a1a1a] rounded-xl border border-[#272729] p-3 flex items-center justify-between group cursor-pointer hover:border-gray-600 transition-colors" onClick={() => onPanelAction('generate_invite')}>
                           <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center shrink-0"><Link size={14}/></div>
                              <div className="truncate">
                                 <p className="text-sm font-bold text-blue-400 truncate">{activeRoomDetails?.inviteCode ? `inv_${activeRoomDetails.inviteCode}` : 'Generate Invite Link'}</p>
                                 <p className="text-[10px] text-gray-500 truncate">Share to let others join</p>
                              </div>
                           </div>
                           <Copy size={16} className="text-gray-600 group-hover:text-white" />
                        </div>
                      </div>
                    )}

                    {/* Member List */}
                    <div className="p-4 border-b border-[#272729]">
                       <p className="text-xs font-bold text-gray-500 uppercase mb-3">Members ({activeMembers.length})</p>
                       <div className="space-y-2">
                          {activeMembers.map((m: any) => {
                             const isMemberAdmin = m.role?.toLowerCase() === 'admin' || creatorId === m.id;
                             const isMemberCreator = creatorId === m.id;
                             
                             return (
                               <div key={m.id} className="flex items-center justify-between group py-1">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-white shrink-0 relative">
                                        {m.name?.charAt(0) || 'U'}
                                        {(m.isOnline || (presence[m.id] && presence[m.id].online)) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0a0a0a] rounded-full"></div>}
                                     </div>
                                     <div>
                                        <p className="text-sm font-medium text-gray-200 leading-tight">{m.id === user?.id ? 'You' : m.name}</p>
                                        <p className="text-[10px] text-gray-500">@{m.username}</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     {isMemberCreator && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/30">Creator</span>}
                                     {!isMemberCreator && isMemberAdmin && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">Admin</span>}
                                     
                                     {amIAdmin && m.id !== user?.id && !isMemberCreator && (
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity bg-[#1a1a1a] rounded px-1">
                                           {!isMemberAdmin && <button onClick={() => onPanelAction('promote_admin', m.id)} className="p-1 text-green-500 hover:bg-white/10 rounded" title="Make Admin"><Shield size={14}/></button>}
                                           <button onClick={() => onPanelAction('remove_member', m.id)} className="p-1 text-red-500 hover:bg-white/10 rounded" title="Kick"><UserMinus size={14}/></button>
                                        </div>
                                     )}
                                  </div>
                               </div>
                             )
                          })}
                       </div>
                    </div>

                    <div className="p-4 space-y-2">
                       {/* LOGIC FIX: Admin can only leave if there's at least one other admin to take over */}
                       {canLeaveGroup && (
                         <button onClick={() => onPanelAction('leave_group')} className="w-full flex items-center gap-3 p-3 text-orange-500 hover:bg-orange-500/10 rounded-xl transition-colors font-medium text-sm">
                            <LogOut size={18}/> Leave Squad
                         </button>
                       )}
                       {amICreator && (
                         <button onClick={() => onPanelAction('delete_group')} className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-medium text-sm">
                            <Trash2 size={18}/> Delete Squad
                         </button>
                       )}
                    </div>
                 </div>
               </>
            )}
         </div>
      </div>

      {/* --- ADD MEMBERS MODAL --- */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Friends to Squad"
         footer={
            <>
               <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
               <button onClick={submitAddMembers} disabled={selectedFriends.length === 0 || isAdding} className="px-5 py-2 bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl hover:bg-blue-500 flex items-center gap-2">
                  {isAdding && <Loader2 size={14} className="animate-spin" />} Add {selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}
               </button>
            </>
         }
      >
         <div className="max-h-64 overflow-y-auto scrollbar-hide pr-2">
            {isLoadingFriends ? (
                <div className="flex justify-center p-6"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : friends.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">All your friends are already in this squad, or you have no friends to add.</p>
            ) : (
                <div className="space-y-2">
                   {friends.map(friend => (
                      <div key={friend.id} onClick={() => toggleFriendSelection(friend.id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${selectedFriends.includes(friend.id) ? 'bg-blue-600/10 border-blue-500/50' : 'bg-[#1a1a1a] border-[#272729] hover:border-gray-600'}`}>
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                               <img src={friend.avatar_url || `https://ui-avatars.com/api/?name=${friend.name}&background=random`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                               <p className="text-sm font-bold text-white leading-tight">{friend.name}</p>
                               <p className="text-[10px] text-gray-500">@{friend.username}</p>
                            </div>
                         </div>
                         <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedFriends.includes(friend.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-500'}`}>
                            {selectedFriends.includes(friend.id) && <Check size={12} strokeWidth={3} />}
                         </div>
                      </div>
                   ))}
                </div>
            )}
         </div>
      </Modal>

      {/* --- EDIT SQUAD MODAL --- */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Squad Info">
        <form onSubmit={submitEditGroup} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Group Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#272729] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Group Image URL</label>
                <input type="url" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#272729] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="https://example.com/image.png" />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Visibility</label>
                <select value={editVisibility} onChange={e => setEditVisibility(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#272729] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 appearance-none">
                   <option value="public">Public - anyone can search and join</option>
                   <option value="private">Private - invite code only</option>
                </select>
            </div>
            <button type="submit" disabled={!editName.trim() || isEditing} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4">
                {isEditing ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
            </button>
        </form>
      </Modal>

    </div>
  );
};