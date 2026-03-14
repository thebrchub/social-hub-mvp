import { useState, useEffect } from 'react';
import { Search, ArrowLeft, Loader2, Reply, Users, Info, Copy, LogOut, Trash2, Shield, UserMinus, Link, Plus, Send, Smile, Clock, Check, CheckCheck, X, Edit2 } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { api } from '../../services/api';
import Modal from '../Modal';

export const ChatGroupWindow = ({ 
  activeRoom, selectedRoomId, setSelectedRoomId, messages, user, presence, typingData,
  isMessagesLoading, isLoadingOlder, hasMoreMessages, fetchMessages, messagesEndRef,
  isSearchingMessages, setIsSearchingMessages, messageSearchQuery, setMessageSearchQuery, scrollToBottom, renderTextWithHighlights,
  handleSendMessage, inputValue, handleInput, replyingTo, setReplyingTo, showEmojiPicker, setShowEmojiPicker, onEmojiClick,
  formatTime, showInfoPanel, setShowInfoPanel, activeRoomDetails, isLoadingDetails, showToast, refreshChats, onPanelAction 
}: any) => {

  const { theme } = useThemeStore();
  const { sendMessage } = useWebSocket();

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

  const adminCount = activeMembers.filter((m: any) => m.role?.toLowerCase() === 'admin' || creatorId === m.id).length;
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

  // --- PHASE 4: Share Invite Modal States ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFriends, setShareFriends] = useState<any[]>([]);
  const [selectedShareFriends, setSelectedShareFriends] = useState<string[]>([]);
  const [existingShareIds, setExistingShareIds] = useState<string[]>([]); // ADD THIS LINE
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
     setShowAddModal(false);
     setShowEditModal(false);
     setShowShareModal(false);
  }, [selectedRoomId]);

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

  const openShareModal = async () => {
      setShowShareModal(true);
      setIsLoadingFriends(true);
      setSelectedShareFriends([]);
      try {
          const res = await api.get('/friends');
          const allFriends = Array.isArray(res) ? res : res.data || [];
          const existingMemberIds = activeMembers.map((m: any) => m.id);
          
          setExistingShareIds(existingMemberIds); // Save who is already in
          setShareFriends(allFriends); // Show ALL friends
      } catch (e) {
          showToast("Failed to load friends", "error");
      } finally {
          setIsLoadingFriends(false);
      }
  };

  const toggleFriendSelection = (id: string, isShareModal: boolean = false) => {
      if (isShareModal) {
          if (existingShareIds.includes(id)) return; // Prevent clicking grayed-out friends
          setSelectedShareFriends(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
      } else {
          setSelectedFriends(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
      }
  };

  const selectAllShareFriends = () => {
      const validFriends = shareFriends.filter(f => !existingShareIds.includes(f.id));
      if (selectedShareFriends.length === validFriends.length) {
          setSelectedShareFriends([]); // Deselect all
      } else {
          setSelectedShareFriends(validFriends.map(f => f.id)); // Select all valid friends
      }
  };

  const submitAddMembers = async () => {
      if (selectedFriends.length === 0) return;
      setIsAdding(true);
      try {
          const res = await api.post(`/groups/${selectedRoomId}/members`, { memberIds: selectedFriends });
          const data = res.data || res;
          
          const addedCount = data.added?.length || 0;
          const invitedCount = data.invited?.length || 0;

          let toastMsg = "";
          if (addedCount > 0 && invitedCount > 0) {
              toastMsg = `Added ${addedCount} friends. Sent invites to ${invitedCount} private users!`;
          } else if (invitedCount > 0) {
              toastMsg = `Sent squad invites to ${invitedCount} private users.`;
          } else {
              toastMsg = `Successfully added ${addedCount} members!`;
          }

          showToast(toastMsg, "success");
          setShowAddModal(false);
          refreshChats(); 
      } catch (e: any) {
          showToast(e.message || "Failed to add members", "error");
      } finally {
          setIsAdding(false);
      }
  };

  // --- NEW: Submit In-App Share ---
  // --- PHASE 4 FIX: Robust In-App Share ---
  // --- PHASE 4 FIX v2: Robust In-App Share (Handles Private Accounts) ---
  const submitShareInvite = async () => {
      if (selectedShareFriends.length === 0) return;
      setIsSharing(true);
      try {
          const inviteCode = activeRoomDetails?.inviteCode || activeRoom?.inviteCode;
          const link = `https://zquab.com/j/${inviteCode}`;
          const text = `Hey! Join my squad "${activeRoomDetails?.name || activeRoom?.name}":\n\n${link}`;
          
          let successCount = 0;
          let privateCount = 0;

          // Process one friend at a time to prevent WebSocket flooding
          for (const friendId of selectedShareFriends) {
              const friend = shareFriends.find(f => f.id === friendId);
              if (friend) {
                  try {
                      // 1. Ensure a DM room exists with this friend
                      const res = await api.post('/rooms', { username: friend.username });
                      const data = res.data || res;
                      
                      // 2. Handle Private Accounts (DM Request sent instead of active room)
                      if (data.pending) {
                         privateCount++;
                         continue; // Skip sending the WS message since there is no active room yet
                      }

                      const roomId = data.room_id || data.id;
                      
                      // 3. Send the message via WebSocket
                      if (roomId && sendMessage) {
                          const tempId = `tmp_share_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                          sendMessage(roomId, text, tempId);
                          successCount++;
                          
                          // 4. Crucial: Wait 300ms before sending the next one so the backend doesn't drop frames!
                          await new Promise(r => setTimeout(r, 300)); 
                      }
                  } catch (err) {
                      console.error(`Failed to share with ${friend.name}`, err);
                  }
              }
          }
          
          // Show accurate success toast based on what happened
          if (successCount > 0 && privateCount > 0) {
             showToast(`Sent to ${successCount} friends. ${privateCount} are private.`, "success");
          } else if (successCount > 0) {
             showToast(`Invite link sent to ${successCount} friends!`, "success");
          } else if (privateCount > 0) {
             showToast(`Sent DM requests to ${privateCount} private friends.`, "info");
          } else {
             showToast("Failed to send invites.", "error");
          }
          
          setShowShareModal(false);
          setSelectedShareFriends([]); // Reset selection
          
          // Force the sidebar to pull the latest messages from the DB
          setTimeout(() => refreshChats(), 1000);

      } catch(e) {
          showToast("A network error occurred.", "error");
          setIsSharing(false);
      } 
  };
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
          refreshChats();
      } catch (err: any) {
          showToast(err.message || "Failed to update squad", "error");
      } finally {
          setIsEditing(false);
      }
  };

  return (
    <div className={`flex-1 flex bg-white dark:bg-[#030303] relative min-w-0 transition-colors duration-300 ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
      
      {/* INVISIBLE OVERLAY */}
      {showInfoPanel && (
         <div className="absolute inset-0 z-40 bg-transparent" onClick={() => setShowInfoPanel(false)} />
      )}

      {/* --- MAIN CHAT COLUMN --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        
        {/* Header */}
        <div className="h-16 border-b border-gray-200 dark:border-[#272729] flex items-center justify-between px-4 md:px-6 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl shrink-0 transition-colors z-30 shadow-sm">
           <div className="flex items-center gap-3 min-w-0 cursor-pointer group" onClick={() => setShowInfoPanel(true)}>
              <button onClick={(e) => { e.stopPropagation(); setSelectedRoomId(null); }} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shrink-0 transition-colors">
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
              
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-500 font-extrabold shrink-0 border border-blue-200 dark:border-[#272729] bg-blue-50 dark:bg-blue-900/30 overflow-hidden shadow-sm group-hover:border-blue-400 transition-colors">
                 {activeRoomDetails?.avatarUrl || activeRoom?.avatar_url ? (
                     <img src={activeRoomDetails?.avatarUrl || activeRoom?.avatar_url} alt="Group DP" className="w-full h-full object-cover" />
                 ) : (
                     <Users size={20} strokeWidth={2.5} />
                 )}
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                 <h3 className="font-extrabold text-gray-900 dark:text-white text-[15px] flex items-center gap-2 truncate leading-tight transition-colors">
                    {activeRoom.name || `Squad_${selectedRoomId.substring(0,4)}`} 
                 </h3>
                 {typingData?.roomId === selectedRoomId && typingNames ? (
                    <p className="text-[11px] text-green-500 dark:text-[#4ade80] italic truncate font-bold animate-pulse">{typingNames} typing...</p>
                 ) : (
                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate hover:text-blue-500 transition-colors">{activeMembers.length} members</p>
                 )}
              </div>
           </div>
           
           <div className="flex items-center gap-1 sm:gap-2 text-gray-400 dark:text-gray-500 shrink-0 z-50">
              <button onClick={() => { setIsSearchingMessages(!isSearchingMessages); setMessageSearchQuery(""); }} className={`p-2 rounded-full transition-colors ${isSearchingMessages ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`} title="Search Chat"><Search size={18} strokeWidth={2.5} /></button>
              <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={`p-2 rounded-full transition-colors hidden sm:block ${showInfoPanel ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`} title="Group Info"><Info size={18} strokeWidth={2.5} /></button>
           </div>
        </div>

        {isSearchingMessages && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-[#272729] flex items-center gap-3 shrink-0 shadow-inner z-20 transition-colors">
             <Search size={16} strokeWidth={3} className="text-gray-400" />
             <input type="text" placeholder="Search in squad..." value={messageSearchQuery} onChange={(e) => setMessageSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none text-sm font-bold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400" autoFocus />
             <button onClick={() => { setIsSearchingMessages(false); setMessageSearchQuery(""); scrollToBottom(); }} className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-transparent">Cancel</button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col scrollbar-hide z-0 bg-white dark:bg-[#030303] transition-colors">
           {hasMoreMessages && !isSearchingMessages && (
             <button onClick={() => fetchMessages(selectedRoomId, true)} disabled={isLoadingOlder} className="mx-auto mb-6 px-4 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-2 transition-colors border border-gray-200 dark:border-transparent shadow-sm">
               {isLoadingOlder ? <Loader2 size={14} className="animate-spin" strokeWidth={3} /> : <Clock size={14} strokeWidth={3} />} Load older
             </button>
           )}

           {isMessagesLoading ? (
              <div className="m-auto flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin" strokeWidth={3} /></div>
           ) : (
              <>
                 <div className="mt-auto"></div>
                 <div className="flex flex-col gap-2">
                   {messages.map((msg: any, idx: number) => {
                      const isMe = msg.sender_id === user?.id || msg.from === user?.id;
                      const isSystemMsg = msg.type === 'system' || msg.sender_id === 'system' || msg.from === 'system';
                      const msgText = msg.text || msg.content || "";
                      const msgId = msg.id || msg.message_id || msg._tempId || `temp-${idx}`;

                      if (isSystemMsg) {
                        return (
                          <div id={`msg-${msgId}`} key={msgId} className="flex justify-center my-3">
                             <span className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm text-center">
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
                        <div id={`msg-${msgId}`} key={msgId} onDoubleClick={() => setReplyingTo(msg)} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group cursor-pointer scroll-mt-24`}>
                           <div className={`max-w-[85%] md:max-w-[70%] px-3.5 py-2 md:px-4 md:py-2.5 rounded-2xl text-[14px] md:text-[15px] font-medium leading-snug shadow-sm flex flex-col transition-colors ${
                             isMe 
                             ? 'bg-blue-600 text-white rounded-br-none shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]' 
                             : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-[#272729] rounded-bl-none'
                           }`}>
                              {!isMe && <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">{senderName}</span>}
                              {isReply && (
                                <div className={`border-l-2 pl-2 mb-2 text-xs opacity-90 ${isMe ? 'border-white/50 bg-black/10 text-white' : 'border-blue-500 bg-white dark:bg-black/20 text-gray-700 dark:text-gray-300 shadow-inner'} p-2 rounded-lg`}>
                                  {renderTextWithHighlights(quoteText)}
                                </div>
                              )}
                              <span className="break-words whitespace-pre-wrap">{renderTextWithHighlights(actualText)}</span>
                              <div className={`flex items-center gap-1 text-[9px] md:text-[10px] mt-1 font-bold uppercase tracking-wider ${isMe ? 'text-blue-100 justify-end' : 'text-gray-400 dark:text-gray-500 justify-start'}`}>
                                 <span>{formatTime(msg.created_at)}</span>
                                 {isMe && (
                                   <span className="ml-1 flex items-center">
                                     {msg.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin text-white/70" strokeWidth={3} />}
                                     {(msg.status === 'sent' || !msg.status) && <Check className="w-3.5 h-3.5 text-white/80" strokeWidth={3} />}
                                     {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-white/90" strokeWidth={3} />}
                                     {msg.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-green-400 drop-shadow-sm" strokeWidth={3} />}
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
        <div className="border-t border-gray-200 dark:border-[#272729] bg-white dark:bg-[#0a0a0a] shrink-0 flex flex-col z-20 relative p-3 md:p-4 transition-colors">
           {showEmojiPicker && (
             <div className="absolute bottom-full right-4 mb-2 z-[100] shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-[#343536] animate-in slide-in-from-bottom-2">
               <EmojiPicker theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} onEmojiClick={onEmojiClick} width={320} height={350} lazyLoadEmojis={true} />
             </div>
           )}
           {replyingTo && (
             <div className="flex items-center justify-between px-4 py-2 mb-3 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#272729] rounded-xl shadow-sm">
                 <div className="flex items-center gap-2 overflow-hidden border-l-2 border-blue-500 pl-2">
                    <Reply size={16} strokeWidth={2.5} className="text-gray-400 shrink-0" />
                    <div className="truncate">
                       <p className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest mb-0.5">{replyingTo.sender_id === user?.id ? 'Replying to yourself' : 'Replying to member'}</p>
                       <p className="text-gray-600 dark:text-gray-400 text-xs font-medium truncate max-w-[200px] md:max-w-md">{replyingTo.text || replyingTo.content}</p>
                    </div>
                 </div>
                 <button onClick={() => setReplyingTo(null)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full bg-white dark:bg-white/5 shadow-sm border border-gray-200 dark:border-transparent transition-colors"><X size={14} strokeWidth={2.5} /></button>
             </div>
           )}
           <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-gray-50 dark:bg-[#1a1a1a] p-1.5 md:p-2 rounded-full border border-gray-200 dark:border-[#272729] focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-all shadow-inner focus-within:shadow-md">
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 transition-colors shrink-0 rounded-full ${showEmojiPicker ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-500'}`}><Smile size={22} strokeWidth={2.5} /></button>
              <input type="text" value={inputValue} onChange={handleInput} placeholder="Message squad..." className="flex-1 bg-transparent text-gray-900 dark:text-white text-sm md:text-[15px] font-medium py-1.5 md:py-2 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500" autoFocus />
              <button type="submit" disabled={!inputValue.trim()} className="p-2 md:px-5 md:py-2 bg-blue-600 border border-blue-600 dark:border-blue-500 text-white rounded-full font-extrabold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] disabled:shadow-none hover:-translate-y-0.5 disabled:hover:translate-y-0 shrink-0">
                <Send size={18} strokeWidth={2.5} className="ml-0.5" />
                <span className="hidden md:inline">Send</span>
              </button>
           </form>
        </div>
      </div>

      {/* --- RIGHT SIDEBAR: GROUP INFO PANEL --- */}
      <div 
        className={`absolute top-0 right-0 bottom-0 w-full sm:w-[320px] border-l border-gray-200 dark:border-[#272729] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col z-50 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${showInfoPanel && selectedRoomId ? 'translate-x-0' : 'translate-x-full'}`}
      >
         <div className="h-16 border-b border-gray-200 dark:border-[#272729] flex items-center justify-between px-4 bg-gray-50/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md shrink-0 transition-colors">
            <div className="flex items-center">
                <button onClick={() => setShowInfoPanel(false)} className="p-2 -ml-1 mr-3 bg-white dark:bg-[#272729] border border-gray-200 dark:border-transparent rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shrink-0 transition-all shadow-sm active:scale-95">
                   <X size={18} strokeWidth={2.5} />
                </button>
                <h2 className="font-extrabold text-gray-900 dark:text-white text-base">Squad Info</h2>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto scrollbar-hide">
            {isLoadingDetails ? (
               <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" strokeWidth={3} /></div>
            ) : (
               <>
                 <div className="p-6 flex flex-col items-center text-center border-b border-gray-200 dark:border-[#272729] bg-white dark:bg-transparent transition-colors">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-extrabold mb-4 shadow-lg border-4 border-blue-100 dark:border-[#1a1a1a] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 overflow-hidden transition-colors">
                       {activeRoomDetails?.avatarUrl || activeRoom?.avatar_url ? (
                           <img src={activeRoomDetails?.avatarUrl || activeRoom?.avatar_url} alt="Group DP" className="w-full h-full object-cover" />
                       ) : (
                           <Users size={36} strokeWidth={2.5} />
                       )}
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1 transition-colors">{activeRoomDetails?.name || activeRoom?.name}</h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 transition-colors">{activeMembers.length} Participants</p>
                    
                    {activeRoomDetails?.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-500 mb-4 font-medium italic bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-transparent shadow-inner">"{activeRoomDetails.description}"</p>
                    )}

                    {activeRoomDetails?.visibility === 'private' && <span className="px-3 py-1 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-300 text-[10px] font-extrabold rounded-lg uppercase tracking-widest shadow-sm">Private Squad</span>}
                 </div>

                 <div className="flex flex-col pb-6">
                    
                    {/* Admin Actions: Edit & Add Members */}
                    {amIAdmin && (
                      <div className="px-4 pt-4 pb-2 space-y-3 transition-colors">
                        <div className="flex gap-2">
                            <button onClick={openEditModal} className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#272729] hover:bg-gray-100 dark:hover:bg-[#272729] text-gray-700 dark:text-gray-300 font-extrabold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md">
                               <Edit2 size={16} strokeWidth={2.5} /> Edit
                            </button>
                            <button onClick={openAddMembersModal} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_2px_8px_rgba(37,99,235,0.4)] hover:-translate-y-0.5">
                               <Plus size={16} strokeWidth={3} /> Add Members
                            </button>
                        </div>
                      </div>
                    )}

                    {/* Invite Link Block (Visible to admins, OR to members if a code already exists) */}
                    {(amIAdmin || activeRoomDetails?.inviteCode) && (
                      <div className={`px-4 ${amIAdmin ? 'pb-4' : 'py-4'} border-b border-gray-200 dark:border-[#272729] transition-colors`}>
                        <div className="bg-gray-50 dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#272729] p-3 flex flex-col gap-3 group shadow-sm hover:border-blue-400 dark:hover:border-gray-600 transition-colors">
                           <div 
                              className={`flex items-center gap-3 overflow-hidden ${!activeRoomDetails?.inviteCode && amIAdmin ? 'cursor-pointer' : ''}`} 
                              onClick={() => { if(!activeRoomDetails?.inviteCode && amIAdmin) onPanelAction('generate_invite') }}
                           >
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-500 flex items-center justify-center shrink-0 border border-blue-200 dark:border-transparent">
                                <Link size={16} strokeWidth={2.5} />
                              </div>
                              <div className="truncate">
                                 <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 truncate">
                                   {activeRoomDetails?.inviteCode ? `zquab.com/j/${activeRoomDetails.inviteCode}` : 'Generate Invite Link'}
                                 </p>
                                 <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 truncate mt-0.5">
                                   {activeRoomDetails?.inviteCode ? 'Invite others to join' : 'Create link to let others join'}
                                 </p>
                              </div>
                           </div>
                           
                           {/* Only show actions if a code actually exists */}
                           {activeRoomDetails?.inviteCode && (
                             <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-[#272729]">
                                <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(`https://zquab.com/j/${activeRoomDetails.inviteCode}`);
                                      showToast("Invite link copied to clipboard!", "success");
                                  }}
                                  className="flex-1 py-2 bg-white dark:bg-[#272729] hover:bg-gray-100 dark:hover:bg-[#343536] text-gray-700 dark:text-gray-300 text-[11px] font-extrabold rounded-lg border border-gray-200 dark:border-transparent flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <Copy size={14} strokeWidth={2.5} /> Copy Link
                                </button>
                                
                                <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      openShareModal(); 
                                  }}
                                  className="flex-1 py-2 bg-blue-50 dark:bg-blue-600/10 hover:bg-blue-100 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[11px] font-extrabold rounded-lg border border-blue-100 dark:border-transparent flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <Send size={14} strokeWidth={2.5} /> Share in App
                                </button>
                             </div>
                           )}
                        </div>
                      </div>
                    )}

                    {/* Member List */}
                    <div className="p-4 border-b border-gray-200 dark:border-[#272729] transition-colors">
                       <p className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Members ({activeMembers.length})</p>
                       <div className="space-y-2">
                          {activeMembers.map((m: any) => {
                             const isMemberAdmin = m.role?.toLowerCase() === 'admin' || creatorId === m.id;
                             const isMemberCreator = creatorId === m.id;
                             
                             return (
                               <div key={m.id} className="flex items-center justify-between group py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-[1rem] bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-sm font-extrabold text-gray-500 dark:text-white shrink-0 relative border border-gray-300 dark:border-transparent overflow-hidden">
                                        {m.avatar_url || m.avatarUrl ? (
                                            <img src={m.avatar_url || m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                                        ) : (
                                            m.name?.charAt(0) || 'U'
                                        )}
                                        {(m.isOnline || (presence[m.id] && presence[m.id].online)) && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#0a0a0a] rounded-full shadow-sm"></div>}
                                     </div>
                                     <div>
                                        <p className="text-sm font-extrabold text-gray-900 dark:text-gray-200 leading-tight">{m.id === user?.id ? 'You' : m.name}</p>
                                        <p className="text-[10px] font-bold text-gray-500 mt-0.5">@{m.username}</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     {isMemberCreator && <span className="text-[9px] font-extrabold uppercase tracking-widest bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 px-2 py-1 rounded-md border border-yellow-200 dark:border-yellow-500/30">Creator</span>}
                                     {!isMemberCreator && isMemberAdmin && <span className="text-[9px] font-extrabold uppercase tracking-widest bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 px-2 py-1 rounded-md border border-purple-200 dark:border-purple-500/30">Admin</span>}
                                     
                                     {amIAdmin && m.id !== user?.id && !isMemberCreator && (
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity bg-white dark:bg-[#1a1a1a] rounded-lg px-1.5 py-1 border border-gray-200 dark:border-[#272729] shadow-sm">
                                           {!isMemberAdmin && <button onClick={() => onPanelAction('promote_admin', m.id)} className="p-1.5 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-white/10 rounded-md transition-colors" title="Make Admin"><Shield size={16} strokeWidth={2.5}/></button>}
                                           <button onClick={() => onPanelAction('remove_member', m.id)} className="p-1.5 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-white/10 rounded-md transition-colors" title="Kick"><UserMinus size={16} strokeWidth={2.5}/></button>
                                        </div>
                                     )}
                                  </div>
                               </div>
                             )
                          })}
                       </div>
                    </div>

                    <div className="p-4 space-y-3">
                       <h4 className="text-[10px] font-extrabold text-red-400 dark:text-red-500/50 uppercase tracking-widest px-2 mb-2">Danger Zone</h4>
                       {canLeaveGroup && (
                         <button onClick={() => onPanelAction('leave_group')} className="w-full flex items-center gap-3 p-3.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 border border-orange-100 dark:border-transparent text-orange-600 dark:text-orange-500 rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow-md">
                            <LogOut size={18} strokeWidth={2.5}/> Leave Squad
                         </button>
                       )}
                       {amICreator && (
                         <button onClick={() => onPanelAction('delete_group')} className="w-full flex items-center gap-3 p-3.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-100 dark:border-transparent text-red-600 dark:text-red-500 rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow-md">
                            <Trash2 size={18} strokeWidth={2.5}/> Delete Squad
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
               <button onClick={() => setShowAddModal(false)} className="px-5 py-3 text-sm font-extrabold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
               <button onClick={submitAddMembers} disabled={selectedFriends.length === 0 || isAdding} className="px-6 py-3 bg-blue-600 disabled:opacity-50 text-white text-sm font-extrabold rounded-2xl hover:bg-blue-500 flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all hover:-translate-y-0.5">
                  {isAdding && <Loader2 size={16} className="animate-spin" strokeWidth={3} />} Add {selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}
               </button>
            </>
         }
      >
         <div className="max-h-72 overflow-y-auto scrollbar-hide pr-1 py-2">
            {isLoadingFriends ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" strokeWidth={3} /></div>
            ) : friends.length === 0 ? (
                <div className="text-center p-6 bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#272729]">
                   <p className="text-gray-500 font-bold text-sm">All friends are in this squad.</p>
                   <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Or you have no friends to add</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                   {friends.map(friend => (
                      <div key={friend.id} onClick={() => toggleFriendSelection(friend.id)} className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border-2 shadow-sm ${selectedFriends.includes(friend.id) ? 'bg-blue-50 dark:bg-white/10 border-blue-500 dark:border-white/20' : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#272729] hover:border-gray-300 dark:hover:border-gray-600'}`}>
                         <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-[1rem] bg-gray-200 dark:bg-gray-800 overflow-hidden border border-gray-300 dark:border-transparent shrink-0 flex items-center justify-center font-extrabold text-gray-500 dark:text-gray-300">
                               {friend.avatar_url ? (
                                  <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                               ) : (
                                  friend.name?.charAt(0) || 'F'
                               )}
                            </div>
                            <div>
                               <p className="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">{friend.name}</p>
                               <p className="text-[10px] font-bold text-gray-500 mt-0.5">@{friend.username}</p>
                            </div>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedFriends.includes(friend.id) ? 'bg-blue-600 border-blue-600 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' : 'border-gray-300 dark:border-gray-600'}`}>
                            {selectedFriends.includes(friend.id) && <Check size={14} strokeWidth={3} />}
                         </div>
                      </div>
                   ))}
                </div>
            )}
         </div>
      </Modal>

      {/* --- IN-APP SHARE MODAL --- */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} title="Share Invite Link"
         footer={
            <>
               <button onClick={() => setShowShareModal(false)} className="px-5 py-3 text-sm font-extrabold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
               <button onClick={submitShareInvite} disabled={selectedShareFriends.length === 0 || isSharing} className="px-6 py-3 bg-blue-600 disabled:opacity-50 text-white text-sm font-extrabold rounded-2xl hover:bg-blue-500 flex items-center gap-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all hover:-translate-y-0.5">
                  {isSharing ? <Loader2 size={16} className="animate-spin" strokeWidth={3} /> : <Send size={16} strokeWidth={2.5} />} Send to {selectedShareFriends.length > 0 ? `(${selectedShareFriends.length})` : ''}
               </button>
            </>
         }
      >
         <div className="max-h-72 overflow-y-auto scrollbar-hide pr-1 py-2">
            {isLoadingFriends ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500" strokeWidth={3} /></div>
            ) : shareFriends.length === 0 ? (
                <div className="text-center p-6 bg-gray-50 dark:bg-[#0a0a0a] rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#272729]">
                   <p className="text-gray-500 font-bold text-sm">No friends available to share.</p>
                </div>
            ) : (
                <>
                   <div className="flex justify-between items-center mb-4 px-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Friends</p>
                      <button onClick={selectAllShareFriends} className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                        {selectedShareFriends.length === shareFriends.length && shareFriends.length > 0 ? 'Deselect All' : 'Select All'}
                      </button>
                   </div>
                   <div className="space-y-2.5">
                      {shareFriends.map(friend => {
                         const isAlreadyIn = existingShareIds.includes(friend.id);
                         const isSelected = selectedShareFriends.includes(friend.id);
                         
                         return (
                           <div key={friend.id} onClick={() => toggleFriendSelection(friend.id, true)} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border-2 shadow-sm ${isAlreadyIn ? 'opacity-50 bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#272729] cursor-not-allowed' : isSelected ? 'bg-blue-50 dark:bg-white/10 border-blue-500 dark:border-white/20 cursor-pointer' : 'bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#272729] hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'}`}>
                              <div className="flex items-center gap-3.5">
                                 <div className="w-10 h-10 rounded-[1rem] bg-gray-200 dark:bg-gray-800 overflow-hidden border border-gray-300 dark:border-transparent shrink-0 flex items-center justify-center font-extrabold text-gray-500 dark:text-gray-300">
                                    {friend.avatar_url ? (
                                       <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                       friend.name?.charAt(0) || 'F'
                                    )}
                                 </div>
                                 <div>
                                    <p className="text-sm font-extrabold text-gray-900 dark:text-white leading-tight">{friend.name}</p>
                                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">@{friend.username}</p>
                                 </div>
                              </div>
                              
                              {/* Show "In Squad" if already joined, otherwise show Checkbox */}
                              {isAlreadyIn ? (
                                 <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest px-2">In Squad</span>
                              ) : (
                                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]' : 'border-gray-300 dark:border-gray-600'}`}>
                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                 </div>
                              )}
                           </div>
                         )
                      })}
                   </div>
                </>
            )}
         </div>
      </Modal>

      {/* --- EDIT SQUAD MODAL --- */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Squad Info">
        <form onSubmit={submitEditGroup} className="space-y-5 py-2">
            <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Group Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner transition-all" required />
            </div>
            <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Group Image URL</label>
                <input type="url" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner transition-all" placeholder="https://example.com/image.png" />
            </div>
            <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Visibility</label>
                <div className="relative">
                   <select value={editVisibility} onChange={e => setEditVisibility(e.target.value)} className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none shadow-inner transition-all cursor-pointer">
                      <option value="public">Public - anyone can search and join</option>
                      <option value="private">Private - invite code only</option>
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                </div>
            </div>
            <button type="submit" disabled={!editName.trim() || isEditing} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 mt-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] hover:-translate-y-0.5">
                {isEditing ? <Loader2 size={18} className="animate-spin" strokeWidth={3} /> : "Save Changes"}
            </button>
        </form>
      </Modal>

    </div>
  );
};