export interface User {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  avatarUrl?: string;
  is_online?: boolean;
  last_seen_at?: string;
  role?: string;
}

export interface RoomMember extends User {}

export interface Room {
  room_id: string;
  name: string | null;
  type: 'DM' | 'group' | 'private' | 'private_dm' | 'GROUP';
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
  group_avatar?: string;
  member_ids?: string[];
}

export interface DMRequest {
  room_id: string;
  sender_name?: string;
  sender_username?: string;
  sender_avatar?: string;
  sender_id?: string;
  last_message_preview?: string;
  last_message_at?: string;
}

export interface GroupInvite {
  roomId: string;
  groupName: string;
  avatarUrl?: string;
  invitedBy: string;
  inviterName: string;
  invitedAt: string;
}

export interface MediaItem {
  url?: string;
  objectKey?: string;
  mediaType: 'image' | 'video';
  width: number;
  height: number;
  sortOrder: number;
}

export interface ChatMessage {
  id?: string;
  message_id?: string;
  text?: string;
  content?: string;
  sender_id: string;
  from?: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  _tempId?: string;
  type?: string;
  media?: MediaItem[];
}

export interface CallHistoryItem {
  roomId?: string;
  room_id?: string;
  groupId?: string;
  initiatedBy?: string;
  peerId?: string;
  receiverId?: string;
  peerName?: string;
  callerName?: string;
  peerAvatar?: string;
  callerAvatar?: string;
  peerUsername?: string;
  callerUsername?: string;
  type: 'video' | 'audio' | 'chat';
}

export interface UserPresence {
  online: boolean;
  lastSeen: string | null;
}

export interface WSPayload {
  type: string;
  roomId?: string;
  room_id?: string;
  groupId?: string;
  userId?: string;
  text?: string;
  content?: string;
  tempId?: string;
  temp_id?: string;
  id?: string;
  message_id?: string;
  sender_id?: string;
  from?: string;
  created_at?: string;
  status?: string;
  media?: MediaItem[];
  userIds?: string[];
  lastSeenAt?: string;
  groupName?: string;
  inviterName?: string;
  invitedAt?: string;
  avatarUrl?: string;
  data?: WSPayload; // For wrapped private
}

export type FlipState = { horizontal: boolean; vertical: boolean };

export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Toast
export interface ToastMessage {
  msg: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface ConfirmConfig {
  title: string;
  desc: string;
  onConfirm: () => void;
}

