import {
  AuthData,
  BlockRequestDto,
  ChatMessage,
  ConversationItem,
  LikeNotificationDto,
  LoginRequestDto,
  MatchItem,
  RegisterRequestDto,
  ReportRequestDto,
  SendMessageDto,
  StoryItem,
  SwipeRequestDto,
  SwipeResult,
  UpdateProfileDto,
  UserProfile,
  UserStoryGroup,
  VoiceMatchStatusDto,
  VoiceSignalDto,
  VideoCallDto
} from './types';

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const DEFAULT_BASE_URL =
  (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ||
  (isLocalhost ? 'http://localhost:8080/api/v1' : 'https://dating-social-app-production.up.railway.app/api/v1');

class ApiClient {
  private _baseUrl: string;
  private _authToken: string | null = null;
  private _currentUserId: number | null = null;

  constructor() {
    const savedUrl = localStorage.getItem('vibly_base_url') || localStorage.getItem('aura_base_url');
    if (isLocalhost && (!savedUrl || savedUrl.includes('railway.app'))) {
      this._baseUrl = 'http://localhost:8080/api/v1';
    } else {
      this._baseUrl = savedUrl && savedUrl.trim() ? savedUrl.trim() : DEFAULT_BASE_URL;
    }
    this._authToken = localStorage.getItem('vibly_auth_token') || localStorage.getItem('aura_auth_token');
    const savedUserId = localStorage.getItem('vibly_user_id') || localStorage.getItem('aura_user_id');
    this._currentUserId = savedUserId ? parseInt(savedUserId, 10) : null;
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  set baseUrl(url: string) {
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api/v1')) {
      clean = `${clean}/api/v1`;
    }
    this._baseUrl = clean;
    localStorage.setItem('vibly_base_url', clean);
  }

  get authToken(): string | null {
    return this._authToken;
  }

  get currentUserId(): number | null {
    return this._currentUserId;
  }

  saveAuth(token: string, userId: number) {
    this._authToken = token;
    this._currentUserId = userId;
    localStorage.setItem('vibly_auth_token', token);
    localStorage.setItem('vibly_user_id', userId.toString());
  }

  clearAuth() {
    this._authToken = null;
    this._currentUserId = null;
    localStorage.removeItem('vibly_auth_token');
    localStorage.removeItem('vibly_user_id');
    localStorage.removeItem('aura_auth_token');
    localStorage.removeItem('aura_user_id');
  }

  // Resolve relative URLs (e.g. /uploads/xyz.jpg) to full absolute URL
  resolveMediaUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const origin = this._baseUrl.replace(/\/api\/v1\/?$/, '');
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  getPrimaryPhoto(profile?: UserProfile | null): string {
    if (!profile) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800';
    const photos = profile.photos || [];
    const primary = photos.find(p => p.isPrimary)?.photoUrl || photos[0]?.photoUrl;
    if (primary) {
      return this.resolveMediaUrl(primary);
    }
    return profile.gender === 'MALE'
      ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this._baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this._authToken) {
      headers['Authorization'] = `Bearer ${this._authToken}`;
    }

    // Only set Content-Type to application/json if not sending FormData
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 || res.status === 403) {
      // If unauthorized, clear auth state
      if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
        this.clearAuth();
      }
    }

    if (!res.ok) {
      let errorMsg = `Request failed (${res.status})`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.message || errorJson.error || errorMsg;
      } catch {
        // use fallback status
      }
      throw new Error(errorMsg);
    }

    // Return empty object for 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // --- Auth APIs ---
  async login(data: LoginRequestDto): Promise<AuthData> {
    const result = await this.request<AuthData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.saveAuth(result.token, result.userId);
    return result;
  }

  async register(data: RegisterRequestDto): Promise<AuthData> {
    const result = await this.request<AuthData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.saveAuth(result.token, result.userId);
    return result;
  }

  async uploadRegistrationPhoto(file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{ photoUrl: string }>('/auth/upload-photo', {
      method: 'POST',
      body: formData,
    });
  }

  // --- Profile APIs ---
  async getMyProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/profiles/me');
  }

  async updateProfile(data: UpdateProfileDto): Promise<UserProfile> {
    return this.request<UserProfile>('/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateLocation(latitude: number, longitude: number, city?: string): Promise<UserProfile> {
    return this.request<UserProfile>('/profiles/me/location', {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude, city }),
    });
  }

  async uploadProfilePhoto(file: File, isPrimary: boolean = true): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<UserProfile>(`/profiles/me/photos/upload?isPrimary=${isPrimary}`, {
      method: 'POST',
      body: formData,
    });
  }

  async deletePhoto(photoId: number): Promise<void> {
    await this.request<void>(`/profiles/me/photos/${photoId}`, {
      method: 'DELETE',
    });
  }

  // --- Discovery APIs ---
  async getDiscoveryFeed(params?: {
    minAge?: number;
    maxAge?: number;
    gender?: string;
    maxDistanceKm?: number;
  }): Promise<UserProfile[]> {
    const query = new URLSearchParams();
    if (params?.minAge) query.set('minAge', params.minAge.toString());
    if (params?.maxAge) query.set('maxAge', params.maxAge.toString());
    if (params?.gender && params.gender !== 'ALL') query.set('gender', params.gender);
    if (params?.maxDistanceKm) query.set('maxDistanceKm', params.maxDistanceKm.toString());

    const qs = query.toString();
    return this.request<UserProfile[]>(`/discovery${qs ? `?${qs}` : ''}`);
  }

  async swipe(data: SwipeRequestDto): Promise<SwipeResult> {
    return this.request<SwipeResult>('/discovery/swipe', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Matches APIs ---
  async getMatches(): Promise<MatchItem[]> {
    return this.request<MatchItem[]>('/matches');
  }

  async getLikesReceived(): Promise<LikeNotificationDto[]> {
    return this.request<LikeNotificationDto[]>('/matches/likes-received');
  }

  // --- Chat APIs ---
  async getConversations(): Promise<ConversationItem[]> {
    return this.request<ConversationItem[]>('/chat/conversations');
  }

  async getMessages(conversationId: number): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: number, data: SendMessageDto): Promise<ChatMessage> {
    return this.request<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendTypingStatus(conversationId: number, isTyping: boolean): Promise<void> {
    try {
      await this.request<void>(`/chat/conversations/${conversationId}/typing`, {
        method: 'POST',
        body: JSON.stringify({ isTyping }),
      });
    } catch {
      // Ignore background typing notification failures
    }
  }

  // --- Stories APIs ---
  async getStoriesTray(): Promise<UserStoryGroup[]> {
    return this.request<UserStoryGroup[]>('/stories/tray');
  }

  async getMyStories(): Promise<StoryItem[]> {
    return this.request<StoryItem[]>('/stories/me');
  }

  async uploadStory(file: File, caption?: string): Promise<StoryItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return this.request<StoryItem>('/stories', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteStory(storyId: number): Promise<void> {
    await this.request<void>(`/stories/${storyId}`, {
      method: 'DELETE',
    });
  }

  async viewStory(storyId: number): Promise<void> {
    try {
      await this.request<void>(`/stories/${storyId}/view`, {
        method: 'POST',
      });
    } catch {
      // view tracking error can be silently ignored
    }
  }

  // --- Safety APIs ---
  async blockUser(data: BlockRequestDto): Promise<{ message: string }> {
    return this.request<{ message: string }>('/safety/block', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reportUser(data: ReportRequestDto): Promise<{ message: string }> {
    return this.request<{ message: string }>('/safety/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Voice Match APIs ---
  async joinVoiceQueue(): Promise<VoiceMatchStatusDto> {
    return this.request<VoiceMatchStatusDto>('/voice-match/queue/join', {
      method: 'POST',
    });
  }

  async getVoiceQueueStatus(): Promise<VoiceMatchStatusDto> {
    return this.request<VoiceMatchStatusDto>('/voice-match/queue/status', {
      method: 'GET',
    });
  }

  async leaveVoiceQueue(): Promise<void> {
    await this.request<void>('/voice-match/queue/leave', {
      method: 'POST',
    });
  }

  async sendVoiceMatchRequest(roomId: string): Promise<VoiceMatchStatusDto> {
    return this.request<VoiceMatchStatusDto>(`/voice-match/room/${roomId}/match-request`, {
      method: 'POST',
    });
  }

  async sendVoiceSignal(roomId: string, signal: VoiceSignalDto): Promise<void> {
    await this.request<void>(`/voice-match/room/${roomId}/signal`, {
      method: 'POST',
      body: JSON.stringify(signal),
    });
  }

  // --- Video Call APIs ---
  async initiateVideoCall(targetUserId: number, conversationId?: number): Promise<VideoCallDto> {
    return this.request<VideoCallDto>('/video-call/initiate', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, conversationId }),
    });
  }

  async acceptVideoCall(callId: string): Promise<VideoCallDto> {
    return this.request<VideoCallDto>(`/video-call/${callId}/accept`, {
      method: 'POST',
    });
  }

  async rejectVideoCall(callId: string, reason = 'DECLINED'): Promise<void> {
    await this.request<void>(`/video-call/${callId}/reject?reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
    });
  }

  async endVideoCall(callId: string): Promise<void> {
    await this.request<void>(`/video-call/${callId}/end`, {
      method: 'POST',
    });
  }

  async getActiveVideoCall(): Promise<VideoCallDto | null> {
    try {
      const res = await this.request<VideoCallDto>('/video-call/active');
      return res && res.callId ? res : null;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
