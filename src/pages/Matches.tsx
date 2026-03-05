import { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Send, UserPlus, XCircle, RefreshCw, Zap, Smile, Ban, Flag, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { api } from '../services/api';
import { useWebSocket } from '../providers/WebSocketProvider';
import { useAuthStore } from '../store/useAuthStore';

// Define the shape of our partner
interface Partner {
  name: string;
  username: string;
  avatar: string;
}

// Modal types for our custom overlays
type ModalType = 'NONE' | 'REPORT' | 'BLOCK' | 'FRIEND_SUCCESS' | 'LEAVE_WARNING';

const Matches = () => {
  // FIX: Using `subscribe` instead of `lastMessage` state to prevent dropped back-to-back events
  const { sendMessage, isConnected, subscribe } = useWebSocket();
  const user = useAuthStore(state => state.user);

  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'CHATTING'>('IDLE');
  const [messages, setMessages] = useState<{id: number, text: string, isMe: boolean, isSystem?: boolean}[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Track full partner details
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Custom Modal States
  const [modalType, setModalType] = useState<ModalType>('NONE');
  const [reportReason, setReportReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
  // Ref to always have access to the latest roomId inside the WebSocket subscriber
  const activeRoomIdRef = useRef<string | null>(null);
  activeRoomIdRef.current = activeRoomId;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- PREVENT ACCIDENTAL NAVIGATION & CLEANUP ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status === 'CHATTING' || status === 'SEARCHING') {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (status === 'CHATTING' || status === 'SEARCHING') {
        api.post('/match/leave', {}).catch(() => {});
      }
    };
  }, [status]);

  // --- 1. ENTER QUEUE (Wrapped in useCallback so we can safely trigger it from the WebSocket listener) ---
  const startSearch = useCallback(async () => {
    if (!isConnected) {
      alert("Connecting to server... please wait.");
      return;
    }

    setStatus('SEARCHING');
    setMessages([]); 
    setShowEmojiPicker(false);
    setActiveRoomId(null);
    setPartner(null); 
    setModalType('NONE');
    
    try {
      const res = await api.post('/match/enter', {});
      if (res?.data?.room_id || res?.room_id) {
        setActiveRoomId(res.data?.room_id || res.room_id);
        setStatus('CHATTING');
      }
    } catch (error) {
      console.error("Failed to enter match queue:", error);
      setStatus('IDLE');
    }
  }, [isConnected]);

  // --- WEBSOCKET EVENT LISTENER (DIRECT SUBSCRIPTION) ---
  useEffect(() => {
    const handleWsEvent = (msg: any) => {
      if (!msg || !msg.type) return;

      const rId = msg.roomId || msg.room_id;

      // 1. Handle MATCH FOUND
      if (msg.type === 'match_found') {
        setActiveRoomId(rId);
        
        const pData = msg.partner || msg.partnerDetails || msg.user || {};
        const finalName = pData.name || msg.partner_name || msg.partnerName || msg.partner_fake_name || 'Anonymous';
        const finalUsername = pData.username || msg.partner_username || 'unknown';
        const finalAvatar = pData.avatar || pData.avatar_url || msg.partner_avatar || '';

        setPartner({
          name: finalName,
          username: finalUsername,
          avatar: finalAvatar
        });

        setStatus('CHATTING');
        setMessages([{ id: Date.now(), text: "You are connected! Say hi.", isMe: false, isSystem: true }]);
        return;
      }

      // 2. Handle INCOMING MESSAGES
      if (msg.type === 'send_message' && rId === activeRoomIdRef.current) {
        if (msg.from !== user?.id) {
           setMessages(prev => [...prev, { id: Date.now(), text: msg.text, isMe: false }]);
           
           if (msg.fromName) {
             setPartner(prev => {
               if (!prev || prev.name !== msg.fromName) {
                 return {
                   name: msg.fromName,
                   username: prev?.username || 'anonymous',
                   avatar: prev?.avatar || ''
                 };
               }
               return prev;
             });
           }
        }
        return;
      }

      // 3. Handle STRANGER DISCONNECT OR ROOM CLOSED (AUTO-REMATCH LOGIC)
      // Checks both types directly from your JSON log payload
      if ((msg.type === 'stranger_disconnected' || msg.type === 'room_closed') && rId === activeRoomIdRef.current) {
         startSearch();
         return;
      }
    };

    // Attach subscriber (Bypasses React state batching)
    const unsubscribe = subscribe(handleWsEvent);
    return () => unsubscribe();
  }, [subscribe, startSearch, user?.id]);


  // --- 2. LEAVE QUEUE ---
  const executeCancelSearch = async () => {
    setIsLoading(true);
    try {
      await api.post('/match/leave', {});
      setStatus('IDLE');
      setModalType('NONE');
    } catch (error) {
      console.error("Failed to leave match queue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. MATCH ACTIONS ---
  const executeMatchAction = async (actionType: 'skip' | 'block' | 'friend') => {
    if (!activeRoomIdRef.current) return;
    setIsProcessingAction(true);
    
    try {
      await api.post('/match/action', {
        room_id: activeRoomIdRef.current,
        action: actionType,
        partner_username: partner?.username
      });

      if (actionType === 'friend') {
        setModalType('FRIEND_SUCCESS'); 
      } else {
        setModalType('NONE');
        startSearch(); 
      }
    } catch (error) {
      console.error(`Failed to execute ${actionType}:`, error);
      alert(`Failed to complete action.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // --- 4. SUBMIT REPORT ---
  const executeReport = async () => {
    if (!activeRoomIdRef.current || !reportReason.trim()) return;
    setIsProcessingAction(true);

    try {
      await api.post('/match/report', {
        reported_username: partner?.username,
        reason: reportReason
      });
      
      setReportReason("");
      await executeMatchAction('block');
    } catch (error) {
      alert("Failed to submit report.");
      setIsProcessingAction(false);
    }
  }

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !activeRoomId) return;

    const newMsg = { id: Date.now(), text: inputValue, isMe: true };
    setMessages((prev) => [...prev, newMsg]);
    
    sendMessage(activeRoomId, inputValue);
    
    setInputValue("");
    setShowEmojiPicker(false);
  };

  const onEmojiClick = (emojiObject: any) => {
    setInputValue((prev) => prev + emojiObject.emoji);
  };

  return (
    <DashboardLayout>
      <div className="w-full h-[calc(100vh-4rem)] flex flex-col relative bg-[#0a0a0a]">
        
        {/* CUSTOM MODALS OVERLAY */}
        {modalType !== 'NONE' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              
              {/* BLOCK MODAL */}
              {modalType === 'BLOCK' && (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                    <Ban size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Block {partner?.name}?</h3>
                  <p className="text-sm text-gray-400 mb-6">You will no longer be matched with this person, and they won't be able to message you.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setModalType('NONE')} className="flex-1 py-2.5 rounded-xl bg-[#272729] text-white hover:bg-[#343536] transition-colors font-medium">Cancel</button>
                    <button onClick={() => executeMatchAction('block')} disabled={isProcessingAction} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium flex items-center justify-center">
                      {isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Block'}
                    </button>
                  </div>
                </div>
              )}

              {/* REPORT MODAL */}
              {modalType === 'REPORT' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center">
                      <Flag size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white">Report {partner?.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Please let us know why you are reporting this user. They will be automatically blocked.</p>
                  <textarea 
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full bg-[#0a0a0a] border border-[#343536] rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[100px] mb-6 resize-none"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setModalType('NONE')} className="flex-1 py-2.5 rounded-xl bg-[#272729] text-white hover:bg-[#343536] transition-colors font-medium">Cancel</button>
                    <button onClick={executeReport} disabled={isProcessingAction || !reportReason.trim()} className="flex-1 py-2.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center">
                      {isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
                    </button>
                  </div>
                </div>
              )}

              {/* FRIEND SUCCESS MODAL */}
              {modalType === 'FRIEND_SUCCESS' && (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Request Sent!</h3>
                  <p className="text-sm text-gray-400 mb-6">A friend request has been sent to {partner?.name}. You can keep chatting!</p>
                  <button onClick={() => setModalType('NONE')} className="w-full py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">
                    Continue Chatting
                  </button>
                </div>
              )}

              {/* CANCEL/LEAVE WARNING MODAL */}
              {modalType === 'LEAVE_WARNING' && (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Leave Search?</h3>
                  <p className="text-sm text-gray-400 mb-6">Are you sure you want to stop searching for a match?</p>
                  <div className="flex gap-3">
                    <button onClick={() => setModalType('NONE')} className="flex-1 py-2.5 rounded-xl bg-[#272729] text-white hover:bg-[#343536] transition-colors font-medium">Keep Searching</button>
                    <button onClick={executeCancelSearch} disabled={isLoading} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium flex items-center justify-center">
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Leave'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-[#0a0a0a]/50 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
             <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
             <h2 className="text-base sm:text-lg font-display font-bold text-white truncate">Stranger Chat</h2>
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-gray-500 whitespace-nowrap">{isConnected ? 'Server Connected' : 'Connecting...'}</div>
        </div>

        {/* --- MAIN AREA --- */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* STATE 1: IDLE */}
          {status === 'IDLE' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
               <button 
                 onClick={startSearch}
                 disabled={!isConnected}
                 className="w-32 h-32 sm:w-40 sm:h-40 bg-[#0f0f0f] border-2 border-white/10 rounded-full flex items-center justify-center group hover:scale-105 transition-transform cursor-pointer shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 group-hover:text-white transition-colors" />
               </button>
               <h3 className="mt-8 text-xl sm:text-2xl font-display font-bold text-white">Start Texting</h3>
               <p className="text-gray-500 text-xs sm:text-sm mt-2 max-w-xs px-4">
                 Connect with random people instantly. No video, just pure conversation.
               </p>
            </div>
          )}

          {/* STATE 2: SEARCHING */}
          {status === 'SEARCHING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
               <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500/10 animate-ping"></span>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#0f0f0f] border border-blue-500/30 rounded-full flex items-center justify-center">
                     <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 animate-spin" />
                  </div>
               </div>
               <h3 className="mt-6 text-base sm:text-lg font-display font-bold text-white animate-pulse">Looking for someone...</h3>
               <button 
                  onClick={() => setModalType('LEAVE_WARNING')} 
                  className="mt-4 text-xs flex items-center gap-2 text-red-400 font-bold hover:underline"
               >
                  Cancel Search
               </button>
            </div>
          )}

          {/* STATE 3: CHATTING */}
          {status === 'CHATTING' && (
            <div className="flex-1 flex flex-col w-full h-full relative animate-in fade-in duration-300">
               
               {/* MOBILE RESPONSIVE CONTROLS BAR */}
               <div className="p-3 sm:p-4 flex items-center justify-between border-b border-white/5 bg-[#0f0f0f]/50 shrink-0">
                  
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
                     <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-800 overflow-hidden border border-white/10 shrink-0">
                        <img 
                            src={partner?.avatar || `https://ui-avatars.com/api/?name=${partner?.name || 'U'}&background=random`} 
                            alt={partner?.name} 
                            className="w-full h-full object-cover"
                        />
                     </div>
                     <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
                          {partner?.name || 'Stranger'}
                        </span>
                     </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                     <button 
                        onClick={() => executeMatchAction('friend')} 
                        className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-green-400 transition-colors" 
                        title="Add Friend"
                     >
                        <UserPlus size={16} className="sm:w-[18px] sm:h-[18px]" />
                     </button>
                     <button 
                        onClick={() => setModalType('REPORT')} 
                        className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-orange-500 transition-colors" 
                        title="Report User"
                     >
                        <Flag size={16} className="sm:w-[18px] sm:h-[18px]" />
                     </button>
                     <button 
                        onClick={() => setModalType('BLOCK')} 
                        className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-red-500 transition-colors" 
                        title="Block User"
                     >
                        <Ban size={16} className="sm:w-[18px] sm:h-[18px]" />
                     </button>
                     <button 
                        onClick={() => executeMatchAction('skip')} 
                        disabled={isProcessingAction}
                        className="px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 sm:gap-2 whitespace-nowrap disabled:opacity-50"
                     >
                        {isProcessingAction ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} 
                        <span className="hidden sm:inline">Skip / Next</span>
                     </button>
                  </div>
               </div>

               {/* Messages Area */}
               <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                  <div className="min-h-full flex flex-col justify-end space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isSystem ? 'justify-center' : msg.isMe ? 'justify-end' : 'justify-start'}`}>
                           {msg.isSystem ? (
                             <span className="text-[10px] sm:text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full text-center max-w-[90%]">
                               {msg.text}
                             </span>
                           ) : (
                             <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                msg.isMe 
                                  ? 'bg-blue-600 text-white rounded-br-none' 
                                  : 'bg-[#1a1a1a] text-gray-200 border border-white/5 rounded-bl-none'
                             }`}>
                                {msg.text}
                             </div>
                           )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>
               </div>

               {/* Input Area */}
               <div className="p-3 sm:p-4 border-t border-white/5 bg-[#0a0a0a] relative z-20 shrink-0">
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-16 sm:bottom-20 left-2 sm:left-4 z-50 shadow-2xl">
                      <EmojiPicker 
                        theme={Theme.DARK} 
                        onEmojiClick={onEmojiClick}
                        width={window.innerWidth < 400 ? window.innerWidth - 30 : 350}
                        height={400}
                      />
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 items-center">
                     <div className="flex-1 relative">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-4 pr-10 sm:pr-12 py-3 sm:py-3.5 text-sm sm:text-base text-white focus:outline-none focus:border-blue-500 transition-colors"
                            autoFocus
                        />
                        <button 
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
                        >
                          <Smile size={18} className="sm:w-[20px] sm:h-[20px]" />
                        </button>
                     </div>

                     <button type="submit" className="p-3 sm:p-3.5 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20" disabled={!inputValue.trim()}>
                        <Send size={18} className="sm:w-[20px] sm:h-[20px]" />
                     </button>
                  </form>
               </div>

            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Matches;