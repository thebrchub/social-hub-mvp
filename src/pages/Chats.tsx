import { useState, useEffect, useRef, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendStore } from '../store/useFriendStore'; 
import { useWebSocket } from '../providers/WebSocketProvider';
import { ChatSidebar } from '../components/chats/ChatSidebar';
import { ChatWindow } from '../components/chats/ChatWindow';
import { ChatGroupWindow } from '../components/chats/ChatGroupWindow'; 
import { PhoneCall, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useNotificationStore } from '../store/useNotificationStore';
import { useLocation } from 'react-router-dom';

interface RoomMember { id: string; name: string; username: string; is_online?: boolean; last_seen_at?: string; role?: string; avatar_url?: string; avatarUrl?: string; }
interface Room { room_id: string; name: string | null; type: string; last_message_preview: string | null; last_message_at: string; unread_count: number; friend_username?: string; partner_id?: string; members?: RoomMember[]; createdBy?: string; inviteCode?: string; avatarUrl?: string; avatar_url?: string; }
interface DMRequest { room_id: string; sender_name?: string; sender_username?: string; sender_avatar?: string; sender_id?: string; last_message_preview?: string; last_message_at?: string; }
interface GroupInvite { roomId: string; groupName: string; avatarUrl?: string; invitedBy: string; inviterName: string; invitedAt: string; }
interface ChatMessage { id?: string; message_id?: string; text?: string; content?: string; sender_id?: string; from?: string; created_at: string; status?: 'sending' | 'sent' | 'delivered' | 'read'; _tempId?: string; type?: string; }

