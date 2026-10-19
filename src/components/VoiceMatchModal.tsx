import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../api/types';
import apiClient from '../api/apiClient';
import {
  Mic,
  MicOff,
  Heart,
  PhoneOff,
  Sparkles,
  Shuffle,
  Clock,
  Radio,
  Volume2,
  X,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';

interface VoiceMatchModalProps {
  currentUser: UserProfile;
  availableProfiles?: UserProfile[];
  onClose: () => void;
  onMutualMatch: (matchedProfile: UserProfile) => void;
  onNavigateToChat: (conversationId?: number) => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type CallState = 'searching' | 'connected' | 'celebration' | 'ended';

const ICEBREAKERS = [
  "What is the most spontaneous thing you've ever done?",
  "If you could teleport anywhere right now for dinner, where?",
  "What's your biggest guilty pleasure song?",
  "Coffee, tea, or late-night cocktails?",
  "Are you an early bird sunrise person or 2 AM deep talker?",
  "What movie or show can you watch 100 times without getting bored?",
  "What's your favorite travel memory of all time?",
  "If your friends had to describe your vibe in 3 words, what would they be?",
  "What's a weird hidden talent you have?",
  "Pineapple on pizza: absolute crime or underrated masterpiece?",
];

const getProfileName = (p?: UserProfile | null): string => {
  if (!p) return 'Partner';
  return p.displayName || (p as unknown as { name?: string }).name || 'Partner';
};

export const VoiceMatchModal: React.FC<VoiceMatchModalProps> = ({
  currentUser,
  availableProfiles = [],
  onClose,
  onMutualMatch,
  onNavigateToChat,
  showToast,
}) => {
  const [callState, setCallState] = useState<CallState>('searching');
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute limit
  const [isMuted, setIsMuted] = useState(false);
  const [hasSentMatchRequest, setHasSentMatchRequest] = useState(false);
  const [peerSentMatchRequest, setPeerSentMatchRequest] = useState(false);
  const [matchedPeer, setMatchedPeer] = useState<UserProfile | null>(null);
  const [icebreakerIndex, setIcebreakerIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isMicAllowedRef = useRef(false);

  // Pick a candidate to voice-match with
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (callState === 'searching') {
      // Find candidate from feed or mock partner
      const candidates = availableProfiles.filter(p => p.id !== currentUser.id);
      const chosen = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : ({
            id: 9999,
            userId: 9999,
            displayName: 'Sophia',
            age: 24,
            bio: 'Lover of indie vinyl records, rooftop sunsets, and spontaneous road trips. Talk to me about your favorite travel spot!',
            gender: 'FEMALE',
            distanceKm: 3,
            city: 'Downtown',
            interests: [{ id: 1, name: 'Live Music' }, { id: 2, name: 'Travel' }, { id: 3, name: 'Coffee' }],
            photos: [{ id: 1, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800', isPrimary: true, sortOrder: 0 }],
          } as UserProfile);

      // Realistic pairing delay (2.5s)
      timer = setTimeout(() => {
        setMatchedPeer(chosen);
        setCallState('connected');
        setTimeLeft(60);
        showToast(`Connected with ${getProfileName(chosen)}! You have 60 seconds.`, 'info');
      }, 2500);
    }

    return () => clearTimeout(timer);
  }, [callState, availableProfiles, currentUser.id]);

  // 60-Second Countdown Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [callState, hasSentMatchRequest, peerSentMatchRequest]);

  // Peer random match request behavior (simulation)
  useEffect(() => {
    let matchTimeout: ReturnType<typeof setTimeout>;
    if (callState === 'connected' && matchedPeer) {
      // Peer sends match request around 20-35 seconds into the call
      const randomDelay = (15 + Math.random() * 20) * 1000;
      matchTimeout = setTimeout(() => {
        setPeerSentMatchRequest(true);
        showToast(`${getProfileName(matchedPeer)} sent you a Match Request! ❤️`, 'info');
      }, randomDelay);
    }
    return () => clearTimeout(matchTimeout);
  }, [callState, matchedPeer]);

  // Handle Mutual Match Trigger
  useEffect(() => {
    if (hasSentMatchRequest && peerSentMatchRequest && callState === 'connected' && matchedPeer) {
      setCallState('celebration');
      onMutualMatch(matchedPeer);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FF3366', '#FF7A00', '#9B51E0', '#00F0FF'],
        });
      } catch {
        // Confetti fallback
      }
    }
  }, [hasSentMatchRequest, peerSentMatchRequest, callState, matchedPeer, onMutualMatch]);

  // Audio Context & Frequency Visualizer
  useEffect(() => {
    if (callState !== 'connected') return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;

    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        mediaStreamRef.current = stream;
        isMicAllowedRef.current = true;

        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
      } catch {
        // Mic permission not granted - fallback to animated synth waves
        isMicAllowedRef.current = false;
      }

      renderWaveform();
    };

    let phase = 0;
    const renderWaveform = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 28;
      const barWidth = 4;
      const gap = (width - numBars * barWidth) / (numBars - 1);

      if (analyser && dataArray && !isMuted) {
        (analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < numBars; i++) {
        let value = 10;
        if (isMuted) {
          value = 4; // Flatline when muted
        } else if (analyser && dataArray && isMicAllowedRef.current) {
          const index = Math.floor((i / numBars) * dataArray.length);
          value = (dataArray[index] / 255) * height * 0.85;
        } else {
          // Lively synthetic voice simulation
          phase += 0.003;
          const sine = Math.sin(phase * 4 + i * 0.45);
          const cosine = Math.cos(phase * 3 + i * 0.3);
          value = Math.max(6, (Math.abs(sine + cosine) / 2) * height * 0.75);
        }

        const barHeight = Math.max(6, Math.min(height, value));
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        // Gradient color for bars
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#FF3366');
        gradient.addColorStop(0.5, '#9B51E0');
        gradient.addColorStop(1, '#00F0FF');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }

      animFrameIdRef.current = requestAnimationFrame(renderWaveform);
    };

    startAudio();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [callState, isMuted]);

  const handleTimeExpired = () => {
    if (!hasSentMatchRequest || !peerSentMatchRequest) {
      setCallState('ended');
    }
  };

  const handleSendMatchRequest = () => {
    setHasSentMatchRequest(true);
    showToast('Match Request Sent! Waiting for partner... ❤️', 'success');
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
    showToast(isMuted ? 'Microphone unmuted' : 'Microphone muted', 'info');
  };

  const handleRestartSearch = () => {
    setCallState('searching');
    setTimeLeft(60);
    setHasSentMatchRequest(false);
    setPeerSentMatchRequest(false);
    setMatchedPeer(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Circular progress calculations
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / 60) * circumference;

  const timerColor = timeLeft > 20 ? 'var(--neon-cyan, #00F0FF)' : timeLeft > 10 ? '#FFB800' : '#FF3366';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(5, 6, 10, 0.88)',
      backdropFilter: 'blur(20px)',
      padding: '16px',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '460px',
        backgroundColor: '#12141F',
        borderRadius: '28px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 51, 102, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF3366, #9B51E0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Radio size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
                Voice Match
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                1-Minute Speed Audio
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* STATE 1: SEARCHING / RADAR */}
        {callState === 'searching' && (
          <div style={{
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            {/* Pulsing Radar Effect */}
            <div style={{
              position: 'relative',
              width: '160px',
              height: '160px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '32px',
            }}>
              <div style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 51, 102, 0.25)',
                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
              }} />
              <div style={{
                position: 'absolute',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '2px solid rgba(155, 81, 224, 0.4)',
                animation: 'pulse 1.8s ease-in-out infinite',
              }} />
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF3366, #9B51E0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(255, 51, 102, 0.6)',
              }}>
                <Mic size={36} color="#fff" />
              </div>
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
              Finding Your Voice Match...
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '280px', lineHeight: 1.5, marginBottom: '28px' }}>
              Matching you with someone nearby for a 60-second blind voice conversation. Listen to the vibe!
            </p>

            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                borderRadius: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* STATE 2: CONNECTED (60s SPEED CALL) */}
        {callState === 'connected' && matchedPeer && (
          <div style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Timer Ring & Mystery Avatar */}
            <div style={{ position: 'relative', width: '130px', height: '130px', marginBottom: '16px' }}>
              {/* Circular SVG Timer */}
              <svg width="130" height="130" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke={timerColor}
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                />
              </svg>

              {/* Blurred Mystery Avatar */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                width: '106px',
                height: '106px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              }}>
                <img
                  src={apiClient.getPrimaryPhoto(matchedPeer)}
                  alt="Mystery Match"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'blur(12px) brightness(0.9)',
                    transform: 'scale(1.2)',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(18, 20, 31, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles size={24} color="#FF3366" />
                </div>
              </div>

              {/* Floating Timer Badge */}
              <div style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#1E2130',
                border: `1px solid ${timerColor}`,
                borderRadius: '16px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 800,
                color: timerColor,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}>
                <Clock size={11} />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {/* Peer Info */}
            <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                {getProfileName(matchedPeer)}, {matchedPeer.age}
              </h3>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', margin: '4px 0 0 0' }}>
                {matchedPeer.city || 'Nearby'} • Mystery Photo unlocks upon mutual match
              </p>
            </div>

            {/* Real-time Audio Waveform Canvas */}
            <div style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              padding: '12px 16px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '8px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Volume2 size={12} color="#00F0FF" /> Live Voice Channel
                </span>
                <span>{isMuted ? 'Muted' : 'Speaking...'}</span>
              </div>
              <canvas
                ref={canvasRef}
                width={360}
                height={46}
                style={{ width: '100%', height: '46px' }}
              />
            </div>

            {/* Icebreaker Prompt Box */}
            <div style={{
              width: '100%',
              backgroundColor: 'rgba(155, 81, 224, 0.08)',
              border: '1px solid rgba(155, 81, 224, 0.25)',
              borderRadius: '16px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9B51E0', fontWeight: 800, letterSpacing: '0.5px' }}>
                  💡 Icebreaker Prompt
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px', fontWeight: 500 }}>
                  "{ICEBREAKERS[icebreakerIndex]}"
                </div>
              </div>
              <button
                onClick={() => setIcebreakerIndex((prev) => (prev + 1) % ICEBREAKERS.length)}
                title="Shuffle Icebreaker"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Shuffle size={14} />
              </button>
            </div>

            {/* Actions: Mute + Send Match Request + Skip */}
            <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              {/* Mic Toggle */}
              <button
                onClick={toggleMute}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: isMuted ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${isMuted ? '#FF3366' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isMuted ? '#FF3366' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Main "Send Match Request" Button */}
              <button
                onClick={handleSendMatchRequest}
                disabled={hasSentMatchRequest}
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: '24px',
                  background: hasSentMatchRequest
                    ? 'linear-gradient(135deg, #10B981, #059669)'
                    : 'linear-gradient(135deg, #FF3366, #FF7A00)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: hasSentMatchRequest ? 'default' : 'pointer',
                  boxShadow: hasSentMatchRequest
                    ? '0 6px 20px rgba(16, 185, 129, 0.4)'
                    : '0 6px 20px rgba(255, 51, 102, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Heart size={18} fill="#fff" />
                <span>
                  {hasSentMatchRequest
                    ? (peerSentMatchRequest ? 'Mutual Match!' : 'Request Sent ❤️')
                    : 'Send Match Request'}
                </span>
              </button>

              {/* End / Skip Call */}
              <button
                onClick={() => setCallState('ended')}
                title="End Call"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 51, 102, 0.15)',
                  border: '1px solid rgba(255, 51, 102, 0.3)',
                  color: '#FF3366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: CELEBRATION (MUTUAL MATCH) */}
        {callState === 'celebration' && matchedPeer && (
          <div style={{
            padding: '36px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 51, 102, 0.15)',
              border: '1px solid rgba(255, 51, 102, 0.3)',
              color: '#FF3366',
              fontSize: '12px',
              fontWeight: 800,
              marginBottom: '20px',
            }}>
              <Flame size={14} /> IT'S A MUTUAL VOICE MATCH!
            </div>

            {/* Profile Photos Side-by-side Unblurred */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                border: '3px solid #FF3366',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(255, 51, 102, 0.3)',
              }}>
                <img
                  src={apiClient.getPrimaryPhoto(currentUser)}
                  alt={getProfileName(currentUser)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF3366, #9B51E0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}>
                <Heart size={18} fill="#fff" />
              </div>

              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                border: '3px solid #00F0FF',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 240, 255, 0.3)',
              }}>
                <img
                  src={apiClient.getPrimaryPhoto(matchedPeer)}
                  alt={getProfileName(matchedPeer)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: '0 0 8px 0' }}>
              You and {getProfileName(matchedPeer)} Matched!
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, marginBottom: '28px', maxWidth: '320px' }}>
              Your 60-second voice vibe was mutual! Her profile is now unlocked and you can continue chatting anytime.
            </p>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToChat();
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #FF3366, #9B51E0)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(255, 51, 102, 0.4)',
                }}
              >
                <MessageCircle size={18} />
                <span>Send First Message</span>
              </button>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Keep Exploring
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: ENDED (NO MATCH OR SKIPPED) */}
        {callState === 'ended' && (
          <div style={{
            padding: '36px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              marginBottom: '16px',
            }}>
              <Clock size={28} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 8px 0' }}>
              Voice Call Ended
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '300px', lineHeight: 1.5, marginBottom: '28px' }}>
              The 60 seconds are up! You can jump back into the queue for another voice match or continue browsing cards.
            </p>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleRestartSearch}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #FF3366, #9B51E0)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(255, 51, 102, 0.4)',
                }}
              >
                <Radio size={16} />
                <span>Find Next Voice Match</span>
              </button>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back to Feed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
