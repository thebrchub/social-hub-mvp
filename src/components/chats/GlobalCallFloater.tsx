import { useState, useEffect, useRef } from 'react';
import { PhoneCall, Phone, VideoOff, MicOff, Maximize2, Minimize2, PictureInPicture, XCircle, CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/useAuthStore';

export const GlobalCallFloater = () => {
  const { subscribe, sendRaw } = useWebSocket();
  const user = useAuthStore(state => state.user);

  // --- MOBILE DETECTION ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- TOAST STATE (Moved to Bottom Right) ---
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info' | 'warning'} | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callMicOff, setCallMicOff] = useState(false);
  const [callCamOff, setCallCamOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const [pos, setPos] = useState({ right: 24, bottom: 96 }); // Default bottom to avoid chat inputs
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, x: 24, y: 96 });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = (type: 'ring_in' | 'ring_out') => {
      try {
          if (type === 'ring_in') {
             if (!incomingAudioRef.current) { incomingAudioRef.current = new Audio('/ringtone.mp3'); incomingAudioRef.current.loop = true; }
             incomingAudioRef.current.play().catch(() => {});
          } else {
             if (!outgoingAudioRef.current) { outgoingAudioRef.current = new Audio('/ringtone.mp3'); outgoingAudioRef.current.loop = true; }
             outgoingAudioRef.current.play().catch(() => {});
          }
      } catch (e) { console.error("Sound play failed", e); }
  };

  const stopAllRingtones = () => {
      if (incomingAudioRef.current) { incomingAudioRef.current.pause(); incomingAudioRef.current.currentTime = 0; }
      if (outgoingAudioRef.current) { outgoingAudioRef.current.pause(); outgoingAudioRef.current.currentTime = 0; }
  };

  const endActiveCall = (reason: 'ended' | 'rejected' | 'busy' | 'error' = 'ended') => {
      stopAllRingtones();
      if (activeCall && activeCall.peerId) sendRaw({ type: 'call_end', to: activeCall.peerId, callId: activeCall.id });
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      
      if (activeCall) {
          if (reason === 'rejected') showToast(`Call declined by ${activeCall.peerName}`, 'warning');
          else if (reason === 'busy') showToast(`${activeCall.peerName} is on another call`, 'info');
          else if (reason === 'error') showToast("Call disconnected due to network error", 'error');
          else showToast("Call ended", 'info');
      }

      setActiveCall(null);
      setCallDuration(0);
      
      // TRIGGER REFRESH FOR CALL HISTORY TAB
      window.dispatchEvent(new CustomEvent('REFRESH_CHATS'));
  };

  const getMedia = async (video: boolean) => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: { echoCancellation: true, noiseSuppression: true }, 
              video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false 
          });
          localStreamRef.current = stream; 
          if (localVideoRef.current) localVideoRef.current.srcObject = stream; 
          return stream;
      } catch (err) { 
          showToast("Camera/Mic access denied. Check permissions!", "error");
          return null; 
      }
  };

  const initPeerConnection = async (targetUserId: string, callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc; iceCandidateQueue.current = [];
      pc.onicecandidate = (e) => { if (e.candidate) sendRaw({ type: 'ice_candidate', to: targetUserId, callId, candidate: JSON.stringify(e.candidate) }); };
      pc.ontrack = (e) => { 
          const stream = e.streams && e.streams.length > 0 ? e.streams[0] : new MediaStream([e.track]);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream; 
      };
      pc.oniceconnectionstatechange = () => { 
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
              if (pc.iceConnectionState === 'failed') endActiveCall('error');
              else endActiveCall('ended');
          }
      };
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
      return pc;
  };

  useEffect(() => {
      const handleStartCallEvent = async (event: any) => {
          const { roomId, peerId, type, peerName, peerAvatar } = event.detail;
          const stream = await getMedia(type === 'video'); 
          if (!stream) return;
          
          playSound('ring_out'); 
          const callId = `call_${Date.now()}`;
          setActiveCall({ id: callId, roomId, peerName, peerAvatar, isVideo: type === 'video', peerId, isAccepted: false });
          setIsMinimized(false);
          
          sendRaw({ 
              type: 'call_ring', 
              to: peerId, 
              callId, 
              room_id: roomId,
              callType: type, 
              hasVideo: type === 'video', 
              callerName: user?.name || user?.username, 
              callerAvatar: user?.avatar_url 
          });
      };

      window.addEventListener('START_CALL', handleStartCallEvent);
      return () => window.removeEventListener('START_CALL', handleStartCallEvent);
  }, [user, sendRaw]); 

  useEffect(() => {
      const unsub = subscribe((parsed: any) => {
         if (parsed.type === 'call_ring') { playSound('ring_in'); setIncomingCall(parsed); }
         if (parsed.type === 'call_reject') { stopAllRingtones(); setIncomingCall(null); endActiveCall('rejected'); }
         if (parsed.type === 'call_end' || parsed.type === 'call_dismiss') { stopAllRingtones(); setIncomingCall(null); endActiveCall('ended'); }

         if (parsed.type === 'call_accept') {
            showToast("Connected", "success");
            stopAllRingtones(); 
            setActiveCall((p: any) => p ? ({...p, isAccepted: true}) : null);
            initPeerConnection(parsed.from, parsed.callId).then(pc => {
                pc.createOffer().then(offer => {
                    pc.setLocalDescription(offer);
                    sendRaw({ type: 'call_offer', to: parsed.from, callId: parsed.callId, sdp: JSON.stringify(offer) });
                });
            });
         }
         
         if (parsed.type === 'call_offer') {
             initPeerConnection(parsed.from, parsed.callId).then(pc => {
                 pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.sdp))).then(() => {
                     pc.createAnswer().then(answer => {
                         pc.setLocalDescription(answer);
                         sendRaw({ type: 'call_answer', to: parsed.from, callId: parsed.callId, sdp: JSON.stringify(answer) });
                     });
                 });
                 iceCandidateQueue.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c))); 
                 iceCandidateQueue.current = [];
             });
         }
         
         if (parsed.type === 'call_answer' && pcRef.current) {
             pcRef.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.sdp)));
             iceCandidateQueue.current.forEach(c => pcRef.current!.addIceCandidate(new RTCIceCandidate(c))); 
             iceCandidateQueue.current = [];
         }
         
         if (parsed.type === 'ice_candidate') {
             const candidate = JSON.parse(parsed.candidate);
             if (pcRef.current && pcRef.current.remoteDescription) pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); 
             else iceCandidateQueue.current.push(candidate);
         }
      });
      return unsub;
  }, [subscribe, sendRaw, activeCall]);

  const acceptIncomingCall = async () => {
      stopAllRingtones(); const parsed = incomingCall; setIncomingCall(null);
      const stream = await getMedia(parsed.hasVideo);
      if (!stream) { 
          sendRaw({ type: 'call_reject', to: parsed.from, callId: parsed.callId, reason: 'no_media' }); 
          return; 
      }
      setActiveCall({ id: parsed.callId, roomId: parsed.roomId, peerName: parsed.callerName || 'User', peerAvatar: parsed.callerAvatar, isVideo: parsed.hasVideo, peerId: parsed.from, isAccepted: true });
      setIsMinimized(false);
      sendRaw({ type: 'call_accept', to: parsed.from, callId: parsed.callId });
      showToast("Call started", "success");
  };

  const rejectIncomingCall = () => { 
      stopAllRingtones(); 
      sendRaw({ type: 'call_reject', to: incomingCall.from, callId: incomingCall.callId, reason: 'rejected' }); 
      setIncomingCall(null); 
      showToast("Call declined", "info");
  };

  const togglePiP = async () => {
      try {
          if (document.pictureInPictureElement) await document.exitPictureInPicture();
          else if (remoteVideoRef.current && activeCall?.isVideo) await remoteVideoRef.current.requestPictureInPicture();
      } catch (error) { console.error("Failed PiP", error); }
  };

  useEffect(() => {
    const handlePointerMove = (e: any) => {
        if (!dragRef.current.isDragging) return;
        const dx = (e.touches ? e.touches[0].clientX : e.clientX) - dragRef.current.startX;
        const dy = (e.touches ? e.touches[0].clientY : e.clientY) - dragRef.current.startY;
        setPos({ right: Math.max(0, dragRef.current.x - dx), bottom: Math.max(0, dragRef.current.y - dy) });
    };
    const handlePointerUp = () => dragRef.current.isDragging = false;
    window.addEventListener('mousemove', handlePointerMove); window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove); window.addEventListener('touchend', handlePointerUp);
    return () => {
        window.removeEventListener('mousemove', handlePointerMove); window.removeEventListener('mouseup', handlePointerUp);
        window.removeEventListener('touchmove', handlePointerMove); window.removeEventListener('touchend', handlePointerUp);
    };
  }, []);

  const handlePointerDown = (e: any) => {
    dragRef.current.isDragging = true;
    dragRef.current.startX = e.touches ? e.touches[0].clientX : e.clientX;
    dragRef.current.startY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current.x = pos.right; dragRef.current.y = pos.bottom;
  };

  useEffect(() => {
      let interval: any;
      if (activeCall?.isAccepted) interval = setInterval(() => setCallDuration(p => p + 1), 1000);
      else setCallDuration(0);
      return () => clearInterval(interval);
  }, [activeCall?.isAccepted]);
  
  const formatCallDuration = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;

  return (
    <>
      {/* --- CALL TOASTER UI (Bottom Right, above chat inputs) --- */}
      {toast && (
        <div className={`fixed bottom-24 right-4 md:right-8 z-[1000000] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 transition-all ${
          toast.type === 'success' ? 'bg-green-500 border-green-400 text-white' :
          toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' :
          toast.type === 'warning' ? 'bg-orange-500 border-orange-400 text-white' :
          'bg-gray-900 border-gray-700 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          {toast.type === 'error' && <XCircle size={18} />}
          {toast.type === 'warning' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span className="text-sm font-extrabold tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* --- INCOMING CALL MODAL --- */}
      {incomingCall && !activeCall && (
         <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in transition-colors">
            <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] rounded-[2rem] p-8 md:p-10 flex flex-col items-center shadow-2xl min-w-[320px] animate-in zoom-in-95 transition-colors">
               <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-400/20 dark:bg-blue-600/30 blur-xl rounded-full animate-pulse"></div>
                  <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-4xl font-extrabold text-blue-600 dark:text-blue-500 shadow-inner border-4 border-blue-200 dark:border-blue-500/20 relative z-10 overflow-hidden">
                     {incomingCall.callerAvatar ? <img src={incomingCall.callerAvatar} className="w-full h-full object-cover" /> : (incomingCall.callerName || 'U').charAt(0).toUpperCase()}
                  </div>
               </div>
               <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1 transition-colors">{incomingCall.callerName || 'Someone'}</h2>
               <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 transition-colors">Incoming {incomingCall.hasVideo ? 'Video' : 'Audio'} Call...</p>
               <div className="flex gap-6 w-full px-4">
                  <button onClick={rejectIncomingCall} className="flex-1 h-14 bg-red-600 hover:bg-red-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all active:scale-95">
                     <PhoneCall size={24} className="rotate-[135deg]" strokeWidth={2.5} />
                  </button>
                  <button onClick={acceptIncomingCall} className="flex-1 h-14 bg-green-500 hover:bg-green-400 rounded-[1.5rem] flex items-center justify-center text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all active:scale-95 animate-bounce">
                     <PhoneCall size={24} strokeWidth={2.5} />
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* --- ACTIVE CALL UI --- */}
      <div 
          onMouseDown={isMinimized && !isMobile ? handlePointerDown : undefined} 
          onTouchStart={isMinimized && !isMobile ? handlePointerDown : undefined} 
          style={isMinimized && !isMobile ? { right: pos.right, bottom: pos.bottom } : {}} 
          className={`
            ${activeCall ? 'flex' : 'hidden'} 
            ${isMinimized 
                ? (isMobile 
                    ? 'fixed z-[999999] top-0 inset-x-0 h-[72px] bg-gray-900 border-b border-gray-800 shadow-xl flex-row items-center justify-between px-4 animate-in slide-in-from-top-2' 
                    : 'fixed z-[999999] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex-col overflow-hidden cursor-move w-64 h-auto animate-in zoom-in-95') 
                : 'fixed inset-0 z-[999999] bg-[#0a0a0a] flex-col animate-in fade-in duration-300 overflow-hidden'
            }
          `}
      >
          {/* --- 1. MOBILE MINIMIZED (WhatsApp Style Top Bar) --- */}
          {isMinimized && isMobile && (
             <>
                <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setIsMinimized(false)}>
                   <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-gray-700">
                      {activeCall?.peerAvatar ? <img src={activeCall.peerAvatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{activeCall?.peerName?.charAt(0).toUpperCase()}</div>}
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-white text-sm font-bold truncate drop-shadow-md">{activeCall?.peerName}</span>
                      <span className="text-green-400 text-[10px] font-extrabold uppercase tracking-wider">{activeCall?.isAccepted ? formatCallDuration(callDuration) : 'Calling...'}</span>
                   </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                   <button onTouchStart={(e) => { e.stopPropagation(); setCallMicOff(!callMicOff); if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.enabled = callMicOff); }} className={`p-2.5 rounded-full ${callMicOff ? 'bg-white text-black' : 'bg-gray-800 text-white'}`}><MicOff size={16} strokeWidth={2.5}/></button>
                   <button onTouchStart={(e) => { e.stopPropagation(); endActiveCall(); }} className="p-2.5 bg-red-600 rounded-full text-white"><Phone size={16} strokeWidth={2.5} className="rotate-[135deg]" /></button>
                </div>
                {/* Hidden video elements to keep connection alive on mobile minimized */}
                <div className="opacity-0 absolute pointer-events-none w-px h-px overflow-hidden">
                    <video ref={remoteVideoRef} autoPlay playsInline />
                    {activeCall?.isVideo && <video ref={localVideoRef} autoPlay playsInline muted />}
                </div>
             </>
          )}

          {/* --- 2. DESKTOP MINIMIZED & FULLSCREEN --- */}
          {(!isMinimized || !isMobile) && (
             <>
               {/* Desktop Minimized Header */}
               {isMinimized && !isMobile && (
                  <div className="flex items-center justify-between px-3 py-2 bg-black/80 pointer-events-none">
                      <div className="flex items-center gap-2 min-w-0"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></div><span className="text-white text-xs font-bold truncate drop-shadow-md">{activeCall?.peerName}</span></div>
                      <div className="flex items-center gap-2 pointer-events-auto">
                          {activeCall?.isVideo && (<button onMouseDown={(e) => { e.stopPropagation(); togglePiP(); }} className="p-1 text-gray-400 hover:text-white transition-colors" title="Pop out to OS"><PictureInPicture size={14} /></button>)}
                          <button onMouseDown={(e) => { e.stopPropagation(); setIsMinimized(false); }} className="p-1 text-gray-400 hover:text-white transition-colors"><Maximize2 size={14} /></button>
                      </div>
                  </div>
               )}

               {/* Fullscreen Header */}
               {!isMinimized && (
                  <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
                      <button onClick={() => setIsMinimized(true)} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10" title="Minimize in App"><Minimize2 size={24} /></button>
                      {activeCall?.isVideo && (<button onClick={togglePiP} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all border border-white/10" title="Pop out of Browser"><PictureInPicture size={24} /></button>)}
                  </div>
               )}

               {/* Video Area */}
               <div className={`relative flex items-center justify-center bg-black ${isMinimized ? 'h-36' : 'flex-1'}`}>
                   {/* Remote Video */}
                   <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${!activeCall?.isVideo ? 'opacity-0 absolute pointer-events-none' : ''}`} />
                   
                   {/* Audio Placeholder */}
                   {!activeCall?.isVideo && (
                      <div className={`${isMinimized ? 'w-16 h-16 text-2xl' : 'w-40 h-40 md:w-48 md:h-48 text-6xl md:text-7xl'} rounded-full bg-gray-800 flex items-center justify-center font-extrabold text-white shadow-2xl overflow-hidden ${activeCall?.isAccepted ? 'border-4 border-green-500/50' : 'animate-pulse border-4 border-blue-500/30'}`}>
                         {activeCall?.peerAvatar ? <img src={activeCall.peerAvatar} className="w-full h-full object-cover" alt="avatar"/> : activeCall?.peerName?.charAt(0).toUpperCase()}
                      </div>
                   )}
                   
                   {/* Local Picture-in-Picture */}
                   {activeCall?.isVideo && !callCamOff && (
                       <div className={`absolute overflow-hidden bg-gray-800 border border-white/20 shadow-2xl z-20 ${isMinimized ? 'bottom-2 right-2 w-16 h-24 rounded-lg' : 'bottom-8 right-6 md:bottom-28 md:right-8 w-28 h-40 md:w-40 md:h-56 rounded-2xl'}`}>
                          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                       </div>
                   )}
               </div>

               {/* Fullscreen Name & Duration Overlay (Forces White Text) */}
               {!isMinimized && !activeCall?.isVideo && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-28 md:translate-y-36 flex flex-col items-center pointer-events-none w-full px-4 text-center">
                     <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{activeCall?.peerName}</h2>
                     <p className={`text-xs md:text-sm font-extrabold uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${activeCall?.isAccepted ? 'text-green-400' : 'text-blue-400 animate-pulse'}`}>{activeCall?.isAccepted ? formatCallDuration(callDuration) : 'Calling...'}</p>
                  </div>
               )}

               {/* Control Bar */}
               <div className={`flex items-center justify-center gap-4 md:gap-6 ${isMinimized ? 'py-3 bg-black/80' : 'absolute inset-x-0 bottom-0 pb-10 pt-32 bg-gradient-to-t from-black via-black/80 to-transparent'}`}>
                  <button onMouseDown={(e) => { e.stopPropagation(); setCallMicOff(!callMicOff); if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.enabled = callMicOff); }} onTouchStart={(e) => e.stopPropagation()} className={`rounded-full flex items-center justify-center transition-all shadow-lg ${isMinimized ? 'p-2.5' : 'w-14 h-14 md:w-16 md:h-16'} ${callMicOff ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10'}`}><MicOff size={isMinimized ? 16 : 24} /></button>
                  {activeCall?.isVideo && (<button onMouseDown={(e) => { e.stopPropagation(); setCallCamOff(!callCamOff); if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach(t => t.enabled = callCamOff); }} onTouchStart={(e) => e.stopPropagation()} className={`rounded-full flex items-center justify-center transition-all shadow-lg ${isMinimized ? 'p-2.5' : 'w-14 h-14 md:w-16 md:h-16'} ${callCamOff ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10'}`}><VideoOff size={isMinimized ? 16 : 24} /></button>)}
                  <button onMouseDown={(e) => { e.stopPropagation(); endActiveCall(); }} onTouchStart={(e) => e.stopPropagation()} className={`bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 ${isMinimized ? 'p-2.5' : 'w-14 h-14 md:w-16 md:h-16 shadow-[0_0_20px_rgba(220,38,38,0.4)]'}`}><Phone size={isMinimized ? 16 : 28} className="rotate-[135deg]" /></button>
               </div>
             </>
          )}
      </div>
    </>
  );
};