import { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Send, UserPlus, XCircle, RefreshCw, Zap, Smile, Ban, Flag, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';

interface Partner {
  name: string;
  username: string;
  avatar: string;
}

type ModalType = 'NONE' | 'REPORT' | 'BLOCK' | 'FRIEND_SUCCESS' | 'LEAVE_WARNING';

const Matches = () => {
  // FIX: Destructure sendRaw instead of sendMessage
  const { sendRaw, isConnected, subscribe } = useWebSocket();
  const user = useAuthStore(state => state.user);
  const theme = useThemeStore(state => state.theme);

  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'CHATTING'>('IDLE');
  const [searchReason, setSearchReason] = useState<'MANUAL' | 'PARTNER_LEFT'>('MANUAL');
  
  const [messages, setMessages] = useState<{id: number, text: string, isMe: boolean, isSystem?: boolean}[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [modalType, setModalType] = useState<ModalType>('NONE');
  const [reportReason, setReportReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  activeRoomIdRef.current = activeRoomId;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Prevent Accidental Navigation
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

  const startSearch = useCallback(async (reason: 'MANUAL' | 'PARTNER_LEFT' = 'MANUAL') => {
    if (!isConnected) {
      alert("Connecting to server... please wait.");
      return;
    }

    setStatus('SEARCHING');
    setSearchReason(reason);
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

  // WebSocket Event Listener
  useEffect(() => {
    const handleWsEvent = (msg: any) => {
      if (!msg || !msg.type) return;
      const rId = msg.roomId || msg.room_id;

      if (msg.type === 'match_found') {
        setActiveRoomId(rId);
        const pData = msg.partner || msg.partnerDetails || msg.user || {};
        
        setPartner({
          name: pData.name || msg.partner_name || msg.partnerName || msg.partner_fake_name || 'Anonymous',
          username: pData.username || msg.partner_username || 'unknown',
          avatar: pData.avatar || pData.avatar_url || msg.partner_avatar || ''
        });

        setStatus('CHATTING');
        setMessages([{ id: Date.now(), text: "You are connected! Say hi.", isMe: false, isSystem: true }]);
        return;
      }

      if (msg.type === 'send_message' && rId === activeRoomIdRef.current) {
        // Hardened sender check to ensure it catches the message
        const senderId = msg.from || msg.sender_id || msg.userId;
        
        if (senderId !== user?.id) {
           // Hardened text extraction
           const messageText = msg.text || msg.content;
           setMessages(prev => [...prev, { id: Date.now(), text: messageText, isMe: false }]);
           
           const audio = new Audio('/match.mp3');
           audio.play().catch(() => {});
           
           if (msg.fromName) {
             setPartner(prev => {
               if (!prev || prev.name !== msg.fromName) {
                 return { name: msg.fromName, username: prev?.username || 'anonymous', avatar: prev?.avatar || '' };
               }
               return prev;
             });
           }
        }
        return;
      }

      if ((msg.type === 'stranger_disconnected' || msg.type === 'room_closed') && rId === activeRoomIdRef.current) {
         startSearch('PARTNER_LEFT');
         return;
      }
    };

    const unsubscribe = subscribe(handleWsEvent);
    return () => unsubscribe();
  }, [subscribe, startSearch, user?.id]);

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
        startSearch('MANUAL'); 
      }
    } catch (error) {
      console.error(`Failed to execute ${actionType}:`, error);
      alert(`Failed to complete action.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const executeReport = async () => {
    if (!activeRoomIdRef.current || !reportReason.trim()) return;
    setIsProcessingAction(true);
    try {
      await api.post('/match/report', { reported_username: partner?.username, reason: reportReason });
      setReportReason("");
      await executeMatchAction('block');
    } catch (error) {
      alert("Failed to submit report.");
      setIsProcessingAction(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !activeRoomId) return;

    const newMsg = { id: Date.now(), text: inputValue, isMe: true };
    setMessages((prev) => [...prev, newMsg]);
    
    // THE ULTIMATE FIX: Exact strict schema the backend html test file expects
    if (sendRaw) {
        sendRaw({
            type: 'send_message',
            roomId: activeRoomId,
            text: inputValue,
            tempId: `tmp_${Date.now()}`
        });
    }

    setInputValue("");
    setShowEmojiPicker(false);
  };

  const onEmojiClick = (emojiObject: any) => {
    setInputValue((prev) => prev + emojiObject.emoji);
  };

  return (
    <DashboardLayout>
      <div className="w-full h-full flex flex-col relative bg-gray-50 dark:bg-[#030303] transition-colors duration-300">
        
        {/* CUSTOM MODALS OVERLAY */}
        {modalType !== 'NONE' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
              
              {/* BLOCK MODAL */}
              {modalType === 'BLOCK' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-[#451212] text-red-600 dark:text-red-500 flex items-center justify-center mx-auto mb-5 shadow-inner border border-red-100 dark:border-[#5c1c1c]">
                    <Ban size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-display font-extrabold text-gray-900 dark:text-white mb-2">Block {partner?.name}?</h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">You will no longer be matched with this person, and they won't be able to message you.</p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => executeMatchAction('block')} disabled={isProcessingAction} className="w-full py-3.5 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition-all font-extrabold flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_0_4px_10px_rgba(220,38,38,0.2)]">
                      {isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Block'}
                    </button>
                    <button onClick={() => setModalType('NONE')} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#343536] transition-colors font-extrabold">Cancel</button>
                  </div>
                </div>
              )}

              {/* REPORT MODAL */}
              {modalType === 'REPORT' && (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-[#4a2411] text-orange-500 flex items-center justify-center border border-orange-100 dark:border-[#733312]">
                      <Flag size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-display font-extrabold text-gray-900 dark:text-white">Report User</h3>
                  </div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Please let us know why you are reporting this user. They will be automatically blocked.</p>
                  <textarea 
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#343536] rounded-2xl p-4 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[120px] mb-6 resize-none shadow-inner"
                    autoFocus
                  />
                  <div className="flex flex-col gap-3">
                    <button onClick={executeReport} disabled={isProcessingAction || !reportReason.trim()} className="w-full py-3.5 rounded-2xl bg-orange-500 text-white hover:bg-orange-400 disabled:opacity-50 transition-all font-extrabold flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_0_4px_10px_rgba(249,115,22,0.2)]">
                      {isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Report'}
                    </button>
                    <button onClick={() => setModalType('NONE')} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#343536] transition-colors font-extrabold">Cancel</button>
                  </div>
                </div>
              )}

              {/* FRIEND SUCCESS MODAL */}
              {modalType === 'FRIEND_SUCCESS' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-[#14532D] text-green-500 flex items-center justify-center mx-auto mb-5 border border-green-100 dark:border-[#166534] shadow-inner">
                    <CheckCircle2 size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-display font-extrabold text-gray-900 dark:text-white mb-2">Request Sent!</h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">A friend request has been sent to <span className="font-bold text-gray-700 dark:text-gray-200">{partner?.name}</span>. You can keep chatting!</p>
                  <button onClick={() => setModalType('NONE')} className="w-full py-3.5 rounded-2xl bg-blue-600 dark:bg-[#1E3A8A] text-white hover:bg-blue-500 transition-all font-extrabold shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                    Continue Chatting
                  </button>
                </div>
              )}

              {/* CANCEL/LEAVE WARNING MODAL */}
              {modalType === 'LEAVE_WARNING' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-50 dark:bg-[#4a3f11] text-yellow-600 dark:text-yellow-500 flex items-center justify-center mx-auto mb-5 border border-yellow-100 dark:border-[#736112]">
                    <AlertTriangle size={32} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-display font-extrabold text-gray-900 dark:text-white mb-2">Leave Search?</h3>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">Are you sure you want to stop searching for a match?</p>
                  <div className="flex flex-col gap-3">
                    <button onClick={executeCancelSearch} disabled={isLoading} className="w-full py-3.5 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition-all font-extrabold flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_0_4px_10px_rgba(220,38,38,0.2)]">
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Leave'}
                    </button>
                    <button onClick={() => setModalType('NONE')} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#343536] transition-colors font-extrabold">Keep Searching</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* --- MAIN AREA --- */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* Top Server Connection Pill (Floating) */}
          {status !== 'CHATTING' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] rounded-full shadow-sm animate-in slide-in-from-top-4 duration-500">
               <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
               <span className="text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">{isConnected ? 'Server Connected' : 'Connecting...'}</span>
            </div>
          )}

          {/* --- STATE 1: IDLE --- */}
          {status === 'IDLE' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500 overflow-hidden relative">
              
              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-60 dark:opacity-100">
                <div className="absolute w-[300px] h-[300px] bg-blue-400/20 dark:bg-blue-600/10 blur-3xl rounded-full animate-pulse"></div>
                
                <div className="absolute w-[220px] h-[220px] md:w-[280px] md:h-[280px] border border-dashed border-gray-200 dark:border-blue-900/30 rounded-full animate-spin [animation-duration:15s] flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500/50 rounded-full absolute -top-1"></div>
                </div>
                <div className="absolute w-[300px] h-[300px] md:w-[380px] md:h-[380px] border border-dotted border-gray-200 dark:border-blue-900/10 rounded-full animate-spin [animation-duration:25s] animation-direction-reverse flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-300 dark:bg-blue-700/50 rounded-full absolute top-10"></div>
                </div>
              </div>

              <div className="relative group z-10">
                 <div className="absolute inset-0 bg-blue-300/30 dark:bg-blue-600/20 blur-2xl rounded-[3rem] md:rounded-[4rem] scale-125 animate-pulse transition-transform duration-700"></div>
                 
                 <button 
                   onClick={() => startSearch('MANUAL')}
                   disabled={!isConnected}
                   className="relative w-36 h-36 md:w-48 md:h-48 bg-blue-600 dark:bg-[#1E3A8A] border border-blue-500 dark:border-[#1E40AF] rounded-[3rem] md:rounded-[4rem] flex items-center justify-center hover:-translate-y-2 transition-all cursor-pointer shadow-[inset_0_4px_12px_rgba(255,255,255,0.4),_0_15px_30px_rgba(37,99,235,0.3)] dark:shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden group-hover:shadow-[inset_0_4px_12px_rgba(255,255,255,0.6),_0_20px_40px_rgba(37,99,235,0.5)] dark:group-hover:shadow-[inset_0_2px_8px_rgba(255,255,255,0.2),_0_30px_60px_rgba(0,0,0,0.7)]"
                 >
                    <Zap className="w-14 h-14 md:w-20 md:h-20 text-white drop-shadow-md group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                    
                    <div className="absolute inset-0 rounded-[3rem] md:rounded-[4rem] border-4 border-white/10 dark:border-white/5 shadow-inner"></div>
                 </button>
               </div>

               <h3 className="mt-10 md:mt-12 text-2xl md:text-4xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight z-10">Start Texting</h3>
               <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium mt-2 md:mt-3 max-w-sm px-4 z-10">
                 Connect with random people instantly. No video, just pure conversation.
               </p>
            </div>
          )}

          {/* STATE 2: SEARCHING */}
          {status === 'SEARCHING' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
               <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500/20 animate-ping"></span>
                  <span className="absolute inline-flex h-[70%] w-[70%] rounded-full bg-blue-500/30 animate-ping" style={{ animationDelay: '0.2s' }}></span>
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-white dark:bg-[#1A1A1B] border border-blue-200 dark:border-[#272729] rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_10px_20px_rgba(37,99,235,0.1)] z-10 transition-colors">
                     <RefreshCw className="w-8 h-8 md:w-10 md:h-10 text-blue-600 dark:text-blue-500 animate-spin" strokeWidth={2.5} />
                  </div>
               </div>
               
               <h3 className="mt-8 md:mt-10 text-xl md:text-2xl font-display font-extrabold text-gray-900 dark:text-white transition-colors">
                 {searchReason === 'PARTNER_LEFT' ? 'Partner disconnected...' : 'Looking for someone...'}
               </h3>
               <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium mt-2 transition-colors">
                 {searchReason === 'PARTNER_LEFT' ? 'They left the chat. Finding a new match for you.' : 'Searching the global network'}
               </p>
               
               <button 
                  onClick={() => setModalType('LEAVE_WARNING')} 
                  className="mt-8 px-6 py-2.5 rounded-full bg-red-50 dark:bg-[#451212] text-red-600 dark:text-red-400 text-xs md:text-sm font-extrabold flex items-center gap-2 hover:bg-red-100 dark:hover:bg-[#5c1c1c] transition-all border border-red-100 dark:border-transparent"
               >
                  <XCircle size={16} strokeWidth={2.5} /> Cancel Search
               </button>
            </div>
          )}

          {/* STATE 3: CHATTING */}
          {status === 'CHATTING' && (
            <div className="flex-1 flex flex-col w-full h-full relative animate-in fade-in duration-500 max-w-5xl mx-auto">
               
               {/* FLOATING HEADER */}
               <div className="m-3 md:m-6 p-3 md:p-4 bg-white/90 dark:bg-[#1A1A1B]/90 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-gray-200 dark:border-[#343536] shadow-sm flex items-center justify-between shrink-0 transition-colors z-20">
                  
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                     <div className="relative shrink-0">
                        <img 
                            src={partner?.avatar || `https://ui-avatars.com/api/?name=${partner?.name || 'U'}&background=random`} 
                            alt={partner?.name} 
                            className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl object-cover bg-gray-100 dark:bg-[#272729] border border-gray-200 dark:border-[#343536]"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#1A1A1B] rounded-full"></div>
                     </div>
                     <div className="flex flex-col min-w-0">
                        <span className="text-sm md:text-lg font-extrabold text-gray-900 dark:text-white leading-tight truncate">
                          {partner?.name || 'Stranger'}
                        </span>
                        <span className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest truncate mt-0.5">
                          Random Match
                        </span>
                     </div>
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                     <button 
                        onClick={() => executeMatchAction('friend')} 
                        className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-green-50 dark:bg-[#14532D] text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-[#166534] transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-green-100 dark:border-transparent" 
                        title="Add Friend"
                     >
                        <UserPlus className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                     </button>
                     <button 
                        onClick={() => setModalType('REPORT')} 
                        className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-orange-50 dark:bg-[#4a2411] text-orange-500 hover:bg-orange-100 dark:hover:bg-[#733312] transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-orange-100 dark:border-transparent" 
                        title="Report User"
                     >
                        <Flag className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                     </button>
                     <button 
                        onClick={() => setModalType('BLOCK')} 
                        className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-gray-100 dark:bg-[#272729] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#343536] transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] border border-gray-200 dark:border-[#343536]" 
                        title="Block User"
                     >
                        <Ban className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />
                     </button>
                     <button 
                        onClick={() => executeMatchAction('skip')} 
                        disabled={isProcessingAction}
                        className="px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-all text-xs md:text-sm font-extrabold flex items-center gap-1.5 md:gap-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_4px_8px_rgba(239,68,68,0.2)] disabled:opacity-50 ml-1 md:ml-2 hover:-translate-y-0.5"
                     >
                        {isProcessingAction ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" strokeWidth={2.5} /> : <XCircle className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.5} />} 
                        <span className="hidden md:inline">Skip</span>
                     </button>
                  </div>
               </div>

               {/* CHAT MESSAGES AREA */}
               <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
                  <div className="min-h-full flex flex-col justify-end space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isSystem ? 'justify-center' : msg.isMe ? 'justify-end' : 'justify-start'}`}>
                           {msg.isSystem ? (
                             <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] px-4 py-1.5 rounded-full text-center shadow-sm transition-colors">
                               {msg.text}
                             </span>
                           ) : (
                             <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3 md:px-6 md:py-4 rounded-[1.5rem] text-sm md:text-base font-medium leading-relaxed shadow-sm transition-colors ${
                                msg.isMe 
                                  ? 'bg-blue-600 text-white rounded-br-none shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]' 
                                  : 'bg-white dark:bg-[#1A1A1B] text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-[#272729] rounded-bl-none'
                             }`}>
                                {msg.text}
                             </div>
                           )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>
               </div>

               {/* FLOATING INPUT AREA */}
               <div className="p-3 md:p-6 bg-transparent shrink-0 z-10 relative">
                  {showEmojiPicker && (
                    <div className="absolute bottom-20 md:bottom-24 left-4 md:left-8 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-[#343536] animate-in slide-in-from-bottom-2">
                      <EmojiPicker 
                        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} 
                        onEmojiClick={onEmojiClick}
                        width={window.innerWidth < 400 ? window.innerWidth - 30 : 350}
                        height={400}
                        lazyLoadEmojis={true}
                        skinTonesDisabled={true}
                        searchDisabled={true}
                      />
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2 items-center bg-white dark:bg-[#1A1A1B] p-2 md:p-2.5 rounded-[2rem] md:rounded-[2.5rem] border border-gray-200 dark:border-[#343536] shadow-sm focus-within:shadow-md focus-within:border-blue-300 dark:focus-within:border-blue-500/50 transition-all">
                     <button 
                       type="button"
                       onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                       className="p-2 md:p-3 text-gray-400 hover:text-yellow-500 transition-colors shrink-0"
                     >
                       <Smile className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
                     </button>
                     <input 
                         type="text" 
                         value={inputValue}
                         onChange={(e) => setInputValue(e.target.value)}
                         placeholder="Type a message..."
                         className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-medium text-sm md:text-base px-2 transition-colors"
                         autoFocus
                     />
                     <button type="submit" className="p-3 md:px-6 md:py-3.5 bg-blue-600 dark:bg-[#1E3A8A] border border-blue-600 dark:border-[#1E40AF] text-white rounded-[1.5rem] md:rounded-[2rem] font-extrabold flex items-center justify-center gap-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] hover:scale-105 transition-all shrink-0 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]" disabled={!inputValue.trim()}>
                        <Send className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} /> 
                        <span className="hidden md:inline">Send</span>
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