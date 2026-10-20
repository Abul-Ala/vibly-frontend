import React, { useEffect } from 'react';
import { VideoCallDto } from '../api/types';
import apiClient from '../api/apiClient';
import ringtoneService from '../utils/ringtoneService';
import {
  Video,
  PhoneOff,
  BadgeCheck,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface IncomingCallModalProps {
  call: VideoCallDto;
  onAccept: (call: VideoCallDto) => void;
  onDecline: (call: VideoCallDto) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  const caller = call.callerProfile;
  const callerName = caller?.displayName || 'Match Partner';
  const callerPhoto = apiClient.getPrimaryPhoto(caller);

  useEffect(() => {
    // Start melodic ringtone when modal mounts
    ringtoneService.startIncomingRingtone();

    // Auto decline/timeout after 35 seconds
    const timer = setTimeout(() => {
      ringtoneService.stopIncomingRingtone();
      onDecline(call);
    }, 35000);

    return () => {
      clearTimeout(timer);
      ringtoneService.stopIncomingRingtone();
    };
  }, [call, onDecline]);

  const handleAccept = () => {
    ringtoneService.stopIncomingRingtone();
    onAccept(call);
  };

  const handleDecline = () => {
    ringtoneService.stopIncomingRingtone();
    onDecline(call);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(5, 5, 12, 0.88)',
      backdropFilter: 'blur(16px)',
      padding: '20px',
      animation: 'fadeIn 0.25s ease-out',
    }}>
      <style>{`
        @keyframes pulseRing {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
            box-shadow: 0 0 0 0 rgba(255, 51, 102, 0.7);
          }
          70% {
            transform: scale(1.15);
            opacity: 0.3;
            box-shadow: 0 0 0 35px rgba(255, 51, 102, 0);
          }
          100% {
            transform: scale(0.95);
            opacity: 0;
            box-shadow: 0 0 0 0 rgba(255, 51, 102, 0);
          }
        }
        @keyframes acceptBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes ringWave {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        borderRadius: '28px',
        backgroundColor: '#12121E',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(255, 51, 102, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 28px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient Top Glow */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '240px',
          height: '160px',
          background: 'radial-gradient(circle, rgba(255, 51, 102, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Video Call Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 14px',
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 51, 102, 0.15)',
          border: '1px solid rgba(255, 51, 102, 0.35)',
          color: 'var(--primary-pink)',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '1px',
          marginBottom: '28px',
          textTransform: 'uppercase',
        }}>
          <Video size={15} style={{ animation: 'ringWave 1.2s infinite' }} />
          <span>Incoming Video Call</span>
        </div>

        {/* Pulsing Avatar */}
        <div style={{
          position: 'relative',
          width: '120px',
          height: '120px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 51, 102, 0.6)',
            animation: 'pulseRing 2s infinite ease-out',
          }} />
          <div style={{
            position: 'absolute',
            inset: '-22px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 122, 0, 0.4)',
            animation: 'pulseRing 2s infinite ease-out 0.6s',
          }} />
          <img
            src={callerPhoto}
            alt={callerName}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #FF3366',
              boxShadow: '0 8px 30px rgba(255, 51, 102, 0.4)',
              zIndex: 2,
            }}
          />
        </div>

        {/* Caller Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            {callerName}{caller?.age ? `, ${caller.age}` : ''}
          </h2>
          {caller?.isVerified && (
            <BadgeCheck size={20} fill="#00D2FF" color="#ffffff" />
          )}
        </div>

        {caller?.city && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', marginBottom: '14px' }}>
            <MapPin size={13} />
            <span>{caller.city}</span>
          </div>
        )}

        <p style={{
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.75)',
          margin: '0 0 32px 0',
          fontWeight: 500,
        }}>
          is inviting you to a live video call...
        </p>

        {/* Action Buttons: Decline & Accept */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '36px',
          width: '100%',
        }}>
          {/* Decline Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleDecline}
              title="Decline Video Call"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#EB5757',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(235, 87, 87, 0.45)',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <PhoneOff size={26} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>
              Decline
            </span>
          </div>

          {/* Accept Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleAccept}
              title="Accept Video Call"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.55)',
                animation: 'acceptBounce 1.6s infinite ease-in-out',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Video size={28} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>
              Accept
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
