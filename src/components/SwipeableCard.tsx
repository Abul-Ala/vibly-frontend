import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../api/types';
import apiClient from '../api/apiClient';
import { BadgeCheck, MapPin, Briefcase, Info, Sparkles } from 'lucide-react';
import { formatDistance } from '../utils/locationService';

interface SwipeableCardProps {
  profile: UserProfile;
  isTopCard: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSuperLike?: () => void;
  onCardClick?: () => void;
  style?: React.CSSProperties;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  profile,
  isTopCard,
  onSwipeRight,
  onSwipeLeft,
  onSuperLike,
  onCardClick,
  style,
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Photos array
  const rawPhotos = profile.photos || [];
  const photos = rawPhotos.length > 0
    ? rawPhotos.map(p => apiClient.resolveMediaUrl(p.photoUrl))
    : [apiClient.getPrimaryPhoto(profile)];

  const currentPhoto = photos[photoIndex] || photos[0];

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex < photos.length - 1) {
      setPhotoIndex(prev => prev + 1);
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex > 0) {
      setPhotoIndex(prev => prev - 1);
    }
  };

  // Mouse & Touch Drag Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isTopCard) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const threshold = 85;
    const verticalThreshold = -100;

    if (offset.y < verticalThreshold && Math.abs(offset.x) < 80 && onSuperLike) {
      // Super like swipe up
      onSuperLike();
    } else if (offset.x > threshold) {
      // Swipe Right (Like)
      onSwipeRight();
    } else if (offset.x < -threshold) {
      // Swipe Left (Pass)
      onSwipeLeft();
    } else {
      // Snapping back to center
      setOffset({ x: 0, y: 0 });
    }
    dragStartRef.current = null;
  };

  const rotation = offset.x * 0.08;
  const likeOpacity = Math.min(Math.max((offset.x - 30) / 90, 0), 1);
  const nopeOpacity = Math.min(Math.max((-offset.x - 30) / 90, 0), 1);
  const superLikeOpacity = Math.min(Math.max((-offset.y - 30) / 90, 0), 1);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: '24px',
        overflow: 'hidden',
        cursor: isTopCard ? (isDragging ? 'grabbing' : 'grab') : 'default',
        transform: isTopCard
          ? `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${rotation}deg)`
          : 'scale(0.96) translateY(14px)',
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)',
        backgroundColor: 'var(--surface-dark)',
        touchAction: 'none',
        ...style,
      }}
    >
      {/* Background Profile Photo */}
      <img
        src={currentPhoto}
        alt={profile.displayName || 'Profile'}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      {/* Photo Pagination Bar (Top) */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          gap: '5px',
          zIndex: 4,
        }}>
          {photos.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '3.5px',
                borderRadius: '4px',
                backgroundColor: i === photoIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Tap Zones for Next / Prev Photo */}
      {photos.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '30px',
          left: 0,
          right: 0,
          height: '45%',
          display: 'flex',
          zIndex: 3,
        }}>
          <div
            onClick={handlePrevPhoto}
            style={{ width: '40%', height: '100%', cursor: 'pointer' }}
          />
          <div
            onClick={handleNextPhoto}
            style={{ width: '60%', height: '100%', cursor: 'pointer' }}
          />
        </div>
      )}

      {/* Dynamic Swipe Stamps */}
      {likeOpacity > 0 && (
        <div style={{
          position: 'absolute',
          top: '40px',
          left: '30px',
          padding: '6px 16px',
          border: '4px solid #30D158',
          color: '#30D158',
          borderRadius: '12px',
          fontSize: '28px',
          fontWeight: 900,
          fontFamily: 'var(--font-family-display)',
          letterSpacing: '3px',
          transform: 'rotate(-18deg)',
          opacity: likeOpacity,
          zIndex: 6,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          textShadow: '0 2px 10px rgba(48, 209, 88, 0.5)',
          boxShadow: '0 0 20px rgba(48, 209, 88, 0.4)',
        }}>
          LIKE ❤️
        </div>
      )}

      {nopeOpacity > 0 && (
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '30px',
          padding: '6px 16px',
          border: '4px solid #FF453A',
          color: '#FF453A',
          borderRadius: '12px',
          fontSize: '28px',
          fontWeight: 900,
          fontFamily: 'var(--font-family-display)',
          letterSpacing: '3px',
          transform: 'rotate(18deg)',
          opacity: nopeOpacity,
          zIndex: 6,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          textShadow: '0 2px 10px rgba(255, 69, 58, 0.5)',
          boxShadow: '0 0 20px rgba(255, 69, 58, 0.4)',
        }}>
          NOPE ✖
        </div>
      )}

      {superLikeOpacity > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '180px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 20px',
          border: '4px solid #00F0FF',
          color: '#00F0FF',
          borderRadius: '12px',
          fontSize: '24px',
          fontWeight: 900,
          fontFamily: 'var(--font-family-display)',
          letterSpacing: '2px',
          opacity: superLikeOpacity,
          zIndex: 6,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          textShadow: '0 2px 12px rgba(0, 240, 255, 0.6)',
          boxShadow: '0 0 25px rgba(0, 240, 255, 0.5)',
          whiteSpace: 'nowrap',
        }}>
          SUPER LIKE ★
        </div>
      )}

      {/* Gradient Dark Overlay at Bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        background: 'linear-gradient(to top, rgba(12, 13, 20, 0.96) 0%, rgba(12, 13, 20, 0.75) 45%, rgba(12, 13, 20, 0) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Card Info Details */}
      <div
        onClick={onCardClick}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 18px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
          zIndex: 5,
          cursor: 'pointer',
        }}
      >
        {/* Compatibility Pill & Distance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {profile.compatibilityScore && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(255, 51, 102, 0.85) 0%, rgba(121, 40, 202, 0.85) 100%)',
              backdropFilter: 'blur(8px)',
              fontSize: '11px',
              fontWeight: 700,
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(255, 51, 102, 0.3)',
            }}>
              <Sparkles size={11} />
              <span>{profile.compatibilityScore}% Match</span>
            </div>
          )}

          {!profile.hideDistance && profile.distanceKm !== undefined && profile.distanceKm !== null && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              borderRadius: '20px',
              background: 'rgba(30, 33, 48, 0.8)',
              backdropFilter: 'blur(8px)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <MapPin size={11} color="var(--primary-pink)" />
              <span>{formatDistance(profile.distanceKm, profile.hideDistance)}</span>
            </div>
          )}
        </div>

        {/* Name, Age, Verified & Info Icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{
              fontSize: '23px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-family-display)',
              letterSpacing: '-0.5px',
            }}>
              {profile.displayName || 'Vibly Member'}
            </h2>
            <span style={{ fontSize: '21px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {profile.age || 25}
            </span>
            {profile.isVerified && (
              <BadgeCheck size={22} fill="var(--verified-blue)" color="#ffffff" />
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCardClick?.();
            }}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Info size={18} />
          </button>
        </div>

        {/* Occupation & City */}
        {(profile.occupation || profile.city) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {profile.occupation && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Briefcase size={13} color="var(--primary-pink)" />
                {profile.occupation}
              </span>
            )}
            {profile.city && (
              <span>• {profile.city}</span>
            )}
          </div>
        )}

        {/* Bio Preview */}
        {profile.bio && (
          <p style={{
            fontSize: '13px',
            lineHeight: '1.4',
            color: 'rgba(255, 255, 255, 0.85)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {profile.bio}
          </p>
        )}

        {/* Interests Chips */}
        {profile.interests && profile.interests.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
            {profile.interests.slice(0, 3).map((interest, idx) => (
              <span
                key={idx}
                style={{
                  background: 'rgba(40, 44, 63, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {interest.icon ? `${interest.icon} ` : '✨ '}
                {interest.name}
              </span>
            ))}
            {profile.interests.length > 3 && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '3px 8px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
              }}>
                +{profile.interests.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
