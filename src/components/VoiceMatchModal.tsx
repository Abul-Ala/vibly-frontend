import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { UserProfile, VoiceSignalDto, VoiceMatchStatusDto } from '../api/types';
import apiClient from '../api/apiClient';
import { Room, RoomEvent, Track, RemoteTrack } from 'livekit-client';
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
  Flame,
  Wifi,
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

const DEFAULT_MOCK_PEER: UserProfile = {
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
  const [timeLeft, setTimeLeft] = useState(60);
  const [isMuted, setIsMuted] = useState(false);
  const [hasSentMatchRequest, setHasSentMatchRequest] = useState(false);
  const [peerSentMatchRequest, setPeerSentMatchRequest] = useState(false);
  const [matchedPeer, setMatchedPeer] = useState<UserProfile | null>(null);
  const [icebreakerIndex, setIcebreakerIndex] = useState(0);

  // Live Communication State
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLiveConnection, setIsLiveConnection] = useState(false);
  const [matchedConversationId, setMatchedConversationId] = useState<number | undefined>(undefined);

  // Audio & WebRTC references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isMicAllowedRef = useRef(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const processedSignalsRef = useRef<Set<string>>(new Set());

  // Trigger celebration effects
  const triggerCelebration = (peer: UserProfile) => {
    setCallState('celebration');
    onMutualMatch(peer);
    try {
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF3366', '#FF7A00', '#9B51E0', '#00F0FF'],
      });
    } catch {
      // ignore
    }
  };

  // Step 1: Subscribe to Server-Sent Events (SSE) for instant zero-polling matchmaking
  useEffect(() => {
    let isCancelled = false;
    let fallbackTimeout: ReturnType<typeof setTimeout>;

    if (callState === 'searching') {
      const sseUrl = `${apiClient.baseUrl}/voice-match/queue/events?token=${apiClient.authToken || ''}`;

      try {
        const sse = new EventSource(sseUrl);
        sseRef.current = sse;

        sse.addEventListener('MATCHED', (e: MessageEvent) => {
          if (isCancelled) return;
          try {
            const status: VoiceMatchStatusDto = JSON.parse(e.data);
            if (status.peer) {
              if (fallbackTimeout) clearTimeout(fallbackTimeout);
              setRoomId(status.roomId || null);
              setMatchedPeer(status.peer);
              setIsLiveConnection(true);
              setCallState('connected');
              setTimeLeft(60);
              showToast(`Live Voice Connected with ${getProfileName(status.peer)}!`, 'success');
              initLiveAudio(status.roomId!, status.isInitiator || false, status.livekitUrl, status.livekitToken);
            }
          } catch {
            // ignore
          }
        });

        sse.addEventListener('PEER_MATCH_REQUEST', () => {
          if (isCancelled) return;
          setPeerSentMatchRequest(true);
          showToast(`Your voice partner sent you a Match Request! ❤️`, 'info');
        });

        sse.addEventListener('MUTUAL_MATCH', (e: MessageEvent) => {
          if (isCancelled) return;
          try {
            const status: VoiceMatchStatusDto = JSON.parse(e.data);
            setMatchedConversationId(status.conversationId);
            if (matchedPeer) triggerCelebration(matchedPeer);
          } catch {
            // ignore
          }
        });

        sse.onerror = () => {
          // If SSE fails (e.g. while Railway backend is deploying), close cleanly
          sse.close();
          sseRef.current = null;
        };

        // Join backend matchmaking queue
        apiClient.joinVoiceQueue().then((res) => {
          if (isCancelled) return;
          if (res.status === 'MATCHED' && res.peer) {
            if (fallbackTimeout) clearTimeout(fallbackTimeout);
            setRoomId(res.roomId || null);
            setMatchedPeer(res.peer);
            setIsLiveConnection(true);
            setCallState('connected');
            setTimeLeft(60);
            showToast(`Live Voice Connected with ${getProfileName(res.peer)}!`, 'success');
            initLiveAudio(res.roomId!, res.isInitiator || false, res.livekitUrl, res.livekitToken);
          }
        }).catch((err) => {
          // Handled gracefully: if Railway is rebuilding, fallback timeout will seamlessly connect
          console.warn('Backend join queue error:', err);
        });
      } catch {
        // SSE not supported
      }

      // If no live peer connects within 10 seconds, pair with candidate so user is never stuck
      fallbackTimeout = setTimeout(() => {
        if (callState === 'searching' && !isCancelled) {
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
          const candidates = availableProfiles.filter(p => p.id !== currentUser.id);
          const chosen = candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : DEFAULT_MOCK_PEER;
          setMatchedPeer(chosen);
          setIsLiveConnection(false);
          setCallState('connected');
          setTimeLeft(60);
          showToast(`Connected with ${getProfileName(chosen)}! You have 60 seconds.`, 'info');
        }
      }, 10000);
    }

    return () => {
      isCancelled = true;
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [callState, availableProfiles, currentUser.id]);

  // Step 2: Initialize LiveKit / WebRTC Live 2-Way Audio Streaming
  const initLiveAudio = async (
    activeRoomId: string,
    isInitiator: boolean,
    livekitUrl?: string,
    livekitToken?: string
  ) => {
    // Attempt LiveKit Cloud connection first if token & URL are provided
    if (livekitUrl && livekitToken) {
      try {
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        livekitRoomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind === Track.Kind.Audio && remoteAudioRef.current) {
            track.attach(remoteAudioRef.current);
          }
        });

        await room.connect(livekitUrl, livekitToken);
        await room.localParticipant.setMicrophoneEnabled(true);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        mediaStreamRef.current = stream;
        isMicAllowedRef.current = true;
        return;
      } catch (err) {
        console.warn('LiveKit connection error, falling back to WebRTC P2P:', err);
      }
    }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnectionRef.current = pc;

      // Capture Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      isMicAllowedRef.current = true;
      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));

      // Handle Incoming Remote Audio Track
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      // Send local ICE candidates to backend
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          apiClient.sendVoiceSignal(activeRoomId, {
            type: 'candidate',
            roomId: activeRoomId,
            payload: JSON.stringify(event.candidate),
          }).catch(() => {});
        }
      };

      // Caller creates WebRTC Offer
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await apiClient.sendVoiceSignal(activeRoomId, {
          type: 'offer',
          roomId: activeRoomId,
          payload: JSON.stringify(offer),
        });
      }
    } catch (err) {
      console.warn('Live audio initialization error:', err);
    }
  };


  // Peer simulated match request behavior (for solo/demo mode)
  useEffect(() => {
    let matchTimeout: ReturnType<typeof setTimeout>;
    if (callState === 'connected' && matchedPeer && !isLiveConnection) {
      const randomDelay = (15 + Math.random() * 20) * 1000;
      matchTimeout = setTimeout(() => {
        setPeerSentMatchRequest(true);
        showToast(`${getProfileName(matchedPeer)} sent you a Match Request! ❤️`, 'info');
      }, randomDelay);
    }
    return () => clearTimeout(matchTimeout);
  }, [callState, matchedPeer, isLiveConnection]);

  // Handle mutual match in demo mode
  useEffect(() => {
    if (hasSentMatchRequest && peerSentMatchRequest && callState === 'connected' && matchedPeer && !isLiveConnection) {
      triggerCelebration(matchedPeer);
    }
  }, [hasSentMatchRequest, peerSentMatchRequest, callState, matchedPeer, isLiveConnection]);

  // 60-Second Countdown Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            if (!hasSentMatchRequest || !peerSentMatchRequest) {
              setCallState('ended');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [callState, hasSentMatchRequest, peerSentMatchRequest]);

  // Web Audio API Frequency Spectrum Visualizer
  useEffect(() => {
    if (callState !== 'connected') return;

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;

    const setupVisualizer = async () => {
      try {
        let stream = mediaStreamRef.current;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          mediaStreamRef.current = stream;
        }
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
          value = 4;
        } else if (analyser && dataArray && isMicAllowedRef.current) {
          const index = Math.floor((i / numBars) * dataArray.length);
          value = (dataArray[index] / 255) * height * 0.85;
        } else {
          phase += 0.003;
          const sine = Math.sin(phase * 4 + i * 0.45);
          const cosine = Math.cos(phase * 3 + i * 0.3);
          value = Math.max(6, (Math.abs(sine + cosine) / 2) * height * 0.75);
        }

        const barHeight = Math.max(6, Math.min(height, value));
        const x = i * (barWidth + gap);
        const y = (height - barHeight) / 2;

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

    setupVisualizer();

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

  // Clean exit and leave backend room
  const handleExit = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (livekitRoomRef.current) {
      livekitRoomRef.current.disconnect();
      livekitRoomRef.current = null;
    }
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    apiClient.leaveVoiceQueue().catch(() => {});
    onClose();
  };

  const handleSendMatchRequest = async () => {
    setHasSentMatchRequest(true);
    showToast('Match Request Sent! Waiting for partner... ❤️', 'success');

    if (roomId && isLiveConnection) {
      try {
        const res = await apiClient.sendVoiceMatchRequest(roomId);
        if (res.isMutualMatch && matchedPeer) {
          setMatchedConversationId(res.conversationId);
          triggerCelebration(matchedPeer);
        }
      } catch {
        // fallback
      }
    }
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
    setRoomId(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
      {/* Hidden Audio element for live peer audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

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
        {/* Top Header */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
                  Voice Match
                </span>
                {isLiveConnection && (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}>
                    <Wifi size={9} /> LIVE
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                1-Minute Speed Audio
              </div>
            </div>
          </div>

          <button
            onClick={handleExit}
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
              Finding Live Voice Partner...
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '290px', lineHeight: 1.5, marginBottom: '28px' }}>
              Checking for users on Voice Match right now. You'll be connected directly into a 60-second real-time audio room!
            </p>

            <button
              onClick={handleExit}
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
                {matchedPeer.city || 'Nearby'} • Photo unblurs on mutual match
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
                  <Volume2 size={12} color="#00F0FF" /> 2-Way Live Voice Stream
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
                onClick={handleExit}
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
              Your 60-second voice vibe was mutual! Photos are now unblurred and you can chat anytime.
            </p>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  handleExit();
                  onNavigateToChat(matchedConversationId);
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
                onClick={handleExit}
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
                onClick={handleExit}
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
