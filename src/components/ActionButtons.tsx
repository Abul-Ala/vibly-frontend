import React from 'react';
import { RotateCcw, X, Star, Heart, Zap } from 'lucide-react';

interface ActionButtonsProps {
  onRewind?: () => void;
  onPass: () => void;
  onSuperLike: () => void;
  onLike: () => void;
  onBoost?: () => void;
  disabled?: boolean;
  isCompact?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onRewind,
  onPass,
  onSuperLike,
  onLike,
  onBoost,
  disabled = false,
  isCompact = false,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isCompact ? '10px' : '14px',
      padding: isCompact ? '4px 12px 8px' : '12px 16px 20px',
      zIndex: 10,
    }}>
      {/* Rewind / Refresh */}
      {onRewind && (
        <button
          onClick={onRewind}
          disabled={disabled}
          title="Rewind / Refresh Feed"
          style={{
            width: isCompact ? '38px' : '44px',
            height: isCompact ? '38px' : '44px',
            borderRadius: '50%',
            background: 'var(--surface-card)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFB800',
            opacity: disabled ? 0.4 : 1,
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            touchAction: 'manipulation',
          }}
        >
          <RotateCcw size={isCompact ? 16 : 18} />
        </button>
      )}

      {/* Pass (Nope) */}
      <button
        onClick={onPass}
        disabled={disabled}
        title="Pass"
        style={{
          width: isCompact ? '50px' : '58px',
          height: isCompact ? '50px' : '58px',
          borderRadius: '50%',
          background: 'var(--surface-card)',
          border: '1.5px solid rgba(255, 69, 58, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--pass-red)',
          opacity: disabled ? 0.4 : 1,
          boxShadow: '0 6px 20px rgba(255, 69, 58, 0.22)',
          transition: 'all 0.2s ease',
          touchAction: 'manipulation',
        }}
      >
        <X size={isCompact ? 22 : 26} strokeWidth={2.5} />
      </button>

      {/* Super Like */}
      <button
        onClick={onSuperLike}
        disabled={disabled}
        title="Super Like"
        style={{
          width: isCompact ? '40px' : '46px',
          height: isCompact ? '40px' : '46px',
          borderRadius: '50%',
          background: 'var(--surface-card)',
          border: '1.5px solid rgba(0, 240, 255, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--neon-cyan)',
          opacity: disabled ? 0.4 : 1,
          boxShadow: '0 4px 16px rgba(0, 240, 255, 0.2)',
          touchAction: 'manipulation',
        }}
      >
        <Star size={isCompact ? 18 : 20} fill="currentColor" />
      </button>

      {/* Like */}
      <button
        onClick={onLike}
        disabled={disabled}
        title="Like"
        style={{
          width: isCompact ? '56px' : '64px',
          height: isCompact ? '56px' : '64px',
          borderRadius: '50%',
          background: 'var(--flame-gradient)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          opacity: disabled ? 0.4 : 1,
          boxShadow: '0 8px 26px rgba(255, 51, 102, 0.45)',
          transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          touchAction: 'manipulation',
        }}
      >
        <Heart size={isCompact ? 26 : 30} fill="currentColor" strokeWidth={0} />
      </button>

      {/* Boost */}
      {onBoost && (
        <button
          onClick={onBoost}
          disabled={disabled}
          title="Boost Profile"
          style={{
            width: isCompact ? '38px' : '44px',
            height: isCompact ? '38px' : '44px',
            borderRadius: '50%',
            background: 'var(--surface-card)',
            border: '1px solid rgba(121, 40, 202, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#B876FF',
            opacity: disabled ? 0.4 : 1,
            boxShadow: '0 4px 14px rgba(121, 40, 202, 0.25)',
            touchAction: 'manipulation',
          }}
        >
          <Zap size={isCompact ? 16 : 18} fill="currentColor" />
        </button>
      )}
    </div>
  );
};
