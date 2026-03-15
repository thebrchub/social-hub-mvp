import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Send, AlertTriangle, UserPlus, Flag, Mic, MicOff, Video, VideoOff, FastForward, Power, Loader2, Maximize, Minimize, MessageSquare, MessageSquareOff, X, Columns, Rows, Smile, Ban, CheckCircle2 } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import Modal from '../components/Modal';

type MatchState = 'welcome' | 'searching' | 'matched';
type ModalType = 'NONE' | 'REPORT' | 'BLOCK' | 'FRIEND_SUCCESS' | 'LEAVE_WARNING';

const VidMatches = () => {
  const user = useAuthStore(state => state.user);
  const { theme } = useThemeStore();
  const { subscribe, sendMessage, sendRaw } = useWebSocket();

  const [layoutMode, setLayoutMode] = useState<'stacked' | 'split'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('vidMatches_layoutMode') as 'stacked' | 'split') || 'split';
    return 'split';
  });
  const [showChat, setShowChat] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vidMatches_showChat') !== 'false';
    return true;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('NONE');
  const [reportReason, setReportReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  useEffect(() => localStorage.setItem('vidMatches_layoutMode', layoutMode), [layoutMode]);
  useEffect(() => localStorage.setItem('vidMatches_showChat', String(showChat)), [showChat]);

  const [matchState, setMatchState] = useState<MatchState>('welcome');
  const [slideState, setSlideState] = useState<'idle' | 'sliding-out' | 'sliding-in'>('idle');
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  
  const [, setPeerId] = useState<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  
  const setRoomSync = (id: string | null) => { setActiveRoomId(id); activeRoomIdRef.current = id; };
  const setPeerSync = (id: string | null) => { setPeerId(id); peerIdRef.current = id; };

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [mediaError, setMediaError] = useState<{title: string, desc: string, action: string} | null>(null);

  const [chatMessages, setChatMessages] = useState<{ sender: 'me' | 'stranger' | 'system', text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // FIX: Persistent Remote Stream Reference so React doesn't wipe it on re-render
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const wsRef = useRef<any>(null); 
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // FIX: Relentless Auto-Binder to guarantee video elements always have their streams
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current.getTracks().length > 0 && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }); // No dependency array = runs on every render!

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const resetIdleTimer = () => {
    setShowControls(true);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current); };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const cleanupMatch = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    remoteStreamRef.current = new MediaStream(); // Wipe remote stream
    setRoomSync(null);
    setPeerSync(null);
  };

  const handlePeerDisconnected = async () => {
    if (matchState !== 'matched') return;
    setChatMessages(prev => [...prev, { sender: 'system', text: 'Stranger left. Finding a new match...' }]);
    cleanupMatch();
    setSlideState('sliding-out');
    
    try {
      await api.post('/match/leave', {});
      await api.post('/match/enter', {});
      setTimeout(() => {
        setMatchState('searching');
        setSlideState('idle');
      }, 400); 
    } catch (err) {
      setMatchState('welcome');
    }
  };

  const getIceConfig = async () => {
    try {
      const res = await api.get('/calls/config');
      return res.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
    } catch (e) {
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  };

  const initLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaError({ title: "Browser Blocked Camera", desc: "Your browser does not allow camera access here.", action: "Use HTTPS or localhost." });
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err: any) {
      setMediaError({ title: "Hardware Error", desc: "Could not access camera.", action: "Check permissions or physical camera switches." });
      setMatchState('welcome'); 
      return null;
    }
  };

  const createPeerConnection = async (targetUserId: string, roomId: string) => {
    const iceServers = await getIceConfig();
    const pc = new RTCPeerConnection({ 
        iceServers,
        iceTransportPolicy: 'all', 
        bundlePolicy: 'max-bundle'
    });
    pcRef.current = pc;
    iceCandidateQueue.current = [];

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current({ type: 'ice_candidate', roomId: roomId, room_id: roomId, to: targetUserId, callId: roomId, candidate: JSON.stringify(event.candidate) });
      }
    };

    // FIX: Push tracks into persistent MediaStream
    pc.ontrack = (event) => {
      // 1. Properly check for streams using standard if/else
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(t => remoteStreamRef.current.addTrack(t));
      } else {
        remoteStreamRef.current.addTrack(event.track);
      }

      // 2. Attach the stream to the video element and force play
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed' || pc.iceConnectionState === 'disconnected') {
        handlePeerDisconnected();
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }
    return pc;
  };

  const handleStart = async () => {
    const stream = await initLocalStream();
    if (!stream) return; 
    setMatchState('searching');
    setChatMessages([{ sender: 'system', text: 'Looking for a random stranger...' }]);
    setModalType('NONE');
    try { await api.post('/match/enter', {}); } catch (err) { setMatchState('welcome'); }
  };

  const handleSkip = async () => {
    if (matchState === 'searching' || slideState !== 'idle') return;
    setSlideState('sliding-out');
    cleanupMatch();
    setModalType('NONE');
    try {
      await api.post('/match/leave', {});
      await api.post('/match/enter', {});
      setTimeout(() => {
        setMatchState('searching');
        setSlideState('idle');
        setChatMessages([{ sender: 'system', text: 'Skipped. Looking for someone new...' }]);
      }, 400); 
    } catch (err) { setMatchState('welcome'); }
  };

  const handleExit = async () => {
    cleanupMatch();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    try { await api.post('/match/leave', {}); } catch (e) {}
    setMatchState('welcome');
    setChatMessages([{ sender: 'system', text: 'You have left the video chat.' }]);
  };

  const executeCancelSearch = async () => {
    try { await api.post('/match/leave', {}); setMatchState('welcome'); setModalType('NONE'); } catch (e) {}
  };

  const executeMatchAction = async (actionType: 'skip' | 'block' | 'friend') => {
    if (!activeRoomIdRef.current) return;
    setIsProcessingAction(true);
    try {
      await api.post('/match/action', { room_id: activeRoomIdRef.current, action: actionType, partner_username: peerIdRef.current });
      if (actionType === 'friend') setModalType('FRIEND_SUCCESS'); 
      else { setModalType('NONE'); handleSkip(); }
    } catch (error) { alert(`Failed to complete action.`); } finally { setIsProcessingAction(false); }
  };

  const executeReport = async () => {
    if (!activeRoomIdRef.current || !reportReason.trim()) return;
    setIsProcessingAction(true);
    try {
      await api.post('/match/report', { reported_username: peerIdRef.current, reason: reportReason });
      setReportReason("");
      await executeMatchAction('block');
    } catch (error) { alert("Failed to submit report."); setIsProcessingAction(false); }
  };

  // Helper for bulletproof JSON parsing
  const getParsedData = (data: any) => typeof data === 'string' ? JSON.parse(data) : data;

  useEffect(() => {
    if (!subscribe) return;
    
    wsRef.current = (payload: any) => { 
        if (sendRaw) { sendRaw(payload); }
        else if (sendMessage) { (sendMessage as any)(JSON.stringify(payload)); }
    };

    const unsubscribe = subscribe(async (parsed: any) => {
      const currentRoomId = activeRoomIdRef.current;

      if (parsed.type === 'match_found') {
        const roomId = parsed.roomId || parsed.room_id;
        setRoomSync(roomId);
        setMatchState('matched');
        setSlideState('sliding-in');
        setChatMessages([{ sender: 'system', text: 'You are now video chatting with a stranger!' }]);
        setTimeout(() => setSlideState('idle'), 500);

        const partnerId = parsed.peerId || parsed.partnerId || parsed.partner_id || parsed.partner_username || 'stranger';
        if (partnerId !== 'stranger') setPeerSync(partnerId);

        const isInitiator = parsed.initiator || parsed.isInitiator || (user?.id && partnerId !== 'stranger' && String(user.id).localeCompare(String(partnerId)) < 0);

        if (isInitiator) {
            const pc = await createPeerConnection(partnerId, roomId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            wsRef.current({ type: 'call_offer', roomId: roomId, room_id: roomId, to: partnerId, callId: roomId, sdp: JSON.stringify(offer) });
        }
      }

      if (parsed.type === 'stranger_disconnected' || parsed.type === 'room_closed' || parsed.type === 'peer_left') {
        if (parsed.roomId === currentRoomId || parsed.room_id === currentRoomId) handlePeerDisconnected();
      }

      if ((parsed.type === 'call_offer' || parsed.type === 'webrtc_offer') && (parsed.callId === currentRoomId || parsed.roomId === currentRoomId)) {
        const senderId = parsed.from || parsed.senderId || parsed.peerId;
        if (senderId) setPeerSync(senderId);
        
        const pc = await createPeerConnection(senderId || 'stranger', currentRoomId!);
        const sdpData = getParsedData(parsed.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription(sdpData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        wsRef.current({ type: 'call_answer', roomId: currentRoomId, room_id: currentRoomId, to: senderId, callId: currentRoomId, sdp: JSON.stringify(answer) });
        
        iceCandidateQueue.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
        iceCandidateQueue.current = [];
      }

      if (parsed.type === 'call_answer' && (parsed.callId === currentRoomId || parsed.roomId === currentRoomId)) {
        if (pcRef.current) {
          const sdpData = getParsedData(parsed.sdp);
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdpData));
          iceCandidateQueue.current.forEach(c => pcRef.current!.addIceCandidate(new RTCIceCandidate(c)));
          iceCandidateQueue.current = [];
        }
      }

      if (parsed.type === 'ice_candidate' && (parsed.callId === currentRoomId || parsed.roomId === currentRoomId)) {
        const candObj = getParsedData(parsed.candidate);
        if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(candObj));
        } else {
          iceCandidateQueue.current.push(candObj);
        }
      }

      if (parsed.type === 'send_message' && (parsed.roomId === currentRoomId || parsed.room_id === currentRoomId) && parsed.from !== user?.id) {
        setChatMessages(prev => [...prev, { sender: 'stranger', text: parsed.text || parsed.content }]);
      }
    });

    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [subscribe, user?.id]); 

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !newMuted);
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const newCamOff = !isCamOff;
    setIsCamOff(newCamOff);
    localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !newCamOff);
  };

  const onEmojiClick = (emojiObject: any) => setInputValue((prev) => prev + emojiObject.emoji);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || matchState !== 'matched' || !activeRoomId) return;
    setChatMessages(prev => [...prev, { sender: 'me', text: inputValue }]);
    wsRef.current({ type: 'send_message', roomId: activeRoomId, room_id: activeRoomId, text: inputValue, tempId: `tmp_${Date.now()}` });
    setInputValue('');
    setShowEmojiPicker(false);
  };

  return (
    <DashboardLayout>
      <style>{`aside.w-\\[350px\\] { display: none !important; }`}</style>
      <div ref={containerRef} onMouseMove={resetIdleTimer} onTouchStart={resetIdleTimer} className="absolute inset-0 z-50 flex flex-col md:flex-row bg-gray-100 dark:bg-[#050505] overflow-hidden transition-colors">
        
        {/* CUSTOM MODALS OVERLAY */}
        {modalType !== 'NONE' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#343536] rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
              {modalType === 'BLOCK' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-[#451212] text-red-600 dark:text-red-500 flex items-center justify-center mx-auto mb-5 shadow-inner border border-red-100 dark:border-[#5c1c1c]"><Ban size={32} strokeWidth={2.5} /></div>
                  <h3 className="text-xl font-display font-extrabold text-gray-900 dark:text-white mb-2">Block User?</h3>
                  <div className="flex flex-col gap-3 mt-6">
                    <button onClick={() => executeMatchAction('block')} disabled={isProcessingAction} className="w-full py-3.5 rounded-2xl bg-red-600 text-white hover:bg-red-500 transition-all font-extrabold shadow-sm">{isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yes, Block'}</button>
                    <button onClick={() => setModalType('NONE')} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-300 font-extrabold hover:bg-gray-200 dark:hover:bg-[#343536]">Cancel</button>
                  </div>
                </div>
              )}
              {modalType === 'REPORT' && (
                <div>
                  <h3 className="text-xl font-display font-extrabold text-gray-900 dark:text-white mb-4">Report User</h3>
                  <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Enter reason..." className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#343536] rounded-2xl p-4 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-h-[120px] mb-6 shadow-inner" autoFocus />
                  <div className="flex flex-col gap-3">
                    <button onClick={executeReport} disabled={isProcessingAction || !reportReason.trim()} className="w-full py-3.5 rounded-2xl bg-orange-500 text-white font-extrabold shadow-sm disabled:opacity-50 hover:bg-orange-400">{isProcessingAction ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Report'}</button>
                    <button onClick={() => setModalType('NONE')} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-300 font-extrabold hover:bg-gray-200 dark:hover:bg-[#343536]">Cancel</button>
                  </div>
                </div>
              )}
              {modalType === 'FRIEND_SUCCESS' && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-[#14532D] text-green-500 flex items-center justify-center mx-auto mb-5 border border-green-100 dark:border-[#166534]"><CheckCircle2 size={32} strokeWidth={2.5} /></div>
                  <h3 className="text-xl font-display font-extrabold text-gray-900 dark:text-white mb-2">Request Sent!</h3>
                  <button onClick={() => setModalType('NONE')} className="w-full py-3.5 mt-4 rounded-2xl bg-blue-600 text-white font-extrabold shadow-sm hover:bg-blue-500">Continue Chatting</button>
                </div>
              )}
              {modalType === 'LEAVE_WARNING' && (
                <div className="text-center">
                  <h3 className="text-xl font-display font-extrabold text-gray-900 dark:text-white mb-2">Leave Search?</h3>
                  <div className="flex flex-col gap-3 mt-6">
                    <button onClick={executeCancelSearch} className="w-full py-3.5 rounded-2xl bg-red-600 text-white font-extrabold shadow-sm hover:bg-red-500">Yes, Leave</button>
                    <button onClick={() => setModalType('NONE')} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-[#272729] text-gray-700 dark:text-gray-300 font-extrabold hover:bg-gray-200 dark:hover:bg-[#343536]">Keep Searching</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative flex flex-col bg-gray-100 dark:bg-[#050505] flex-1 shrink-0 z-20 overflow-hidden transition-colors">
          <div className={`absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-40 transition-opacity duration-500 ${showControls || matchState === 'welcome' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
             <div className="bg-white/90 dark:bg-black/40 backdrop-blur-md border border-gray-200 dark:border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${matchState === 'searching' ? 'bg-yellow-500 animate-pulse' : matchState === 'matched' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-400'}`}></div>
                <span className="text-gray-900 dark:text-white text-xs font-extrabold tracking-widest uppercase">{matchState === 'welcome' ? 'READY' : matchState === 'searching' ? 'SEARCHING...' : 'LIVE'}</span>
              </div>
             <div className="flex items-center gap-2">
                <button onClick={() => setLayoutMode(prev => prev === 'stacked' ? 'split' : 'stacked')} className="bg-white/80 hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 backdrop-blur-md border border-gray-300 dark:border-white/10 text-gray-700 dark:text-white p-3 rounded-xl shadow-sm hidden md:block" title="Switch Layout"><Columns size={18} strokeWidth={2.5} /></button>
                <button onClick={() => setShowChat(!showChat)} className="bg-white/80 hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 backdrop-blur-md border border-gray-300 dark:border-white/10 text-gray-700 dark:text-white p-3 rounded-xl shadow-sm" title="Toggle Chat">{showChat ? <MessageSquareOff size={18} strokeWidth={2.5} /> : <MessageSquare size={18} strokeWidth={2.5} />}</button>
                <button onClick={toggleFullscreen} className="bg-white/80 hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 backdrop-blur-md border border-gray-300 dark:border-white/10 text-gray-700 dark:text-white p-3 rounded-xl shadow-sm hidden md:block" title="Toggle Fullscreen">{isFullscreen ? <Minimize size={18} strokeWidth={2.5} /> : <Maximize size={18} strokeWidth={2.5} />}</button>
                {matchState !== 'welcome' && (
                    <button onClick={handleExit} className="bg-red-50 hover:bg-red-100 border border-red-200 dark:bg-red-500/20 dark:hover:bg-red-600/80 dark:border-red-500/50 text-red-600 dark:text-red-500 dark:hover:text-white p-3 rounded-xl backdrop-blur-md shadow-sm ml-2"><Power size={18} strokeWidth={3} /></button>
                )}
             </div>
          </div>

          <div className={`flex-1 flex p-2 md:p-4 pt-16 md:pt-20 gap-2 md:gap-4 overflow-hidden relative ${matchState === 'welcome' ? '' : 'pb-24 md:pb-28'} ${layoutMode === 'split' ? 'md:flex-row flex-col' : 'flex-col items-center justify-center'}`}>
             
             {matchState === 'welcome' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] z-30 animate-in fade-in zoom-in transition-colors">
                     <div className="relative group z-10">
                        <div className="absolute inset-0 bg-purple-300/50 dark:bg-purple-600/20 blur-2xl rounded-[3rem] md:rounded-[4rem] scale-125 animate-pulse transition-transform duration-700"></div>
                        <button onClick={handleStart} className="relative w-36 h-36 md:w-48 md:h-48 bg-purple-600 dark:bg-[#4C1D95] border border-purple-500 dark:border-[#5B21B6] rounded-[3rem] md:rounded-[4rem] flex items-center justify-center hover:-translate-y-2 transition-all cursor-pointer shadow-xl overflow-hidden group-hover:shadow-2xl">
                           <Video className="w-14 h-14 md:w-20 md:h-20 text-white drop-shadow-md group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                        </button>
                     </div>
                     <h3 className="mt-10 md:mt-12 text-2xl md:text-4xl font-display font-extrabold text-gray-900 dark:text-white tracking-tight z-10 transition-colors">Stranger Cam</h3>
                     <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium mt-2 md:mt-3 max-w-sm text-center px-4 z-10 transition-colors">Connect face-to-face with random people instantly.</p>
                 </div>
             )}

             {/* STRANGER VIDEO */}
             <div className={`relative w-full rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-gray-200 dark:bg-[#111] border border-gray-300 dark:border-white/10 shadow-inner flex-1 transition-all duration-300 ${layoutMode === 'stacked' ? 'max-w-4xl' : ''}`}>
                <div className={`absolute bottom-4 left-4 bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white backdrop-blur-md border border-gray-300 dark:border-white/10 text-[10px] font-extrabold tracking-widest px-3 py-1.5 rounded-lg z-20 transition-opacity duration-500 ${showControls && matchState === 'matched' ? 'opacity-100' : 'opacity-0'}`}>STRANGER</div>
                {matchState === 'searching' && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-in fade-in zoom-in duration-500 bg-gray-100 dark:bg-[#0a0a0a]">
                      <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                         <span className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping"></span>
                         <div className="w-20 h-20 md:w-24 md:h-24 bg-white dark:bg-[#1A1A1B] border border-purple-200 dark:border-purple-500/50 rounded-full flex items-center justify-center shadow-lg z-10"><Loader2 className="w-8 h-8 md:w-10 md:h-10 text-purple-600 dark:text-purple-500 animate-spin" strokeWidth={2.5} /></div>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-bold mt-8 animate-pulse text-sm md:text-base tracking-widest uppercase">Finding someone...</p>
                   </div>
                )}
                <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${slideState === 'sliding-out' ? '-translate-x-full opacity-0 scale-95' : slideState === 'sliding-in' ? 'translate-x-full opacity-0 scale-105' : matchState === 'searching' ? 'opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}`}>
                   <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover opacity-90" />
                </div>
                {matchState === 'matched' && slideState === 'idle' && (
                   <button onClick={() => executeMatchAction('friend')} className={`absolute top-4 right-4 bg-green-500/90 hover:bg-green-600 backdrop-blur-md p-3 rounded-xl shadow-lg border border-green-400 transition-all active:scale-90 z-30 group duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`} title="Add as Friend"><UserPlus size={20} strokeWidth={2.5} className="text-white drop-shadow-sm" /></button>
                )}
             </div>

             {/* MY VIDEO */}
             <div className={`relative w-full rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-gray-200 dark:bg-[#111] border border-gray-300 dark:border-white/10 shadow-inner flex-1 transition-all duration-300 ${layoutMode === 'stacked' ? 'max-w-4xl' : ''}`}>
                <div className={`absolute bottom-4 left-4 bg-blue-100 dark:bg-blue-600/80 text-blue-800 dark:text-white backdrop-blur-md border border-blue-300 dark:border-white/20 text-[10px] font-extrabold tracking-widest px-3 py-1.5 rounded-lg z-20 transition-opacity duration-500 ${showControls && matchState !== 'welcome' ? 'opacity-100' : 'opacity-0'}`}>YOU</div>
                <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-opacity scale-x-[-1] ${isCamOff ? 'opacity-0' : 'opacity-100'}`} />
                {isCamOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
                    <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3 border border-gray-300 dark:border-transparent"><VideoOff size={32} className="text-gray-500" strokeWidth={2.5} /></div>
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Camera Disabled</span>
                  </div>
                )}
                {isMuted && (
                  <div className="absolute top-4 right-4 bg-red-100 dark:bg-red-500/90 backdrop-blur-sm p-2 rounded-xl shadow-sm border border-red-300 dark:border-red-400/50"><MicOff size={16} strokeWidth={2.5} className="text-red-600 dark:text-white drop-shadow-sm" /></div>
                )}
             </div>
          </div>

          {/* FLOATING ACTION BAR */}
          {matchState !== 'welcome' && (
              <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-5 z-40 bg-white/90 dark:bg-black/60 backdrop-blur-xl px-4 py-3 md:px-6 md:py-3.5 rounded-[2rem] border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showControls ? 'bottom-6 md:bottom-8 opacity-100 translate-y-0 scale-100' : 'bottom-0 opacity-0 translate-y-20 scale-95 pointer-events-none'}`}>
                 <button onClick={() => setModalType('REPORT')} className="p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/30 text-orange-500 transition-colors shadow-sm" title="Report"><Flag size={22} strokeWidth={2.5} /></button>
                 <div className="flex gap-2 border-x border-gray-200 dark:border-white/10 px-3 md:px-5">
                    <button onClick={toggleMic} className={`p-3 rounded-xl transition-all shadow-sm ${isMuted ? 'bg-red-100 dark:bg-white/20 text-red-600 dark:text-white' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`} title="Toggle Mic">{isMuted ? <MicOff size={22} strokeWidth={2.5} /> : <Mic size={22} strokeWidth={2.5} />}</button>
                    <button onClick={toggleCam} className={`p-3 rounded-xl transition-all shadow-sm ${isCamOff ? 'bg-gray-200 dark:bg-white/20 text-gray-800 dark:text-white' : 'bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`} title="Toggle Camera">{isCamOff ? <VideoOff size={22} strokeWidth={2.5} /> : <Video size={22} strokeWidth={2.5} />}</button>
                 </div>
                 <button onClick={handleSkip} disabled={matchState === 'searching'} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"><span className="hidden md:inline">SKIP</span> <FastForward size={20} strokeWidth={3} className="fill-white" /></button>
              </div>
          )}
        </div>

        {/* CHAT AREA */}
        <div className={`flex flex-col bg-white dark:bg-[#0f0f0f] border-gray-200 dark:border-[#272729] z-50 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden shrink-0 ${showChat ? 'absolute inset-0 md:relative md:w-[400px] border-l opacity-100' : 'absolute w-0 h-0 md:h-full md:w-0 border-none opacity-0'}`}>
          <div className="w-full md:w-[400px] h-full flex flex-col shrink-0">
              <div className="p-4 border-b border-gray-200 dark:border-[#272729] bg-gray-50 dark:bg-[#1a1a1a] flex items-center justify-between shrink-0 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center border border-purple-200 dark:border-purple-500/20 shrink-0"><MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-500" strokeWidth={2.5} /></div>
                    <div className="min-w-0">
                       <h3 className="font-extrabold text-gray-900 dark:text-white text-sm truncate">Stranger Chat</h3>
                       <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1 uppercase tracking-widest"><AlertTriangle size={10} className="text-yellow-500 shrink-0" strokeWidth={3} /> Encrypted</p>
                    </div>
                 </div>
                 <button onClick={() => setShowChat(false)} className="p-2 bg-white dark:bg-[#272729] hover:bg-gray-100 dark:hover:bg-[#343536] border border-gray-200 dark:border-transparent rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"><X size={18} strokeWidth={2.5} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide flex flex-col">
                 <div className="mt-auto"></div>
                 {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                       {msg.sender === 'system' ? (
                          <span className="text-[10px] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest text-center shadow-sm">{msg.text}</span>
                       ) : (
                          <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${msg.sender === 'me' ? 'bg-purple-600 text-white rounded-br-none shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]' : 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-[#272729] rounded-bl-none'}`}>
                             {msg.sender === 'stranger' && <p className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 mb-1 uppercase tracking-wider">Stranger</p>}
                             {msg.text}
                          </div>
                       )}
                    </div>
                 ))}
                 <div ref={messagesEndRef} />
              </div>
              <div className="p-3 md:p-4 bg-white dark:bg-[#0a0a0a] border-t border-gray-200 dark:border-[#272729] shrink-0 relative transition-colors">
                 {showEmojiPicker && (
                    <div className="absolute bottom-20 right-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-[#343536]"><EmojiPicker theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} onEmojiClick={onEmojiClick} width={320} height={400} /></div>
                 )}
                 <form onSubmit={handleChatSubmit} className="flex items-center gap-2 bg-gray-50 dark:bg-[#1a1a1a] p-2 rounded-2xl border border-gray-200 dark:border-[#272729] shadow-inner focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-400 hover:text-yellow-500 transition-colors shrink-0"><Smile size={20} strokeWidth={2.5} /></button>
                    <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} disabled={matchState !== 'matched'} placeholder={matchState === 'welcome' ? "Match to chat..." : matchState === 'searching' ? "Waiting..." : "Type a message..."} className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white font-medium text-sm px-1 disabled:opacity-50" />
                    <button type="submit" disabled={!inputValue.trim() || matchState !== 'matched'} className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-all shrink-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"><Send size={18} strokeWidth={2.5} className="ml-0.5" /></button>
                 </form>
              </div>
          </div>
        </div>

        <Modal isOpen={mediaError !== null} onClose={() => setMediaError(null)} title={mediaError?.title || "Error"} footer={<button onClick={() => setMediaError(null)} className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all hover:-translate-y-0.5">Got it</button>}>
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-2 border border-red-100 dark:border-red-500/20 shadow-inner"><AlertTriangle size={32} strokeWidth={2.5} /></div>
            <p className="text-gray-900 dark:text-gray-200 font-extrabold text-lg leading-tight">{mediaError?.desc}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium bg-gray-50 dark:bg-black/50 p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-inner w-full">{mediaError?.action}</p>
          </div>
        </Modal>

      </div>
    </DashboardLayout>
  );
};

export default VidMatches;