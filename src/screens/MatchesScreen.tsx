import React, { useState, useEffect } from 'react';
import { ConversationItem, LikeNotificationDto, MatchItem, UserProfile, UserStoryGroup } from '../api/types';
import apiClient from '../api/apiClient';
import { StoriesTray } from '../components/StoriesTray';
import { StoryViewerModal } from '../components/StoryViewerModal';
import { AddStoryModal } from '../components/AddStoryModal';
import { MatchCelebrationModal } from '../components/MatchCelebrationModal';
import appEventService from '../utils/appEventService';
import { Search, Heart, MessageCircle, RefreshCw, Sparkles, Loader2 } from 'lucide-react';

interface MatchesScreenProps {
  currentUser: UserProfile;
  onNavigateToChat: (conversationId: number) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const MatchesScreen: React.FC<MatchesScreenProps> = ({
  currentUser,
  onNavigateToChat,
  showToast,
}) => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [likesReceived, setLikesReceived] = useState<LikeNotificationDto[]>([]);
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stories Modals State
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);

  // Match Celebration if liking someone back from "Likes Received"
  const [celebrationProfile, setCelebrationProfile] = useState<UserProfile | null>(null);
  const [celebrationConvId, setCelebrationConvId] = useState<number | undefined>(undefined);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [matchesRes, convRes, likesRes, storiesRes] = await Promise.allSettled([
        apiClient.getMatches(),
        apiClient.getConversations(),
        apiClient.getLikesReceived(),
        apiClient.getStoriesTray(),
      ]);

      if (matchesRes.status === 'fulfilled') setMatches(matchesRes.value || []);
      if (convRes.status === 'fulfilled') setConversations(convRes.value || []);
      if (likesRes.status === 'fulfilled') setLikesReceived(likesRes.value || []);
      if (storiesRes.status === 'fulfilled') setStoryGroups(storiesRes.value || []);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for real-time updates via unified SSE (Zero unnecessary HTTP calls!)
    const unsubMatch = appEventService.on('NEW_MATCH', () => {
      loadData();
    });

    const unsubLike = appEventService.on('NEW_LIKE', () => {
      loadData();
    });

    const unsubMsg = appEventService.on('NEW_MESSAGE', () => {
      loadData();
    });

    const unsubSent = appEventService.on('MESSAGE_SENT', () => {
      loadData();
    });

    const unsubStory = appEventService.on('NEW_STORY', () => {
      loadData();
    });

    // Slow fallback (60s) ONLY if SSE is disconnected
    const fallbackInterval = setInterval(() => {
      if (appEventService.isConnected() || (typeof document !== 'undefined' && document.hidden)) return;
      loadData();
    }, 60000);

    return () => {
      unsubMatch();
      unsubLike();
      unsubMsg();
      unsubSent();
      unsubStory();
      clearInterval(fallbackInterval);
    };
  }, []);

  const handleLikeBack = async (liker: LikeNotificationDto) => {
    try {
      const res = await apiClient.swipe({
        targetUserId: liker.likerUserId,
        isLike: true,
      });

      if (res.isMatch) {
        setCelebrationProfile(res.matchedProfile || {
          id: liker.likerUserId,
          userId: liker.likerUserId,
          displayName: liker.displayName,
          age: 25,
          isVerified: true,
          photos: [{ id: 1, photoUrl: liker.likerPhotoUrl, isPrimary: true }],
        });
        setCelebrationConvId(res.conversationId);
      } else {
        showToast(`Liked ${liker.displayName} back! 💕`, 'success');
      }

      // Refresh matches and likes received
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to match back', 'error');
    }
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter(conv => {
    const name = conv.otherUser?.displayName?.toLowerCase() || '';
    const lastMsg = conv.lastMessage?.toLowerCase() || '';
    const q = searchQuery.toLowerCase().trim();
    return name.includes(q) || lastMsg.includes(q);
  });

  return (
    <div style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-dark)',
      overflowY: 'auto',
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 8px',
        flexShrink: 0,
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 900,
          fontFamily: 'var(--font-family-display)',
        }} className="gradient-text-flame">
          Matches & Messages
        </h1>

        <button
          onClick={loadData}
          disabled={isRefreshing}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-card)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
          }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stories Tray Wrapper */}
      <div style={{ flexShrink: 0, width: '100%' }}>
        <StoriesTray
          groups={storyGroups}
          myAvatarUrl={apiClient.getPrimaryPhoto(currentUser)}
          onOpenGroup={(idx) => setActiveStoryGroupIndex(idx)}
          onAddStory={() => setShowAddStory(true)}
        />
      </div>

      {/* Search Input Bar */}
      <div style={{ padding: '8px 20px 12px', flexShrink: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search matches or chats..."
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              width: '100%',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Who Liked You Section */}
      {likesReceived.length > 0 && (
        <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            <Heart size={14} color="var(--primary-pink)" fill="var(--primary-pink)" />
            <span>Who Liked You ({likesReceived.length})</span>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}>
            {likesReceived.map((liker, idx) => {
              const photo = liker.fullPhotoUrl || apiClient.resolveMediaUrl(liker.likerPhotoUrl) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800';
              return (
                <div
                  key={idx}
                  style={{
                    minWidth: '130px',
                    width: '130px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid rgba(255, 51, 102, 0.25)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                >
                  <div style={{ width: '100%', height: '120px', position: 'relative' }}>
                    <img
                      src={photo}
                      alt={liker.displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '40px',
                      background: 'linear-gradient(to top, rgba(12, 13, 20, 0.95), transparent)',
                    }} />
                    <span style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '8px',
                      right: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#ffffff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {liker.displayName}
                    </span>
                  </div>

                  <button
                    onClick={() => handleLikeBack(liker)}
                    style={{
                      padding: '8px',
                      background: 'var(--flame-gradient)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Heart size={12} fill="#ffffff" />
                    <span>Match Back</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Matches Horizontal Carousel */}
      {matches.length > 0 && (
        <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--text-secondary)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}>
            New Matches ({matches.length})
          </div>

          <div style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}>
            {matches.map((m, idx) => {
              const u = m.matchedUser;
              const photo = apiClient.getPrimaryPhoto(u);
              return (
                <div
                  key={idx}
                  onClick={() => m.conversationId && onNavigateToChat(m.conversationId)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid var(--primary-pink)',
                    boxShadow: '0 0 10px rgba(255, 51, 102, 0.3)',
                  }}>
                    <img
                      src={photo}
                      alt={u?.displayName || 'Match'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    maxWidth: '64px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}>
                    {u?.displayName || 'Match'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conversations / Messages List */}
      <div style={{ flex: 1, padding: '0 20px 80px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 800,
          color: 'var(--text-secondary)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          Messages
        </div>

        {filteredConversations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredConversations.map((conv) => {
              const other = conv.otherUser;
              const photo = apiClient.getPrimaryPhoto(other);
              const isOnline = other?.userStatus === 'Online' && !other?.hideOnlineStatus;

              return (
                <div
                  key={conv.id}
                  onClick={() => onNavigateToChat(conv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {/* Avatar with Online Dot */}
                  <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0 }}>
                    <img
                      src={photo}
                      alt={other?.displayName || 'User'}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                    {isOnline && (
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--success-green)',
                        border: '2px solid var(--surface-card)',
                      }} />
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {other?.displayName || 'Conversation'}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {conv.lastMessageTime?.includes('T') ? conv.lastMessageTime.split('T')[1].slice(0, 5) : (conv.lastMessageTime || '')}
                      </span>
                    </div>

                    <p style={{
                      fontSize: '13px',
                      color: (conv.unreadCount || 0) > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: (conv.unreadCount || 0) > 0 ? 700 : 400,
                      marginTop: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {conv.lastMessage || 'Say hello...'}
                    </p>
                  </div>

                  {/* Unread Count Badge */}
                  {(conv.unreadCount || 0) > 0 && (
                    <div style={{
                      backgroundColor: 'var(--primary-pink)',
                      color: '#ffffff',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(255, 51, 102, 0.4)',
                    }}>
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '36px 20px',
            color: 'var(--text-secondary)',
          }}>
            <MessageCircle size={36} color="var(--primary-pink)" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              No conversations yet
            </h3>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>
              Swipe right on profiles in Discover to create new matches and start chatting!
            </p>
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      {activeStoryGroupIndex !== null && (
        <StoryViewerModal
          groups={storyGroups}
          initialGroupIndex={activeStoryGroupIndex}
          onClose={() => setActiveStoryGroupIndex(null)}
          onStoryDeleted={() => loadData()}
        />
      )}

      {/* Add Story Modal */}
      {showAddStory && (
        <AddStoryModal
          onClose={() => setShowAddStory(false)}
          onStoryCreated={() => {
            loadData();
            showToast('Story posted successfully! 📸', 'success');
          }}
        />
      )}

      {/* Match Celebration Dialog if Liked Back */}
      {celebrationProfile && (
        <MatchCelebrationModal
          currentUser={currentUser}
          matchedProfile={celebrationProfile}
          conversationId={celebrationConvId}
          onSendMessage={(convId) => {
            setCelebrationProfile(null);
            onNavigateToChat(convId);
          }}
          onKeepSwiping={() => setCelebrationProfile(null)}
        />
      )}
    </div>
  );
};
