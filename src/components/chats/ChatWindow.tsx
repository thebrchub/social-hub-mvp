import { Search, Send, ArrowLeft, Smile, Check, CheckCheck, X, Loader2, MessageSquare, Reply, Clock,  Phone, Video, Info, UserMinus, Ban, Flag, BellOff, MicOff, Mic, VideoOff } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export const ChatWindow = ({ 
  activeRoom, selectedRoomId, setSelectedRoomId, messages, user, presence, typingData,
  isMessagesLoading, isLoadingOlder, hasMoreMessages, fetchMessages, messagesEndRef,
  isSearchingMessages, setIsSearchingMessages, messageSearchQuery, setMessageSearchQuery, scrollToBottom, renderTextWithHighlights,
  handleSendMessage, inputValue, handleInput, replyingTo, setReplyingTo, showEmojiPicker, setShowEmojiPicker, onEmojiClick,
  formatTime, formatLastSeen,
  showInfoPanel, setShowInfoPanel, onStartCall, onPanelAction,
  // Call Props
  activeCall, endActiveCall, remoteVideoRef, localVideoRef, callMicOff, setCallMicOff, callCamOff, setCallCamOff, localStreamRef
}: any) => {

  const isCallActiveInThisRoom = activeCall && (activeCall.roomId === selectedRoomId || activeCall.peerId === activeRoom?.partner_id);

  // Wrapper to close the panel when a call starts
  const startCallAndClosePanel = (type: 'audio' | 'video', isGroup: boolean) => {
      setShowInfoPanel(false);
      if (onStartCall) onStartCall(type, isGroup);
  };

  // Safe Avatar Extraction
  const roomAvatar = activeRoom?.avatar_url || activeRoom?.avatarUrl;

  return (
    <div className={`flex-1 flex bg-[#0a0a0a] relative min-w-0 ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
      
      {/* INVISIBLE OVERLAY TO CLOSE PANEL WHEN CLICKING OUTSIDE */}
      {showInfoPanel && (
         <div 
           className="absolute inset-0 z-40 bg-transparent"
           onClick={() => setShowInfoPanel(false)}
         />
      )}

      {selectedRoomId && activeRoom ? (
        <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
          
          {/* Header */}
          <div className="h-16 border-b border-[#272729] flex items-center justify-between px-4 md:px-6 bg-[#0f0f0f]/90 backdrop-blur-md shrink-0">
             <div className="flex items-center gap-3 min-w-0 cursor-pointer z-50" onClick={() => setShowInfoPanel(true)}>
                <button onClick={(e) => { e.stopPropagation(); setSelectedRoomId(null); }} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white shrink-0">
                  <ArrowLeft size={20} />
                </button>
                
                {/* FIX: Render the Avatar Image instead of just the initials */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-200 font-bold shrink-0 border border-[#272729] bg-gray-800 overflow-hidden">
                   {roomAvatar ? (
                       <img src={roomAvatar} alt={activeRoom.name} className="w-full h-full object-cover" />
                   ) : (
                       activeRoom.name?.charAt(0).toUpperCase() || 'U'
                   )}
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                   <h3 className="font-bold text-white text-[15px] flex items-center gap-2 truncate leading-tight">
                      {activeRoom.name || `User_${selectedRoomId.substring(0,4)}`} 
                   </h3>
                   
                   {typingData?.roomId === selectedRoomId ? (
                      <p className="text-[11px] text-[#4ade80] italic truncate font-medium animate-pulse">typing...</p>
                   ) : activeRoom?.partner_id && presence[activeRoom.partner_id] ? (
                      <p className={`text-[11px] truncate ${presence[activeRoom.partner_id].online ? 'text-[#4ade80]' : 'text-gray-500'}`}>
                         {presence[activeRoom.partner_id].online ? 'online' : `last seen ${formatLastSeen(presence[activeRoom.partner_id].lastSeen)}`}
                      </p>
                   ) : (
                      <p className="text-[11px] text-gray-400 truncate">@{activeRoom.friend_username}</p>
                   )}
                </div>
             </div>
             
             <div className="flex items-center gap-1 sm:gap-2 text-gray-400 shrink-0 z-50">
                <button onClick={() => onStartCall('audio', false)} disabled={!!activeCall} className="p-2 rounded-full hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50" title="Voice Call"><Phone size={18} /></button>
                <button onClick={() => onStartCall('video', false)} disabled={!!activeCall} className="p-2 rounded-full hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50" title="Video Call"><Video size={20} /></button>
                <div className="w-[1px] h-6 bg-[#272729] mx-1"></div>
                <button onClick={() => { setIsSearchingMessages(!isSearchingMessages); setMessageSearchQuery(""); }} className={`p-2 rounded-full transition-colors ${isSearchingMessages ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 hover:text-white'}`} title="Search Chat"><Search size={18} /></button>
                <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={`p-2 rounded-full transition-colors hidden sm:block ${showInfoPanel ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 hover:text-white'}`} title="Contact Info"><Info size={18} /></button>
             </div>
          </div>

          {isSearchingMessages && (
            <div className="px-4 py-3 bg-[#1a1a1a] border-b border-[#272729] flex items-center gap-3 shrink-0 shadow-lg z-20">
               <Search size={16} className="text-gray-500" />
               <input type="text" placeholder="Search..." value={messageSearchQuery} onChange={(e) => setMessageSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none text-[15px] text-white focus:outline-none" autoFocus />
               <button onClick={() => { setIsSearchingMessages(false); setMessageSearchQuery(""); scrollToBottom(); }} className="text-sm font-bold text-blue-400">Cancel</button>
            </div>
          )}

          {/* --- THE EMBEDDED CALL --- */}
          {isCallActiveInThisRoom ? (
             <div className="w-full h-[40vh] min-h-[300px] bg-[#050505] border-b border-[#272729] relative flex shrink-0 group animate-in slide-in-from-top-4 overflow-hidden z-20">
                {activeCall.isVideo ? (
                   <>
                      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 right-4 w-28 h-40 bg-[#111] rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
                         <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover scale-x-[-1] transition-opacity ${callCamOff ? 'opacity-0' : 'opacity-100'}`} />
                         {callCamOff && <div className="absolute inset-0 flex items-center justify-center"><VideoOff size={24} className="text-gray-600"/></div>}
                      </div>
                   </>
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-blue-900/20 border-4 border-blue-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-pulse mb-4 overflow-hidden">
                         {roomAvatar ? (
                             <img src={roomAvatar} alt="Call Partner" className="w-full h-full object-cover" />
                         ) : (
                             <span className="text-4xl font-bold text-blue-500">{activeCall.peerName?.charAt(0).toUpperCase()}</span>
                         )}
                      </div>
                      <p className="text-sm text-green-400 font-medium">Voice Call Connected</p>
                      <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                      <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                   </div>
                )}

                {/* Call Overlay Controls */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6 gap-4 z-30">
                   <button onClick={() => {
                      setCallMicOff(!callMicOff);
                      if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((t: any) => t.enabled = callMicOff);
                   }} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${callMicOff ? 'bg-white/20 text-white' : 'bg-black/50 hover:bg-black/70 text-gray-200'}`}>
                      {callMicOff ? <MicOff size={20} /> : <Mic size={20} />}
                   </button>
                   
                   {activeCall.isVideo && (
                     <button onClick={() => {
                        setCallCamOff(!callCamOff);
                        if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach((t: any) => t.enabled = callCamOff);
                     }} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${callCamOff ? 'bg-white/20 text-white' : 'bg-black/50 hover:bg-black/70 text-gray-200'}`}>
                        {callCamOff ? <VideoOff size={20} /> : <Video size={20} />}
                     </button>
                   )}

                   <button onClick={endActiveCall} className="w-14 h-14 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-transform active:scale-95">
                      <Phone size={24} className="rotate-[135deg]" />
                   </button>
                </div>
             </div>
          ) : (
            <>
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
                            
                            const isReply = msgText.startsWith('> ');
                            const splitMsg = isReply ? msgText.split('\n\n') : [];
                            const quoteText = isReply ? splitMsg[0].substring(2) : '';
                            const actualText = isReply ? splitMsg.slice(1).join('\n\n') : msgText;

                            return (
                              <div id={`msg-${msgId}`} key={msgId} onDoubleClick={() => setReplyingTo(msg)} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group cursor-pointer scroll-mt-20`}>
                                 <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed shadow-sm flex flex-col ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1a1a1a] text-gray-200 border border-[#272729] rounded-bl-none'}`}>
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
                             <p className="text-xs text-blue-400 font-bold mb-0.5">{replyingTo.sender_id === user?.id ? 'Replying to yourself' : 'Replying to friend'}</p>
                             <p className="text-gray-400 text-xs truncate max-w-[200px] md:max-w-md">{replyingTo.text || replyingTo.content}</p>
                          </div>
                       </div>
                       <button onClick={() => setReplyingTo(null)} className="p-1.5 text-gray-500 hover:text-white rounded-full bg-white/5 transition-colors"><X size={14}/></button>
                   </div>
                 )}
                 <form onSubmit={handleSendMessage} className="p-4">
                    <div className="bg-[#1a1a1a] rounded-2xl flex items-center px-4 py-2 border border-[#272729] focus-within:border-blue-500/50 transition-colors shadow-inner">
                      <input type="text" value={inputValue} onChange={handleInput} placeholder="Message..." className="flex-1 bg-transparent text-white text-[15px] py-2 focus:outline-none placeholder:text-gray-600" autoFocus />
                      <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 transition-colors mr-2 ${showEmojiPicker ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}><Smile size={22} /></button>
                      <button type="submit" disabled={!inputValue.trim()} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"><Send size={18} className="ml-0.5" /></button>
                    </div>
                 </form>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 w-full h-full">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.02)]">
               <MessageSquare size={40} className="text-gray-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-white mb-2">Your Messages</h3>
            <p className="text-sm text-gray-500 max-w-xs">Select a squad or direct message from the sidebar.</p>
        </div>
      )}

      {/* --- RIGHT SIDEBAR: DM INFO PANEL --- */}
      <div 
        className={`absolute top-0 right-0 bottom-0 w-full sm:w-[350px] border-l border-[#272729] bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col z-50 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${showInfoPanel && selectedRoomId ? 'translate-x-0' : 'translate-x-full'}`}
      >
         <div className="h-16 border-b border-[#272729] flex items-center px-4 bg-[#1a1a1a] shrink-0">
            <button onClick={() => setShowInfoPanel(false)} className="p-2 -ml-2 mr-2 text-gray-400 hover:text-white shrink-0 transition-transform active:scale-95">
               <X size={20} />
            </button>
            <h2 className="font-bold text-white">Contact Info</h2>
         </div>

         <div className="flex-1 overflow-y-auto scrollbar-hide">
             <div className="p-6 flex flex-col items-center text-center border-b border-[#272729]">
                {/* FIX: Info Panel Avatar */}
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold mb-4 shadow-xl border-4 border-[#1a1a1a] bg-gray-800 text-gray-200 overflow-hidden">
                   {roomAvatar ? (
                       <img src={roomAvatar} alt={activeRoom?.name} className="w-full h-full object-cover" />
                   ) : (
                       activeRoom?.name?.charAt(0).toUpperCase() || 'U'
                   )}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{activeRoom?.name || `User_${selectedRoomId?.substring(0,4)}`}</h3>
                <p className="text-sm text-gray-400 mb-6">@{activeRoom?.friend_username}</p>
                
                <div className="flex gap-4 w-full justify-center">
                   <button onClick={() => startCallAndClosePanel('audio', false)} disabled={!!activeCall} className="flex flex-col items-center gap-2 group disabled:opacity-50">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-blue-400 transition-colors"><Phone size={20}/></div>
                      <span className="text-xs text-gray-400 font-medium">Audio</span>
                   </button>
                   <button onClick={() => startCallAndClosePanel('video', false)} disabled={!!activeCall} className="flex flex-col items-center gap-2 group disabled:opacity-50">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-blue-400 transition-colors"><Video size={20}/></div>
                      <span className="text-xs text-gray-400 font-medium">Video</span>
                   </button>
                </div>
             </div>

             <div className="p-4 space-y-2">
                <button onClick={() => onPanelAction('mute_notifications')} className="w-full flex items-center gap-3 p-3 text-gray-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors font-medium text-sm">
                   <BellOff size={18}/> Mute Notifications
                </button>
                <div className="h-px bg-[#272729] my-2"></div>
                <button onClick={() => onPanelAction('remove')} className="w-full flex items-center gap-3 p-3 text-orange-500 hover:bg-orange-500/10 rounded-xl transition-colors font-medium text-sm">
                   <UserMinus size={18}/> Remove Friend
                </button>
                <button onClick={() => onPanelAction('block')} className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-medium text-sm">
                   <Ban size={18}/> Block User
                </button>
                <button onClick={() => onPanelAction('report')} className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-medium text-sm font-bold">
                   <Flag size={18}/> Report
                </button>
             </div>
         </div>
      </div>
    </div>
  );
};