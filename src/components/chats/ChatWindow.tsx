import { Search, Send, ArrowLeft, Smile, Check, CheckCheck, X, Loader2, MessageSquare, Reply, Clock, Phone, Video, Info, UserMinus, Ban, Flag, MicOff, Mic, VideoOff, UserPlus } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useThemeStore } from '../../store/useThemeStore';
import { useEffect, useRef, useState } from 'react'; 

export const ChatWindow = ({ 
  activeRoom, selectedRoomId, setSelectedRoomId, messages, user, presence, typingData,
  isRequest, handleRequestAction, isFriend, 
  isMessagesLoading, isLoadingOlder, hasMoreMessages, fetchMessages, messagesEndRef,
  isSearchingMessages, setIsSearchingMessages, messageSearchQuery, setMessageSearchQuery, scrollToBottom, renderTextWithHighlights,
  handleSendMessage, inputValue, handleInput, replyingTo, setReplyingTo, showEmojiPicker, setShowEmojiPicker, onEmojiClick,
  formatTime, formatLastSeen,
  showInfoPanel, setShowInfoPanel, onStartCall, onPanelAction,
  activeCall, endActiveCall, remoteVideoRef, localVideoRef, callMicOff, setCallMicOff, callCamOff, setCallCamOff, localStreamRef
}: any) => {

  const { theme } = useThemeStore();
  const isCallActiveInThisRoom = activeCall && (activeCall.roomId === selectedRoomId || activeCall.peerId === activeRoom?.partner_id);

  const startCallAndClosePanel = (type: 'audio' | 'video', isGroup: boolean) => {
      setShowInfoPanel(false);
      if (onStartCall) onStartCall(type, isGroup);
  };

  const roomAvatar = activeRoom?.avatar_url || activeRoom?.avatarUrl;

  const avatarRingRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);

  const [callDuration, setCallDuration] = useState(0);

  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeCurrentX = useRef<number | null>(null);

  useEffect(() => {
      let interval: any;
      if (activeCall?.isAccepted) {
          interval = setInterval(() => {
              setCallDuration(prev => prev + 1);
          }, 1000);
      } else {
          setCallDuration(0);
      }
      return () => clearInterval(interval);
  }, [activeCall?.isAccepted]);

  const formatCallDuration = (seconds: number) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
  };

  useEffect(() => {
    if (!isCallActiveInThisRoom || !activeCall?.isAccepted || activeCall.isVideo) return;

    const timer = setTimeout(() => {
      const stream = remoteVideoRef.current?.srcObject as MediaStream;
      if (!stream || stream.getAudioTracks().length === 0) return;

      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;

          if (avatarRingRef.current) {
            const scale = 1 + (average / 255) * 0.5; 
            const glowOpacity = Math.min(0.8, average / 100);
            
            avatarRingRef.current.style.transform = `scale(${scale})`;
            avatarRingRef.current.style.boxShadow = `0 0 ${average}px rgba(34, 197, 94, ${glowOpacity})`;
            avatarRingRef.current.style.opacity = `${0.3 + glowOpacity}`;
          }
          requestRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();

        return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          audioContext.close().catch(() => {});
        };
      } catch (e) {
        console.error("Audio Context Error:", e);
      }
    }, 1000); 

    return () => clearTimeout(timer);
  }, [isCallActiveInThisRoom, activeCall?.isAccepted, activeCall?.isVideo]);

  const scrollToRepliedMessage = (targetMsgId: string) => {
      const targetElement = document.getElementById(`msg-${targetMsgId}`);
      if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          targetElement.classList.add('bg-blue-500/20', 'transition-colors', 'duration-500', 'rounded-xl');
          setTimeout(() => {
              targetElement.classList.remove('bg-blue-500/20');
          }, 1500);
      }
  };

  // FIX: Removed unused 'msgId' from start handler
  const handleTouchStart = (e: React.TouchEvent) => {
      swipeStartX.current = e.touches[0].clientX;
  };

  // Keep msgId here since we DO use it to update the DOM
  const handleTouchMove = (e: React.TouchEvent, msgId: string) => {
      if (swipeStartX.current === null) return;
      const currentX = e.touches[0].clientX;
      const diff = currentX - swipeStartX.current;

      if (diff > 0 && diff < 100) { 
          setSwipingMsgId(msgId);
          swipeCurrentX.current = diff;
          const element = document.getElementById(`msg-bubble-${msgId}`);
          if (element) element.style.transform = `translateX(${diff}px)`;
      }
  };

 // FIX: Removed unused 'e' parameter
  const handleTouchEnd = (msg: any, msgId: string) => {
      if (swipeCurrentX.current && swipeCurrentX.current > 50) {
          setReplyingTo(msg);
      }
      
      const element = document.getElementById(`msg-bubble-${msgId}`);
      if (element) {
          element.style.transition = 'transform 0.2s ease-out';
          element.style.transform = 'translateX(0px)';
          setTimeout(() => { element.style.transition = ''; }, 200);
      }
      
      swipeStartX.current = null;
      swipeCurrentX.current = null;
      setSwipingMsgId(null);
  };

  // Helper to extract clean text for the little box right above the input field
  const getCleanReplyPreviewText = () => {
     if (!replyingTo) return "";
     const rawText = replyingTo.text || replyingTo.content || "";
     if (rawText.startsWith('> ')) {
         const parts = rawText.split('\n\n');
         return parts.slice(1).join('\n\n') || "Reply";
     }
     return rawText;
  };


  return (
    <div className={`flex-1 flex bg-white dark:bg-[#030303] relative min-w-0 transition-colors duration-300 ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
      
      {showInfoPanel && (
         <div className="absolute inset-0 z-40 bg-transparent" onClick={() => setShowInfoPanel(false)} />
      )}

      {selectedRoomId && activeRoom ? (
        <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
          
          <div className="h-16 border-b border-gray-200 dark:border-[#272729] flex items-center justify-between px-4 md:px-6 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl shrink-0 transition-colors z-30 shadow-sm">
             <div className="flex items-center gap-3 min-w-0 cursor-pointer group" onClick={() => setShowInfoPanel(true)}>
                <button onClick={(e) => { e.stopPropagation(); setSelectedRoomId(null); }} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shrink-0 transition-colors">
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-200 font-extrabold shrink-0 border border-gray-200 dark:border-[#272729] bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-sm group-hover:border-blue-400 transition-colors">
                   {roomAvatar ? (
                       <img src={roomAvatar} alt={activeRoom.name} className="w-full h-full object-cover" />
                   ) : (
                       activeRoom.name?.charAt(0).toUpperCase() || 'U'
                   )}
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                   <h3 className="font-extrabold text-gray-900 dark:text-white text-[15px] flex items-center gap-2 truncate leading-tight transition-colors">
                      {activeRoom.name || `User_${selectedRoomId.substring(0,4)}`} 
                   </h3>
                   
                   {typingData?.roomId === selectedRoomId ? (
                      <p className="text-[11px] text-green-500 dark:text-[#4ade80] italic truncate font-bold animate-pulse">typing...</p>
                   ) : activeRoom?.partner_id && presence[activeRoom.partner_id] ? (
                      <p className={`text-[11px] font-bold truncate uppercase tracking-wide ${presence[activeRoom.partner_id].online ? 'text-green-500' : 'text-gray-500 dark:text-gray-500'}`}>
                         {presence[activeRoom.partner_id].online ? 'online' : `last seen ${formatLastSeen(presence[activeRoom.partner_id].lastSeen)}`}
                      </p>
                   ) : (
                      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate">@{activeRoom.friend_username}</p>
                   )}
                </div>
             </div>
             
             <div className="flex items-center gap-1 sm:gap-2 text-gray-400 dark:text-gray-500 shrink-0 z-50">
                {!isRequest && (
                    <>
                        <button onClick={() => onStartCall('audio', false)} disabled={!!activeCall} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors disabled:opacity-50" title="Voice Call"><Phone size={18} strokeWidth={2.5} /></button>
                        <button onClick={() => onStartCall('video', false)} disabled={!!activeCall} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white transition-colors disabled:opacity-50" title="Video Call"><Video size={20} strokeWidth={2.5} /></button>
                        <div className="w-[2px] h-5 bg-gray-200 dark:bg-[#272729] mx-1 md:mx-1.5 rounded-full"></div>
                    </>
                )}
                <button onClick={() => { setIsSearchingMessages(!isSearchingMessages); setMessageSearchQuery(""); }} className={`p-2 rounded-full transition-colors ${isSearchingMessages ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`} title="Search Chat"><Search size={18} strokeWidth={2.5} /></button>
                <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={`p-2 rounded-full transition-colors hidden sm:block ${showInfoPanel ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`} title="Contact Info"><Info size={18} strokeWidth={2.5} /></button>
             </div>
          </div>

          {isSearchingMessages && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-[#272729] flex items-center gap-3 shrink-0 shadow-inner z-20 transition-colors">
               <Search size={16} strokeWidth={3} className="text-gray-400" />
               <input type="text" placeholder="Search messages..." value={messageSearchQuery} onChange={(e) => setMessageSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none text-sm font-bold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400" autoFocus />
               <button onClick={() => { setIsSearchingMessages(false); setMessageSearchQuery(""); scrollToBottom(); }} className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-100 dark:border-transparent">Cancel</button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col scrollbar-hide z-0 bg-white dark:bg-[#030303] transition-colors relative overflow-x-hidden">
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
                   <div className="flex flex-col gap-2 pb-2">
                     {messages.map((msg: any, idx: number) => {
                        const isMe = msg.sender_id === user?.id || msg.from === user?.id;
                        const isSystemMsg = msg.type === 'system' || msg.sender_id === 'system' || msg.from === 'system';
                        const rawText = msg.text || msg.content || "";
                        const msgId = msg.id || msg.message_id || msg._tempId || `temp-${idx}`;

                        if (isSystemMsg) {
                          return (
                            <div id={`msg-${msgId}`} key={msgId} className="flex justify-center my-3">
                               <span className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm text-center">
                                  {rawText}
                               </span>
                            </div>
                          );
                        }
                        
                        // FIX: Strict Parsing to hide the `>` and `[id:...]` payload strings completely
                        const isReply = rawText.startsWith('> ');
                        let repliedMsgId = null;
                        let cleanQuoteText = '';
                        let actualText = rawText;

                        if (isReply) {
                            const parts = rawText.split('\n\n');
                            const firstPart = parts[0];
                            actualText = parts.slice(1).join('\n\n') || '';

                            // Extract the ID and the quote text cleanly
                            const idMatch = firstPart.match(/^>\s*\[id:(.+?)\]\s*(.*)$/);
                            if (idMatch) {
                                repliedMsgId = idMatch[1];
                                cleanQuoteText = idMatch[2];
                            } else {
                                cleanQuoteText = firstPart.substring(2);
                            }
                        }

                        return (
                          <div 
                              id={`msg-${msgId}`} 
                              key={msgId} 
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group cursor-pointer relative -mx-4 px-4 py-0.5`}
                              onDoubleClick={() => setReplyingTo(msg)}
                              onTouchStart={(e) => handleTouchStart(e)}
                              onTouchMove={(e) => handleTouchMove(e, msgId)}
                              onTouchEnd={() => handleTouchEnd(msg, msgId)}
                          >
                             
                             <div className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-[#1a1a1a] text-gray-500 transition-opacity duration-200 ${swipingMsgId === msgId && (swipeCurrentX.current || 0) > 40 ? 'opacity-100' : 'opacity-0'} ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
                                 <Reply size={16} className="-scale-x-100"/>
                             </div>

                             <div 
                                 id={`msg-bubble-${msgId}`}
                                 className={`max-w-[85%] md:max-w-[70%] px-3.5 py-2 md:px-4 md:py-2.5 rounded-2xl text-[14px] md:text-[15px] font-medium leading-snug shadow-sm flex flex-col transition-colors relative z-10 ${
                                   isMe 
                                   ? 'bg-blue-600 text-white rounded-br-none shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]' 
                                   : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-[#272729] rounded-bl-none'
                                 }`}
                             >
                                {isReply && (
                                  <div 
                                      onClick={() => scrollToRepliedMessage(repliedMsgId || '')}
                                      className={`border-l-4 mb-2 text-xs opacity-90 cursor-pointer hover:opacity-100 transition-opacity ${isMe ? 'border-blue-300 bg-black/10 text-white' : 'border-blue-500 bg-white dark:bg-black/20 text-gray-700 dark:text-gray-300 shadow-inner'} p-2 rounded-lg`}
                                  >
                                    <p className="font-extrabold text-[10px] mb-0.5 opacity-80 uppercase tracking-wider">{isMe ? 'You replied' : 'Replied'}</p>
                                    <p className="line-clamp-2">{renderTextWithHighlights(cleanQuoteText)}</p>
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

          <div className="border-t border-gray-200 dark:border-[#272729] bg-white dark:bg-[#0a0a0a] shrink-0 flex flex-col z-20 relative p-3 md:p-4 transition-colors">
             {isRequest ? (
                <div className="p-4 flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-[#272729] shadow-inner transition-colors">
                   <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Accept message request from <strong className="text-gray-900 dark:text-white font-extrabold">{activeRoom?.name}</strong>?</p>
                   <div className="flex gap-3 w-full max-w-sm">
                       <button onClick={() => { handleRequestAction(activeRoom.room_id, 'reject'); setSelectedRoomId(null); }} className="flex-1 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-100 dark:border-red-500/20 hover:bg-red-600 hover:text-white rounded-xl font-extrabold transition-all shadow-sm text-sm">Reject</button>
                       <button onClick={() => handleRequestAction(activeRoom.room_id, 'accept')} className="flex-1 py-2.5 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-extrabold transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] text-sm">Accept</button>
                   </div>
                </div>
             ) : (
                <>
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
                               <p className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest mb-0.5">{replyingTo.sender_id === user?.id ? 'Replying to yourself' : 'Replying to friend'}</p>
                               <p className="text-gray-600 dark:text-gray-400 text-xs font-medium truncate max-w-[200px] md:max-w-md">{getCleanReplyPreviewText()}</p>
                            </div>
                         </div>
                         <button type="button" onClick={() => setReplyingTo(null)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full bg-white dark:bg-white/5 shadow-sm border border-gray-200 dark:border-transparent transition-colors"><X size={14} strokeWidth={2.5} /></button>
                     </div>
                   )}
                   
                   <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-gray-50 dark:bg-[#1a1a1a] p-1.5 md:p-2 rounded-full border border-gray-200 dark:border-[#272729] focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-all shadow-inner focus-within:shadow-md">
                      <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 transition-colors shrink-0 rounded-full ${showEmojiPicker ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-gray-400 hover:text-yellow-500'}`}><Smile size={22} strokeWidth={2.5} /></button>
                      <input 
                         type="text" 
                         value={inputValue} 
                         onChange={handleInput} 
                         placeholder="Type a message..." 
                         className="flex-1 bg-transparent text-gray-900 dark:text-white text-sm md:text-[15px] font-medium py-1.5 md:py-2 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                         autoFocus 
                      />
                      <button type="submit" disabled={!inputValue.trim()} className="p-2 md:px-5 md:py-2 bg-blue-600 border border-blue-600 dark:border-blue-500 text-white rounded-full font-extrabold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] disabled:shadow-none hover:-translate-y-0.5 disabled:hover:translate-y-0 shrink-0">
                        <Send size={18} strokeWidth={2.5} className="ml-0.5" />
                        <span className="hidden md:inline">Send</span>
                      </button>
                   </form>
                </>
             )}
          </div>

          {isCallActiveInThisRoom && (
            <div className="absolute inset-0 z-[100] bg-gray-50 dark:bg-[#030303] flex flex-col animate-in fade-in duration-300 overflow-hidden rounded-t-3xl md:rounded-none shadow-[0_-20px_50px_rgba(0,0,0,0.2)] md:shadow-none">
                {activeCall.isVideo ? (
                   <>
                      <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-28 md:bottom-32 right-6 w-32 h-48 md:w-40 md:h-56 bg-gray-200 dark:bg-[#111] rounded-2xl overflow-hidden border-2 border-white/50 dark:border-white/20 shadow-2xl z-20">
                         <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover scale-x-[-1] transition-opacity ${callCamOff ? 'opacity-0' : 'opacity-100'}`} />
                         {callCamOff && <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900"><VideoOff size={32} className="text-gray-500"/></div>}
                      </div>
                   </>
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center relative pb-20">
                      <div className="relative mb-8 flex items-center justify-center">
                         {activeCall.isAccepted && (
                             <div ref={avatarRingRef} className="absolute inset-0 rounded-full bg-green-500/20 transition-transform origin-center" style={{ zIndex: 0 }} />
                         )}
                         <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500 border-4 shadow-2xl relative z-10 ${activeCall.isAccepted ? 'bg-green-100 dark:bg-green-900/20 border-green-500/50' : 'bg-blue-100 dark:bg-blue-900/20 border-blue-500/30 shadow-[0_0_60px_rgba(59,130,246,0.3)] animate-pulse'}`}>
                            {roomAvatar ? (
                                <img src={roomAvatar} alt="Call Partner" className="w-full h-full object-cover" />
                            ) : (
                                <span className={`text-5xl md:text-7xl font-bold ${activeCall.isAccepted ? 'text-green-600 dark:text-green-500' : 'text-blue-600 dark:text-blue-500'}`}>{activeCall.peerName?.charAt(0).toUpperCase()}</span>
                            )}
                         </div>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{activeCall.peerName}</h2>
                      <p className={`text-xs md:text-sm font-extrabold uppercase tracking-widest ${activeCall.isAccepted ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400 animate-pulse'}`}>
                         {activeCall.isAccepted ? formatCallDuration(callDuration) : 'Calling...'}
                      </p>
                      
                      <video ref={remoteVideoRef} autoPlay playsInline className="absolute w-0 h-0 opacity-0 pointer-events-none" />
                      <video ref={localVideoRef} autoPlay playsInline muted className="absolute w-0 h-0 opacity-0 pointer-events-none" />
                   </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-100/90 via-gray-50/50 dark:from-black/90 dark:via-black/50 to-transparent flex items-end justify-center pb-8 gap-5 z-30 pt-32 pointer-events-none">
                   <button onClick={() => {
                      setCallMicOff(!callMicOff);
                      if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((t: any) => t.enabled = callMicOff);
                   }} className={`pointer-events-auto w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${callMicOff ? 'bg-gray-800 dark:bg-white text-white dark:text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]' : 'bg-white/80 hover:bg-gray-100 dark:bg-black/60 dark:hover:bg-black/80 backdrop-blur-sm text-gray-800 dark:text-white border border-gray-300 dark:border-white/10'}`}>
                      {callMicOff ? <MicOff size={24} strokeWidth={2.5} /> : <Mic size={24} strokeWidth={2.5} />}
                   </button>
                   
                   {activeCall.isVideo && (
                     <button onClick={() => {
                        setCallCamOff(!callCamOff);
                        if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach((t: any) => t.enabled = callCamOff);
                     }} className={`pointer-events-auto w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${callCamOff ? 'bg-gray-800 dark:bg-white text-white dark:text-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]' : 'bg-white/80 hover:bg-gray-100 dark:bg-black/60 dark:hover:bg-black/80 backdrop-blur-sm text-gray-800 dark:text-white border border-gray-300 dark:border-white/10'}`}>
                        {callCamOff ? <VideoOff size={24} strokeWidth={2.5} /> : <Video size={24} strokeWidth={2.5} />}
                     </button>
                   )}

                   <button onClick={endActiveCall} className="pointer-events-auto w-16 h-16 md:w-20 md:h-20 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_0_20px_rgba(220,38,38,0.5)] transition-transform active:scale-95">
                      <Phone size={28} className="rotate-[135deg]" strokeWidth={3} />
                   </button>
                </div>
            </div>
          )}

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 w-full h-full bg-gray-50 dark:bg-[#030303] transition-colors">
            <div className="w-20 h-20 bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
               <MessageSquare size={36} strokeWidth={2.5} className="text-blue-600 dark:text-blue-500" />
            </div>
            <h3 className="text-2xl font-display font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Your Messages</h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-xs">Select a squad or direct message from the sidebar to start chatting.</p>
        </div>
      )}

      <div className={`absolute top-0 right-0 bottom-0 w-full sm:w-[320px] border-l border-gray-200 dark:border-[#272729] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col z-50 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${showInfoPanel && selectedRoomId ? 'translate-x-0' : 'translate-x-full'}`}>
         
         <div className="h-16 border-b border-gray-200 dark:border-[#272729] flex items-center justify-between px-4 bg-gray-50/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md shrink-0 transition-colors">
            <h2 className="font-extrabold text-gray-900 dark:text-white text-base">Contact Info</h2>
            <button onClick={() => setShowInfoPanel(false)} className="p-2 bg-white dark:bg-[#272729] border border-gray-200 dark:border-transparent rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shrink-0 transition-all shadow-sm active:scale-95">
               <X size={18} strokeWidth={2.5} />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto scrollbar-hide">
             <div className="p-6 flex flex-col items-center text-center border-b border-gray-200 dark:border-[#272729] bg-white dark:bg-transparent transition-colors">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-extrabold mb-4 shadow-lg border-4 border-gray-50 dark:border-[#272729] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-200 overflow-hidden">
                   {roomAvatar ? (
                       <img src={roomAvatar} alt={activeRoom?.name} className="w-full h-full object-cover" />
                   ) : (
                       activeRoom?.name?.charAt(0).toUpperCase() || 'U'
                   )}
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1 transition-colors">{activeRoom?.name || `User_${selectedRoomId?.substring(0,4)}`}</h3>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-6">@{activeRoom?.friend_username}</p>
                
                <div className="flex gap-3 w-full justify-center">
                   <button onClick={() => startCallAndClosePanel('audio', false)} disabled={!!activeCall} className="flex flex-col items-center gap-1.5 group disabled:opacity-50">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-all shadow-sm border border-blue-100 dark:border-transparent group-hover:-translate-y-1"><Phone size={20} strokeWidth={2.5}/></div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Audio</span>
                   </button>
                   <button onClick={() => startCallAndClosePanel('video', false)} disabled={!!activeCall} className="flex flex-col items-center gap-1.5 group disabled:opacity-50">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-all shadow-sm border border-blue-100 dark:border-transparent group-hover:-translate-y-1"><Video size={20} strokeWidth={2.5}/></div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Video</span>
                   </button>
                </div>
             </div>

             <div className="p-4 space-y-2">
                {!isFriend && (
                   <>
                      <h4 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 mb-2">Actions</h4>
                      <button onClick={() => onPanelAction('add_friend')} className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20 border border-green-100 dark:border-transparent text-green-600 dark:text-green-500 rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow-md">
                         <UserPlus size={18} strokeWidth={2.5}/> Add as Friend
                      </button>
                      <div className="h-px bg-gray-200 dark:bg-[#272729] my-3"></div>
                   </>
                )}
                
                <h4 className="text-[10px] font-extrabold text-red-400 dark:text-red-500/50 uppercase tracking-widest px-2 mb-2">Danger Zone</h4>
                
                {isFriend && (
                   <button onClick={() => onPanelAction('remove')} className="w-full flex items-center gap-3 p-3 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 border border-orange-100 dark:border-transparent text-orange-600 dark:text-orange-500 rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow-md">
                      <UserMinus size={18} strokeWidth={2.5}/> Remove Friend
                   </button>
                )}

                <button onClick={() => onPanelAction('block')} className="w-full flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-100 dark:border-transparent text-red-600 dark:text-red-500 rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow-md">
                   <Ban size={18} strokeWidth={2.5}/> Block User
                </button>
                <button onClick={() => onPanelAction('report')} className="w-full flex items-center gap-3 p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all font-extrabold text-sm shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] hover:-translate-y-0.5">
                   <Flag size={18} strokeWidth={2.5}/> Report User
                </button>
             </div>
         </div>
      </div>
    </div>
  );
};