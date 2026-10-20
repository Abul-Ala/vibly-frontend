import React, { useState, useEffect } from 'react';
import { ConversationItem, LikeNotificationDto, MatchItem, UserProfile, UserStoryGroup } from '../api/types';
import apiClient from '../api/apiClient';
import { StoriesTray } from './StoriesTray';
import { StoryViewerModal } from './StoryViewerModal';
import { AddStoryModal } from './AddStoryModal';
import { MatchCelebrationModal } from './MatchCelebrationModal';
import appEventService from '../utils/appEventService';
import {
  Flame,
  MessageCircle,
  User,
  Search,
  Heart,
  LogOut,
  BadgeCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentUser: UserProfile;
  activeTab: 'discover' | 'matches' | 'profile';
  activeConversationId: number | null;
  onSelectTab: (tab: 'discover' | 'matches' | 'profile') => void;
  onSelectConversation: (conversationId: number) => void;
  onSignOut: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  activeConversationId,
  onSelectTab,
  onSelectConversation,
  onSignOut,
  showToast,
}) => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [likesReceived, setLikesReceived] = useState<LikeNotificationDto[]>([]);
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Story modals
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null);
  const [showAddStory, setShowAddStory] = useState(false);

  // Match celebration if liked back
  const [celebrationProfile, setCelebrationProfile] = useState<UserProfile | null>(null);
  const [celebrationConvId, setCelebrationConvId] = useState<number | undefined>(undefined);

  const loadSidebarData = async () => {
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
    loadSidebarData();

    // Listen to real-time events via unified SSE
    const unsubMatch = appEventService.on('NEW_MATCH', () => {
      loadSidebarData();
    });

    const unsubMsg = appEventService.on('NEW_MESSAGE', () => {
      loadSidebarData();
    });

    const unsubSent = appEventService.on('MESSAGE_SENT', () => {
      loadSidebarData();
    });

    const unsubLike = appEventService.on('NEW_LIKE', () => {
      loadSidebarData();
    });

    const unsubStory = appEventService.on('NEW_STORY', () => {
      loadSidebarData();
    });

    // Slow fallback (60s) ONLY if SSE is disconnected
    const fallbackInterval = setInterval(() => {
      if (appEventService.isConnected() || (typeof document !== 'undefined' && document.hidden)) return;
      loadSidebarData();
    }, 60000);

    return () => {
      unsubMatch();
      unsubMsg();
      unsubSent();
      unsubLike();
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
          displayName: liker.displayName || liker.likerName || 'User',
          age: 25,
          isVerified: true,
          photos: [{ id: 1, photoUrl: liker.likerPhotoUrl, isPrimary: true }],
        });
        setCelebrationConvId(res.conversationId);
      } else {
        showToast(`Liked ${liker.displayName || 'them'} back! 💕`, 'success');
      }
      loadSidebarData();
    } catch (err: any) {
      showToast(err.message || 'Failed to match back', 'error');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const name = conv.otherUser?.displayName?.toLowerCase() || '';
    const lastMsg = conv.lastMessage?.toLowerCase() || '';
    const q = searchQuery.toLowerCase().trim();
    return name.includes(q) || lastMsg.includes(q);
  });

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <aside className="desktop-sidebar">
      {/* Top Header: Current User Avatar + AURA Logo + Quick Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(22, 24, 34, 0.65)',
        backdropFilter: 'blur(10px)',
      }}>
        {/* User Mini Profile Trigger */}
        <div
          onClick={() => onSelectTab('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <div style={{
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            padding: '2px',
            background: 'var(--flame-gradient)',
          }}>
            <img
              src={apiClient.getPrimaryPhoto(currentUser)}
              alt={currentUser.displayName || 'You'}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--surface-dark)',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {currentUser.displayName?.split(' ')[0] || 'My Profile'}
              </span>
              {currentUser.isVerified && (
                <BadgeCheck size={15} fill="var(--verified-blue)" color="#ffffff" />
              )}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              View Profile
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          <button
            onClick={onSignOut}
            title="Sign Out"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--pass-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Navigation Switcher Pills */}
      <div style={{
        display: 'flex',
        padding: '10px 14px',
        gap: '6px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <button
          onClick={() => onSelectTab('discover')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: activeTab === 'discover' ? 'rgba(255, 51, 102, 0.15)' : 'transparent',
            color: activeTab === 'discover' ? 'var(--primary-pink)' : 'var(--text-secondary)',
            border: `1px solid ${activeTab === 'discover' ? 'rgba(255, 51, 102, 0.35)' : 'transparent'}`,
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <Flame size={16} fill={activeTab === 'discover' ? 'currentColor' : 'none'} />
          <span>Discover</span>
        </button>

        <button
          onClick={() => onSelectTab('matches')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: activeTab === 'matches' ? 'rgba(255, 51, 102, 0.15)' : 'transparent',
            color: activeTab === 'matches' ? 'var(--primary-pink)' : 'var(--text-secondary)',
            border: `1px solid ${activeTab === 'matches' ? 'rgba(255, 51, 102, 0.35)' : 'transparent'}`,
            fontSize: '13px',
            fontWeight: 700,
            position: 'relative',
          }}
        >
          <MessageCircle size={16} fill={activeTab === 'matches' ? 'currentColor' : 'none'} />
          <span>Matches</span>
          {totalUnreadCount > 0 && (
            <span style={{
              backgroundColor: 'var(--primary-pink)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '10px',
            }}>
              {totalUnreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Stories Tray Inside Sidebar */}
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <StoriesTray
          groups={storyGroups}
          myAvatarUrl={apiClient.getPrimaryPhoto(currentUser)}
          onOpenGroup={(idx) => setActiveStoryGroupIndex(idx)}
          onAddStory={() => setShowAddStory(true)}
        />
      </div>

      {/* Who Liked You Section */}
      {likesReceived.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--gold-superlike)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            <Sparkles size={12} color="var(--gold-superlike)" />
            <span>Likes You ({likesReceived.length})</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {likesReceived.map((liker, idx) => {
              const photo = liker.fullPhotoUrl || apiClient.resolveMediaUrl(liker.likerPhotoUrl) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800';
              return (
                <div
                  key={idx}
                  style={{
                    minWidth: '100px',
                    width: '100px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid rgba(255, 184, 0, 0.3)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ width: '100%', height: '80px', position: 'relative' }}>
                    <img src={photo} alt={liker.displayName || 'Liker'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '6px',
                      right: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#ffffff',
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {liker.displayName || liker.likerName || 'User'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleLikeBack(liker)}
                    style={{
                      padding: '6px',
                      background: 'var(--flame-gradient)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Heart size={11} fill="#ffffff" />
                    <span>Match</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ padding: '12px 16px 8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <Search size={14} color="var(--text-secondary)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              width: '100%',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Conversations List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '4px 12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const other = conv.otherUser;
            const photo = apiClient.getPrimaryPhoto(other);
            const isOnline = other?.userStatus === 'Online' && !other?.hideOnlineStatus;
            const isSelected = activeConversationId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'rgba(255, 51, 102, 0.15)' : 'var(--surface-card)',
                  border: `1px solid ${isSelected ? 'rgba(255, 51, 102, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
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
                      bottom: '1px',
                      right: '1px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--success-green)',
                      border: '2px solid var(--surface-card)',
                    }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: isSelected ? 'var(--primary-pink)' : 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {other?.displayName || 'Conversation'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {conv.lastMessageTime?.includes('T') ? conv.lastMessageTime.split('T')[1].slice(0, 5) : (conv.lastMessageTime || '')}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '12px',
                    color: (conv.unreadCount || 0) > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: (conv.unreadCount || 0) > 0 ? 700 : 400,
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {conv.lastMessage || 'Say hello...'}
                  </p>
                </div>

                {(conv.unreadCount || 0) > 0 && (
                  <div style={{
                    backgroundColor: 'var(--primary-pink)',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '2px 7px',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}>
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)', fontSize: '12px' }}>
            No conversations found
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      {activeStoryGroupIndex !== null && (
        <StoryViewerModal
          groups={storyGroups}
          initialGroupIndex={activeStoryGroupIndex}
          onClose={() => setActiveStoryGroupIndex(null)}
          onStoryDeleted={() => loadSidebarData()}
        />
      )}

      {/* Add Story Modal */}
      {showAddStory && (
        <AddStoryModal
          onClose={() => setShowAddStory(false)}
          onStoryCreated={() => {
            loadSidebarData();
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
            onSelectConversation(convId);
          }}
          onKeepSwiping={() => setCelebrationProfile(null)}
        />
      )}
    </aside>
  );
};
