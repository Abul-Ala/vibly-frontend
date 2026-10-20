import React from 'react';
import { UserProfile } from '../api/types';
import apiClient from '../api/apiClient';
import { X, BadgeCheck, MapPin, Briefcase, Heart, Sparkles, ShieldAlert } from 'lucide-react';

interface ProfileDetailSheetProps {
  profile: UserProfile | null;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
  onReportBlock?: () => void;
}

export const ProfileDetailSheet: React.FC<ProfileDetailSheetProps> = ({
  profile,
  onClose,
  onLike,
  onPass,
  onReportBlock,
}) => {
  if (!profile) return null;

  const rawPhotos = profile.photos || [];
  const photos = rawPhotos.length > 0
    ? rawPhotos.map(p => apiClient.resolveMediaUrl(p.photoUrl))
    : [apiClient.getPrimaryPhoto(profile)];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
    }}>
      <div
        className="animate-slide-up"
        style={{
          height: '90%',
          backgroundColor: 'var(--surface-dark)',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(12, 13, 20, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            zIndex: 10,
          }}
        >
          <X size={18} />
        </button>

        {/* Scrollable Profile Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Main Top Photo */}
          <div style={{ width: '100%', height: '360px', position: 'relative' }}>
            <img
              src={photos[0]}
              alt={profile.displayName || 'Profile'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'linear-gradient(to top, var(--surface-dark) 0%, transparent 100%)',
            }} />
          </div>

          {/* Details Section */}
          <div style={{ padding: '0 20px 100px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header: Name, Age, Compatibility */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {profile.displayName || 'Vibly Member'}
                </h1>
                <span style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {profile.age || 25}
                </span>
                {profile.isVerified && (
                  <BadgeCheck size={22} fill="var(--verified-blue)" color="#ffffff" />
                )}
              </div>

              {/* Status & Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {profile.occupation && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Briefcase size={14} color="var(--primary-pink)" />
                    {profile.occupation}
                  </span>
                )}
                {profile.city && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} color="var(--primary-pink)" />
                    {profile.city}
                  </span>
                )}
                {!profile.hideDistance && profile.distanceKm !== undefined && profile.distanceKm !== null && (
                  <span>• {Math.round(profile.distanceKm)} km away</span>
                )}
              </div>

              {profile.compatibilityScore && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '12px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(255, 51, 102, 0.2) 0%, rgba(121, 40, 202, 0.2) 100%)',
                  border: '1px solid rgba(255, 51, 102, 0.35)',
                  color: 'var(--primary-pink)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  <Sparkles size={14} />
                  <span>{profile.compatibilityScore}% Compatibility Score</span>
                </div>
              )}
            </div>

            {/* About Me Section */}
            {profile.bio && (
              <div style={{
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  About Me
                </h3>
                <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Interests & Passions */}
            {profile.interests && profile.interests.length > 0 && (
              <div style={{
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Passions & Interests
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {profile.interests.map((it, i) => (
                    <span
                      key={i}
                      style={{
                        background: 'rgba(255, 51, 102, 0.1)',
                        border: '1px solid rgba(255, 51, 102, 0.3)',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '13px',
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

            {/* Additional Gallery Photos */}
            {photos.length > 1 && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Photos ({photos.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {photos.slice(1).map((photoUrl, idx) => (
                    <img
                      key={idx}
                      src={photoUrl}
                      alt={`Gallery photo ${idx + 2}`}
                      style={{
                        width: '100%',
                        borderRadius: 'var(--radius-lg)',
                        objectFit: 'cover',
                        maxHeight: '400px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Safety Options: Block or Report */}
            {onReportBlock && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                <button
                  onClick={onReportBlock}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    padding: '8px 16px',
                  }}
                >
                  <ShieldAlert size={14} />
                  <span>Report or Block {profile.displayName}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Floating Action Bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, var(--surface-dark) 80%, transparent 100%)',
          padding: '16px 24px 24px',
          display: 'flex',
          justifyContent: 'center',
          gap: '28px',
          zIndex: 10,
        }}>
          <button
            onClick={() => {
              onClose();
              onPass();
            }}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--surface-card)',
              border: '1.5px solid rgba(255, 69, 58, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--pass-red)',
              boxShadow: '0 6px 20px rgba(255, 69, 58, 0.25)',
            }}
          >
            <X size={26} strokeWidth={2.5} />
          </button>

          <button
            onClick={() => {
              onClose();
              onLike();
            }}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--flame-gradient)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(255, 51, 102, 0.45)',
            }}
          >
            <Heart size={26} fill="currentColor" strokeWidth={0} />
          </button>
        </div>
      </div>
    </div>
  );
};
