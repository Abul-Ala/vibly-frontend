import React, { useState } from 'react';
import { UserProfile, Interest } from '../api/types';
import apiClient from '../api/apiClient';
import { ArrowLeft, Save, Loader2, Sparkles, MapPin, Navigation, EyeOff } from 'lucide-react';
import { detectLocation } from '../utils/locationService';

interface EditProfileScreenProps {
  currentUser: UserProfile;
  onNavigateBack: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  currentUser,
  onNavigateBack,
  onProfileUpdated,
  showToast,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [occupation, setOccupation] = useState(currentUser.occupation || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [latitude, setLatitude] = useState<number | undefined>(currentUser.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(currentUser.longitude);
  const [hideDistance, setHideDistance] = useState<boolean>(currentUser.hideDistance ?? false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [interestedIn, setInterestedIn] = useState(currentUser.interestedIn || 'EVERYONE');

  const defaultInterests: Interest[] = [
    { id: 1, name: 'Coffee', icon: '☕' },
    { id: 2, name: 'Hiking', icon: '🥾' },
    { id: 3, name: 'Photography', icon: '📸' },
    { id: 4, name: 'Fitness & Gym', icon: '🏋️' },
    { id: 5, name: 'Coding', icon: '💻' },
    { id: 6, name: 'Indie Music', icon: '🎸' },
    { id: 7, name: 'Yoga', icon: '🧘' },
    { id: 8, name: 'Travel', icon: '✈️' },
    { id: 9, name: 'Art & Design', icon: '🎨' },
    { id: 10, name: 'Foodie', icon: '🍜' },
    { id: 11, name: 'Dogs', icon: '🐶' },
    { id: 12, name: 'Sci-Fi & Anime', icon: '🪐' },
  ];

  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>(
    currentUser.interests ? currentUser.interests.map(i => i.id) : [1, 2, 3]
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleInterest = (id: number) => {
    setSelectedInterestIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const loc = await detectLocation();
      setCity(loc.city);
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      showToast(`📍 Location detected: ${loc.city}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not detect GPS location. Please allow browser location access.', 'error');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await apiClient.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        occupation: occupation.trim(),
        city: city.trim(),
        latitude,
        longitude,
        hideDistance,
        interestedIn,
        interestIds: selectedInterestIds,
      });

      onProfileUpdated(updated);
      showToast('Profile updated successfully! ✨', 'success');
      onNavigateBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      backgroundColor: 'var(--bg-dark)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        backgroundColor: 'var(--surface-dark)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onNavigateBack}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Edit Profile
          </h2>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'var(--flame-gradient)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(255, 51, 102, 0.3)',
          }}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Save</span>
        </button>
      </div>

      {/* Edit Form */}
      <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto' }}>
        <form onSubmit={handleSave} style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              DISPLAY NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
            />
          </div>


        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            BIO / ABOUT ME
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share something authentic about yourself..."
            rows={4}
            maxLength={500}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
            {bio.length}/500
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              OCCUPATION
            </label>
            <input
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. UX Designer"
              style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                CITY
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255, 51, 102, 0.12)',
                  border: '1px solid rgba(255, 51, 102, 0.3)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--primary-pink)',
                  cursor: isDetectingLocation ? 'wait' : 'pointer',
                }}
              >
                {isDetectingLocation ? (
                  <>
                    <Loader2 size={10} className="animate-spin" />
                    <span>Detecting...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={10} />
                    <span>Detect GPS</span>
                  </>
                )}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, India"
                style={{ width: '100%', padding: '12px 14px 12px 34px', fontSize: '14px' }}
              />
              <MapPin
                size={16}
                color="var(--primary-pink)"
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
            </div>
            {latitude && longitude && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                GPS: {latitude.toFixed(3)}, {longitude.toFixed(3)}
              </div>
            )}
          </div>
        </div>

        {/* Distance & Location Privacy */}
        <div style={{
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <EyeOff size={18} color="var(--primary-pink)" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
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
            onChange={(e) => setHideDistance(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: 'var(--primary-pink)', cursor: 'pointer' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            INTERESTED IN
          </label>
          <select
            value={interestedIn}
            onChange={(e) => setInterestedIn(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', fontSize: '14px' }}
          >
            <option value="EVERYONE" style={{ background: '#1E2130' }}>Everyone</option>
            <option value="FEMALE" style={{ background: '#1E2130' }}>Women</option>
            <option value="MALE" style={{ background: '#1E2130' }}>Men</option>
          </select>
        </div>

        {/* Interests & Passions Selection */}
        <div style={{ marginTop: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            marginBottom: '10px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            <Sparkles size={14} color="var(--primary-pink)" />
            <span>Select Your Passions</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {defaultInterests.map((interest) => {
              const isSelected = selectedInterestIds.includes(interest.id);
              return (
                <button
                  type="button"
                  key={interest.id}
                  onClick={() => toggleInterest(interest.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    backgroundColor: isSelected ? 'var(--primary-pink)' : 'var(--surface-card)',
                    color: '#ffffff',
                    border: `1px solid ${isSelected ? 'var(--primary-pink)' : 'rgba(255, 255, 255, 0.08)'}`,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {interest.icon ? `${interest.icon} ` : ''}
                  {interest.name}
                </button>
              );
            })}
          </div>
        </div>
      </form>
      </div>
    </div>
  );
};

