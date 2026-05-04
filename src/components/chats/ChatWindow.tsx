import React, { useRef, useState, useEffect } from 'react'; 
import { Search, Send, ArrowLeft, Smile, Check, CheckCheck, X, Loader2, MessageSquare, Reply, Clock, Phone, Video, Info, UserMinus, Ban, Flag, UserPlus, Image as ImageIcon } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useThemeStore } from '../../store/useThemeStore';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch('QkvvAzTY6DrGBFLYQS0u5E1MBTzw8eMP');

function GiphyPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [search, setSearch] = useState('');
  const fetchGifs = (offset: number) => search ? gf.search(search, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 });
  return (
    <div className="w-[300px] flex flex-col gap-2 p-3">
      <input type="text" placeholder="Search GIFs..." className="w-full bg-gray-100 dark:bg-[#111] rounded-xl px-4 py-2 border border-gray-200 dark:border-[#272729] text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white" onChange={(e) => setSearch(e.target.value)} value={search} />
      <div className="h-[250px] overflow-y-auto scrollbar-hide rounded-lg bg-gray-50 dark:bg-black">
        <Grid key={search} width={275} columns={2} fetchGifs={fetchGifs} onGifClick={(gif, e) => { e.preventDefault(); onSelect(gif.images.original.url); }} noResultsMessage={<div className="text-center text-gray-500 mt-4 text-sm font-bold">No GIFs found</div>} />
      </div>
    </div>
  );
}

function useOnClickOutside(ref: React.RefObject<any>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Helper: Check if message is ONLY emojis (up to 3 for massive size)
const isOnlyEmojis = (str: string) => {
  if (!str) return false;
  const stripped = str.replace(/[\s\u200B-\u200D\uFEFF]/g, ''); 
  if (stripped.length === 0) return false;
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}){1,3}$/u;
  return emojiRegex.test(stripped);
};

// Formats "last seen 18 March at 02:26 pm"
const formatLastSeenLower = (dateString: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase();
  return `${day} at ${time}`;
};

