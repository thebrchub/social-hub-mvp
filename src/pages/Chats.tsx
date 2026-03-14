import { useState, useEffect, useRef, useMemo } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendStore } from '../store/useFriendStore'; 
import { useWebSocket } from '../hooks/useWebSocket';
import { ChatSidebar } from '../components/chats/ChatSidebar';
import { ChatWindow } from '../components/chats/ChatWindow';
import { ChatGroupWindow } from '../components/chats/ChatGroupWindow'; 
import { Loader2, Users, WifiOff } from 'lucide-react';
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
//   const navigate = useNavigate();
  const { sendTypingStart, markRead, markDelivered, isConnected, subscribe, sendRaw } = useWebSocket();
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
        api.get('/rooms?limit=50').catch(() => ({ data: { rooms: [], users: {} } })),
        api.get('/rooms/requests').catch(() => ({ data: [] })),
        api.get('/groups/invites').catch(() => ({ data: [] })),
        api.get('/calls/history?limit=30').catch(() => ({ data: [] })) 
      ]);
      
      const rawRoomsData = roomsRes?.data || roomsRes;
      let fetchedRooms = rawRoomsData.rooms || (Array.isArray(rawRoomsData) ? rawRoomsData : []);
      const usersMap = rawRoomsData.users || {};

      const fetchedReqs = Array.isArray(requestsRes) ? requestsRes : requestsRes?.data || [];
      const fetchedInvites = Array.isArray(invitesRes) ? invitesRes : invitesRes?.data || [];
      const histData = historyRes?.data || historyRes;
      const fetchedHistory = Array.isArray(histData) ? histData : (histData?.calls || histData?.data || []);

      setRequests(fetchedReqs);
      setGroupInvites(fetchedInvites);
      setCallHistory(fetchedHistory);

      const currentUserId = useAuthStore.getState().user?.id;

      fetchedRooms = fetchedRooms.map((room: any) => {
         // Stitch members first
         if (room.member_ids && Array.isArray(room.member_ids)) {
             room.members = room.member_ids.map((id: string) => {
                 const userDetails = usersMap[id];
                 return userDetails ? { id, ...userDetails } : { id };
             });
         }

         // Now find partner correctly
         if ((room.type === 'DM' || room.type === 'private' || room.type === 'private_dm') && room.members) {
             const partner = room.members.find((m: any) => String(m.id) !== String(currentUserId));
             if (partner) {
                 room.name = partner.name || partner.username;
                 room.friend_username = partner.username;
                 room.partner_id = partner.id; // CRITICAL FIX: Ensure this is set for calls
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
    } catch (error) { 
        console.error("Failed to fetch chats data:", error); 
    } finally { 
        setIsLoadingSidebar(false); 
    }
  };

  useEffect(() => { 
      fetchChatsData(); 
      fetchFriends(); 
      
      // ADD THIS: Listen for call endings to refresh the sidebar history!
      const handleRefresh = () => fetchChatsData();
      window.addEventListener('REFRESH_CHATS', handleRefresh);
      return () => window.removeEventListener('REFRESH_CHATS', handleRefresh);
      
  }, [location.state?.autoOpenRoomId]);

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

  useEffect(() => {
    if (!selectedRoomId) { setMessages([]); return; }
    
    const savedDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
    setInputValue(savedDrafts[selectedRoomId] || "");
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
    const unsubscribe = subscribe(async (parsed: any) => {
      if (parsed.type === 'presence_online') setPresence(prev => ({ ...prev, [parsed.userId]: { online: true, lastSeen: null }}));
      if (parsed.type === 'presence_offline') setPresence(prev => ({ ...prev, [parsed.userId]: { online: false, lastSeen: parsed.lastSeenAt }}));

      if (parsed.type === 'typing_status' && parsed.roomId === selectedRoomIdRef.current && !parsed.userIds.includes(user?.id)) {
         setTypingData({ roomId: parsed.roomId, userIds: parsed.userIds });
         if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
         typingTimeoutRef.current = setTimeout(() => setTypingData(null), 3000); 
      }

      if (parsed.type === 'group_invite') { 
          showToast(`You were invited to join ${parsed.groupName || 'a squad'}!`, "info"); 
          fetchChatsData(); 
          useNotificationStore.getState().addNotification({
              type: 'GROUP_INVITE',
              title: `Squad Invite: ${parsed.groupName || 'New Squad'}`,
              message: `@${parsed.inviterName || 'Someone'} invited you to join their squad!`,
              time: parsed.invitedAt || new Date().toISOString(),
              data: {
                  roomId: parsed.roomId || parsed.groupId,
                  groupName: parsed.groupName,
                  avatarUrl: parsed.avatarUrl,
                  inviterName: parsed.inviterName
              }
          });
      }
      
      if (parsed.type === 'group_invite_accepted' || parsed.type === 'member_joined' || parsed.type === 'group_updated') {
         fetchChatsData(); 
         const targetId = parsed.roomId || parsed.groupId || parsed.room_id;
         if (String(targetId) === String(selectedRoomIdRef.current)) {
             fetchRoomDetails(targetId, 'group');
         }
      }

      if (parsed.type === 'send_message' || parsed.type === 'group_message' || parsed.type === 'message' || parsed.type === 'message_sent_confirm') {
         const incomingText = parsed.text || parsed.content || "New message";
         const targetRoomId = String(parsed.roomId || parsed.room_id || parsed.groupId);
         const currentRoomId = String(selectedRoomIdRef.current);
         
         const incomingTempId = parsed.tempId || parsed.temp_id;
         const incomingMsgId = parsed.id || parsed.message_id;

         let senderId = parsed.from || parsed.sender_id || parsed.senderId || parsed.userId;
         if (!senderId && parsed.user) senderId = parsed.user.id;
         
         const isMe = String(senderId) === String(user?.id);
         const isCurrentlyLookingAtThisChat = document.visibilityState === 'visible' && targetRoomId === currentRoomId;

         if (parsed.type !== 'message_sent_confirm') {
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
         }

         if (isMe || parsed.type === 'message_sent_confirm') {
            setMessages(prev => prev.map(m => {
               if (m._tempId === incomingTempId || m.id === incomingTempId || (m.status === 'sending' && (m.text === incomingText || m.content === incomingText))) {
                  return { ...m, status: 'sent', id: incomingMsgId };
               }
               return m;
            }));
         } else if (targetRoomId === currentRoomId) {
             setMessages(prev => {
                if (incomingMsgId && prev.some(m => m.id === incomingMsgId)) return prev;
                if (incomingTempId && prev.some(m => m._tempId === incomingTempId)) return prev;
                return [...prev, { 
                    id: incomingMsgId || incomingTempId || Date.now().toString(), 
                    sender_id: senderId, 
                    text: incomingText, 
                    created_at: new Date().toISOString(), 
                    status: 'read', 
                    type: parsed.msgType || 'chat' 
                }];
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

      if (parsed.type === 'message_delivered' && String(parsed.roomId || parsed.room_id) === String(selectedRoomIdRef.current) && String(parsed.userId) !== String(user?.id)) {
         setMessages(prev => prev.map(m => ((String(m.sender_id) === String(user?.id) || String(m.from) === String(user?.id)) && (m.status === 'sending' || m.status === 'sent' || !m.status)) ? { ...m, status: 'delivered' } : m));
      }
      if (parsed.type === 'message_read' && String(parsed.roomId || parsed.room_id) === String(selectedRoomIdRef.current) && Date.now() - lastMarkReadTime.current > 2000 && String(parsed.userId) !== String(user?.id)) {
         setMessages(prev => prev.map(m => ((String(m.sender_id) === String(user?.id) || String(m.from) === String(user?.id)) && m.status !== 'read') ? { ...m, status: 'read' } : m));
      }
    });
    return unsubscribe;
  }, [user?.id, isConnected, subscribe, markDelivered, markRead, rooms]); // Added rooms to dependency array


  // FIX: Unified, bulletproof handler for both Opening Chats and Redialing Calls
  const handleCallLogClick = async (call: any, action: 'chat' | 'video' | 'audio' = 'chat') => {
      // Safely extract every possible ID format the backend might send
      const roomId = call.roomId || call.room_id || call.groupId;
      const isOutgoing = String(call.initiatedBy) === String(user?.id);
      const peerId = isOutgoing ? (call.peerId || call.receiverId || call.to || call.partner_id) : (call.initiatedBy || call.callerId || call.from);
      const peerName = isOutgoing ? (call.peerName || call.receiverName || 'Unknown') : (call.callerName || 'Unknown');
      const peerAvatar = isOutgoing ? (call.peerAvatar || call.receiverAvatar) : call.callerAvatar;

      // SCENARIO 1: We have the roomId right away (Fastest)
      if (roomId && peerId) {
          if (action === 'chat') {
              setSelectedRoomId(roomId);
              setActiveTab('chats');
          } else {
              window.dispatchEvent(new CustomEvent('START_CALL', {
                  detail: { roomId, peerId, type: action, peerName, peerAvatar }
              }));
          }
          return;
      }

      // SCENARIO 2: Room ID is missing from history. We must fetch/create it using username.
      const knownUser = userMap[peerId] || Object.values(userMap).find((u: any) => u.name === peerName);
      const targetUsername = knownUser?.username || call.peerUsername || call.callerUsername;

      if (!targetUsername) {
          showToast("Cannot find user details to complete this action.", "error");
          return;
      }

      try {
          // Force fetch the room to get the official Room ID
          const res = await api.post('/rooms', { username: targetUsername });
          const fetchedRoomId = res.data?.room_id || res.data?.id;

          if (action === 'chat') {
              setSelectedRoomId(fetchedRoomId);
              setActiveTab('chats');
          } else {
              window.dispatchEvent(new CustomEvent('START_CALL', {
                  detail: { roomId: fetchedRoomId, peerId, type: action, peerName, peerAvatar }
              }));
          }
      } catch (e) {
          showToast(`Failed to ${action === 'chat' ? 'open chat' : 'start call'}`, "error");
      }
  };

 const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedRoomId || !activeRoom) return;

    if (!isConnected) { showToast("Currently offline.", "error"); return; }

    const finalMessageText = replyingTo ? `> [id:${replyingTo.id || replyingTo._tempId}] ${replyingTo.text || replyingTo.content}\n\n${inputValue}` : inputValue;
    const tempId = `tmp_${Date.now()}`;
    
    setMessages(prev => [...prev, { _tempId: tempId, text: finalMessageText, sender_id: user?.id, created_at: new Date().toISOString(), status: 'sending' }]);

    // THE ULTIMATE FIX: Exact schema match with the backend's HTML client.
    // Strictly camelCase, no extra fields, and send_message works for groups too!
    sendRaw({
        type: 'send_message',
        roomId: selectedRoomId, 
        text: finalMessageText,
        tempId: tempId
    });
    
    setRooms(prev => {
       let updated = prev.map(r => r.room_id === selectedRoomId ? { ...r, last_message_preview: inputValue, last_message_at: new Date().toISOString() } : r);
       const targetIdx = updated.findIndex(r => r.room_id === selectedRoomId);
       if (targetIdx > 0) { const [target] = updated.splice(targetIdx, 1); updated.unshift(target); }
       return updated;
    });
    
    setInputValue(""); handleSetReplyingTo(null); setShowEmojiPicker(false);
    const savedDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
    delete savedDrafts[selectedRoomId]; localStorage.setItem('chat_drafts', JSON.stringify(savedDrafts));
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

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
      if (req) { isRequest = true; activeRoom = { room_id: req.room_id, type: 'DM', name: req.sender_name, friend_username: req.sender_username, avatar_url: req.sender_avatar, partner_id: req.sender_id, last_message_at: new Date().toISOString(), unread_count: 0 } as Room; }
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
                  setConfirmConfig({ title: "Block User", desc: "They will no longer be able to message you. Chat history will remain visible.", onConfirm: async () => { try { await api.post(`/friends/block/${targetUsername}`); setConfirmConfig(null); showToast("User blocked successfully.", "success"); fetchChatsData(); } catch (e: any) { setConfirmConfig(null); showToast(e.response?.data?.message || "Failed to block user.", "error"); } }}); break;
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
    try { 
        await api.post(`/rooms/${roomId}/${action}`); 
        await fetchChatsData(); 
        if (action === 'accept') { 
            setActiveTab('chats'); 
            setSelectedRoomId(roomId); 
        } 
    } catch (error: any) { 
        showToast(`Failed to ${action} request`, 'error'); 
    }
  };

  const handleJoinFromInviteClick = async (code: string) => {
    try {
       const res = await api.post(`/invite/${code}`); 
       const data = res.data || res;
       showToast("Joined squad successfully!", 'success'); 
       await fetchChatsData(); 
       const newRoomId = data.room_id || data.id || data.groupId;
       if (newRoomId) { setActiveTab('chats'); setSelectedRoomId(newRoomId); fetchRoomDetails(newRoomId, 'group'); }
    } catch (error: any) {
       const msg = error.response?.data?.message || error.message || "Failed to join";
       if (msg.toLowerCase().includes('already')) showToast("You are already in this squad!", 'info');
       else showToast(msg, 'error');
    }
  };

  const renderTextWithHighlights = (text: string) => {
    if (!text) return text;
    if (isSearchingMessages && messageSearchQuery.trim()) {
      const query = messageSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return parts.map((part, i) => part.toLowerCase() === messageSearchQuery.toLowerCase() ? <mark key={i} className="bg-yellow-400 text-gray-900 font-bold rounded-sm px-0.5">{part}</mark> : part);
    }

    const zquabInviteRegex = /(https?:\/\/(?:www\.)?zquab\.com\/j\/[a-zA-Z0-9_-]+)/g;
    if (text.match(zquabInviteRegex)) {
        const parts = text.split(zquabInviteRegex);
        return parts.map((part, i) => {
            const match = part.match(/https?:\/\/(?:www\.)?zquab\.com\/j\/([a-zA-Z0-9_-]+)/);
            if (match) {
                const code = match[1];
                return (
                    <div key={i} className="mt-2 mb-1 p-3 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-[#272729] shadow-sm flex flex-col gap-2 min-w-[200px]">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Users size={14} strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Squad Invite</p>
                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">zquab.com/j/{code}</p>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleJoinFromInviteClick(code); }} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-extrabold rounded-lg transition-all shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] active:scale-95">
                            Join Squad
                        </button>
                    </div>
                );
            }
            const stdUrlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
            const subParts = part.split(stdUrlRegex);
            return subParts.map((subPart, j) => {
                if (subPart.match(stdUrlRegex)) {
                    const href = subPart.startsWith('http') ? subPart : `https://${subPart}`;
                    return <a key={`${i}-${j}`} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-300 dark:text-blue-400 underline decoration-blue-400/50 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>{subPart}</a>;
                }
                return subPart;
            });
        });
    }

    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-300 dark:text-blue-400 underline decoration-blue-400/50 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>{part}</a>;
      }
      return part;
    });
  };

  return (
    <DashboardLayout>
      {!isConnected && (
         <div className="absolute top-0 inset-x-0 bg-red-600 text-white text-[10px] font-bold text-center py-1 z-[999] flex justify-center items-center gap-2 shadow-md animate-in slide-in-from-top duration-300">
             <WifiOff size={12} /> Reconnecting to chat server...
         </div>
      )}

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
              onPanelAction={handlePanelAction} showToast={showToast}
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

    </DashboardLayout>
  );
}