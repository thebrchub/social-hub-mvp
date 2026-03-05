import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useWebSocket } from '../providers/WebSocketProvider';
import { ChatSidebar } from '../components/chats/ChatSidebar';
import { ChatWindow } from '../components/chats/ChatWindow';
import { ChatGroupWindow } from '../components/chats/ChatGroupWindow'; 
import { PhoneCall, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';

// --- INTERFACES ---
// --- INTERFACES ---
interface RoomMember { 
  id: string; 
  name: string; 
  username: string; 
  is_online?: boolean; 
  last_seen_at?: string; 
  role?: string; 
  avatar_url?: string; // <-- ADDED THIS
  avatarUrl?: string;  // <-- ADDED THIS (Fallback)
}

interface Room { 
  room_id: string; 
  name: string | null; 
  type: string; 
  last_message_preview: string | null; 
  last_message_at: string; 
  unread_count: number; 
  friend_username?: string; 
  partner_id?: string; 
  members?: RoomMember[]; 
  createdBy?: string; 
  inviteCode?: string; 
  avatarUrl?: string; 
  avatar_url?: string; 
}

interface DMRequest { 
  room_id: string; 
  sender_name?: string; 
  sender_username?: string; 
  sender_avatar?: string; 
  last_message_preview?: string; 
}

interface ChatMessage { 
  id?: string; 
  message_id?: string; 
  text?: string; 
  content?: string; 
  sender_id?: string; 
  from?: string; 
  created_at: string; 
  status?: 'sending' | 'sent' | 'delivered' | 'read'; 
  _tempId?: string; 
  type?: string; 
}

export default function Chats() {
  const user = useAuthStore(state => state.user);
  const { sendMessage, sendRaw, sendTypingStart, markRead, markDelivered, isConnected, subscribe } = useWebSocket();

  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{title: string, desc: string, onConfirm: ()=>void} | null>(null);

  // Custom Report Modal State
  const [reportConfig, setReportConfig] = useState<{username: string, roomId: string} | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<DMRequest[]>([]);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const [presence, setPresence] = useState<Record<string, { online: boolean; lastSeen: string | null }>>({});
  const [typingData, setTypingData] = useState<{ roomId: string; userIds: string[] } | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [activeRoomDetails, setActiveRoomDetails] = useState<Room | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMarkReadTime = useRef<number>(0);
  const hasSentInitialDelivery = useRef(false);
  const wsRef = useRef<any>(null); 

  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Group Modal States
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState("");
  const [isPrivateGroup, setIsPrivateGroup] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // --- CALLING STATES (WebRTC P2P) ---
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const [callMicOff, setCallMicOff] = useState(false);
  const [callCamOff, setCallCamOff] = useState(false);

  const wsSendSignaling = (payload: any) => {
      if (sendRaw) sendRaw(payload);
      else console.error("sendRaw not found in WebSocketProvider!");
  };

  const playSound = (type: 'message' | 'ring') => {
      const audio = new Audio(type === 'message' ? '/message.mp3' : '/ringtone.mp3');
      audio.play().catch(() => {});
  };

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'success') => {
      setToastMessage({msg, type});
      setTimeout(() => setToastMessage(null), 3000);
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (date.toDateString() === new Date().toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const triggerMarkRead = (roomId: string) => {
     lastMarkReadTime.current = Date.now();
     markRead(roomId);
  };

  const fetchChatsData = async () => {
    try {
      const [roomsRes, requestsRes] = await Promise.all([
        api.get('/rooms?limit=50').catch(() => []),
        api.get('/rooms/requests').catch(() => [])
      ]);
      
      let fetchedRooms = Array.isArray(roomsRes) ? roomsRes : roomsRes?.data || [];
      const fetchedReqs = Array.isArray(requestsRes) ? requestsRes : requestsRes?.data || [];
      setRequests(fetchedReqs);

      fetchedRooms = fetchedRooms.map((room: any) => {
         // 1. Handle DMs
         if ((room.type === 'DM' || room.type === 'private') && room.members) {
             const partner = room.members.find((m: any) => m.id !== user?.id);
             if (partner) {
                 room.name = partner.name || partner.username;
                 room.friend_username = partner.username;
                 room.partner_id = partner.id;
                 
                 // THE FIX: Pull the avatar from the member array and map it to the room object
                 const pAvatar = partner.avatar_url || partner.avatarUrl;
                 room.avatar_url = pAvatar;
                 room.avatarUrl = pAvatar; 
                 
                 setPresence(prev => ({ ...prev, [partner.id]: { online: partner.is_online || false, lastSeen: partner.last_seen_at || null } }));
             }
         } 
         // 2. Handle Groups
         else if (room.type === 'group' || room.type === 'GROUP') {
             // THE FIX: Pull group_avatar (based on your Swagger JSON) and map it
             const gAvatar = room.group_avatar || room.avatarUrl || room.avatar_url;
             room.avatar_url = gAvatar;
             room.avatarUrl = gAvatar;
         }
         return room;
      });

      setRooms(fetchedRooms);
    } catch (error) { 
      console.error("Failed to fetch chats data:", error); 
    } finally { 
      setIsLoadingSidebar(false); 
    }
  };

  useEffect(() => { fetchChatsData(); }, []);

  useEffect(() => {
    if (isConnected && markDelivered && rooms.length > 0 && !hasSentInitialDelivery.current) {
       rooms.forEach(r => markDelivered(r.room_id));
       hasSentInitialDelivery.current = true;
    }
  }, [isConnected, rooms]);

  const fetchMessages = async (roomId: string, loadOlder = false) => {
    if (!loadOlder) { setIsMessagesLoading(true); setMessageCursor(null); } 
    else { setIsLoadingOlder(true); }

    try {
      let url = `/rooms/${roomId}/messages?limit=50`;
      if (loadOlder && messageCursor) url += `&cursor=${messageCursor}`;

      const res = await api.get(url);
      const msgs = Array.isArray(res) ? res : res.data || [];
      
      if (msgs.length > 0) {
        if (!loadOlder) {
          setMessages([...msgs].reverse());
          setTimeout(() => scrollToBottom("auto"), 50);
        } else {
          setMessages(prev => [...[...msgs].reverse(), ...prev]);
        }
        setMessageCursor(msgs[msgs.length - 1].id);
        setHasMoreMessages(msgs.length >= 50);
      } else {
        if (!loadOlder) setMessages([]);
        setHasMoreMessages(false);
      }

      if (!loadOlder && isConnected) {
         triggerMarkRead(roomId);
         setRooms(prev => prev.map(r => r.room_id === roomId ? { ...r, unread_count: 0 } : r));
      }
    } catch (error) { console.error("Failed to fetch messages:", error); } 
    finally { setIsMessagesLoading(false); setIsLoadingOlder(false); }
  };

  useEffect(() => {
    if (!selectedRoomId) return;
    setIsSearchingMessages(false); setMessageSearchQuery("");
    setShowInfoPanel(false); setShowEmojiPicker(false);
    setTypingData(null);
    fetchMessages(selectedRoomId, false);
  }, [selectedRoomId, isConnected]); 

  const fetchRoomDetails = async (roomId: string, type: string) => {
      if (type !== 'group' && type !== 'GROUP') return;
      setIsLoadingDetails(true);
      try {
          const res = await api.get(`/groups/${roomId}`);
          setActiveRoomDetails(res.data || res);
      } catch (err) {} finally { setIsLoadingDetails(false); }
  };

  useEffect(() => {
      const activeRoom = rooms.find(r => r.room_id === selectedRoomId);
      if (showInfoPanel && activeRoom && selectedRoomId) fetchRoomDetails(selectedRoomId, activeRoom.type);
  }, [showInfoPanel, selectedRoomId]);

  // ------------------------------------------------------------------
  // WEBSOCKET LISTENER
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!subscribe) return;
    wsRef.current = (payload: any) => { wsSendSignaling(payload); };
    const unsubscribe = subscribe(async (parsed: any) => {
      
      if (parsed.type === 'presence_online') setPresence(prev => ({ ...prev, [parsed.userId]: { online: true, lastSeen: null }}));
      if (parsed.type === 'presence_offline') setPresence(prev => ({ ...prev, [parsed.userId]: { online: false, lastSeen: parsed.lastSeenAt }}));

      if (parsed.type === 'typing_status' && parsed.roomId === selectedRoomId && !parsed.userIds.includes(user?.id)) {
         setTypingData({ roomId: parsed.roomId, userIds: parsed.userIds });
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         typingTimeoutRef.current = setTimeout(() => setTypingData(null), 3000); 
      }

      if (parsed.type === 'send_message') {
         const incomingText = parsed.text || parsed.content || "New message";
         if (parsed.from !== user?.id && parsed.roomId !== selectedRoomId) playSound('message');

         setRooms(prev => {
            let updated = prev.map(r => {
               if (r.room_id === parsed.roomId) {
                  const isNotActive = parsed.roomId !== selectedRoomId;
                  const newUnreadCount = (isNotActive && parsed.from !== user?.id) ? (r.unread_count || 0) + 1 : r.unread_count;
                  return { ...r, last_message_preview: incomingText, last_message_at: new Date().toISOString(), unread_count: newUnreadCount };
               }
               return r;
            });
            const targetIdx = updated.findIndex(r => r.room_id === parsed.roomId);
            if (targetIdx > 0) { const [target] = updated.splice(targetIdx, 1); updated.unshift(target); }
            return updated;
         });

         if (parsed.from === user?.id) {
            setMessages(prev => prev.map(m => (m.status === 'sending' && (m.text === incomingText || m.content === incomingText)) ? { ...m, status: 'sent', id: parsed.id } : m));
         } else if (parsed.roomId === selectedRoomId) {
             setMessages(prev => {
                if (prev.some(m => m.id === parsed.id || (parsed.tempId && m._tempId === parsed.tempId))) return prev;
                return [...prev, { id: parsed.id || parsed.tempId || Date.now().toString(), sender_id: parsed.from, text: incomingText, created_at: new Date().toISOString(), status: 'read', type: parsed.msgType || 'chat' }];
             });
             if (isConnected) triggerMarkRead(parsed.roomId);
             setTimeout(() => scrollToBottom("smooth"), 50);
         } else {
             if (isConnected && markDelivered) markDelivered(parsed.roomId);
         }
      }

      if (parsed.type === 'message_sent_confirm') {
         setMessages(prev => prev.map(m => m._tempId === parsed.tempId ? { ...m, status: (m.status === 'delivered' || m.status === 'read') ? m.status : 'sent', id: parsed.id } : m));
      }
      if (parsed.type === 'message_delivered' && parsed.roomId === selectedRoomId && parsed.userId !== user?.id) {
         setMessages(prev => prev.map(m => ((m.sender_id === user?.id || m.from === user?.id) && (m.status === 'sending' || m.status === 'sent' || !m.status)) ? { ...m, status: 'delivered' } : m));
      }
      if (parsed.type === 'message_read' && parsed.roomId === selectedRoomId && Date.now() - lastMarkReadTime.current > 2000 && parsed.userId !== user?.id) {
         setMessages(prev => prev.map(m => ((m.sender_id === user?.id || m.from === user?.id) && m.status !== 'read') ? { ...m, status: 'read' } : m));
      }

      if (parsed.type === 'call_ring') { playSound('ring'); setIncomingCall(parsed); }
      if (parsed.type === 'call_reject') { showToast(`Call ${parsed.reason || 'declined'}`, 'info'); endActiveCall(); }
      if (parsed.type === 'call_accept') {
          if (pcRef.current) return;
          const pc = await initPeerConnection(parsed.from, parsed.callId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsSendSignaling({ type: 'call_offer', to: parsed.from, callId: parsed.callId, sdp: JSON.stringify(offer) });
      }
      if (parsed.type === 'call_offer') {
          const pc = pcRef.current || await initPeerConnection(parsed.from, parsed.callId);
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.sdp)));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsSendSignaling({ type: 'call_answer', to: parsed.from, callId: parsed.callId, sdp: JSON.stringify(answer) });
          iceCandidateQueue.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
          iceCandidateQueue.current = [];
      }
      if (parsed.type === 'call_answer') {
          if (pcRef.current) {
             await pcRef.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.sdp)));
             iceCandidateQueue.current.forEach(c => pcRef.current!.addIceCandidate(new RTCIceCandidate(c)));
             iceCandidateQueue.current = [];
          }
      }
      if (parsed.type === 'ice_candidate') {
          const candidate = JSON.parse(parsed.candidate);
          if (pcRef.current && pcRef.current.remoteDescription) pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          else iceCandidateQueue.current.push(candidate);
      }
      if (parsed.type === 'call_end') { showToast('Call ended', 'info'); endActiveCall(); }
    });
    return unsubscribe;
  }, [selectedRoomId, user?.id, isConnected, subscribe, markDelivered, markRead]);


  // ------------------------------------------------------------------
  // WEBRTC PEER CONNECTION LOGIC
  // ------------------------------------------------------------------
  const getMedia = async (video: boolean) => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { width: { ideal: 1280 } } : false });
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          return stream;
      } catch (err) {
          showToast('Camera/Mic permission denied', 'error');
          return null;
      }
  };

  const initPeerConnection = async (targetUserId: string, callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      iceCandidateQueue.current = [];
      pc.onicecandidate = (e) => { if (e.candidate) wsSendSignaling({ type: 'ice_candidate', to: targetUserId, callId, candidate: JSON.stringify(e.candidate) }); };
      pc.ontrack = (e) => { if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== e.streams[0]) remoteVideoRef.current.srcObject = e.streams[0]; };
      pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') endActiveCall(); };
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
      return pc;
  };

  const handleStartCall = async (type: 'audio' | 'video', isGroupCall: boolean) => {
      if (!selectedRoomId) return;
      if (isGroupCall) return; 
      
      const targetRoom = rooms.find(r => r.room_id === selectedRoomId);
      if (!targetRoom || !targetRoom.partner_id) return; // TS Guard
      
      const stream = await getMedia(type === 'video');
      if (!stream) return;
      const callId = `call_${Date.now()}`;
      setActiveCall({ id: callId, roomId: selectedRoomId, peerName: targetRoom.name || 'User', isVideo: type === 'video', peerId: targetRoom.partner_id });
      wsSendSignaling({ type: 'call_ring', to: targetRoom.partner_id, callId, roomId: selectedRoomId, callType: type, hasVideo: type === 'video' });
  };

  const acceptIncomingCall = async (resolvedName: string) => {
      const parsed = incomingCall;
      setIncomingCall(null);
      const stream = await getMedia(parsed.hasVideo);
      if (!stream) {
         wsSendSignaling({ type: 'call_reject', to: parsed.from, callId: parsed.callId, reason: 'no_media' });
         return;
      }
      setActiveCall({ id: parsed.callId, roomId: parsed.roomId, peerName: resolvedName, isVideo: parsed.hasVideo, peerId: parsed.from });
      wsSendSignaling({ type: 'call_accept', to: parsed.from, callId: parsed.callId });
  };

  const rejectIncomingCall = () => {
      wsSendSignaling({ type: 'call_reject', to: incomingCall.from, callId: incomingCall.callId, reason: 'rejected' });
      setIncomingCall(null);
  };

  const endActiveCall = () => {
      if (activeCall && activeCall.peerId) wsSendSignaling({ type: 'call_end', to: activeCall.peerId, callId: activeCall.id });
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setActiveCall(null);
  };

  // ------------------------------------------------------------------
  // UI HANDLERS
  // ------------------------------------------------------------------
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedRoomId) return;

    const finalMessageText = replyingTo ? `> ${replyingTo.text || replyingTo.content}\n\n${inputValue}` : inputValue;
    const tempId = `tmp_${Date.now()}`;
    const newMsg: ChatMessage = { _tempId: tempId, text: finalMessageText, sender_id: user?.id, created_at: new Date().toISOString(), status: 'sending' };

    setMessages(prev => [...prev, newMsg]);
    sendMessage(selectedRoomId, finalMessageText, tempId);
    
    setRooms(prev => {
       let updated = prev.map(r => r.room_id === selectedRoomId ? { ...r, last_message_preview: inputValue, last_message_at: new Date().toISOString() } : r);
       const targetIdx = updated.findIndex(r => r.room_id === selectedRoomId);
       if (targetIdx > 0) { const [target] = updated.splice(targetIdx, 1); updated.unshift(target); }
       return updated;
    });
    
    setInputValue(""); setReplyingTo(null); setShowEmojiPicker(false);
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (selectedRoomId) sendTypingStart(selectedRoomId);
  };

  const onEmojiClick = (emojiObject: any) => setInputValue((prev) => prev + emojiObject.emoji);

  const activeRoom = rooms.find(r => r.room_id === selectedRoomId);

  // --- THE FIX: BULLETPROOF TYPESCRIPT & INSTANT STATE UPDATES ---
  const handlePanelAction = async (action: string, payload?: any) => {
      setShowInfoPanel(false); 
      if (!selectedRoomId || !activeRoom) return; // Strict TS Guard!
      
      const isGroup = activeRoom.type === 'group' || activeRoom.type === 'GROUP';
      const targetRoomId = selectedRoomId;
      const targetName = activeRoom.name || 'Unknown';
      const targetUsername = activeRoom.friend_username;

      if (isGroup) {
          switch(action) {
              case 'generate_invite':
                  try {
                    const res = await api.post(`/groups/${targetRoomId}/invite`);
                    const code = res?.data?.inviteCode || res?.inviteCode;
                    if (code) {
                        navigator.clipboard.writeText(`inv_${code}`);
                        showToast(`Invite code inv_${code} copied!`, 'success');
                        fetchRoomDetails(targetRoomId, 'group'); 
                    } else showToast("Could not generate invite code.", 'error');
                  } catch(e) { showToast("Failed to generate code", 'error'); }
                  break;
              case 'leave_group':
                  setConfirmConfig({ title: "Leave Squad", desc: `Are you sure you want to leave ${targetName}?`, onConfirm: async () => { 
                      await api.delete(`/groups/${targetRoomId}/members/${user?.id}`); 
                      setSelectedRoomId(null); 
                      setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); 
                      setConfirmConfig(null); 
                      showToast("Left squad.", "info"); 
                  }});
                  break;
              case 'delete_group':
                  setConfirmConfig({ title: "Delete Squad", desc: "DANGER: This permanently deletes the group for everyone. Proceed?", onConfirm: async () => { 
                      await api.delete(`/groups/${targetRoomId}`); 
                      setSelectedRoomId(null); 
                      setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); 
                      setConfirmConfig(null); 
                      showToast("Squad deleted.", "info"); 
                  }});
                  break;
              case 'remove_member':
                  setConfirmConfig({ title: "Kick Member", desc: "Are you sure you want to kick this user?", onConfirm: async () => { 
                      await api.delete(`/groups/${targetRoomId}/members/${payload}`); 
                      fetchRoomDetails(targetRoomId, 'group'); 
                      setConfirmConfig(null); 
                      showToast("Member kicked.", "success"); 
                  }});
                  break;
              case 'promote_admin':
                  setConfirmConfig({ title: "Promote to Admin", desc: "Give this user admin privileges?", onConfirm: async () => { 
                      await api.post(`/groups/${targetRoomId}/admins`, { userId: payload }); 
                      fetchRoomDetails(targetRoomId, 'group'); 
                      setConfirmConfig(null); 
                      showToast("Promoted to admin.", "success"); 
                  }});
                  break;
          }
      } else {
          switch(action) {
              case 'mute_notifications':
                  showToast("Mute feature coming soon!", "info");
                  break;
              case 'remove':
                  if (!targetUsername) return showToast("Cannot remove unknown user", "error");
                  setConfirmConfig({ 
                      title: "Remove Friend", 
                      desc: `Are you sure you want to remove @${targetUsername}? If you remove them, your chats will be gone forever and cannot be retrieved.`, 
                      onConfirm: async () => { 
                          try {
                              // Ignore 'Not friends' error if they were just a stranger match
                              await api.delete(`/friends/${targetUsername}`).catch(e => {
                                  if (e.message && !e.message.includes('Not friends')) throw e;
                              }); 
                              await api.post(`/rooms/${targetRoomId}/reject`).catch(() => {});
                              setSelectedRoomId(null); 
                              setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); 
                              setConfirmConfig(null); 
                              showToast("Friend removed and chat deleted.", "success"); 
                          } catch (e: any) {
                              setConfirmConfig(null);
                              showToast(e.message || "Failed to remove friend.", "error"); 
                          }
                      }
                  });
                  break;
              case 'block':
                  setConfirmConfig({ 
                      title: "Block User", 
                      desc: "They will no longer be able to message you. This chat will be deleted.", 
                      onConfirm: async () => { 
                          try {
                              await api.post('/match/action', { room_id: targetRoomId, action: 'block', partner_username: targetUsername }); 
                              await api.post(`/rooms/${targetRoomId}/reject`).catch(() => {});
                              setSelectedRoomId(null); 
                              setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); 
                              setConfirmConfig(null); 
                              showToast("User blocked.", "success"); 
                          } catch (e: any) {
                              setConfirmConfig(null); 
                              showToast(e.message || "Failed to block user.", "error");
                          }
                      }
                  });
                  break;
              case 'report':
                  if (targetUsername) {
                      setReportConfig({ username: targetUsername, roomId: targetRoomId });
                  }
                  break;
          }
      }
  };

  const submitReport = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reportConfig || !reportReason.trim()) return;
      setIsReporting(true);
      try {
          await api.post('/match/report', { 
              reported_username: reportConfig.username, 
              reason: reportReason.trim(), 
              room_id: reportConfig.roomId 
          });
          const targetRoomId = reportConfig.roomId;
          await api.post(`/rooms/${targetRoomId}/reject`).catch(() => {});
          setSelectedRoomId(null);
          setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); 
          setReportConfig(null);
          setReportReason("");
          showToast("Report submitted successfully. The user has been blocked.", "success");
      } catch (err: any) {
          showToast(err.message || "Failed to submit report.", "error");
      } finally {
          setIsReporting(false);
      }
  };

  const handleCreateDMOrJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = newUsername.trim();
    if (!input) return;
    setIsCreating(true);
    try {
      if (input.startsWith('inv_') || input.length > 15) {
         await api.post(`/invite/${input}`);
         showToast("Joined group successfully!", 'success');
         await fetchChatsData();
      } else {
         const res = await api.post('/rooms', { username: input });
         const data = res.data || res;
         if (data.pending) showToast("Because their account is private, a DM request was sent!", 'info');
         else { await fetchChatsData(); setSelectedRoomId(data.room_id); setActiveTab('chats'); }
      }
      setNewUsername('');
    } catch (error: any) { showToast(error.message || "Failed to add", 'error'); } 
    finally { setIsCreating(false); }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setIsCreatingGroup(true);
    try {
      const res = await api.post('/groups', { name: groupName.trim(), description: groupDesc.trim(), is_private: isPrivateGroup, avatarUrl: groupAvatarUrl.trim() });
      const data = res.data || res;
      await fetchChatsData(); 
      setSelectedRoomId(data.room_id || data.id);
      setShowGroupModal(false);
      setGroupName(""); setGroupDesc(""); setGroupAvatarUrl("");
      showToast("Squad created!", 'success');
    } catch (error: any) { showToast(error.message || "Failed to create squad", 'error'); } 
    finally { setIsCreatingGroup(false); }
  };

  const handleRequestAction = async (roomId: string, action: 'accept' | 'reject') => {
    try {
      await api.post(`/rooms/${roomId}/${action}`);
      await fetchChatsData();
      if (action === 'accept') { setActiveTab('chats'); setSelectedRoomId(roomId); }
    } catch (error: any) { showToast(`Failed to ${action} request`, 'error'); }
  };

  const renderTextWithHighlights = (text: string) => {
    if (!isSearchingMessages || !messageSearchQuery.trim()) return text;
    const query = messageSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => part.toLowerCase() === messageSearchQuery.toLowerCase() ? <mark key={i} className="bg-yellow-500/60 text-[#0a0a0a] font-bold rounded-sm px-0.5">{part}</mark> : part);
  };

  return (
    <DashboardLayout>
      <div className="absolute inset-0 z-10 flex bg-[#0a0a0a] overflow-hidden font-sans border-t border-[#272729] md:border-none">
         <ChatSidebar 
            rooms={rooms} requests={requests} activeTab={activeTab} setActiveTab={setActiveTab} 
            selectedRoomId={selectedRoomId} setSelectedRoomId={setSelectedRoomId} presence={presence} 
            user={user} formatTime={formatTime} newUsername={newUsername} setNewUsername={setNewUsername} 
            isCreating={isCreating} handleCreateDM={handleCreateDMOrJoin} isLoadingSidebar={isLoadingSidebar}
            handleRequestAction={handleRequestAction} setShowGroupModal={setShowGroupModal}
         />
         
         {activeRoom?.type === 'group' || activeRoom?.type === 'GROUP' ? (
           <ChatGroupWindow 
              activeRoom={activeRoom} selectedRoomId={selectedRoomId} setSelectedRoomId={setSelectedRoomId}
              messages={messages} user={user} presence={presence} typingData={typingData}
              isMessagesLoading={isMessagesLoading} isLoadingOlder={isLoadingOlder} hasMoreMessages={hasMoreMessages}
              fetchMessages={fetchMessages} messagesEndRef={messagesEndRef} isSearchingMessages={isSearchingMessages}
              setIsSearchingMessages={setIsSearchingMessages} messageSearchQuery={messageSearchQuery}
              setMessageSearchQuery={setMessageSearchQuery} scrollToBottom={scrollToBottom}
              renderTextWithHighlights={renderTextWithHighlights} handleSendMessage={handleSendMessage}
              inputValue={inputValue} handleInput={handleInput} replyingTo={replyingTo} setReplyingTo={setReplyingTo}
              showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker} onEmojiClick={onEmojiClick}
              formatTime={formatTime} showInfoPanel={showInfoPanel} setShowInfoPanel={setShowInfoPanel} 
              activeRoomDetails={activeRoomDetails} isLoadingDetails={isLoadingDetails} showToast={showToast} refreshChats={fetchChatsData}
              onPanelAction={handlePanelAction} 
           />
         ) : (
           <ChatWindow 
              activeRoom={activeRoom} selectedRoomId={selectedRoomId} setSelectedRoomId={setSelectedRoomId}
              messages={messages} user={user} presence={presence} typingData={typingData}
              isMessagesLoading={isMessagesLoading} isLoadingOlder={isLoadingOlder} hasMoreMessages={hasMoreMessages}
              fetchMessages={fetchMessages} messagesEndRef={messagesEndRef} isSearchingMessages={isSearchingMessages}
              setIsSearchingMessages={setIsSearchingMessages} messageSearchQuery={messageSearchQuery}
              setMessageSearchQuery={setMessageSearchQuery} scrollToBottom={scrollToBottom}
              renderTextWithHighlights={renderTextWithHighlights} handleSendMessage={handleSendMessage}
              inputValue={inputValue} handleInput={handleInput} replyingTo={replyingTo} setReplyingTo={setReplyingTo}
              showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker} onEmojiClick={onEmojiClick}
              formatTime={formatTime} formatLastSeen={formatLastSeen}
              showInfoPanel={showInfoPanel} setShowInfoPanel={setShowInfoPanel} 
              onStartCall={handleStartCall} onPanelAction={handlePanelAction} 
              activeCall={activeCall} endActiveCall={endActiveCall}
              remoteVideoRef={remoteVideoRef} localVideoRef={localVideoRef}
              callMicOff={callMicOff} setCallMicOff={setCallMicOff}
              callCamOff={callCamOff} setCallCamOff={setCallCamOff}
              localStreamRef={localStreamRef}
           />
         )}
      </div>

      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-[99999] px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 font-bold text-white ${toastMessage.type === 'success' ? 'bg-green-600' : toastMessage.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
           {toastMessage.msg}
        </div>
      )}

      {/* --- DM ACTIONS CONFIRMATION MODAL --- */}
      <Modal isOpen={confirmConfig !== null} onClose={() => setConfirmConfig(null)} title={confirmConfig?.title || "Confirm"}
        footer={
           <>
            <button onClick={() => setConfirmConfig(null)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={confirmConfig?.onConfirm} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500">Confirm</button>
           </>
        }>
         <p className="text-gray-300">{confirmConfig?.desc}</p>
      </Modal>

      {/* --- NEW: CUSTOM REPORT MODAL --- */}
      <Modal isOpen={reportConfig !== null} onClose={() => { setReportConfig(null); setReportReason(""); }} title={`Report @${reportConfig?.username}`}
        footer={
           <>
            <button onClick={() => { setReportConfig(null); setReportReason(""); }} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={submitReport} disabled={!reportReason.trim() || isReporting} className="px-5 py-2 bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl hover:bg-red-500 flex items-center gap-2">
               {isReporting && <Loader2 size={14} className="animate-spin" />} Submit Report
            </button>
           </>
        }>
         <div className="space-y-4">
             <p className="text-sm text-gray-300">Why are you reporting this user? They will be blocked immediately upon submission.</p>
             <textarea 
                value={reportReason} 
                onChange={(e) => setReportReason(e.target.value)} 
                className="w-full bg-[#0a0a0a] border border-[#272729] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 min-h-[100px] resize-none" 
                placeholder="E.g., Inappropriate behavior, spam..." 
                autoFocus 
             />
         </div>
      </Modal>

      {/* CREATE GROUP MODAL */}
      <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title="Create a Squad">
        <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Group Name</label>
                <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#272729] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="E.g. Weekend Gamers" autoFocus required />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Group Image URL (Optional)</label>
                <input type="url" value={groupAvatarUrl} onChange={e => setGroupAvatarUrl(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#272729] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="https://example.com/image.png" />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Description (Optional)</label>
                <input type="text" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} className="w-full bg-[#0a0a0a] border border-[#272729] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="What is this group for?" />
            </div>
            <label className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-[#272729] rounded-xl cursor-pointer hover:border-gray-600 transition-colors">
                <input type="checkbox" checked={isPrivateGroup} onChange={e => setIsPrivateGroup(e.target.checked)} className="w-4 h-4 accent-blue-500 rounded bg-gray-800 border-gray-600" />
                <div><p className="text-sm font-bold text-white">Private Group</p><p className="text-[10px] text-gray-500">Only people with an invite code can join.</p></div>
            </label>
            <button type="submit" disabled={!groupName.trim() || isCreatingGroup} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
                {isCreatingGroup ? <Loader2 size={16} className="animate-spin" /> : "Create Squad"}
            </button>
        </form>
      </Modal>

      {/* --- INCOMING CALL POPUP --- */}
      {incomingCall && (() => {
        let callerName = incomingCall.from;
        const directRoom = rooms.find(r => r.partner_id === incomingCall.from);
        if (directRoom && directRoom.name) callerName = directRoom.name;
        else {
           for (const r of rooms) {
               const m = r.members?.find(m => m.id === incomingCall.from);
               if (m && m.name) { callerName = m.name; break; }
           }
        }
        
        return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-[#1a1a1a] border border-[#272729] rounded-3xl p-8 flex flex-col items-center shadow-2xl min-w-[300px] animate-in zoom-in-95">
              <div className="w-24 h-24 rounded-full bg-blue-900/30 flex items-center justify-center text-4xl font-bold text-blue-500 mb-4 animate-pulse border-4 border-blue-500/20">
                 {callerName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{callerName}</h2>
              <p className="text-gray-400 text-sm mb-8">Incoming {incomingCall.hasVideo ? 'Video' : 'Audio'} Call...</p>
              
              <div className="flex gap-6">
                 <button onClick={rejectIncomingCall} className="w-14 h-14 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95">
                    <PhoneCall size={24} className="rotate-[135deg]" />
                 </button>
                 <button onClick={() => acceptIncomingCall(callerName)} className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 animate-bounce">
                    <PhoneCall size={24} />
                 </button>
              </div>
           </div>
        </div>
        );
      })()}
    </DashboardLayout>
  );
}