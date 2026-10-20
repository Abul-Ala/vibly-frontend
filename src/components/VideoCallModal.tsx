import React, { useState, useEffect, useRef } from 'react';
import { VideoCallDto, UserProfile } from '../api/types';
import apiClient from '../api/apiClient';
import ringtoneService from '../utils/ringtoneService';
import { Room, RoomEvent, Track, RemoteTrack, LocalVideoTrack } from 'livekit-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  SwitchCamera,
  Maximize2,
  Minimize2,
  BadgeCheck,
  Signal,
  Wifi,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface VideoCallModalProps {
  initialCall: VideoCallDto;
  currentUser: UserProfile;
  onClose: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  initialCall,
  currentUser,
  onClose,
  showToast,
}) => {
  const [call, setCall] = useState<VideoCallDto>(initialCall);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isConnectingLiveKit, setIsConnectingLiveKit] = useState(false);
  const [isPipMinimized, setIsPipMinimized] = useState(false);

  // References
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoTrackRef = useRef<RemoteTrack | null>(null);
  const remoteAudioTrackRef = useRef<RemoteTrack | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Helper to attach remote track to appropriate DOM element
  const attachRemoteTrack = (track: Track) => {
    if (track.kind === Track.Kind.Video) {
      remoteVideoTrackRef.current = track as RemoteTrack;
      setHasRemoteVideo(true);
      if (remoteVideoRef.current) {
        try {
          track.attach(remoteVideoRef.current);
          remoteVideoRef.current.play().catch(() => {});
        } catch (e) {
          console.warn('Could not attach remote video track:', e);
        }
      }
    } else if (track.kind === Track.Kind.Audio) {
      remoteAudioTrackRef.current = track as RemoteTrack;
      if (remoteAudioRef.current) {
        try {
          track.attach(remoteAudioRef.current);
          remoteAudioRef.current.play().catch(() => {});
        } catch (e) {
          console.warn('Could not attach remote audio track:', e);
        }
      }
    }
  };

  // Re-attach tracks if ref becomes available or state updates
  useEffect(() => {
    if (remoteVideoTrackRef.current && remoteVideoRef.current) {
      try {
        remoteVideoTrackRef.current.attach(remoteVideoRef.current);
        remoteVideoRef.current.play().catch(() => {});
      } catch {}
    }
    if (remoteAudioTrackRef.current && remoteAudioRef.current) {
      try {
        remoteAudioTrackRef.current.attach(remoteAudioRef.current);
        remoteAudioRef.current.play().catch(() => {});
      } catch {}
    }
  }, [hasRemoteVideo, call.status]);

  // Determine peer user profile
  const isCaller = currentUser.userId === call.callerId || currentUser.id === call.callerId;
  const peerProfile = isCaller ? call.targetProfile : call.callerProfile;
  const peerName = peerProfile?.displayName || (isCaller ? 'Match' : 'Caller');
  const peerPhoto = apiClient.getPrimaryPhoto(peerProfile);
  const myPhoto = apiClient.getPrimaryPhoto(currentUser);

  // Format call duration MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Step 1: Outgoing ringback tone & peer response listener
  useEffect(() => {
    if (call.status === 'RINGING' && isCaller) {
      ringtoneService.startOutgoingRingback();
    } else {
      ringtoneService.stopOutgoingRingback();
    }

    return () => {
      ringtoneService.stopOutgoingRingback();
    };
  }, [call.status, isCaller]);

  // Step 2: Real-time listener for Call Status changes (ACCEPTED, REJECTED, ENDED)
  useEffect(() => {
    let isCancelled = false;

    // Connect SSE for zero-polling instant state transitions
    const sseUrl = `${apiClient.baseUrl}/video-call/events?token=${apiClient.authToken || ''}`;
    try {
      const sse = new EventSource(sseUrl);
      sseRef.current = sse;

      sse.addEventListener('CALL_ACCEPTED', (e: MessageEvent) => {
        if (isCancelled) return;
        try {
          const updated: VideoCallDto = JSON.parse(e.data);
          ringtoneService.stopAll();
          setCall(prev => ({ ...prev, ...updated, status: 'ACCEPTED' }));
          showToast(`Video connected with ${peerName}!`, 'success');
        } catch {
          // ignore
        }
      });

      sse.addEventListener('CALL_REJECTED', () => {
        if (isCancelled) return;
        ringtoneService.stopAll();
        showToast(`${peerName} declined the call`, 'info');
        cleanupAndClose();
      });

      sse.addEventListener('CALL_ENDED', () => {
        if (isCancelled) return;
        ringtoneService.stopAll();
        showToast('Call ended', 'info');
        cleanupAndClose();
      });

      sse.addEventListener('CALL_MISSED', () => {
        if (isCancelled) return;
        ringtoneService.stopAll();
        showToast('No answer. Call ended.', 'info');
        cleanupAndClose();
      });
    } catch {
      // SSE fallback handled below
    }

    // Polling fallback every 2.5s while ringing
    const pollInterval = setInterval(async () => {
      if (isCancelled || call.status === 'ACCEPTED') return;
      try {
        const active = await apiClient.getActiveVideoCall();
        if (!active) {
          if (call.status === 'RINGING') {
            ringtoneService.stopAll();
            showToast('Call ended', 'info');
            cleanupAndClose();
          }
          return;
        }

        if (active.status === 'ACCEPTED') {
          ringtoneService.stopAll();
          setCall(active);
          showToast(`Video connected with ${peerName}!`, 'success');
        } else if (active.status === 'REJECTED' || active.status === 'ENDED') {
          ringtoneService.stopAll();
          showToast(active.status === 'REJECTED' ? `${peerName} declined the call` : 'Call ended', 'info');
          cleanupAndClose();
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [call.status, call.callId, peerName]);

  // Step 3: Connect to LiveKit Room once Call is ACCEPTED
  useEffect(() => {
    let isMounted = true;

    if (call.status === 'ACCEPTED') {
      // Start call duration counter
      if (!timerIntervalRef.current) {
        timerIntervalRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      }

      const connectLiveKit = async () => {
        setIsConnectingLiveKit(true);
        const livekitUrl = call.livekitUrl || 'wss://vibly-dukzgaut.livekit.cloud';
        const livekitToken = call.token;

        if (!livekitToken) {
          console.warn('No LiveKit token available for video call');
          setIsConnectingLiveKit(false);
          return;
        }

        try {
          const room = new Room({
            videoCaptureDefaults: {
              resolution: { width: 1280, height: 720, frameRate: 30 },
              facingMode: facingMode,
            },
          });
          livekitRoomRef.current = room;

          // Helper to sync all tracks from all remote participants
          const syncAllRemoteTracks = () => {
            if (!isMounted || !livekitRoomRef.current) return;
            livekitRoomRef.current.remoteParticipants.forEach((participant) => {
              participant.trackPublications.forEach((pub) => {
                if (pub.track) {
                  attachRemoteTrack(pub.track);
                }
              });
            });
          };

          // 1. Listen for new subscriptions
          room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
            if (!isMounted) return;
            attachRemoteTrack(track);
          });

          // 2. Also listen for TrackPublished when track is already available
          room.on(RoomEvent.TrackPublished, (pub) => {
            if (!isMounted) return;
            if (pub.isSubscribed && pub.track) {
              attachRemoteTrack(pub.track);
            }
          });

          // 3. Unsubscribed
          room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
            if (!isMounted) return;
            if (track.kind === Track.Kind.Video) {
              if (remoteVideoRef.current) {
                try { track.detach(remoteVideoRef.current); } catch {}
              }
              setHasRemoteVideo(false);
              if (remoteVideoTrackRef.current === track) {
                remoteVideoTrackRef.current = null;
              }
            } else if (track.kind === Track.Kind.Audio) {
              if (remoteAudioRef.current) {
                try { track.detach(remoteAudioRef.current); } catch {}
              }
              if (remoteAudioTrackRef.current === track) {
                remoteAudioTrackRef.current = null;
              }
            }
          });

          // 4. Track Muted / Unmuted (only for remote participant video)
          room.on(RoomEvent.TrackMuted, (pub, participant) => {
            if (!isMounted) return;
            if (participant !== room.localParticipant && pub.kind === Track.Kind.Video) {
              setHasRemoteVideo(false);
            }
          });

          room.on(RoomEvent.TrackUnmuted, (pub, participant) => {
            if (!isMounted) return;
            if (participant !== room.localParticipant && pub.kind === Track.Kind.Video && pub.track) {
              attachRemoteTrack(pub.track);
            }
          });

          // 5. Remote Participant Connected
          room.on(RoomEvent.ParticipantConnected, (participant) => {
            if (!isMounted) return;
            participant.trackPublications.forEach((pub) => {
              if (pub.track) {
                attachRemoteTrack(pub.track);
              }
            });
          });

          // 6. Local Track Published (attach local preview)
          room.on(RoomEvent.LocalTrackPublished, (pub) => {
            if (!isMounted) return;
            if (pub.track && pub.track.kind === Track.Kind.Video && localVideoRef.current) {
              try {
                (pub.track as LocalVideoTrack).attach(localVideoRef.current);
                localVideoRef.current.play().catch(() => {});
              } catch {}
            }
          });

          room.on(RoomEvent.ParticipantDisconnected, () => {
            if (!isMounted) return;
            showToast(`${peerName} left the video call`, 'info');
            cleanupAndClose();
          });

          // Connect to room
          await room.connect(livekitUrl, livekitToken);

          // Enable microphone and camera cleanly via LiveKit
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
            const videoPub = await room.localParticipant.setCameraEnabled(true);
            if (videoPub && videoPub.track && localVideoRef.current) {
              (videoPub.track as LocalVideoTrack).attach(localVideoRef.current);
              localVideoRef.current.play().catch(() => {});
            }
          } catch (camErr) {
            console.warn('Error enabling camera/mic in LiveKit:', camErr);
          }

          // Initial check for local video tracks in case pub was delayed
          room.localParticipant.videoTrackPublications.forEach((pub) => {
            if (pub.track && localVideoRef.current) {
              (pub.track as LocalVideoTrack).attach(localVideoRef.current);
              localVideoRef.current.play().catch(() => {});
            }
          });

          // Crucial: Attach tracks of participants who were ALREADY in the room before we joined!
          syncAllRemoteTracks();

          // Double check with timers to catch in-flight WebRTC negotiation
          setTimeout(syncAllRemoteTracks, 300);
          setTimeout(syncAllRemoteTracks, 1000);
          setTimeout(syncAllRemoteTracks, 2500);

          if (isMounted) setIsConnectingLiveKit(false);
        } catch (err) {
          console.warn('LiveKit room connection error:', err);
          if (isMounted) {
            setIsConnectingLiveKit(false);
          }
        }
      };

      connectLiveKit();
    }

    return () => {
      isMounted = false;
    };
  }, [call.status, call.token, call.livekitUrl]);

  // Master cleanup: rigorously stop and release all hardware camera and mic tracks
  const stopAllMediaTracks = () => {
    ringtoneService.stopAll();

    // 1. Explicitly stop and release all LiveKit local participant tracks
    if (livekitRoomRef.current) {
      try {
        const room = livekitRoomRef.current;

        // Stop all video track publications
        room.localParticipant.videoTrackPublications.forEach((pub) => {
          try {
            if (pub.track) {
              if (localVideoRef.current) {
                pub.track.detach(localVideoRef.current);
              }
              pub.track.stop();
              const mediaTrack = (pub.track as any).mediaStreamTrack;
              if (mediaTrack && typeof mediaTrack.stop === 'function') {
                mediaTrack.stop();
              }
            }
          } catch {}
        });

        // Stop all audio track publications
        room.localParticipant.audioTrackPublications.forEach((pub) => {
          try {
            if (pub.track) {
              pub.track.stop();
              const mediaTrack = (pub.track as any).mediaStreamTrack;
              if (mediaTrack && typeof mediaTrack.stop === 'function') {
                mediaTrack.stop();
              }
            }
          } catch {}
        });

        // Explicitly set camera & mic disabled in LiveKit
        room.localParticipant.setCameraEnabled(false).catch(() => {});
        room.localParticipant.setMicrophoneEnabled(false).catch(() => {});

        // Disconnect room with stopTracks = true
        room.disconnect(true);
      } catch (e) {
        console.warn('Error closing LiveKit room:', e);
      }
      livekitRoomRef.current = null;
    }

    // 2. Stop and release any direct MediaStream tracks on local video element
    if (localVideoRef.current) {
      try {
        const stream = localVideoRef.current.srcObject;
        if (stream && stream instanceof MediaStream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
        }
        localVideoRef.current.srcObject = null;
      } catch {}
    }

    // 3. Stop and release any remote video/audio element tracks
    if (remoteVideoRef.current) {
      try {
        const stream = remoteVideoRef.current.srcObject;
        if (stream && stream instanceof MediaStream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
        }
        remoteVideoRef.current.srcObject = null;
      } catch {}
    }
    if (remoteAudioRef.current) {
      try {
        const stream = remoteAudioRef.current.srcObject;
        if (stream && stream instanceof MediaStream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
        }
        remoteAudioRef.current.srcObject = null;
      } catch {}
    }

    // 4. Stop and release localStreamRef tracks
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
      } catch {}
      localStreamRef.current = null;
    }
  };

  // Ensure camera and audio tracks are 100% stopped when component unmounts
  useEffect(() => {
    return () => {
      stopAllMediaTracks();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, []);

  // Fallback / direct camera stream helper
  const startLocalCamera = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Could not acquire local camera/mic stream:', e);
    }
  };

  // Toggle Microphone
  const handleToggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (livekitRoomRef.current) {
      await livekitRoomRef.current.localParticipant.setMicrophoneEnabled(!nextMuted);
    } else if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !nextMuted;
      });
    }
  };

  // Toggle Camera
  const handleToggleCamera = async () => {
    const nextCameraOff = !isCameraOff;
    setIsCameraOff(nextCameraOff);

    if (livekitRoomRef.current) {
      await livekitRoomRef.current.localParticipant.setCameraEnabled(!nextCameraOff);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = !nextCameraOff;
      });
    }
  };

  // Flip / Switch Camera
  const handleFlipCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    if (livekitRoomRef.current) {
      try {
        await livekitRoomRef.current.localParticipant.setCameraEnabled(false);
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (videoDevices.length > 1) {
          await livekitRoomRef.current.localParticipant.setCameraEnabled(true, {
            facingMode: nextMode,
          });
          livekitRoomRef.current.localParticipant.videoTrackPublications.forEach((pub) => {
            if (pub.track && localVideoRef.current) {
              (pub.track as LocalVideoTrack).attach(localVideoRef.current);
            }
          });
        }
      } catch {
        // ignore
      }
    } else {
      startLocalCamera();
    }
  };

  // End Video Call
  const handleEndCall = async () => {
    stopAllMediaTracks();
    try {
      await apiClient.endVideoCall(call.callId);
    } catch {
      // ignore
    }
    cleanupAndClose();
  };

  const cleanupAndClose = () => {
    stopAllMediaTracks();

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9998,
      backgroundColor: '#0A0A14',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes radarRipple {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }
        @keyframes soundWave {
          0%, 100% { height: 8px; }
          50% { height: 28px; }
        }
      `}</style>

      {/* Hidden remote audio tag for LiveKit track attachment */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* ============================================================== */}
      {/* 1. OUTGOING RINGING OVERLAY (Displayed when status is RINGING) */}
      {/* ============================================================== */}
      {call.status === 'RINGING' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'radial-gradient(circle at center, #1E122A 0%, #0A0A14 85%)',
        }}>
          {/* Pulsating Radar Waves */}
          <div style={{ position: 'relative', width: '160px', height: '160px', marginBottom: '36px' }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(255, 51, 102, 0.45)',
              animation: 'radarRipple 2.2s infinite ease-out',
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(255, 122, 0, 0.35)',
              animation: 'radarRipple 2.2s infinite ease-out 0.7s',
            }} />
            <img
              src={peerPhoto}
              alt={peerName}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #FF3366',
                boxShadow: '0 0 50px rgba(255, 51, 102, 0.5)',
                position: 'relative',
                zIndex: 2,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
              {peerName}{peerProfile?.age ? `, ${peerProfile.age}` : ''}
            </h2>
            {peerProfile?.isVerified && (
              <BadgeCheck size={22} fill="#00D2FF" color="#ffffff" />
            )}
          </div>

          <p style={{
            fontSize: '16px',
            color: 'var(--primary-pink)',
            fontWeight: 600,
            letterSpacing: '1px',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <VideoIcon size={18} />
            <span>Calling...</span>
          </p>

          <span style={{
            fontSize: '13px',
            color: call.isTargetOnline ? 'rgba(255, 255, 255, 0.6)' : '#FFAA00',
            marginBottom: '48px',
          }}>
            {call.isTargetOnline ? 'Ringing partner...' : 'User may be away. Ringing anyway...'}
          </span>

          {/* End / Cancel Call Button */}
          <button
            onClick={handleEndCall}
            title="Cancel Call"
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#EB5757',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(235, 87, 87, 0.55)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <PhoneOff size={30} />
          </button>
          <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '10px' }}>
            Cancel
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. CONNECTED 2-WAY LIVEKIT VIDEO VIEW (Always mounted in DOM) */}
      {/* ============================================================== */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Main Remote Video Container */}
        <div style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#0D0E15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Live Remote Video Tag - Always mounted and muted to allow seamless autoplay */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              inset: 0,
              opacity: (hasRemoteVideo && call.status === 'ACCEPTED') ? 1 : 0,
              transition: 'opacity 0.25s ease',
            }}
          />

          {/* If Remote Video is Not Yet Published or Camera Off */}
          {(!hasRemoteVideo || call.status !== 'ACCEPTED') && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              zIndex: 1,
            }}>
              <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                <img
                  src={peerPhoto}
                  alt={peerName}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid rgba(255, 51, 102, 0.6)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                  }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                  {peerName}
                </h3>
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {isConnectingLiveKit ? 'Connecting HD video...' : 'Camera is muted / connecting stream'}
                </span>
              </div>
              {/* Audio Waves Simulation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '30px' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: '4px',
                      backgroundColor: '#FF3366',
                      borderRadius: '2px',
                      animation: `soundWave 1.2s infinite ease-in-out ${i * 0.18}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Top Overlay Header */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%)',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={peerPhoto}
                alt={peerName}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #FF3366',
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    {peerName}
                  </h4>
                  {peerProfile?.isVerified && (
                    <BadgeCheck size={16} fill="#00D2FF" color="#ffffff" />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    display: 'inline-block',
                    boxShadow: '0 0 8px #10B981',
                  }} />
                  <span>LIVE</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{formatDuration(callDuration)}</span>
                </div>
              </div>
            </div>

            {/* Quality & Connection Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              <Signal size={14} color="#10B981" />
              <span>HD Video</span>
            </div>
          </div>

          {/* Picture-in-Picture Local Self Preview */}
          <div style={{
            position: 'absolute',
            bottom: '100px',
            right: '20px',
            width: isPipMinimized ? '70px' : '130px',
            height: isPipMinimized ? '95px' : '175px',
            borderRadius: '18px',
            overflow: 'hidden',
            backgroundColor: '#1A1B26',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
            zIndex: 20,
            transition: 'all 0.25s ease',
          }}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                display: isCameraOff ? 'none' : 'block',
              }}
            />
            {isCameraOff && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#181926',
              }}>
                <img
                  src={myPhoto}
                  alt="Me"
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', marginBottom: '4px' }}
                />
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>Off</span>
              </div>
            )}
            {/* Local Video Tag Badge */}
            <div style={{
              position: 'absolute',
              top: '6px',
              left: '8px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#ffffff',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: '2px 6px',
              borderRadius: '8px',
            }}>
              You
            </div>
            {/* Resize PIP button */}
            <button
              onClick={() => setIsPipMinimized(prev => !prev)}
              title={isPipMinimized ? 'Expand Preview' : 'Minimize Preview'}
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                color: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {isPipMinimized ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
            </button>
          </div>
        </div>

        {/* Bottom Floating Controls Bar */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 24px',
          borderRadius: '40px',
          backgroundColor: 'rgba(15, 16, 26, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
          zIndex: 30,
        }}>
          {/* Toggle Mute */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: isMuted ? '#EB5757' : 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={handleToggleCamera}
            title={isCameraOff ? 'Turn Video On' : 'Turn Video Off'}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: isCameraOff ? '#EB5757' : 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isCameraOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
          </button>

          {/* Flip Camera */}
          <button
            onClick={handleFlipCamera}
            title="Flip Camera (Front/Back)"
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <SwitchCamera size={20} />
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            title="End Video Call"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#EB5757',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(235, 87, 87, 0.6)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
