import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, VideoCallDto } from './api/types';
import apiClient from './api/apiClient';
import { AuthScreen } from './screens/AuthScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { MatchesScreen } from './screens/MatchesScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, ToastMessage } from './components/Toast';
import { IncomingCallModal } from './components/IncomingCallModal';
import { VideoCallModal } from './components/VideoCallModal';
import appEventService from './utils/appEventService';
import { Flame, MessageCircle, User, Loader2 } from 'lucide-react';

type Tab = 'discover' | 'matches' | 'profile';
type Screen = 'main' | 'chat' | 'profile' | 'edit_profile';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Responsive state for phone vs desktop (sync with CSS media query @ 900px)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 900px)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 900px)');
    const updateMatches = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', updateMatches);
    window.addEventListener('resize', updateMatches);
    return () => {
      mql.removeEventListener('change', updateMatches);
      window.removeEventListener('resize', updateMatches);
    };
  }, []);

  // Navigation state
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [activeScreen, setActiveScreen] = useState<Screen>('main');
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  // Modals & Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [likesReceivedCount, setLikesReceivedCount] = useState(0);
  const lastLikesCountRef = useRef<number>(-1);

  // Video Calling State
  const [incomingCall, setIncomingCall] = useState<VideoCallDto | null>(null);
  const [activeVideoCall, setActiveVideoCall] = useState<VideoCallDto | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info', icon?: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, text, type, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Check auth and load profile on startup
  const checkAuth = async () => {
    if (!apiClient.authToken) {
      setIsInitializing(false);
      return;
    }

    try {
      const profile = await apiClient.getMyProfile();
      setCurrentUser(profile);
    } catch {
      apiClient.clearAuth();
      setCurrentUser(null);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Real-time Unified Server-Sent Events (SSE) Listener
  useEffect(() => {
    if (!currentUser) {
      appEventService.disconnect();
      return;
    }

    // Connect to single persistent SSE stream
    appEventService.connect(apiClient.baseUrl, apiClient.authToken);

    // Initial fetch of likes count
    apiClient.getLikesReceived().then(likes => {
      setLikesReceivedCount(likes.length);
      lastLikesCountRef.current = likes.length;
    }).catch(() => {});

    // 1. Listen for new incoming video calls
    const unsubIncoming = appEventService.on('INCOMING_CALL', (call: VideoCallDto) => {
      if (call && call.status === 'RINGING') {
        setIncomingCall(call);
      }
    });

    const unsubActive = appEventService.on('ACTIVE_CALL', (call: VideoCallDto) => {
      const myId = currentUser.userId || currentUser.id;
      if (call && call.status === 'RINGING' && call.targetId === myId) {
        setIncomingCall(call);
      }
    });

    const unsubEnded = appEventService.on('CALL_ENDED', () => {
      setIncomingCall(null);
    });

    const unsubRejected = appEventService.on('CALL_REJECTED', () => {
      setIncomingCall(null);
    });

    // 2. Listen for real-time likes
    const unsubLike = appEventService.on('NEW_LIKE', (like: any) => {
      setLikesReceivedCount(prev => prev + 1);
      const liker = like?.displayName || like?.likerName || 'Someone';
      showToast(`❤️ ${liker} liked your profile!`, 'success', '❤️');
    });

    // 3. Listen for real-time mutual matches
    const unsubMatch = appEventService.on('NEW_MATCH', (match: any) => {
      const name = match?.matchedProfile?.displayName || match?.otherUser?.displayName || 'Someone';
      showToast(`🎉 New Match with ${name}! Say hello! 💕`, 'success', '🎉');
    });

    // Passive slow fallback (45s) ONLY if SSE connection dropped
    const fallbackInterval = setInterval(async () => {
      if (appEventService.isConnected() || (typeof document !== 'undefined' && document.hidden)) return;
      try {
        const call = await apiClient.getActiveVideoCall();
        const myId = currentUser.userId || currentUser.id;
        if (call && call.status === 'RINGING' && call.targetId === myId) {
          setIncomingCall(call);
        } else if (!call || call.status === 'ENDED' || call.status === 'REJECTED') {
          setIncomingCall(null);
        }
      } catch {}
    }, 45000);

    return () => {
      unsubIncoming();
      unsubActive();
      unsubEnded();
      unsubRejected();
      unsubLike();
      unsubMatch();
      clearInterval(fallbackInterval);
    };
  }, [currentUser]);

  const handleAcceptIncomingCall = async (call: VideoCallDto) => {
    setIncomingCall(null);
    try {
      const accepted = await apiClient.acceptVideoCall(call.callId);
      setActiveVideoCall(accepted);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept video call', 'error');
    }
  };

  const handleDeclineIncomingCall = async (call: VideoCallDto) => {
    setIncomingCall(null);
    try {
      await apiClient.rejectVideoCall(call.callId);
    } catch {
      // ignore
    }
  };

  const handleStartVideoCall = async (targetUserId: number, conversationId: number) => {
    try {
      const call = await apiClient.initiateVideoCall(targetUserId, conversationId);
      setActiveVideoCall(call);
    } catch (err: any) {
      showToast(err.message || 'Failed to start video call', 'error');
    }
  };

  const handleNavigateToChat = (conversationId: number) => {
    setActiveConversationId(conversationId);
    setActiveScreen('chat');
  };

  const handleSignOut = () => {
    appEventService.disconnect();
    apiClient.clearAuth();
    setCurrentUser(null);
    setActiveScreen('main');
    setActiveTab('discover');
    setActiveConversationId(null);
    showToast('Signed out of Vibly', 'info');
  };

  if (isInitializing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-dark)',
        gap: '16px',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'var(--flame-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(255, 51, 102, 0.45)',
        }}>
          <Flame size={36} color="#ffffff" />
        </div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 900,
          letterSpacing: '3px',
          fontFamily: 'var(--font-family-display)',
        }} className="gradient-text-flame">
          VIBLY
        </h1>
        <Loader2 size={24} color="var(--primary-pink)" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {!currentUser ? (
        /* Unauthenticated Auth Screen (Adapts to Phone & Desktop) */
        <AuthScreen
          onAuthSuccess={(profile) => {
            setCurrentUser(profile);
            showToast(`Welcome to Vibly, ${profile.displayName}! 🔥`, 'success');
          }}
        />
      ) : isDesktop ? (
        /* ==================== DESKTOP DUAL-PANE WINDOW VIEW (>= 860px) ==================== */
        <div className="desktop-layout">
          {/* Left Navigation Sidebar */}
          <Sidebar
            currentUser={currentUser}
            activeTab={activeTab}
            activeConversationId={activeConversationId}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'discover') {
                setActiveScreen('main');
              } else if (tab === 'matches') {
                if (!activeConversationId) {
                  setActiveScreen('main');
                }
              } else if (tab === 'profile') {
                setActiveScreen('profile');
              }
            }}
            onSelectConversation={(convId) => {
              handleNavigateToChat(convId);
            }}
            onSignOut={handleSignOut}
            showToast={showToast}
          />

          {/* Main Desktop Stage */}
          <main className="desktop-main-stage">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              {activeScreen === 'main' && (
                <>
                  {activeTab === 'discover' && (
                    <DiscoverScreen
                      currentUser={currentUser}
                      onNavigateToChat={handleNavigateToChat}
                      showToast={showToast}
                    />
                  )}

                  {activeTab === 'matches' && (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '40px',
                      gap: '16px',
                    }}>
                      <div style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        background: 'var(--romantic-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(255, 51, 102, 0.4)',
                      }}>
                        <MessageCircle size={40} color="#ffffff" />
                      </div>
                      <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Select a conversation
                      </h2>
                      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: '1.5' }}>
                        Choose any match or chat on the left sidebar to start messaging in real time.
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab('discover');
                          setActiveScreen('main');
                        }}
                        style={{
                          padding: '12px 24px',
                          borderRadius: 'var(--radius-lg)',
                          background: 'var(--flame-gradient)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '14px',
                          boxShadow: '0 6px 20px rgba(255, 51, 102, 0.4)',
                        }}
                      >
                        Find New Matches
                      </button>
                    </div>
                  )}

                  {activeTab === 'profile' && (
                    <ProfileScreen
                      currentUser={currentUser}
                      onEditProfile={() => setActiveScreen('edit_profile')}
                      onSignOut={handleSignOut}
                      onProfileUpdated={(updated) => setCurrentUser(updated)}
                      showToast={showToast}
                    />
                  )}
                </>
              )}

              {activeScreen === 'chat' && activeConversationId && (
                <ChatScreen
                  conversationId={activeConversationId}
                  currentUser={currentUser}
                  onNavigateBack={() => {
                    setActiveScreen('main');
                    setActiveConversationId(null);
                  }}
                  showToast={showToast}
                />
              )}

              {activeScreen === 'profile' && (
                <ProfileScreen
                  currentUser={currentUser}
                  onEditProfile={() => setActiveScreen('edit_profile')}
                  onSignOut={handleSignOut}
                  onProfileUpdated={(updated) => setCurrentUser(updated)}
                  showToast={showToast}
                />
              )}

              {activeScreen === 'edit_profile' && (
                <EditProfileScreen
                  currentUser={currentUser}
                  onNavigateBack={() => setActiveScreen('profile')}
                  onProfileUpdated={(updated) => setCurrentUser(updated)}
                  showToast={showToast}
                />
              )}
            </div>
          </main>
        </div>
      ) : (
        /* ==================== MOBILE PHONE VIEW (< 860px) ==================== */
        <div className="mobile-screen-container">
          {/* Mobile Screen Views */}
          <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {activeScreen === 'main' && (
              <>
                {activeTab === 'discover' && (
                  <DiscoverScreen
                    currentUser={currentUser}
                    onNavigateToChat={handleNavigateToChat}
                    showToast={showToast}
                  />
                )}

                {activeTab === 'matches' && (
                  <MatchesScreen
                    currentUser={currentUser}
                    onNavigateToChat={handleNavigateToChat}
                    showToast={showToast}
                  />
                )}

                {activeTab === 'profile' && (
                  <ProfileScreen
                    currentUser={currentUser}
                    onEditProfile={() => setActiveScreen('edit_profile')}
                    onSignOut={handleSignOut}
                    onProfileUpdated={(updated) => setCurrentUser(updated)}
                    showToast={showToast}
                  />
                )}
              </>
            )}

            {activeScreen === 'chat' && activeConversationId && (
              <ChatScreen
                conversationId={activeConversationId}
                currentUser={currentUser}
                onNavigateBack={() => {
                  setActiveScreen('main');
                  setActiveTab('matches');
                  setActiveConversationId(null);
                }}
                onStartVideoCall={handleStartVideoCall}
                showToast={showToast}
              />
            )}

            {activeScreen === 'profile' && (
              <ProfileScreen
                currentUser={currentUser}
                onEditProfile={() => setActiveScreen('edit_profile')}
                onSignOut={handleSignOut}
                onProfileUpdated={(updated) => setCurrentUser(updated)}
                showToast={showToast}
              />
            )}

            {activeScreen === 'edit_profile' && (
              <EditProfileScreen
                currentUser={currentUser}
                onNavigateBack={() => {
                  setActiveScreen('main');
                  setActiveTab('profile');
                }}
                onProfileUpdated={(updated) => setCurrentUser(updated)}
                showToast={showToast}
              />
            )}
          </div>

          {/* Mobile Bottom Navigation Bar (ONLY shown on Main Screen, hidden during Chat/Edit) */}
          {activeScreen === 'main' && (
            <nav className="mobile-bottom-nav">
              <button
                onClick={() => setActiveTab('discover')}
                title="Discover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  color: activeTab === 'discover' ? 'var(--primary-pink)' : 'var(--text-muted)',
                  padding: '6px 16px',
                }}
              >
                <Flame size={24} fill={activeTab === 'discover' ? 'currentColor' : 'none'} />
                <span style={{ fontSize: '11px', fontWeight: activeTab === 'discover' ? 700 : 500 }}>
                  Discover
                </span>
              </button>

              <button
                onClick={() => setActiveTab('matches')}
                title="Matches"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  color: activeTab === 'matches' ? 'var(--primary-pink)' : 'var(--text-muted)',
                  padding: '6px 16px',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <MessageCircle size={24} fill={activeTab === 'matches' ? 'currentColor' : 'none'} />
                  {likesReceivedCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-5px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-pink)',
                    }} />
                  )}
                </div>
                <span style={{ fontSize: '11px', fontWeight: activeTab === 'matches' ? 700 : 500 }}>
                  Matches
                </span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                title="Profile"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  color: activeTab === 'profile' ? 'var(--primary-pink)' : 'var(--text-muted)',
                  padding: '6px 16px',
                }}
              >
                <User size={24} fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
                <span style={{ fontSize: '11px', fontWeight: activeTab === 'profile' ? 700 : 500 }}>
                  Profile
                </span>
              </button>
            </nav>
          )}
        </div>
      )}

      {/* Incoming Video Call Ringing Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* Active Video Call Modal (LiveKit 2-way call & Outgoing Ringing) */}
      {activeVideoCall && currentUser && (
        <VideoCallModal
          initialCall={activeVideoCall}
          currentUser={currentUser}
          onClose={() => setActiveVideoCall(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export default App;
