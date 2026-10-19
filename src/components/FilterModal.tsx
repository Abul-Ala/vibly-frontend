import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export interface DiscoveryFilters {
  minAge: number;
  maxAge: number;
  gender: string;
  maxDistanceKm: number;
}

interface FilterModalProps {
  initialFilters: DiscoveryFilters;
  onClose: () => void;
  onApply: (filters: DiscoveryFilters) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  initialFilters,
  onClose,
  onApply,
}) => {
  const [minAge, setMinAge] = useState(initialFilters.minAge);
  const [maxAge, setMaxAge] = useState(initialFilters.maxAge);
  const [gender, setGender] = useState(initialFilters.gender);
  const [maxDistanceKm, setMaxDistanceKm] = useState(initialFilters.maxDistanceKm);

  const handleApply = () => {
    onApply({
      minAge,
      maxAge,
      gender,
      maxDistanceKm,
    });
    onClose();
  };

  const handleReset = () => {
    setMinAge(18);
    setMaxAge(60);
    setGender('ALL');
    setMaxDistanceKm(100);
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 10000,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
    }}>
      <div
        className="animate-slide-up"
        style={{
          backgroundColor: 'var(--surface-dark)',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '24px 20px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Discovery Preferences
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Gender Choice */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px' }}>
            SHOW ME
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'ALL', label: 'Everyone' },
              { id: 'FEMALE', label: 'Women' },
              { id: 'MALE', label: 'Men' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setGender(opt.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: gender === opt.id ? 'var(--primary-pink)' : 'var(--surface-card)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: `1px solid ${gender === opt.id ? 'var(--primary-pink)' : 'rgba(255, 255, 255, 0.08)'}`,
                  transition: 'all 0.2s ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Age Range Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px' }}>
              AGE RANGE
            </label>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {minAge} - {maxAge}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="range"
              min="18"
              max="60"
              value={minAge}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val <= maxAge) setMinAge(val);
              }}
              style={{ flex: 1, accentColor: 'var(--primary-pink)' }}
            />
            <input
              type="range"
              min="18"
              max="60"
              value={maxAge}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= minAge) setMaxAge(val);
              }}
              style={{ flex: 1, accentColor: 'var(--primary-pink)' }}
            />
          </div>
        </div>

        {/* Max Distance Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px' }}>
              MAXIMUM DISTANCE
            </label>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {maxDistanceKm} km
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="200"
            step="5"
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: 'var(--primary-pink)' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--flame-gradient)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(255, 51, 102, 0.35)',
            }}
          >
            <Check size={18} />
            <span>Apply Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
