import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../api/types';
import apiClient from '../api/apiClient';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';

interface MatchCelebrationModalProps {
  currentUser: UserProfile;
  matchedProfile: UserProfile;
  conversationId?: number;
  onSendMessage: (conversationId: number) => void;
  onKeepSwiping: () => void;
}

export const MatchCelebrationModal: React.FC<MatchCelebrationModalProps> = ({
  currentUser,
  matchedProfile,
  conversationId,
  onSendMessage,
  onKeepSwiping,
}) => {
  useEffect(() => {
    // Fire celebratory confetti!
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 10001,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#FF3366', '#FF7A00', '#00F0FF'],
    });
    fire(0.2, {
      spread: 60,
      colors: ['#FF3366', '#7928CA', '#FFFFFF'],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      colors: ['#FFD700', '#FF3366'],
    });
  }, []);

  const myPhoto = apiClient.getPrimaryPhoto(currentUser);
  const theirPhoto = apiClient.getPrimaryPhoto(matchedProfile);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 10000,
      backgroundColor: 'rgba(12, 13, 20, 0.94)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div className="animate-slide-up" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        maxWidth: '380px',
        width: '100%',
      }}>
        {/* Glow badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 51, 102, 0.15)',
          border: '1px solid rgba(255, 51, 102, 0.4)',
          borderRadius: '20px',
          padding: '6px 16px',
          color: 'var(--primary-pink)',
          fontSize: '13px',
          fontWeight: 700,
        }}>
          <Sparkles size={14} />
          <span>MUTUAL ATTRACTION</span>
        </div>

        {/* Title */}
        <div>
          <h1 style={{
            fontSize: '38px',
            fontWeight: 900,
            fontFamily: 'var(--font-family-display)',
            letterSpacing: '-1px',
            lineHeight: '1.1',
          }} className="gradient-text-flame">
            It's a Match!
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '15px',
            marginTop: '8px',
          }}>
            You and <strong style={{ color: '#ffffff' }}>{matchedProfile.displayName || 'they'}</strong> have liked each other.
          </p>
        </div>

        {/* Intersecting Glowing Avatars */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '20px 0',
        }}>
          {/* User photo */}
          <div style={{
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid var(--primary-pink)',
            boxShadow: '0 0 25px rgba(255, 51, 102, 0.5)',
            transform: 'translateX(14px)',
            zIndex: 1,
          }}>
            <img src={myPhoto} alt="You" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Heart Badge in Center */}
          <div style={{
            position: 'absolute',
            zIndex: 3,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--romantic-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(255, 51, 102, 0.8)',
            border: '3px solid var(--bg-dark)',
          }}>
            <Heart size={20} fill="#ffffff" color="#ffffff" />
          </div>

          {/* Matched profile photo */}
          <div style={{
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid #7928CA',
            boxShadow: '0 0 25px rgba(121, 40, 202, 0.5)',
            transform: 'translateX(-14px)',
            zIndex: 2,
          }}>
            <img src={theirPhoto} alt={matchedProfile.displayName || 'Match'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <button
            onClick={() => conversationId && onSendMessage(conversationId)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--flame-gradient)',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(255, 51, 102, 0.4)',
            }}
          >
            <MessageCircle size={20} />
            <span>Say Hello to {matchedProfile.displayName}</span>
          </button>

          <button
            onClick={onKeepSwiping}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
              fontSize: '15px',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
};
