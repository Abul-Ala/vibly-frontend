import React, { useState, useEffect } from 'react';
import { UserProfile, SwipeResult } from '../api/types';
import apiClient from '../api/apiClient';
import { SwipeableCard } from '../components/SwipeableCard';
import { ActionButtons } from '../components/ActionButtons';
import { ProfileDetailSheet } from '../components/ProfileDetailSheet';
import { MatchCelebrationModal } from '../components/MatchCelebrationModal';
import { FilterModal, DiscoveryFilters } from '../components/FilterModal';
import { ReportBlockModal } from '../components/ReportBlockModal';
import { SlidersHorizontal, RefreshCw, Check, Loader2, Sparkles, MapPin, Briefcase, BadgeCheck, ShieldAlert, X } from 'lucide-react';

interface DiscoverScreenProps {
  currentUser: UserProfile;
  onNavigateToChat: (conversationId: number) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  currentUser,
  onNavigateToChat,
  showToast,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<UserProfile | null>(null);
  const [matchedConversationId, setMatchedConversationId] = useState<number | undefined>(undefined);
  const [detailProfile, setDetailProfile] = useState<UserProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [safetyTargetProfile, setSafetyTargetProfile] = useState<UserProfile | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 899px)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 899px)');
    const update = () => setIsMobile(mql.matches);
    mql.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mql.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const [filters, setFilters] = useState<DiscoveryFilters>({
    minAge: 18,
    maxAge: 60,
    gender: 'ALL',
    maxDistanceKm: 100,
  });

  const loadCandidates = async (customFilters?: DiscoveryFilters) => {
    setIsLoading(true);
    try {
      const activeFilters = customFilters || filters;
      const res = await apiClient.getDiscoveryFeed({
        minAge: activeFilters.minAge,
        maxAge: activeFilters.maxAge,
        gender: activeFilters.gender !== 'ALL' ? activeFilters.gender : undefined,
        maxDistanceKm: activeFilters.maxDistanceKm,
      });
      setProfiles(res || []);
    } catch {
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [currentUser.userId]);

  const handleSwipe = async (targetProfile: UserProfile, isLike: boolean, isSuper: boolean = false) => {
    setProfiles(prev => prev.filter(p => p.userId !== targetProfile.userId));
    if (detailProfile?.userId === targetProfile.userId) {
      setDetailProfile(null);
    }

    try {
      const res: SwipeResult = await apiClient.swipe({
        targetUserId: targetProfile.userId,
        isLike,
      });

      if (res.isMatch) {
        setMatchedProfile(res.matchedProfile || targetProfile);
        setMatchedConversationId(res.conversationId);
      } else if (isLike) {
        showToast(
          isSuper
            ? `Super Liked ${targetProfile.displayName}! ⭐`
            : `Liked ${targetProfile.displayName}! 💕`,
          'success'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Error recording swipe', 'error');
    }

    if (profiles.length <= 1) {
      loadCandidates();
    }
  };

  const currentTopProfile = profiles[0];

  const handlePass = () => {
    if (currentTopProfile) handleSwipe(currentTopProfile, false);
  };

  const handleLike = () => {
    if (currentTopProfile) handleSwipe(currentTopProfile, true);
  };

  const handleSuperLike = () => {
    if (currentTopProfile) handleSwipe(currentTopProfile, true, true);
  };

  // Keyboard navigation for desktop users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePass();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleLike();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleSuperLike();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentTopProfile) {
          setDetailProfile(prev => prev ? null : currentTopProfile);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profiles, currentTopProfile]);

  return (
    <div style={{
      flex: 1,
      height: '100%',
      width: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top Header: Responsive for Phone vs Desktop */}
      {isMobile ? (
        /* Mobile Phone Header */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          zIndex: 10,
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          flexShrink: 0,
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '2px',
            fontFamily: 'var(--font-family-display)',
          }} className="gradient-text-flame">
            VIBLY
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => loadCandidates()}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <RefreshCw size={13} color="var(--neon-cyan)" className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowFilters(true)}
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
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Desktop Window Header */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          zIndex: 10,
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 800,
              fontFamily: 'var(--font-family-display)',
              color: 'var(--text-primary)',
            }}>
              Discovery Feed
            </h2>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}>
              <span>{profiles.length} profiles nearby</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => loadCandidates()}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '20px',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={14} color="var(--neon-cyan)" className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowFilters(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '20px',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <SlidersHorizontal size={14} color="var(--primary-pink)" />
              <span>Preferences</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Stage: Card Deck + Inspector */}
      <div style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '4px 10px 2px' : '16px 20px',
        overflow: 'hidden',
        position: 'relative',
        gap: '24px',
      }}>
        {isLoading && profiles.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <Loader2 size={36} color="var(--primary-pink)" className="animate-spin" />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Searching genuine matches near you...</span>
          </div>
        ) : profiles.length > 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            minHeight: 0,
            maxWidth: (!isMobile && detailProfile) ? '1060px' : '520px',
            gap: '24px',
          }}>
            {/* The Card Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: isMobile ? 'space-between' : 'center',
              height: '100%',
              width: '100%',
              minHeight: 0,
              maxWidth: isMobile ? '100%' : '480px',
            }}>
              {/* Card Container (Flex-1 with minHeight 0 to perfectly fit mobile screen) */}
              <div style={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                maxHeight: isMobile ? '100%' : '660px',
                position: 'relative',
                marginBottom: isMobile ? '2px' : '0',
              }}>
                {profiles.slice(0, 3).reverse().map((profile) => {
                  const isTopCard = profile.userId === currentTopProfile?.userId;
                  return (
                    <SwipeableCard
                      key={profile.userId}
                      profile={profile}
                      isTopCard={isTopCard}
                      onSwipeRight={() => handleSwipe(profile, true)}
                      onSwipeLeft={() => handleSwipe(profile, false)}
                      onSuperLike={() => handleSwipe(profile, true, true)}
                      onCardClick={() => setDetailProfile(prev => prev?.userId === profile.userId ? null : profile)}
                    />
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <ActionButtons
                  onRewind={() => loadCandidates()}
                  onPass={handlePass}
                  onSuperLike={handleSuperLike}
                  onLike={handleLike}
                  onBoost={() => showToast('Profile Boost activated! ⚡', 'success')}
                  disabled={profiles.length === 0}
                  isCompact={isMobile}
                />
              </div>
            </div>

            {/* Desktop Side Profile Inspector (Only shown on Desktop) */}
            {!isMobile && detailProfile && (
              <div
                className="animate-fade-in"
                style={{
                  width: '420px',
                  height: '100%',
                  maxHeight: '720px',
                  backgroundColor: 'var(--surface-dark)',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => setDetailProfile(null)}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                >
                  <X size={16} />
                </button>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {detailProfile.displayName}
                    </h2>
                    <span style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      {detailProfile.age}
                    </span>
                    {detailProfile.isVerified && (
                      <BadgeCheck size={22} fill="var(--verified-blue)" color="#ffffff" />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {detailProfile.occupation && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Briefcase size={14} color="var(--primary-pink)" />
                        {detailProfile.occupation}
                      </span>
                    )}
                    {detailProfile.city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} color="var(--primary-pink)" />
                        {detailProfile.city}
                      </span>
                    )}
                  </div>

                  {detailProfile.compatibilityScore && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '14px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(255, 51, 102, 0.2) 0%, rgba(121, 40, 202, 0.2) 100%)',
                      border: '1px solid rgba(255, 51, 102, 0.35)',
                      color: 'var(--primary-pink)',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}>
                      <Sparkles size={14} />
                      <span>{detailProfile.compatibilityScore}% Compatibility Match</span>
                    </div>
                  )}

                  {detailProfile.bio && (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                        About Me
                      </h4>
                      <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {detailProfile.bio}
                      </p>
                    </div>
                  )}

                  {detailProfile.interests && detailProfile.interests.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                        Passions & Interests
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {detailProfile.interests.map((it, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(255, 51, 102, 0.1)',
                              border: '1px solid rgba(255, 51, 102, 0.3)',
                              borderRadius: '20px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {it.icon ? `${it.icon} ` : '✨ '}
                            {it.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailProfile.photos && detailProfile.photos.length > 1 && (
                    <div style={{ marginTop: '24px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                        Gallery Photos
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {detailProfile.photos.slice(1).map((p, idx) => (
                          <img
                            key={idx}
                            src={apiClient.resolveMediaUrl(p.photoUrl)}
                            alt={`Photo ${idx + 2}`}
                            style={{ width: '100%', borderRadius: '16px', objectFit: 'cover', maxHeight: '300px' }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSafetyTargetProfile(detailProfile)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                      }}
                    >
                      <ShieldAlert size={14} />
                      <span>Report or Block {detailProfile.displayName}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '24px',
            maxWidth: '360px',
            gap: '14px',
          }}>
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: 'var(--romantic-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(255, 51, 102, 0.4)',
            }}>
              <Check size={38} color="#ffffff" strokeWidth={3} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
              You're All Caught Up!
            </h2>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              No new candidate profiles right now. Adjust your discovery preferences or tap Refresh to find new people!
            </p>

            <button
              onClick={() => loadCandidates()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--flame-gradient)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                boxShadow: '0 6px 20px rgba(255, 51, 102, 0.4)',
              }}
            >
              <RefreshCw size={15} />
              <span>Refresh Discovery Feed</span>
            </button>
          </div>
        )}
      </div>

      {/* Desktop Keyboard Shortcuts Hint Bar (Only on Desktop) */}
      {!isMobile && (
        <div style={{
          padding: '8px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          zIndex: 10,
          flexShrink: 0,
        }}>
          <span><strong style={{ color: 'var(--pass-red)' }}>[ ← ]</strong> Pass</span>
          <span><strong style={{ color: 'var(--neon-cyan)' }}>[ ↑ ]</strong> Super Like</span>
          <span><strong style={{ color: 'var(--primary-pink)' }}>[ → ]</strong> Like</span>
          <span><strong style={{ color: '#ffffff' }}>[ Enter ]</strong> Toggle Bio</span>
        </div>
      )}

      {/* Mobile Profile Detail Sheet Modal (When on Mobile) */}
      {isMobile && detailProfile && (
        <ProfileDetailSheet
          profile={detailProfile}
          onClose={() => setDetailProfile(null)}
          onLike={() => {
            handleSwipe(detailProfile, true);
            setDetailProfile(null);
          }}
          onPass={() => {
            handleSwipe(detailProfile, false);
            setDetailProfile(null);
          }}
          onReportBlock={() => setSafetyTargetProfile(detailProfile)}
        />
      )}

      {/* Match Celebration Dialog */}
      {matchedProfile && (
        <MatchCelebrationModal
          currentUser={currentUser}
          matchedProfile={matchedProfile}
          conversationId={matchedConversationId}
          onSendMessage={(convId) => {
            setMatchedProfile(null);
            onNavigateToChat(convId);
          }}
          onKeepSwiping={() => setMatchedProfile(null)}
        />
      )}

      {/* Discovery Filters Modal */}
      {showFilters && (
        <FilterModal
          initialFilters={filters}
          onClose={() => setShowFilters(false)}
          onApply={(newFilters) => {
            setFilters(newFilters);
            loadCandidates(newFilters);
          }}
        />
      )}

      {/* Safety Report / Block Modal */}
      {safetyTargetProfile && (
        <ReportBlockModal
          targetUserId={safetyTargetProfile.userId}
          targetUserName={safetyTargetProfile.displayName}
          onClose={() => setSafetyTargetProfile(null)}
          onActionComplete={(act) => {
            setDetailProfile(null);
            setProfiles(prev => prev.filter(p => p.userId !== safetyTargetProfile.userId));
            showToast(act === 'block' ? 'User blocked successfully' : 'Report submitted to moderators', 'info');
          }}
        />
      )}
    </div>
  );
};
