import React, { useState, useRef } from 'react';
import { UserProfile } from '../api/types';
import apiClient from '../api/apiClient';
import {
  BadgeCheck,
  MapPin,
  Briefcase,
  Camera,
  Edit3,
  LogOut,
  Trash2,
  Plus,
  EyeOff,
  Radio,
  Loader2,
  Sparkles,
  Navigation,
} from 'lucide-react';
import { detectLocation } from '../utils/locationService';

interface ProfileScreenProps {
  currentUser: UserProfile;
  onEditProfile: () => void;
  onSignOut: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onEditProfile,
  onSignOut,
  onProfileUpdated,
  showToast,
}) => {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [hideDistance, setHideDistance] = useState(!!currentUser.hideDistance);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(!!currentUser.hideOnlineStatus);

  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const galleryPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateLocation = async () => {
    setIsUpdatingLocation(true);
    try {
      const loc = await detectLocation();
      const updated = await apiClient.updateLocation(loc.latitude, loc.longitude, loc.city);
      onProfileUpdated(updated);
      showToast(`📍 Location updated to ${loc.city}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not update GPS location. Check browser location access.', 'error');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const handleUploadPhoto = async (file: File, isPrimary: boolean) => {
    setIsUploadingPhoto(true);
    try {
      const updated = await apiClient.uploadProfilePhoto(file, isPrimary);
      onProfileUpdated(updated);
      showToast(isPrimary ? 'Profile photo updated! 📸' : 'Photo added to gallery! ✨', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      await apiClient.deletePhoto(photoId);
      const updated = await apiClient.getMyProfile();
      onProfileUpdated(updated);
      showToast('Photo deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete photo', 'error');
    }
  };

  const handleTogglePrivacy = async (field: 'hideDistance' | 'hideOnlineStatus', value: boolean) => {
    try {
      const payload = {
        [field]: value,
      };
      if (field === 'hideDistance') setHideDistance(value);
      if (field === 'hideOnlineStatus') setHideOnlineStatus(value);

      const updated = await apiClient.updateProfile(payload);
      onProfileUpdated(updated);
      showToast('Privacy preference saved', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update privacy', 'error');
    }
  };

  const primaryPhoto = apiClient.getPrimaryPhoto(currentUser);
  const photos = currentUser.photos || [];

  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      backgroundColor: 'var(--bg-dark)',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '80px',
    }}>
      {/* Hidden file inputs for photo upload */}
      <input
        type="file"
        ref={profilePhotoInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadPhoto(e.target.files[0], true);
          }
        }}
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={galleryPhotoInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadPhoto(e.target.files[0], false);
          }
        }}
        style={{ display: 'none' }}
      />

      {/* Main Profile Content Wrapper */}
      <div style={{ maxWidth: '860px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 900,
            fontFamily: 'var(--font-family-display)',
          }} className="gradient-text-flame">
            My Profile
          </h1>
        </div>

        {/* Top Banner & Avatar Section */}
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 20px 16px',
          background: 'linear-gradient(to bottom, rgba(255, 51, 102, 0.12) 0%, transparent 100%)',
        }}>
          {/* Profile Avatar with Camera Upload Icon */}
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            padding: '3px',
            background: 'var(--flame-gradient)',
            boxShadow: '0 8px 30px rgba(255, 51, 102, 0.45)',
          }}>
            <img
              src={primaryPhoto}
              alt={currentUser.displayName || 'Profile'}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--bg-dark)',
              }}
            />

            <button
              onClick={() => profilePhotoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              title="Update Profile Photo"
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'var(--primary-pink)',
                border: '2px solid var(--bg-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {isUploadingPhoto ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </button>
          </div>

          {/* Name, Age, Verified */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <h2 style={{
              fontSize: '26px',
              fontWeight: 800,
              fontFamily: 'var(--font-family-display)',
              color: 'var(--text-primary)',
            }}>
              {currentUser.displayName || 'Vibly Member'}
            </h2>
            <span style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {currentUser.age || 25}
            </span>
            {currentUser.isVerified && (
              <BadgeCheck size={24} fill="var(--verified-blue)" color="#ffffff" />
            )}
          </div>

          {/* Location & Job */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginTop: '6px',
          }}>
            {currentUser.occupation && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Briefcase size={14} color="var(--primary-pink)" />
                {currentUser.occupation}
              </span>
            )}
            <button
              onClick={handleUpdateLocation}
              disabled={isUpdatingLocation}
              title="Click to detect current GPS location"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255, 51, 102, 0.1)',
                border: '1px solid rgba(255, 51, 102, 0.25)',
                borderRadius: '14px',
                padding: '3px 10px',
                color: 'var(--primary-pink)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isUpdatingLocation ? 'wait' : 'pointer',
              }}
            >
              {isUpdatingLocation ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
              <span>{currentUser.city || 'Detect GPS Location'}</span>
              <span style={{ fontSize: '11px', opacity: 0.7 }}>⟳</span>
            </button>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={onEditProfile}
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '24px',
              background: 'var(--surface-card)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <Edit3 size={15} color="var(--primary-pink)" />
            <span>Edit Profile</span>
          </button>
        </div>


      {/* Main Profile Info Cards */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* About Me Card */}
        {currentUser.bio && (
          <div style={{
            backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              About Me
            </h3>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {currentUser.bio}
            </p>
          </div>
        )}

        {/* Interests & Passions Card */}
        {currentUser.interests && currentUser.interests.length > 0 && (
          <div style={{
            backgroundColor: 'var(--surface-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              Passions & Interests
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {currentUser.interests.map((it, idx) => (
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

        {/* Photo Gallery Grid */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Photos ({photos.length})
            </h3>
            <button
              onClick={() => galleryPhotoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--primary-pink)',
              }}
            >
              <Plus size={14} />
              <span>Add Photo</span>
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}>
            {photos.map((p, idx) => {
              const url = apiClient.resolveMediaUrl(p.photoUrl);
              return (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: p.isPrimary ? '2px solid var(--primary-pink)' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <img
                    src={url}
                    alt="Gallery"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {p.isPrimary ? (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: '4px',
                      padding: '2px 6px',
                      backgroundColor: 'var(--primary-pink)',
                      borderRadius: '8px',
                      fontSize: '9px',
                      fontWeight: 800,
                      color: '#ffffff',
                    }}>
                      Primary
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeletePhoto(p.id)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        color: 'var(--pass-red)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacy & Discovery Settings */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Privacy & Status
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <EyeOff size={18} color="var(--primary-pink)" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Hide My Distance
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Don't show distance in km to other users
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hideDistance}
              onChange={(e) => handleTogglePrivacy('hideDistance', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--primary-pink)', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Radio size={18} color="var(--neon-cyan)" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Hide Online Status
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Appear offline in chat and match lists
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hideOnlineStatus}
              onChange={(e) => handleTogglePrivacy('hideOnlineStatus', e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--primary-pink)', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Account Actions */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '4px 16px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <button
            onClick={onSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 0',
              color: 'var(--pass-red)',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            <LogOut size={18} />
            <span>Sign Out of Vibly</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

