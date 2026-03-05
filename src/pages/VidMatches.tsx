import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { Send, AlertTriangle, UserPlus, Flag, Mic, MicOff, Video, VideoOff, FastForward, Power, Loader2, Maximize, Minimize, MessageSquare, MessageSquareOff, X, Columns, Rows } from 'lucide-react';
import { useWebSocket } from '../providers/WebSocketProvider';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import Modal from '../components/Modal';

// Define the stages of the match lifecycle
type MatchState = 'welcome' | 'searching' | 'matched';

const VidMatches = () => {
  const user = useAuthStore(state => state.user);
  const { subscribe, sendMessage } = useWebSocket();

  // --- UI Layout States ---
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

  // Sync Layout Preferences
  useEffect(() => localStorage.setItem('vidMatches_layoutMode', layoutMode), [layoutMode]);
  useEffect(() => localStorage.setItem('vidMatches_showChat', String(showChat)), [showChat]);

  // --- Match & WebRTC States ---
  const [matchState, setMatchState] = useState<MatchState>('welcome');
  const [slideState, setSlideState] = useState<'idle' | 'sliding-out' | 'sliding-in'>('idle');
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  
  const [peerId, setPeerId] = useState<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  
  const setRoomSync = (id: string | null) => { setActiveRoomId(id); activeRoomIdRef.current = id; };
  const setPeerSync = (id: string | null) => { setPeerId(id); peerIdRef.current = id; };

  // AV Toggles (Local UI state)
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [mediaError, setMediaError] = useState<{title: string, desc: string, action: string} | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<{ sender: 'me' | 'stranger' | 'system', text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');

  // WebRTC Refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const wsRef = useRef<any>(null); 

  // ------------------------------------------------------------------
  // 1. UI HELPERS (Idle Timer & Fullscreen)
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // 2. WEBRTC CORE LOGIC
  // ------------------------------------------------------------------
  const cleanupMatch = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setRoomSync(null);
    setPeerSync(null);
  };

  const handlePeerDisconnected = () => {
    setChatMessages(prev => [...prev, { sender: 'system', text: 'Stranger has disconnected.' }]);
    cleanupMatch();
    setMatchState('welcome'); 
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

    // CHECK 1: Secure Context Check (The fix for Vercel/Production)
    if (!window.isSecureContext) {
      setMediaError({
        title: "Insecure Connection",
        desc: "Browsers only allow camera access over HTTPS connections.",
        action: "Please ensure you are using https:// in your address bar."
      });
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: "user" // Better for mobile support
        }, 
        audio: true 
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;

    } catch (err: any) {
      console.error("Camera/Mic access failed:", err);
      
      // Handle specific WebRTC Errors
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMediaError({
          title: "Hardware Detection Error",
          desc: "The browser is reporting that no camera or mic is available. If you are on a laptop/mobile, this usually means permissions were blocked at the system level or the connection isn't secure.",
          action: "Try refreshing the page or checking your site settings (lock icon)."
        });
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaError({
          title: "Camera & Mic Required",
          desc: "Access was denied. We need these permissions to connect you with strangers.",
          action: "Please click the lock icon in the address bar and set Camera/Microphone to 'Allow'."
        });
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMediaError({
          title: "Hardware in Use",
          desc: "Another app is currently using your camera.",
          action: "Close Zoom, Discord, or other browser tabs using the camera and try again."
        });
      } else {
        setMediaError({
          title: "Hardware Error",
          desc: "An unexpected error occurred while trying to access your hardware.",
          action: err.message || "Please restart your browser and try again."
        });
      }
      
      setMatchState('welcome'); 
      return null;
    }
  };

  const createPeerConnection = async (targetUserId: string, roomId: string) => {
    const iceServers = await getIceConfig();
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    iceCandidateQueue.current = [];

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current({
          type: 'ice_candidate',
          to: targetUserId,
          callId: roomId, 
          candidate: JSON.stringify(event.candidate)
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        handlePeerDisconnected();
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    return pc;
  };

  // ------------------------------------------------------------------
  // 3. MATCHMAKING LIFECYCLE
  // ------------------------------------------------------------------
  const handleStart = async () => {
    const stream = await initLocalStream();
    if (!stream) return; 
    
    setMatchState('searching');
    setChatMessages([{ sender: 'system', text: 'Looking for a random stranger...' }]);
    
    try {
      await api.post('/match/enter', {});
    } catch (err) {
      console.error("Failed to enter match queue", err);
      setMatchState('welcome');
    }
  };

  const handleSkip = async () => {
    if (matchState === 'searching' || slideState !== 'idle') return;

    setSlideState('sliding-out');
    cleanupMatch();
    
    try {
      await api.post('/match/leave', {});
      await api.post('/match/enter', {});
      
      setTimeout(() => {
        setMatchState('searching');
        setSlideState('idle');
        setChatMessages([{ sender: 'system', text: 'Skipped. Looking for someone new...' }]);
      }, 400); 

    } catch (err) {
      console.error("Skip failed", err);
      setMatchState('welcome');
    }
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

  // ------------------------------------------------------------------
  // 4. WEBSOCKET EVENT LISTENER
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!subscribe) return;
    
    wsRef.current = (payload: any) => {
        (sendMessage as any)(JSON.stringify(payload)); 
    };

    const unsubscribe = subscribe(async (parsed: any) => {
      const currentRoomId = activeRoomIdRef.current;

      if (parsed.type === 'match_found') {
        const roomId = parsed.roomId || parsed.room_id;
        setRoomSync(roomId);
        setMatchState('matched');
        setSlideState('sliding-in');
        setChatMessages([{ sender: 'system', text: 'You are now chatting with a stranger!' }]);
        setTimeout(() => setSlideState('idle'), 500);

        if (parsed.peerId) setPeerSync(parsed.peerId);

        if (user?.id && parsed.peerId && String(user.id).localeCompare(String(parsed.peerId)) < 0) {
            const pc = await createPeerConnection(parsed.peerId, roomId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            wsRef.current({ type: 'call_offer', to: parsed.peerId, callId: roomId, sdp: JSON.stringify(offer) });
        }
      }

      if (parsed.type === 'stranger_disconnected' || parsed.type === 'room_closed') {
        if (parsed.roomId === currentRoomId) handlePeerDisconnected();
      }

      if (parsed.type === 'call_offer' && parsed.callId === currentRoomId) {
        setPeerSync(parsed.from);
        const pc = await createPeerConnection(parsed.from, parsed.callId);
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.sdp)));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsRef.current({ type: 'call_answer', to: parsed.from, callId: parsed.callId, sdp: JSON.stringify(answer) });
        
        iceCandidateQueue.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
        iceCandidateQueue.current = [];
      }

      if (parsed.type === 'call_answer' && parsed.callId === currentRoomId) {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.sdp)));
          iceCandidateQueue.current.forEach(c => pcRef.current!.addIceCandidate(new RTCIceCandidate(c)));
          iceCandidateQueue.current = [];
        }
      }

      if (parsed.type === 'ice_candidate' && parsed.callId === currentRoomId) {
        const candidate = JSON.parse(parsed.candidate);
        if (pcRef.current && pcRef.current.remoteDescription) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidateQueue.current.push(candidate);
        }
      }

      if (parsed.type === 'send_message' && parsed.roomId === currentRoomId && parsed.from !== user?.id) {
        setChatMessages(prev => [...prev, { sender: 'stranger', text: parsed.text || parsed.content }]);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [subscribe, user?.id]); 

  // ------------------------------------------------------------------
  // 5. LOCAL AV CONTROLS
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // 6. RENDER HELPERS
  // ------------------------------------------------------------------
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || matchState !== 'matched' || !activeRoomId) return;
    
    setChatMessages(prev => [...prev, { sender: 'me', text: inputValue }]);
    
    (sendMessage as any)({ type: 'send_message', roomId: activeRoomId, text: inputValue, tempId: `tmp_${Date.now()}` });
    setInputValue('');
  };

  return (
    <DashboardLayout>
      <div 
        ref={containerRef} 
        onMouseMove={resetIdleTimer} 
        onTouchStart={resetIdleTimer}
        className="absolute inset-0 z-10 flex flex-col md:flex-row bg-[#050505] overflow-hidden"
      >
        
        {/* --- LEFT PANE: VIDEO AREA --- */}
        <div className="relative flex flex-col bg-black flex-1 shrink-0 z-20 overflow-hidden">
          
          {/* HEADER CONTROLS */}
          <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-40 transition-opacity duration-500 ${showControls || matchState === 'welcome' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
             <div className="flex gap-2">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                   <div className={`w-2 h-2 rounded-full ${matchState === 'searching' ? 'bg-yellow-500 animate-pulse' : matchState === 'matched' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                   <span className="text-white text-xs font-bold tracking-wide uppercase">
                     {matchState === 'welcome' ? 'READY' : matchState === 'searching' ? 'SEARCHING...' : 'LIVE'}
                   </span>
                </div>
             </div>

             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setLayoutMode(prev => prev === 'stacked' ? 'split' : 'stacked')} 
                  className="bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white p-2.5 rounded-full transition-colors shadow-lg hidden md:block" 
                  title={layoutMode === 'stacked' ? "Switch to Side-by-Side" : "Switch to Stacked"}
                >
                  {layoutMode === 'stacked' ? <Columns size={18} /> : <Rows size={18} />}
                </button>

                <button 
                  onClick={() => setShowChat(!showChat)} 
                  className="bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white p-2.5 rounded-full transition-colors shadow-lg hidden md:block" 
                  title={showChat ? "Hide Chat" : "Show Chat"}
                >
                  {showChat ? <MessageSquareOff size={18} /> : <MessageSquare size={18} />}
                </button>

                <button 
                  onClick={toggleFullscreen} 
                  className="bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white p-2.5 rounded-full transition-colors shadow-lg hidden md:block" 
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>

                {matchState !== 'welcome' && (
                    <button onClick={handleExit} className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-500 p-2.5 rounded-full backdrop-blur-md transition-colors shadow-lg ml-2" title="Exit Matchmaking">
                       <Power size={18} />
                    </button>
                )}
             </div>
          </div>

          {/* --- VIDEO SPLIT SCREEN --- */}
          <div className={`flex-1 flex p-2 md:p-4 pt-16 md:pt-20 gap-2 md:gap-4 overflow-hidden relative ${matchState === 'welcome' ? '' : 'pb-24 md:pb-28'} ${layoutMode === 'split' ? 'md:flex-row flex-col' : 'flex-col items-center justify-center'}`}>
             
             {/* THE NEW UNIFIED WELCOME SCREEN */}
             {matchState === 'welcome' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-30 animate-in fade-in zoom-in">
                     <button 
                       onClick={handleStart}
                       className="w-40 h-40 bg-[#0f0f0f] border-2 border-white/10 rounded-full flex items-center justify-center group hover:scale-105 transition-transform cursor-pointer shadow-[0_0_40px_-10px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <Video className="w-16 h-16 text-purple-500 group-hover:text-white transition-colors" />
                     </button>
                     <h3 className="mt-8 text-2xl font-display font-bold text-white">Stranger Cam</h3>
                     <p className="text-gray-500 text-sm mt-2 max-w-xs text-center">
                       Connect face-to-face with random people instantly.
                     </p>
                 </div>
             )}

             {/* STRANGER VIDEO */}
             <div className={`relative w-full rounded-2xl overflow-hidden bg-[#111] border border-white/5 shadow-inner flex-1 transition-all duration-300 ${layoutMode === 'stacked' ? 'max-w-4xl' : ''}`}>
                
                <div className={`absolute bottom-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded z-20 transition-opacity duration-500 ${showControls && matchState === 'matched' ? 'opacity-100' : 'opacity-0'}`}>
                   STRANGER
                </div>

                {matchState === 'searching' && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-in fade-in zoom-in duration-500 bg-[#0a0a0a]">
                      <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                         <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
                         <div className="absolute inset-4 border-4 border-blue-500/50 rounded-full animate-ping" style={{ animationDelay: '200ms' }}></div>
                         <Loader2 size={32} className="text-blue-500 animate-spin" />
                      </div>
                      <p className="text-gray-400 font-medium mt-6 animate-pulse text-sm">Finding someone...</p>
                   </div>
                )}

                <div 
                   className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                     slideState === 'sliding-out' ? '-translate-x-full opacity-0 scale-95' :
                     slideState === 'sliding-in' ? 'translate-x-full opacity-0 scale-105' :
                     matchState === 'searching' ? 'opacity-0 scale-95' :
                     'translate-x-0 opacity-100 scale-100'
                   }`}
                >
                   <video 
                     ref={remoteVideoRef}
                     autoPlay 
                     playsInline 
                     className="w-full h-full object-cover opacity-90"
                   />
                </div>

                {matchState === 'matched' && slideState === 'idle' && (
                   <button 
                     onClick={() => api.post('/friends/request', { username: peerId })} 
                     className={`absolute bottom-4 right-4 bg-indigo-600/90 hover:bg-indigo-500 backdrop-blur-md p-3 rounded-full shadow-lg border border-indigo-400/30 transition-all active:scale-90 z-30 group duration-500 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`} 
                     title="Add as Friend"
                   >
                      <UserPlus size={18} className="text-white" />
                   </button>
                )}
             </div>

             {/* MY VIDEO */}
             <div className={`relative w-full rounded-2xl overflow-hidden bg-gray-900 border border-white/5 shadow-inner flex-1 transition-all duration-300 ${layoutMode === 'stacked' ? 'max-w-4xl' : ''}`}>
                
                <div className={`absolute bottom-4 left-4 bg-blue-600/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded z-20 transition-opacity duration-500 ${showControls && matchState !== 'welcome' ? 'opacity-100' : 'opacity-0'}`}>
                   YOU
                </div>

                <video 
                  ref={localVideoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className={`w-full h-full object-cover transition-opacity scale-x-[-1] ${isCamOff ? 'opacity-0' : 'opacity-100'}`}
                />
                
                {isCamOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                       <VideoOff size={28} className="text-gray-500" />
                    </div>
                    <span className="text-gray-500 text-xs font-medium">Camera Disabled</span>
                  </div>
                )}
                
                {isMuted && (
                  <div className="absolute top-4 right-4 bg-red-500/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                    <MicOff size={14} className="text-white" />
                  </div>
                )}
             </div>
          </div>

          {/* --- FLOATING ACTION BAR --- */}
          {matchState !== 'welcome' && (
              <div 
                 className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-5 z-40 bg-black/60 backdrop-blur-xl px-4 py-2.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
                 ${showControls ? 'bottom-6 md:bottom-8 opacity-100 translate-y-0 scale-100' : 'bottom-0 opacity-0 translate-y-20 scale-95 pointer-events-none'}`}
              >
                 <button className="p-3 rounded-full bg-red-500/10 hover:bg-red-500/30 text-red-500 transition-colors" title="Report">
                    <Flag size={20} />
                 </button>

                 <div className="flex gap-2 border-x border-white/10 px-3 md:px-5">
                    <button onClick={toggleMic} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`} title="Toggle Mic">
                       {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button onClick={toggleCam} className={`p-3 rounded-full transition-colors ${isCamOff ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`} title="Toggle Camera">
                       {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                 </div>

                 <button 
                   onClick={handleSkip} 
                   disabled={matchState === 'searching'}
                   className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wider transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                 >
                    SKIP <FastForward size={18} className="fill-white" />
                 </button>
              </div>
          )}
        </div>

        {/* --- RIGHT PANE: CHAT AREA --- */}
        <div className={`
          flex flex-col bg-[#0f0f0f] border-[#272729] z-30 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]
          transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden shrink-0
          ${showChat 
            ? 'w-full h-[50vh] md:h-full md:w-[380px] border-t md:border-t-0 md:border-l opacity-100' 
            : 'w-full h-0 md:h-full md:w-0 border-none opacity-0'
          }
        `}>
          <div className="w-full md:w-[380px] h-full flex flex-col shrink-0">
              
              <div className="p-4 border-b border-[#272729] bg-[#1a1a1a] flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-500/20 shrink-0">
                       <span className="text-blue-500 font-bold text-lg">?</span>
                    </div>
                    <div className="min-w-0">
                       <h3 className="font-bold text-white text-sm truncate">Stranger Chat</h3>
                       <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                         <AlertTriangle size={10} className="text-yellow-500 shrink-0" /> End-to-end encrypted
                       </p>
                    </div>
                 </div>
                 
                 <button 
                   onClick={() => setShowChat(false)} 
                   className="p-2 bg-[#272729] hover:bg-[#343536] rounded-full text-gray-400 hover:text-white transition-colors shrink-0 shadow-sm"
                   title="Close Chat"
                 >
                    <X size={18} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide flex flex-col">
                 <div className="mt-auto"></div>
                 {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                       {msg.sender === 'system' ? (
                          <span className="text-[10px] bg-white/5 border border-white/10 text-gray-400 px-3 py-1 rounded-full font-medium text-center max-w-[85%] leading-relaxed shadow-sm">
                             {msg.text}
                          </span>
                       ) : (
                          <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                             msg.sender === 'me' 
                             ? 'bg-blue-600 text-white rounded-br-none' 
                             : 'bg-[#1a1a1a] text-gray-200 border border-[#272729] rounded-bl-none'
                          }`}>
                             {msg.sender === 'stranger' && <p className="text-[10px] font-bold text-blue-400 mb-1">Stranger</p>}
                             {msg.text}
                          </div>
                       )}
                    </div>
                 ))}
                 {matchState === 'searching' && (
                    <div className="flex justify-start">
                       <div className="bg-[#1a1a1a] border border-[#272729] rounded-2xl rounded-bl-none px-4 py-3 flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-3 bg-[#0a0a0a] border-t border-[#272729] shrink-0">
                 <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      disabled={matchState !== 'matched'}
                      placeholder={matchState === 'welcome' ? "Start matching to chat..." : matchState === 'searching' ? "Waiting for stranger..." : "Type a message..."}
                      className="flex-1 bg-[#1a1a1a] border border-[#272729] rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 disabled:opacity-50 transition-colors shadow-inner"
                    />
                    <button 
                      type="submit" 
                      disabled={!inputValue.trim() || matchState !== 'matched'}
                      className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors shrink-0 shadow-lg"
                    >
                       <Send size={16} className="ml-0.5" />
                    </button>
                 </form>
              </div>

          </div>
        </div>

        {/* Dynamic Error Modal for Media Issues */}
        <Modal 
          isOpen={mediaError !== null} 
          onClose={() => setMediaError(null)}
          title={mediaError?.title || "Error"}
          footer={
            <button 
              onClick={() => setMediaError(null)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
            >
              Got it
            </button>
          }
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-2">
              <AlertTriangle size={32} />
            </div>
            <p className="text-gray-200">{mediaError?.desc}</p>
            <p className="text-xs text-gray-500">
              {mediaError?.title === 'Camera & Mic Required' ? (
                <>Please click the <strong className="text-white">lock icon</strong> or <strong className="text-white">permissions icon</strong> in your browser's address bar, allow permissions, and try again.</>
              ) : (
                <strong className="text-white">{mediaError?.action}</strong>
              )}
            </p>
          </div>
        </Modal>

      </div>
    </DashboardLayout>
  );
};

export default VidMatches;