export default function Chats() {
  const user = useAuthStore(state => state.user);
  const location = useLocation();
  const { sendMessage, sendRaw, sendTypingStart, markRead, markDelivered, isConnected, subscribe } = useWebSocket();
  const { friends, fetchFriends } = useFriendStore(); 

  const [toastMessage, setToastMessage] = useState<{msg: string, type: 'success'|'error'|'info'|'warning'} | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{title: string, desc: string, onConfirm: ()=>void} | null>(null);

  const [reportConfig, setReportConfig] = useState<{username: string, roomId: string} | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<DMRequest[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [callHistory, setCallHistory] = useState<any[]>([]); 
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  
  // FIX: Drafts & ReplyingTo states separated by Room ID
  const [inputValue, setInputValue] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [draftReplies, setDraftReplies] = useState<Record<string, ChatMessage | null>>({});
  
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

  const [activeTab, setActiveTab] = useState<'chats' | 'requests' | 'calls'>('chats');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const selectedRoomIdRef = useRef<string | null>(null);
  selectedRoomIdRef.current = selectedRoomId;
  const [newUsername, setNewUsername] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState("");
  const [isPrivateGroup, setIsPrivateGroup] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const [callMicOff, setCallMicOff] = useState(false);
  const [callCamOff, setCallCamOff] = useState(false);

  const incomingAudioRef = useRef<HTMLAudioElement | null>(null);
  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);

  const userMap = useMemo(() => {
     const map: Record<string, any> = {};
     rooms.forEach(r => {
        r.members?.forEach(m => {
           map[m.id] = m;
           map[m.username] = m;
        });
     });
     return map;
  }, [rooms]);

  const wsSendSignaling = (payload: any) => { if (sendRaw) sendRaw(payload); };

  const playSound = (type: 'message' | 'ring_in' | 'ring_out') => {
      if (type === 'ring_in') {
         if (!incomingAudioRef.current) { incomingAudioRef.current = new Audio('/ringtone.mp3'); incomingAudioRef.current.loop = true; }
         incomingAudioRef.current.play().catch(() => {});
      } else if (type === 'ring_out') {
         if (!outgoingAudioRef.current) { outgoingAudioRef.current = new Audio('/ringtone.mp3'); outgoingAudioRef.current.loop = true; }
         outgoingAudioRef.current.play().catch(() => {});
      } else {
         const audio = new Audio('/message.mp3'); audio.play().catch(() => {});
      }
  };

  const stopAllRingtones = () => {
      if (incomingAudioRef.current) { incomingAudioRef.current.pause(); incomingAudioRef.current.currentTime = 0; incomingAudioRef.current.src = ''; incomingAudioRef.current = null; }
      if (outgoingAudioRef.current) { outgoingAudioRef.current.pause(); outgoingAudioRef.current.currentTime = 0; outgoingAudioRef.current.src = ''; outgoingAudioRef.current = null; }
  };

  const showToast = (msg: string, type: 'success'|'error'|'info'|'warning' = 'success') => {
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
    return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (date.toDateString() === new Date().toDateString()) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
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
      const [roomsRes, requestsRes, invitesRes, historyRes] = await Promise.all([
        api.get('/rooms?limit=50').catch(() => []),
        api.get('/rooms/requests').catch(() => []),
        api.get('/groups/invites').catch(() => []),
        api.get('/calls/history?limit=30').catch(() => []) 
      ]);
      
      let fetchedRooms = Array.isArray(roomsRes) ? roomsRes : roomsRes?.data || [];
      const fetchedReqs = Array.isArray(requestsRes) ? requestsRes : requestsRes?.data || [];
      const fetchedInvites = Array.isArray(invitesRes) ? invitesRes : invitesRes?.data || [];
      const histData = historyRes?.data || historyRes;
      const fetchedHistory = Array.isArray(histData) ? histData : (histData?.calls || histData?.data || []);

      setRequests(fetchedReqs);
      setGroupInvites(fetchedInvites);
      setCallHistory(fetchedHistory);

      fetchedRooms = fetchedRooms.map((room: any) => {
         if ((room.type === 'DM' || room.type === 'private') && room.members) {
             const partner = room.members.find((m: any) => m.id !== user?.id);
             if (partner) {
                 room.name = partner.name || partner.username;
                 room.friend_username = partner.username;
                 room.partner_id = partner.id;
                 room.avatar_url = partner.avatar_url || partner.avatarUrl;
                 room.avatarUrl = partner.avatar_url || partner.avatarUrl; 
                 setPresence(prev => ({ ...prev, [partner.id]: { online: partner.is_online || false, lastSeen: partner.last_seen_at || null } }));
             }
         } else if (room.type === 'group' || room.type === 'GROUP') {
             room.avatar_url = room.group_avatar || room.avatarUrl || room.avatar_url;
             room.avatarUrl = room.group_avatar || room.avatarUrl || room.avatar_url;
         }
         return room;
      });

      const totalUnread = fetchedRooms.reduce((acc: number, r: any) => acc + (r.unread_count || 0), 0);
      useNotificationStore.getState().setUnreadChatsCount(totalUnread);
      setRooms(fetchedRooms);

      if (location.state?.autoOpenRoomId) {
         setSelectedRoomId(location.state.autoOpenRoomId);
         window.history.replaceState({}, document.title) 
      }
    } catch (error) { console.error("Failed to fetch chats data:", error); } finally { setIsLoadingSidebar(false); }
  };

  useEffect(() => { fetchChatsData(); fetchFriends(); }, [location.state?.autoOpenRoomId]); 

  useEffect(() => {
    if (isConnected && markDelivered && rooms.length > 0 && !hasSentInitialDelivery.current) {
       rooms.forEach(r => markDelivered(r.room_id));
       hasSentInitialDelivery.current = true;
    }
  }, [isConnected, rooms]);

  const fetchMessages = async (roomId: string, loadOlder = false) => {
    if (!loadOlder) { setIsMessagesLoading(true); setMessageCursor(null); setMessages([]); } else { setIsLoadingOlder(true); }
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
    } catch (error) { 
        if (!loadOlder) {
            const pendingReq = requests.find(r => r.room_id === roomId);
            if (pendingReq && pendingReq.last_message_preview) {
                setMessages([{ id: 'preview', text: pendingReq.last_message_preview, sender_id: pendingReq.sender_id || 'unknown', from: pendingReq.sender_id || 'unknown', created_at: pendingReq.last_message_at || new Date().toISOString(), status: 'delivered' } as any]);
            } else { setMessages([]); }
        }
    } finally { setIsMessagesLoading(false); setIsLoadingOlder(false); }
  };

  // FIX: Load drafts when changing rooms
  useEffect(() => {
    if (!selectedRoomId) { setMessages([]); return; }
    
    // 1. Fetch text draft from LocalStorage
    const savedDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
    setInputValue(savedDrafts[selectedRoomId] || "");
    
    // 2. Fetch reply state from memory
    setReplyingTo(draftReplies[selectedRoomId] || null);

    setIsSearchingMessages(false); setMessageSearchQuery("");
    setShowInfoPanel(false); setShowEmojiPicker(false);
    setTypingData(null);
    setMessages([]);
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

  useEffect(() => {
    if (!subscribe) return;
    wsRef.current = (payload: any) => { wsSendSignaling(payload); };
    const unsubscribe = subscribe(async (parsed: any) => {
      if (parsed.type === 'presence_online') setPresence(prev => ({ ...prev, [parsed.userId]: { online: true, lastSeen: null }}));
      if (parsed.type === 'presence_offline') setPresence(prev => ({ ...prev, [parsed.userId]: { online: false, lastSeen: parsed.lastSeenAt }}));

      if (parsed.type === 'typing_status' && parsed.roomId === selectedRoomIdRef.current && !parsed.userIds.includes(user?.id)) {
         setTypingData({ roomId: parsed.roomId, userIds: parsed.userIds });
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         typingTimeoutRef.current = setTimeout(() => setTypingData(null), 3000); 
      }

      if (parsed.type === 'group_invite') { showToast(`You were invited to join ${parsed.groupName || 'a squad'}!`, "info"); fetchChatsData(); }
      if (parsed.type === 'group_invite_accepted') {
         fetchChatsData(); 
         if (parsed.roomId === selectedRoomIdRef.current) fetchRoomDetails(parsed.roomId, 'group');
      }

      if (parsed.type === 'send_message' || parsed.type === 'group_message') {
         const incomingText = parsed.text || parsed.content || "New message";
         const targetRoomId = String(parsed.roomId || parsed.room_id || parsed.groupId);
         const currentRoomId = String(selectedRoomIdRef.current);
         const isMe = String(parsed.from) === String(user?.id) || String(parsed.sender_id) === String(user?.id);
         const isCurrentlyLookingAtThisChat = document.visibilityState === 'visible' && targetRoomId === currentRoomId;
         
         if (!isMe && !isCurrentlyLookingAtThisChat) {
             playSound('message');
         }

         setRooms(prev => {
            let updated = prev.map(r => {
               if (String(r.room_id) === targetRoomId) {
                  const newUnreadCount = (!isCurrentlyLookingAtThisChat && !isMe) ? (r.unread_count || 0) + 1 : r.unread_count;
                  return { ...r, last_message_preview: incomingText, last_message_at: new Date().toISOString(), unread_count: newUnreadCount };
               }
               return r;
            });
            const targetIdx = updated.findIndex(r => String(r.room_id) === targetRoomId);
            if (targetIdx > 0) { const [target] = updated.splice(targetIdx, 1); updated.unshift(target); }
            return updated;
         });

         if (isMe) {
            setMessages(prev => prev.map(m => {
               if (m._tempId === parsed.tempId || m.id === parsed.tempId || (m.status === 'sending' && (m.text === incomingText || m.content === incomingText))) {
                  return { ...m, status: 'sent', id: parsed.id || parsed.message_id };
               }
               return m;
            }));
         } else if (targetRoomId === currentRoomId) {
             setMessages(prev => {
                if (parsed.id && prev.some(m => m.id === parsed.id)) return prev;
                if (parsed.tempId && prev.some(m => m._tempId === parsed.tempId)) return prev;
                return [...prev, { id: parsed.id || parsed.tempId || Date.now().toString(), sender_id: parsed.from || parsed.sender_id, text: incomingText, created_at: new Date().toISOString(), status: 'read', type: parsed.msgType || 'chat' }];
             });
             if (isConnected) triggerMarkRead(targetRoomId);
             setTimeout(() => scrollToBottom("auto"), 10); 
         } else {
             if (isConnected && markDelivered) markDelivered(targetRoomId);
             useNotificationStore.getState().setUnreadChatsCount(useNotificationStore.getState().unreadChatsCount + 1);
             const isFriendRoom = rooms.some((r: any) => String(r.room_id) === targetRoomId);
             if (!isFriendRoom) { fetchChatsData(); }
         }
      }

      if (parsed.type === 'message_sent_confirm') {
          setMessages(prev => prev.map(m => (m._tempId === parsed.tempId || m.id === parsed.tempId) ? { ...m, status: (m.status === 'delivered' || m.status === 'read') ? m.status : 'sent', id: parsed.id } : m));
      }

      if (parsed.type === 'message_delivered' && String(parsed.roomId) === String(selectedRoomIdRef.current) && String(parsed.userId) !== String(user?.id)) {
         setMessages(prev => prev.map(m => ((String(m.sender_id) === String(user?.id) || String(m.from) === String(user?.id)) && (m.status === 'sending' || m.status === 'sent' || !m.status)) ? { ...m, status: 'delivered' } : m));
      }
      if (parsed.type === 'message_read' && String(parsed.roomId) === String(selectedRoomIdRef.current) && Date.now() - lastMarkReadTime.current > 2000 && String(parsed.userId) !== String(user?.id)) {
         setMessages(prev => prev.map(m => ((String(m.sender_id) === String(user?.id) || String(m.from) === String(user?.id)) && m.status !== 'read') ? { ...m, status: 'read' } : m));
      }

      if (parsed.type === 'call_ring') { playSound('ring_in'); setIncomingCall(parsed); }
      if (parsed.type === 'call_reject' || parsed.type === 'call_end' || parsed.type === 'call_dismiss' || parsed.type === 'error') {
          stopAllRingtones(); setIncomingCall(null);
          if (parsed.type === 'call_reject') showToast(`Call ${parsed.reason || 'declined'}`, 'error');
          if (parsed.type === 'call_end') showToast('Call ended', 'warning');
          if (parsed.type === 'error') { showToast(parsed.message || "Action not allowed", "error"); if (!parsed.message?.toLowerCase().includes("call friends")) return; }
          endActiveCall(); fetchChatsData(); 
      }
      if (parsed.type === 'call_accept') {
          stopAllRingtones(); setActiveCall((prev: any) => prev ? { ...prev, isAccepted: true } : prev);
          if (pcRef.current) return;
          const pc = await initPeerConnection(parsed.from, parsed.callId);
          const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
          wsSendSignaling({ type: 'call_offer', to: parsed.from, callId: parsed.callId, sdp: JSON.stringify(offer) });
      }
      if (parsed.type === 'call_offer') {
          const pc = pcRef.current || await initPeerConnection(parsed.from, parsed.callId);
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.sdp)));
          const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
          wsSendSignaling({ type: 'call_answer', to: parsed.from, callId: parsed.callId, sdp: JSON.stringify(answer) });
          iceCandidateQueue.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c))); iceCandidateQueue.current = [];
      }
      if (parsed.type === 'call_answer') {
          if (pcRef.current) { await pcRef.current.setRemoteDescription(new RTCSessionDescription(JSON.parse(parsed.sdp))); iceCandidateQueue.current.forEach(c => pcRef.current!.addIceCandidate(new RTCIceCandidate(c))); iceCandidateQueue.current = []; }
      }
      if (parsed.type === 'ice_candidate') {
          const candidate = JSON.parse(parsed.candidate);
          if (pcRef.current && pcRef.current.remoteDescription) pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); else iceCandidateQueue.current.push(candidate);
      }
    });
    return unsubscribe;
  }, [user?.id, isConnected, subscribe, markDelivered, markRead]);

  const getMedia = async (video: boolean) => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: video ? { width: { ideal: 1280 } } : false });
          localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream; return stream;
      } catch (err) { showToast('Camera/Mic permission denied', 'error'); return null; }
  };

  const initPeerConnection = async (targetUserId: string, callId: string) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc; iceCandidateQueue.current = [];
      pc.onicecandidate = (e) => { if (e.candidate) wsSendSignaling({ type: 'ice_candidate', to: targetUserId, callId, candidate: JSON.stringify(e.candidate) }); };
      pc.ontrack = (e) => { 
          const stream = e.streams && e.streams.length > 0 ? e.streams[0] : new MediaStream([e.track]);
          if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== stream) { remoteVideoRef.current.srcObject = stream; remoteVideoRef.current.play().catch(console.error); } 
      };
      pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') endActiveCall(); };
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
      return pc;
  };

  const handleStartCall = async (type: 'audio' | 'video', isGroupCall: boolean) => {
      if (!selectedRoomId || isGroupCall) return; 
      const targetRoom = rooms.find(r => r.room_id === selectedRoomId);
      if (!targetRoom || !targetRoom.partner_id) return; 
      const stream = await getMedia(type === 'video'); if (!stream) return;
      playSound('ring_out'); 
      const callId = `call_${Date.now()}`;
      setActiveCall({ id: callId, roomId: selectedRoomId, peerName: targetRoom.name || 'User', isVideo: type === 'video', peerId: targetRoom.partner_id, isAccepted: false });
      wsSendSignaling({ type: 'call_ring', to: targetRoom.partner_id, callId, roomId: selectedRoomId, callType: type, hasVideo: type === 'video' });
  };

  const acceptIncomingCall = async (resolvedName: string) => {
      stopAllRingtones(); const parsed = incomingCall; setIncomingCall(null);
      const stream = await getMedia(parsed.hasVideo);
      if (!stream) { wsSendSignaling({ type: 'call_reject', to: parsed.from, callId: parsed.callId, reason: 'no_media' }); return; }
      setActiveCall({ id: parsed.callId, roomId: parsed.roomId, peerName: resolvedName, isVideo: parsed.hasVideo, peerId: parsed.from, isAccepted: true });
      wsSendSignaling({ type: 'call_accept', to: parsed.from, callId: parsed.callId });
  };

  const rejectIncomingCall = () => { stopAllRingtones(); wsSendSignaling({ type: 'call_reject', to: incomingCall.from, callId: incomingCall.callId, reason: 'rejected' }); setIncomingCall(null); };

  const endActiveCall = () => {
      stopAllRingtones();
      if (activeCall && activeCall.peerId) wsSendSignaling({ type: 'call_end', to: activeCall.peerId, callId: activeCall.id });
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setActiveCall(null);
  };

  const handleCallLogClick = async (call: any) => {
      const isOutgoing = String(call.initiatedBy) === String(user?.id);
      const otherId = isOutgoing ? (call.peerId || call.receiverId || call.to || call.partner_id) : call.initiatedBy;
      const knownUser = userMap[otherId] || Object.values(userMap).find(u => u.name === call.callerName || u.name === call.peerName);
      const targetUsername = knownUser?.username || call.callerUsername || call.peerUsername;

      if (targetUsername) {
          try { const res = await api.post('/rooms', { username: targetUsername }); setSelectedRoomId(res.data?.room_id || res.data?.id); setActiveTab('chats'); } 
          catch (e) { showToast("Failed to open chat", "error"); }
      } else { showToast("User details not found to start chat", "error"); }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedRoomId) return;

    // Encode ID so we can click-to-scroll later
    const finalMessageText = replyingTo ? `> [id:${replyingTo.id || replyingTo._tempId}] ${replyingTo.text || replyingTo.content}\n\n${inputValue}` : inputValue;
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
    
    // FIX: Clear local storage draft and state on send
    setInputValue(""); 
    handleSetReplyingTo(null); 
    setShowEmojiPicker(false);
    
    const savedDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
    delete savedDrafts[selectedRoomId];
    localStorage.setItem('chat_drafts', JSON.stringify(savedDrafts));

    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  // FIX: Save drafts to local storage dynamically
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (selectedRoomId) {
        const savedDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
        savedDrafts[selectedRoomId] = val;
        localStorage.setItem('chat_drafts', JSON.stringify(savedDrafts));
        sendTypingStart(selectedRoomId);
    }
  };

  // FIX: Manage reply states per room
  const handleSetReplyingTo = (msg: ChatMessage | null) => {
      setReplyingTo(msg);
      if (selectedRoomId) {
          setDraftReplies(prev => ({ ...prev, [selectedRoomId]: msg }));
      }
  };

  const onEmojiClick = (emojiObject: any) => {
      const newVal = inputValue + emojiObject.emoji;
      setInputValue(newVal);
      if (selectedRoomId) {
          const savedDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
          savedDrafts[selectedRoomId] = newVal;
          localStorage.setItem('chat_drafts', JSON.stringify(savedDrafts));
      }
  };

  let isRequest = false;
  let activeRoom = rooms.find(r => r.room_id === selectedRoomId);
  if (!activeRoom && selectedRoomId) {
      const req = requests.find(r => r.room_id === selectedRoomId);
      if (req) { isRequest = true; activeRoom = { room_id: req.room_id, type: 'DM', name: req.sender_name, friend_username: req.sender_username, avatar_url: req.sender_avatar, partner_id: req.sender_username, last_message_at: new Date().toISOString(), unread_count: 0 } as Room; }
  }

  const isFriend = activeRoom?.friend_username ? friends.some(f => f.username === activeRoom?.friend_username) : false;

  const handleGroupInviteAction = async (groupId: string, action: 'accept' | 'decline') => {
    try { await api.post(`/groups/${groupId}/invites/${action}`); await fetchChatsData(); if (action === 'accept') { setActiveTab('chats'); setSelectedRoomId(groupId); } showToast(`Squad invite ${action}ed!`, 'success'); } 
    catch (error: any) { showToast(`Failed to ${action} invite`, 'error'); }
  };

  const handlePanelAction = async (action: string, payload?: any) => {
      setShowInfoPanel(false); if (!selectedRoomId || !activeRoom) return; 
      const isGroup = activeRoom.type === 'group' || activeRoom.type === 'GROUP';
      const targetRoomId = selectedRoomId; const targetName = activeRoom.name || 'Unknown'; const targetUsername = activeRoom.friend_username;

      if (isGroup) {
          switch(action) {
              case 'generate_invite':
                  try {
                    const res = await api.post(`/groups/${targetRoomId}/invite`); const code = res?.data?.inviteCode || res?.inviteCode;
                    if (code) { navigator.clipboard.writeText(`inv_${code}`); showToast(`Invite code inv_${code} copied!`, 'success'); fetchRoomDetails(targetRoomId, 'group'); } 
                    else showToast("Could not generate invite code.", 'error');
                  } catch(e) { showToast("Failed to generate code", 'error'); } break;
              case 'leave_group': setConfirmConfig({ title: "Leave Squad", desc: `Are you sure you want to leave ${targetName}?`, onConfirm: async () => { await api.delete(`/groups/${targetRoomId}/members/${user?.id}`); setSelectedRoomId(null); setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); setConfirmConfig(null); showToast("Left squad.", "info"); }}); break;
              case 'delete_group': setConfirmConfig({ title: "Delete Squad", desc: "DANGER: This permanently deletes the group for everyone. Proceed?", onConfirm: async () => { await api.delete(`/groups/${targetRoomId}`); setSelectedRoomId(null); setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); setConfirmConfig(null); showToast("Squad deleted.", "info"); }}); break;
              case 'remove_member': setConfirmConfig({ title: "Kick Member", desc: "Are you sure you want to kick this user?", onConfirm: async () => { await api.delete(`/groups/${targetRoomId}/members/${payload}`); fetchRoomDetails(targetRoomId, 'group'); setConfirmConfig(null); showToast("Member kicked.", "success"); }}); break;
              case 'promote_admin': setConfirmConfig({ title: "Promote to Admin", desc: "Give this user admin privileges?", onConfirm: async () => { await api.post(`/groups/${targetRoomId}/admins`, { userId: payload }); fetchRoomDetails(targetRoomId, 'group'); setConfirmConfig(null); showToast("Promoted to admin.", "success"); }}); break;
          }
      } else {
          switch(action) {
              case 'mute_notifications': showToast("Mute feature coming soon!", "info"); break;
              case 'add_friend':
                  if (!targetUsername) return showToast("Cannot add unknown user", "error");
                  try { await api.post(`/friends/request`, { username: targetUsername }); showToast("Friend request sent!", "success"); fetchFriends(true); } 
                  catch (e: any) { showToast(e.message || "Failed to send request", "error"); } break;
              case 'remove':
                  if (!targetUsername) return showToast("Cannot remove unknown user", "error");
                  setConfirmConfig({ title: "Remove Friend", desc: `Are you sure you want to remove @${targetUsername}? If you remove them, your chats will be gone forever and cannot be retrieved.`, onConfirm: async () => { try { await api.delete(`/friends/${targetUsername}`).catch(e => { if (e.message && !e.message.includes('Not friends')) throw e; }); await api.post(`/rooms/${targetRoomId}/reject`).catch(() => {}); setSelectedRoomId(null); setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); setConfirmConfig(null); showToast("Friend removed and chat deleted.", "success"); } catch (e: any) { setConfirmConfig(null); showToast(e.message || "Failed to remove friend.", "error"); } }}); break;
              case 'block':
                  setConfirmConfig({ title: "Block User", desc: "They will no longer be able to message you. This chat will be deleted.", onConfirm: async () => { try { await api.post('/match/action', { room_id: targetRoomId, action: 'block', partner_username: targetUsername }); await api.post(`/rooms/${targetRoomId}/reject`).catch(() => {}); setSelectedRoomId(null); setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); setConfirmConfig(null); showToast("User blocked.", "success"); } catch (e: any) { setConfirmConfig(null); showToast(e.message || "Failed to block user.", "error"); } }}); break;
              case 'report': if (targetUsername) setReportConfig({ username: targetUsername, roomId: targetRoomId }); break;
          }
      }
  };

  const submitReport = async (e: React.FormEvent) => {
      e.preventDefault(); if (!reportConfig || !reportReason.trim()) return; setIsReporting(true);
      try { await api.post('/match/report', { reported_username: reportConfig.username, reason: reportReason.trim(), room_id: reportConfig.roomId }); const targetRoomId = reportConfig.roomId; await api.post(`/rooms/${targetRoomId}/reject`).catch(() => {}); setSelectedRoomId(null); setRooms(prev => prev.filter(r => r.room_id !== targetRoomId)); setReportConfig(null); setReportReason(""); showToast("Report submitted successfully. The user has been blocked.", "success"); } 
      catch (err: any) { showToast(err.message || "Failed to submit report.", "error"); } finally { setIsReporting(false); }
  };

  const handleCreateDMOrJoin = async (e: React.FormEvent) => {
    e.preventDefault(); const input = newUsername.trim(); if (!input) return; setIsCreating(true);
    try {
      if (input.startsWith('inv_') || input.length > 15) {
         const actualCode = input.startsWith('inv_') ? input.replace('inv_', '') : input;
         await api.post(`/invite/${actualCode}`); showToast("Joined squad successfully!", 'success'); await fetchChatsData();
      } else {
         const res = await api.post('/rooms', { username: input }); const data = res.data || res;
         if (data.pending) showToast("Because their account is private, a DM request was sent!", 'info');
         else { await fetchChatsData(); setSelectedRoomId(data.room_id); setActiveTab('chats'); }
      }
      setNewUsername('');
    } catch (error: any) { 
      const status = error.response?.status || error.status; const msg = error.response?.data?.message || error.message || "";
      if (msg.toLowerCase().includes('already')) showToast("You are already a member of this squad!", 'info');
      else if (status === 403 || msg.toLowerCase().includes('private')) showToast("This user has a private account. Send a friend request first.", 'error');
      else showToast(msg || "Failed to start chat", 'error'); 
    } finally { setIsCreating(false); }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault(); if (!groupName.trim()) return; setIsCreatingGroup(true);
    try {
      const res = await api.post('/groups', { name: groupName.trim(), description: groupDesc.trim(), is_private: isPrivateGroup, avatarUrl: groupAvatarUrl.trim() });
      const data = res.data || res; await fetchChatsData(); setSelectedRoomId(data.room_id || data.id); setShowGroupModal(false); setGroupName(""); setGroupDesc(""); setGroupAvatarUrl(""); showToast("Squad created!", 'success');
    } catch (error: any) { showToast(error.message || "Failed to create squad", 'error'); } finally { setIsCreatingGroup(false); }
  };

  const handleRequestAction = async (roomId: string, action: 'accept' | 'reject') => {
    try { await api.post(`/rooms/${roomId}/${action}`); await fetchChatsData(); if (action === 'accept') { setActiveTab('chats'); setSelectedRoomId(roomId); } } 
    catch (error: any) { showToast(`Failed to ${action} request`, 'error'); }
  };

  const renderTextWithHighlights = (text: string) => {
    if (!isSearchingMessages || !messageSearchQuery.trim()) return text;
    const query = messageSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => part.toLowerCase() === messageSearchQuery.toLowerCase() ? <mark key={i} className="bg-yellow-400 text-gray-900 font-bold rounded-sm px-0.5">{part}</mark> : part);
  };

  return (
    <DashboardLayout>
      <div className="absolute inset-0 z-10 flex bg-white dark:bg-[#030303] overflow-hidden font-sans transition-colors duration-300 border-t border-gray-200 dark:border-[#272729] md:border-none">
         <ChatSidebar 
            rooms={rooms} requests={requests} groupInvites={groupInvites} callHistory={callHistory} activeTab={activeTab} setActiveTab={setActiveTab} 
            selectedRoomId={selectedRoomId} setSelectedRoomId={setSelectedRoomId} presence={presence} 
            user={user} formatTime={formatTime} newUsername={newUsername} setNewUsername={setNewUsername} 
            isCreating={isCreating} handleCreateDM={handleCreateDMOrJoin} isLoadingSidebar={isLoadingSidebar}
            handleRequestAction={handleRequestAction} handleGroupInviteAction={handleGroupInviteAction} setShowGroupModal={setShowGroupModal}
            handleCallLogClick={handleCallLogClick} userMap={userMap}
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
              inputValue={inputValue} handleInput={handleInput} replyingTo={replyingTo} setReplyingTo={handleSetReplyingTo}
              showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker} onEmojiClick={onEmojiClick}
              formatTime={formatTime} showInfoPanel={showInfoPanel} setShowInfoPanel={setShowInfoPanel} 
              activeRoomDetails={activeRoomDetails} isLoadingDetails={isLoadingDetails} showToast={showToast} refreshChats={fetchChatsData}
              onPanelAction={handlePanelAction} 
           />
         ) : (
           <ChatWindow 
              activeRoom={activeRoom} selectedRoomId={selectedRoomId} setSelectedRoomId={setSelectedRoomId}
              isRequest={isRequest} isFriend={isFriend} 
              handleRequestAction={handleRequestAction} 
              messages={messages} user={user} presence={presence} typingData={typingData}
              isMessagesLoading={isMessagesLoading} isLoadingOlder={isLoadingOlder} hasMoreMessages={hasMoreMessages}
              fetchMessages={fetchMessages} messagesEndRef={messagesEndRef} isSearchingMessages={isSearchingMessages}
              setIsSearchingMessages={setIsSearchingMessages} messageSearchQuery={messageSearchQuery}
              setMessageSearchQuery={setMessageSearchQuery} scrollToBottom={scrollToBottom}
              renderTextWithHighlights={renderTextWithHighlights} handleSendMessage={handleSendMessage}
              inputValue={inputValue} handleInput={handleInput} replyingTo={replyingTo} setReplyingTo={handleSetReplyingTo}
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
        <div className={`fixed bottom-6 right-6 z-[99999] px-6 py-3.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 font-extrabold text-white text-sm ${
           toastMessage.type === 'success' ? 'bg-green-600' : 
           toastMessage.type === 'error' ? 'bg-red-600' : 
           toastMessage.type === 'warning' ? 'bg-gray-800 border border-gray-700' : 'bg-blue-600'
        }`}>{toastMessage.msg}</div>
      )}

      <Modal isOpen={confirmConfig !== null} onClose={() => setConfirmConfig(null)} title={confirmConfig?.title || "Confirm"}
        footer={
           <>
            <button onClick={() => setConfirmConfig(null)} className="px-5 py-3 text-sm font-extrabold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
            <button onClick={confirmConfig?.onConfirm} className="px-6 py-3 bg-blue-600 text-white text-sm font-extrabold rounded-2xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] hover:bg-blue-500 transition-all hover:-translate-y-0.5">Confirm</button>
           </>
        }>
         <p className="text-gray-600 dark:text-gray-300 font-medium py-2 text-center md:text-left">{confirmConfig?.desc}</p>
      </Modal>

      <Modal isOpen={reportConfig !== null} onClose={() => { setReportConfig(null); setReportReason(""); }} title={`Report @${reportConfig?.username}`}
        footer={
           <>
            <button onClick={() => { setReportConfig(null); setReportReason(""); }} className="px-5 py-3 text-sm font-extrabold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
            <button onClick={submitReport} disabled={!reportReason.trim() || isReporting} className="px-6 py-3 bg-red-600 disabled:opacity-50 text-white text-sm font-extrabold rounded-2xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] hover:bg-red-500 transition-all hover:-translate-y-0.5 flex items-center gap-2">
               {isReporting && <Loader2 size={16} className="animate-spin" />} Submit Report
            </button>
           </>
        }>
         <div className="space-y-4 py-2">
             <p className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center md:text-left">Why are you reporting this user? They will be blocked immediately upon submission.</p>
             <textarea 
                value={reportReason} 
                onChange={(e) => setReportReason(e.target.value)} 
                className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl p-4 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[120px] resize-none shadow-inner transition-all" 
                placeholder="E.g., Inappropriate behavior, spam..." 
                autoFocus 
             />
         </div>
      </Modal>

      <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title="Create a Squad">
        <form onSubmit={handleCreateGroup} className="space-y-5 py-2">
            <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Group Name</label>
                <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner transition-all" placeholder="E.g. Weekend Gamers" autoFocus required />
            </div>
            <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Group Image URL (Optional)</label>
                <input type="url" value={groupAvatarUrl} onChange={e => setGroupAvatarUrl(e.target.value)} className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner transition-all" placeholder="https://example.com/image.png" />
            </div>
            <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">Description (Optional)</label>
                <input type="text" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner transition-all" placeholder="What is this group for?" />
            </div>
            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#272729] rounded-2xl cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm mt-2">
                <input type="checkbox" checked={isPrivateGroup} onChange={e => setIsPrivateGroup(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <div>
                   <p className="text-sm font-bold text-gray-900 dark:text-white">Private Group</p>
                   <p className="text-[10px] font-medium text-gray-500 mt-0.5">Only people with an invite code can join.</p>
                </div>
            </label>
            <button type="submit" disabled={!groupName.trim() || isCreatingGroup} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 mt-6 hover:-translate-y-0.5">
                {isCreatingGroup ? <Loader2 size={18} className="animate-spin" /> : "Create Squad"}
            </button>
        </form>
      </Modal>

      {incomingCall && (() => {
        let callerName = 'Someone';
        const fromId = incomingCall.from || incomingCall.callerId || incomingCall.userId;
        
        if (fromId && userMap[fromId]) {
            callerName = userMap[fromId].name || userMap[fromId].username;
        } else {
            for (const r of rooms) {
                const m = r.members?.find((m:any) => m.id === fromId || m.username === fromId);
                if (m && m.name) { callerName = m.name; break; }
            }
        }
        
        return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in transition-colors">
           <div className="bg-white dark:bg-[#1A1A1B] border border-gray-200 dark:border-[#272729] rounded-[2rem] p-8 md:p-10 flex flex-col items-center shadow-2xl min-w-[320px] animate-in zoom-in-95 transition-colors">
              <div className="relative mb-6">
                 <div className="absolute inset-0 bg-blue-400/20 dark:bg-blue-600/30 blur-xl rounded-full animate-pulse"></div>
                 <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-4xl font-extrabold text-blue-600 dark:text-blue-500 shadow-inner border-4 border-blue-200 dark:border-blue-500/20 relative z-10">
                    {callerName.charAt(0).toUpperCase()}
                 </div>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1 transition-colors">{callerName}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8 transition-colors">Incoming {incomingCall.hasVideo ? 'Video' : 'Audio'} Call...</p>
              
              <div className="flex gap-6 w-full px-4">
                 <button onClick={rejectIncomingCall} className="flex-1 h-14 bg-red-600 hover:bg-red-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all active:scale-95 hover:-translate-y-0.5">
                    <PhoneCall size={24} className="rotate-[135deg]" strokeWidth={2.5} />
                 </button>
                 <button onClick={() => acceptIncomingCall(callerName)} className="flex-1 h-14 bg-green-500 hover:bg-green-400 rounded-[1.5rem] flex items-center justify-center text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all active:scale-95 animate-bounce hover:-translate-y-0.5">
                    <PhoneCall size={24} strokeWidth={2.5} />
                 </button>
              </div>
           </div>
        </div>
        );
      })()}
    </DashboardLayout>
  );
}