// WhatsApp-style Date Pill Formatter
const getDateLabel = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatJustTime = (isoString: string) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const ChatWindow = ({ 
  activeRoom, selectedRoomId, setSelectedRoomId, messages, user, presence, typingData,
  isRequest, handleRequestAction, isFriend, 
  isMessagesLoading, isLoadingOlder, hasMoreMessages, fetchMessages, messagesEndRef,
  isSearchingMessages, setIsSearchingMessages, messageSearchQuery, setMessageSearchQuery, renderTextWithHighlights,
  handleSendMessage, showToast, scrollToBottom, // <-- FIX: Added scrollToBottom here!
  inputValue, handleInput, replyingTo, setReplyingTo, showEmojiPicker, setShowEmojiPicker, onEmojiClick,
  showInfoPanel, setShowInfoPanel, onPanelAction,
  imageFile, setImageFile, imagePreview, setImagePreview, gifUrl, setGifUrl, isSendingAttachment
}: any) => {

  const { theme } = useThemeStore();
  const roomAvatar = activeRoom?.avatar_url || activeRoom?.avatarUrl;
  
  const [showGifPicker, setShowGifPicker] = useState(false);
  
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useOnClickOutside(emojiPickerRef, () => setShowEmojiPicker(false));
  useOnClickOutside(gifPickerRef, () => setShowGifPicker(false));

  // --- AUTO SCROLL FIX ---
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, selectedRoomId, isMessagesLoading]);

  const triggerCall = (type: 'audio' | 'video') => {
      setShowInfoPanel(false);
      if (!selectedRoomId || !activeRoom?.partner_id) {
          if (showToast) showToast("Error: Missing Partner ID", "error");
          return;
      }
      window.dispatchEvent(new CustomEvent('START_CALL', {
          detail: { roomId: selectedRoomId, peerId: activeRoom.partner_id, type, peerName: activeRoom.name || 'User', peerAvatar: roomAvatar }
      }));
  };

  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const swipeCurrentX = useRef<number | null>(null);

  const scrollToRepliedMessage = (targetMsgId: string) => {
      const targetElement = document.getElementById(`msg-${targetMsgId}`);
      if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetElement.classList.add('bg-blue-500/20', 'transition-colors', 'duration-500', 'rounded-xl');
          setTimeout(() => targetElement.classList.remove('bg-blue-500/20'), 1500);
      }
  };

  const handleTouchStart = (e: React.TouchEvent) => { swipeStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent, msgId: string) => {
      if (swipeStartX.current === null) return;
      const diff = e.touches[0].clientX - swipeStartX.current;
      if (diff > 0 && diff < 100) { 
          setSwipingMsgId(msgId); swipeCurrentX.current = diff;
          const el = document.getElementById(`msg-bubble-${msgId}`);
          if (el) el.style.transform = `translateX(${diff}px)`;
      }
  };
  const handleTouchEnd = (msg: any, msgId: string) => {
      if (swipeCurrentX.current && swipeCurrentX.current > 50) setReplyingTo(msg);
      const el = document.getElementById(`msg-bubble-${msgId}`);
      if (el) {
          el.style.transition = 'transform 0.2s ease-out';
          el.style.transform = 'translateX(0px)';
          setTimeout(() => el.style.transition = '', 200);
      }
      swipeStartX.current = null; swipeCurrentX.current = null; setSwipingMsgId(null);
  };

  const getCleanReplyPreviewText = () => {
     if (!replyingTo) return "";
     const rawText = replyingTo.text || replyingTo.content || "";
     return rawText.startsWith('> ') ? (rawText.split('\n\n').slice(1).join('\n\n') || "Attachment") : rawText;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGifUrl(''); setImageFile(file); setImagePreview(URL.createObjectURL(file)); e.target.value = '';
  };

  const clearAttachment = () => {
    setGifUrl(''); setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview); setImagePreview('');
  };

  // --- WHATSAPP-STYLE MESSAGE GROUPING ---
  const renderMessageGroups = () => {
    let lastDateLabel = '';
    const elements: React.ReactNode[] = [];

    messages.forEach((msg: any, idx: number) => {
      const msgDateLabel = getDateLabel(msg.created_at);
      
      if (msgDateLabel !== lastDateLabel) {
        elements.push(
          <div key={`date-${msgDateLabel}-${idx}`} className="flex justify-center my-6 sticky top-2 z-20">
             <span className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-sm border border-gray-200 dark:border-[#272729] text-gray-500 dark:text-gray-400 text-[11px] px-4 py-1.5 rounded-full font-bold shadow-sm text-center">
                {msgDateLabel}
             </span>
          </div>
        );
        lastDateLabel = msgDateLabel;
      }

      const isMe = msg.sender_id === user?.id || msg.from === user?.id;
      const isSystemMsg = msg.type === 'system' || msg.sender_id === 'system' || msg.from === 'system';
      const rawText = msg.text || msg.content || "";
      const msgId = msg.id || msg.message_id || msg._tempId || `temp-${idx}`;
      const isEmojiOnly = isOnlyEmojis(rawText);

      if (isSystemMsg) {
        elements.push(
          <div id={`msg-${msgId}`} key={msgId} className="flex justify-center my-4">
             <span className="bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-[#272729] text-gray-500 dark:text-gray-400 text-[10px] px-4 py-1.5 rounded-full font-bold shadow-sm text-center">
                {rawText}
             </span>
          </div>
        );
        return;
      }
      
      const isReply = rawText.startsWith('> ');
      let repliedMsgId = null;
      let cleanQuoteText = '';
      let actualText = rawText;

      if (isReply) {
          const parts = rawText.split('\n\n');
          const firstPart = parts[0];
          actualText = parts.slice(1).join('\n\n') || '';
          const idMatch = firstPart.match(/^>\s*\[id:(.+?)\]\s*(.*)$/);
          if (idMatch) { repliedMsgId = idMatch[1]; cleanQuoteText = idMatch[2]; } 
          else { cleanQuoteText = firstPart.substring(2); }
      }

      elements.push(
        <div 
            id={`msg-${msgId}`} 
            key={msgId} 
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} group cursor-pointer relative -mx-4 px-4 py-0.5`}
            onDoubleClick={() => setReplyingTo(msg)}
            onTouchStart={(e) => handleTouchStart(e)}
            onTouchMove={(e) => handleTouchMove(e, msgId)}
            onTouchEnd={() => handleTouchEnd(msg, msgId)}
        >
           <div className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#272729] shadow-sm text-gray-500 transition-opacity duration-200 ${swipingMsgId === msgId && (swipeCurrentX.current || 0) > 40 ? 'opacity-100' : 'opacity-0'} ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
               <Reply size={16} className="-scale-x-100"/>
           </div>

           <div 
               id={`msg-bubble-${msgId}`}
               className={`max-w-[85%] md:max-w-[70%] flex flex-col relative z-10 transition-colors ${
                 isEmojiOnly && (!msg.media || msg.media.length === 0) && !isReply
                    ? 'bg-transparent text-[50px] md:text-[60px] leading-none drop-shadow-md my-1'
                    : isMe 
                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm px-4 py-2.5' 
                        : 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-[#272729] rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm'
               }`}
           >
              {isReply && (
                <div onClick={() => scrollToRepliedMessage(repliedMsgId || '')} className={`border-l-4 mb-2 text-xs opacity-90 cursor-pointer hover:opacity-100 transition-opacity ${isMe ? 'border-blue-300 bg-black/20 text-white' : 'border-blue-500 bg-gray-100 dark:bg-black/20 text-gray-700 dark:text-gray-300 shadow-inner'} p-2 rounded-lg`}>
                  <p className="font-extrabold text-[10px] mb-0.5 opacity-80 uppercase tracking-wider">{isMe ? 'You replied' : 'Replied'}</p>
                  <p className="line-clamp-2">{renderTextWithHighlights(cleanQuoteText)}</p>
                </div>
              )}
              
              {msg.media && msg.media.length > 0 && (
                 <div className={`w-full max-w-[250px] rounded-xl overflow-hidden mb-2 border ${isMe ? 'border-blue-500/50' : 'border-gray-200 dark:border-[#272729]'}`}>
                    <img src={msg.media[0].url} className="w-full h-auto object-cover" alt="Attachment" loading="lazy" />
                 </div>
              )}

              {(!isEmojiOnly || msg.media?.length > 0 || isReply) ? (
                  <span className="break-words whitespace-pre-wrap text-[15px] font-medium leading-snug">{renderTextWithHighlights(actualText)}</span>
              ) : (
                  <span>{actualText}</span>
              )}

              <div className={`flex items-center gap-1 text-[9px] md:text-[10px] mt-1 font-bold uppercase tracking-wider ${isMe ? (isEmojiOnly && !isReply && (!msg.media || msg.media.length === 0) ? 'text-gray-500 justify-end' : 'text-blue-200 justify-end') : 'text-gray-400 dark:text-gray-500 justify-start'}`}>
                 <span>{formatJustTime(msg.created_at)}</span>
                 {isMe && (
                   <span className="ml-1 flex items-center">
                     {msg.status === 'sending' && <Loader2 className={`w-3 h-3 animate-spin ${isEmojiOnly && !isReply && !msg.media ? 'text-gray-400' : 'text-white/70'}`} strokeWidth={3} />}
                     {(msg.status === 'sent' || !msg.status) && <Check className={`w-3.5 h-3.5 ${isEmojiOnly && !isReply && !msg.media ? 'text-gray-400' : 'text-white/80'}`} strokeWidth={3} />}
                     {msg.status === 'delivered' && <CheckCheck className={`w-3.5 h-3.5 ${isEmojiOnly && !isReply && !msg.media ? 'text-gray-500' : 'text-white/90'}`} strokeWidth={3} />}
                     {msg.status === 'read' && <CheckCheck className={`w-3.5 h-3.5 ${isEmojiOnly && !isReply && !msg.media ? 'text-blue-500' : 'text-green-400 drop-shadow-sm'}`} strokeWidth={3} />}
                   </span>
                 )}
              </div>
           </div>
        </div>
      );
    });

    return elements;
  };

  return (
    <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-[#000] relative min-w-0 transition-colors duration-300 h-[100dvh] md:h-auto ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
      
      {showInfoPanel && <div className="absolute inset-0 z-40 bg-transparent" onClick={() => setShowInfoPanel(false)} />}

      {selectedRoomId && activeRoom ? (
        <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 overflow-hidden">
          
          {/* HEADER */}
          <div className="h-16 md:h-18 border-b border-gray-200 dark:border-[#272729] flex items-center justify-between px-3 md:px-6 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl shrink-0 transition-colors z-30 shadow-sm">
             <div className="flex items-center gap-3 min-w-0 cursor-pointer group" onClick={() => setShowInfoPanel(true)}>
                <button onClick={(e) => { e.stopPropagation(); setSelectedRoomId(null); }} className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shrink-0 transition-colors">
                  <ArrowLeft size={22} strokeWidth={2.5} />
                </button>
                
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-200 font-extrabold shrink-0 border border-gray-200 dark:border-[#272729] bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-sm group-hover:border-blue-400 transition-colors">
                   {roomAvatar ? <img src={roomAvatar} alt={activeRoom.name} className="w-full h-full object-cover" /> : (activeRoom.name?.charAt(0).toUpperCase() || 'U')}
                </div>

                <div className="min-w-0 flex flex-col justify-center">
                   <h3 className="font-extrabold text-gray-900 dark:text-white text-[16px] flex items-center gap-2 truncate leading-tight transition-colors">
                      {activeRoom.name || `User_${selectedRoomId.substring(0,4)}`} 
                   </h3>
                   
                   {typingData?.roomId === selectedRoomId ? (
                      <p className="text-[11px] text-blue-500 dark:text-blue-400 italic truncate font-bold animate-pulse">typing...</p>
                   ) : activeRoom?.partner_id && presence[activeRoom.partner_id] ? (
                      <p className={`text-[10px] font-medium truncate ${presence[activeRoom.partner_id].online ? 'text-green-500 tracking-wide uppercase font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                         {presence[activeRoom.partner_id].online ? 'online' : `last seen ${formatLastSeenLower(presence[activeRoom.partner_id].lastSeen)}`}
                      </p>
                   ) : (
                      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate">@{activeRoom.friend_username}</p>
                   )}
                </div>
             </div>
             
             <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 shrink-0 z-50">
                {!isRequest && (
                    <>
                        <button onClick={() => triggerCall('audio')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors active:scale-95" title="Voice Call"><Phone size={18} strokeWidth={2.5} /></button>
                        <button onClick={() => triggerCall('video')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors active:scale-95" title="Video Call"><Video size={20} strokeWidth={2.5} /></button>
                        <div className="w-[1px] h-5 bg-gray-200 dark:bg-[#272729] mx-1 rounded-full hidden sm:block"></div>
                    </>
                )}
                <button onClick={() => { setIsSearchingMessages(!isSearchingMessages); setMessageSearchQuery(""); }} className={`p-2 rounded-full transition-colors active:scale-95 hidden sm:block ${isSearchingMessages ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><Search size={18} strokeWidth={2.5} /></button>
                <button onClick={() => setShowInfoPanel(!showInfoPanel)} className={`p-2 rounded-full transition-colors active:scale-95 ${showInfoPanel ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}><Info size={20} strokeWidth={2.5} /></button>
             </div>
          </div>

          {isSearchingMessages && (
            <div className="px-4 py-3 bg-white/90 dark:bg-[#111]/90 backdrop-blur-md border-b border-gray-200 dark:border-[#272729] flex items-center gap-3 shrink-0 shadow-inner z-20 transition-colors">
               <Search size={16} strokeWidth={3} className="text-gray-400" />
               <input type="text" placeholder="Search messages..." value={messageSearchQuery} onChange={(e) => setMessageSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none text-sm font-bold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400" autoFocus />
               <button onClick={() => { setIsSearchingMessages(false); setMessageSearchQuery(""); scrollToBottom(); }} className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-transparent">Cancel</button>
            </div>
          )}

          {/* MESSAGES AREA */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col scrollbar-hide z-0 bg-gray-50 dark:bg-[#000] transition-colors relative overflow-x-hidden">
             {hasMoreMessages && !isSearchingMessages && (
               <button onClick={() => fetchMessages(selectedRoomId, true)} disabled={isLoadingOlder} className="mx-auto mb-6 px-5 py-2 bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-2 transition-all border border-gray-200 dark:border-[#272729] shadow-sm hover:shadow-md">
                 {isLoadingOlder ? <Loader2 size={14} className="animate-spin" strokeWidth={3} /> : <Clock size={14} strokeWidth={3} />} Load older
               </button>
             )}

             {isMessagesLoading ? (
                <div className="m-auto flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin" strokeWidth={3} /></div>
             ) : (
                <>
                   <div className="mt-auto"></div>
                   <div className="flex flex-col pb-2">
                      {renderMessageGroups()}
                   </div>
                </>
             )}
          </div>

          {/* INPUT COMPOSER AREA */}
          <div className="border-t border-gray-200 dark:border-[#272729] bg-white dark:bg-[#0a0a0a] shrink-0 flex flex-col z-20 relative p-3 md:p-4 transition-colors">
             {isRequest ? (
                <div className="p-4 flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-[#272729] shadow-inner transition-colors">
                   <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Accept message request from <strong className="text-gray-900 dark:text-white font-extrabold">{activeRoom?.name}</strong>?</p>
                   <div className="flex gap-3 w-full max-w-sm">
                       <button onClick={() => { handleRequestAction(activeRoom.room_id, 'reject'); setSelectedRoomId(null); }} className="flex-1 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-100 dark:border-red-500/20 hover:bg-red-600 hover:text-white rounded-xl font-extrabold transition-all shadow-sm text-sm">Reject</button>
                       <button onClick={() => handleRequestAction(activeRoom.room_id, 'accept')} className="flex-1 py-2.5 bg-blue-600 text-white hover:bg-blue-500 rounded-xl font-extrabold transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] text-sm">Accept</button>
                   </div>
                </div>
             ) : (
                <>
                   {/* POPUPS */}
                   {showEmojiPicker && (
                     <div ref={emojiPickerRef} className="absolute bottom-full right-4 mb-2 z-[100] shadow-2xl rounded-[1.5rem] overflow-hidden border border-gray-200 dark:border-[#343536] animate-in slide-in-from-bottom-2">
                       <EmojiPicker theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} onEmojiClick={onEmojiClick} width={320} height={350} lazyLoadEmojis={true} />
                     </div>
                   )}
                   {showGifPicker && (
                     <div ref={gifPickerRef} className="absolute bottom-full left-4 mb-2 z-[100] shadow-2xl rounded-[1.5rem] overflow-hidden border border-gray-200 dark:border-[#343536] bg-white dark:bg-[#111] animate-in slide-in-from-bottom-2">
                       <GiphyPicker onSelect={(url) => { setGifUrl(url); setImageFile(null); setImagePreview(''); setShowGifPicker(false); }} />
                     </div>
                   )}

                   {/* REPLY / ATTACHMENT PREVIEW */}
                   {(replyingTo || imagePreview || gifUrl) && (
                     <div className="flex items-center justify-between px-4 py-2.5 mb-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-2xl shadow-inner transition-all">
                         <div className="flex items-center gap-3 overflow-hidden border-l-2 border-blue-500 pl-3">
                            {(imagePreview || gifUrl) ? (
                               <img src={imagePreview || gifUrl} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-gray-200 dark:border-[#272729]" alt="Preview" />
                            ) : (
                               <Reply size={18} strokeWidth={2.5} className="text-gray-400 shrink-0" />
                            )}
                            <div className="truncate">
                               <p className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest mb-0.5">
                                 {imagePreview || gifUrl ? 'Attachment' : replyingTo?.sender_id === user?.id ? 'Replying to yourself' : 'Replying to friend'}
                               </p>
                               <p className="text-gray-600 dark:text-gray-400 text-xs font-bold truncate max-w-[200px] md:max-w-md">{imagePreview || gifUrl ? 'Media file ready to send' : getCleanReplyPreviewText()}</p>
                            </div>
                         </div>
                         <button type="button" onClick={() => { setReplyingTo(null); clearAttachment(); }} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full bg-white dark:bg-[#272729] shadow-sm border border-gray-200 dark:border-transparent transition-all active:scale-90"><X size={14} strokeWidth={3} /></button>
                     </div>
                   )}
                   
                   <form onSubmit={handleSendMessage} className="flex items-center gap-1 md:gap-2 bg-gray-100 dark:bg-[#111] p-1 md:p-1.5 rounded-full border border-gray-200 dark:border-transparent focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-all shadow-inner focus-within:bg-white dark:focus-within:bg-[#0f0f0f]">
                      
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 transition-colors shrink-0 rounded-full text-gray-400 hover:text-blue-500 active:scale-95"><ImageIcon size={20} strokeWidth={2.5} /></button>
                      
                      <button type="button" onClick={() => setShowGifPicker(!showGifPicker)} className={`p-2 transition-colors shrink-0 rounded-full active:scale-95 flex items-center justify-center hidden sm:flex ${showGifPicker ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}>
                          <div className="font-black text-[10px] border-2 border-current px-1 rounded flex items-center justify-center h-[18px]">GIF</div>
                      </button>

                      <input 
                         type="text" 
                         value={inputValue} 
                         onChange={handleInput} 
                         placeholder="Message..." 
                         className="flex-1 bg-transparent text-gray-900 dark:text-white text-[15px] font-medium py-2 focus:outline-none placeholder:text-gray-500 px-1 min-w-0" 
                      />

                      <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 transition-colors shrink-0 rounded-full active:scale-95 mr-1 ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}><Smile size={22} strokeWidth={2.5} /></button>
                      
                      <button type="submit" disabled={(!inputValue.trim() && !imageFile && !gifUrl) || isSendingAttachment} className="w-10 h-10 md:w-auto md:px-5 md:py-2.5 bg-blue-600 border border-blue-600 dark:border-blue-500 text-white rounded-full font-extrabold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] active:scale-95 shrink-0">
                        {isSendingAttachment ? <Loader2 size={18} strokeWidth={3} className="animate-spin" /> : <Send size={18} strokeWidth={2.5} className="ml-0.5 md:ml-0" />}
                        <span className="hidden md:inline">Send</span>
                      </button>
                   </form>
                </>
             )}
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 w-full h-full bg-gray-50 dark:bg-[#030303] transition-colors">
            <div className="w-20 h-20 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#272729] rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
               <MessageSquare size={36} strokeWidth={2.5} className="text-blue-600 dark:text-blue-500" />
            </div>
            <h3 className="text-2xl font-display font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Your Messages</h3>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 max-w-xs">Select a squad or direct message from the sidebar to start chatting.</p>
        </div>
      )}

      {/* INFO PANEL */}
      <div className={`absolute top-0 right-0 bottom-0 w-full sm:w-[320px] border-l border-gray-200 dark:border-[#272729] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl flex flex-col z-50 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${showInfoPanel && selectedRoomId ? 'translate-x-0' : 'translate-x-full'}`}>
         
         <div className="h-16 md:h-18 border-b border-gray-200 dark:border-[#272729] flex items-center justify-between px-4 bg-gray-50/90 dark:bg-[#111]/90 backdrop-blur-md shrink-0 transition-colors">
            <h2 className="font-extrabold text-gray-900 dark:text-white text-base">Contact Info</h2>
            <button onClick={() => setShowInfoPanel(false)} className="p-2 bg-white dark:bg-[#272729] border border-gray-200 dark:border-transparent rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shrink-0 transition-all shadow-sm active:scale-95"><X size={18} strokeWidth={2.5} /></button>
         </div>

         <div className="flex-1 overflow-y-auto scrollbar-hide">
             <div className="p-6 flex flex-col items-center text-center border-b border-gray-200 dark:border-[#272729] bg-white dark:bg-transparent transition-colors">
                <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-4xl font-extrabold mb-4 shadow-lg shadow-black/5 border border-gray-200 dark:border-[#272729] bg-gray-100 dark:bg-[#111] text-gray-400 dark:text-gray-200 overflow-hidden">
                   {roomAvatar ? <img src={roomAvatar} alt={activeRoom?.name} className="w-full h-full object-cover" /> : (activeRoom?.name?.charAt(0).toUpperCase() || 'U')}
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1 transition-colors">{activeRoom?.name || `User_${selectedRoomId?.substring(0,4)}`}</h3>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-6">@{activeRoom?.friend_username}</p>
                
                <div className="flex gap-3 w-full justify-center">
                   <button onClick={() => triggerCall('audio')} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-12 h-12 rounded-[1rem] bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-all border border-transparent dark:border-blue-500/20 active:scale-95"><Phone size={20} strokeWidth={2.5}/></div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Audio</span>
                   </button>
                   <button onClick={() => triggerCall('video')} className="flex flex-col items-center gap-1.5 group">
                      <div className="w-12 h-12 rounded-[1rem] bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-all border border-transparent dark:border-blue-500/20 active:scale-95"><Video size={20} strokeWidth={2.5}/></div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Video</span>
                   </button>
                </div>
             </div>

             <div className="p-4 space-y-2">
                {!isFriend && (
                   <>
                      <h4 className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 mb-2">Actions</h4>
                      <button onClick={() => onPanelAction('add_friend')} className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20 border border-green-100 dark:border-transparent text-green-600 dark:text-green-500 rounded-[1rem] transition-all font-bold text-sm active:scale-95">
                         <UserPlus size={18} strokeWidth={2.5}/> Add as Friend
                      </button>
                      <div className="h-px bg-gray-200 dark:bg-[#272729] my-3"></div>
                   </>
                )}
                
                <h4 className="text-[10px] font-extrabold text-red-400 dark:text-red-500/50 uppercase tracking-widest px-2 mb-2">Danger Zone</h4>
                
                {isFriend && (
                   <button onClick={() => onPanelAction('remove')} className="w-full flex items-center gap-3 p-3 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 border border-orange-100 dark:border-transparent text-orange-600 dark:text-orange-500 rounded-[1rem] transition-all font-bold text-sm active:scale-95">
                      <UserMinus size={18} strokeWidth={2.5}/> Remove Friend
                   </button>
                )}

                <button onClick={() => onPanelAction('block')} className="w-full flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-100 dark:border-transparent text-red-600 dark:text-red-500 rounded-[1rem] transition-all font-bold text-sm active:scale-95">
                   <Ban size={18} strokeWidth={2.5}/> Block User
                </button>
                <button onClick={() => onPanelAction('report')} className="w-full flex items-center gap-3 p-3 bg-red-600 hover:bg-red-700 text-white rounded-[1rem] transition-all font-extrabold text-sm shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] active:scale-95">
                   <Flag size={18} strokeWidth={2.5}/> Report User
                </button>
             </div>
         </div>
      </div>
    </div>
  );
};