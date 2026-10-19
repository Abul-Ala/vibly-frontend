export interface Photo {
  id: number;
  photoUrl?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface Interest {
  id: number;
  name: string;
  category?: string;
  icon?: string;
}

export interface UserProfile {
  id: number;
  userId: number;
  displayName?: string;
  age: number;
  gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | string;
  interestedIn?: 'MALE' | 'FEMALE' | 'EVERYONE' | string;
  bio?: string;
  occupation?: string;
  city?: string;
  isVerified?: boolean;
  hideDistance?: boolean;
  hideOnlineStatus?: boolean;
  photos?: Photo[];
  interests?: Interest[];
  distanceKm?: number;
  compatibilityScore?: number;
  userStatus?: string;
}

export interface SwipeResult {
  isMatch: boolean;
  matchId?: number;
  conversationId?: number;
  message?: string;
  matchedProfile?: UserProfile;
}

export interface MatchItem {
  matchId: number;
  conversationId?: number;
  matchedUser?: UserProfile;
  matchedAt?: string;
}

export interface ConversationItem {
  id: number;
  matchId: number;
  otherUser?: UserProfile;
  lastMessage?: string;
  lastMessageTime?: string;
  updatedAt?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName?: string;
  content: string;
  type?: string;
  isRead?: boolean;
  isMe?: boolean;
  createdAt?: string;
  time?: string;
}

export interface AuthData {
  token: string;
  userId: number;
  email: string;
  profile?: UserProfile;
}

export interface RegisterRequestDto {
  displayName: string;
  email: string;
  password: string;
  gender: string;
  interestedIn: string;
  birthDate?: string;
  city?: string;
  initialPhotoUrl?: string;
  interestIds?: number[];
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface SwipeRequestDto {
  targetUserId: number;
  isLike: boolean;
}

export interface SendMessageDto {
  content: string;
  type?: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  occupation?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  interestedIn?: string;
  interestIds?: number[];
  hideDistance?: boolean;
  hideOnlineStatus?: boolean;
}

export interface BlockRequestDto {
  targetUserId: number;
  reason?: string;
}

export interface ReportRequestDto {
  targetUserId: number;
  reason?: string;
  details?: string;
}

export interface StoryItem {
  id: number;
  userId: number;
  userName?: string;
  userAvatarUrl?: string;
  mediaUrl?: string;
  caption?: string;
  createdAt?: string;
  expiresAt?: string;
  timeAgo?: string;
  viewCount?: number;
}

export interface UserStoryGroup {
  userId: number;
  userName?: string;
  userAvatarUrl?: string;
  isMe?: boolean;
  stories: StoryItem[];
}

export interface LikeNotificationDto {
  likerUserId: number;
  likerName?: string;
  displayName?: string;
  likerPhotoUrl?: string;
  fullPhotoUrl?: string;
  message?: string;
  likedAt?: string;
  isMatched?: boolean;
}

export interface VoiceMatchStatusDto {
  status: 'IDLE' | 'WAITING' | 'MATCHED' | 'ENDED';
  roomId?: string;
  peer?: UserProfile;
  audioMode?: 'LIVEKIT' | 'WEBRTC_P2P';
  livekitUrl?: string;
  livekitToken?: string;
  isInitiator?: boolean;
  peerSentMatchRequest?: boolean;
  isMutualMatch?: boolean;
  conversationId?: number;
  createdAt?: number;
  durationSeconds?: number;
}

export interface VoiceSignalDto {
  type: 'offer' | 'answer' | 'candidate' | 'bye';
  senderId?: number;
  targetId?: number;
  roomId: string;
  payload: string;
}
