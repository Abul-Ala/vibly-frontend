import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserProfile } from '../api/types';
import apiClient from '../api/apiClient';
import { ReportBlockModal } from '../components/ReportBlockModal';
import {
  ArrowLeft,
  Send,
  ShieldAlert,
  CheckCheck,
  Loader2,
  User,
  BadgeCheck,
  MapPin,
  Briefcase,
  Sparkles,
  X,
} from 'lucide-react';

interface ChatScreenProps {
  conversationId: number;
  currentUser: UserProfile;
  onNavigateBack: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  conversationId,
  currentUser,
  onNavigateBack,
  showToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 899px)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 899px)');
    const update = () => setIsMobile(mql.matches);
    mql.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mql.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const icebreakers = [
    '☕ Coffee or Chai debate?',
    '🧗 Next dream travel destination?',
    '🎬 Favorite comfort movie?',
    '🐶 Are you a dog or cat person?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationData = async () => {
    try {
      const [msgRes, convsRes] = await Promise.allSettled([
        apiClient.getMessages(conversationId),
        apiClient.getConversations(),
      ]);

      if (msgRes.status === 'fulfilled') {
        setMessages(msgRes.value || []);
      }

      if (convsRes.status === 'fulfilled') {
        const conv = convsRes.value?.find(c => c.id === conversationId);
        if (conv?.otherUser) {
          setOtherUser(conv.otherUser);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadConversationData();
    const interval = setInterval(loadConversationData, 2500);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending || isBlocked) return;

    setIsSending(true);
    setInputText('');

    const tempMsg: ChatMessage = {
      id: Date.now(),
      conversationId,
      senderId: currentUser.userId,
      senderName: currentUser.displayName,
      content: text,
      type: 'TEXT',
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const sent = await apiClient.sendMessage(conversationId, {
        content: text,
        type: 'TEXT',
      });
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? sent : m));
    } catch (err: any) {
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const otherPhoto = apiClient.getPrimaryPhoto(otherUser);
  const isOnline = otherUser?.userStatus === 'Online' && !otherUser?.hideOnlineStatus;

  return (
    <div style={{
      flex: 1,
      height: '100%',
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: 'var(--bg-dark)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Main Chat Column */}
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minWidth: 0,
      }}>
        {/* Top Conversation Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          backgroundColor: 'var(--surface-dark)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onNavigateBack}
              title="Back"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <ArrowLeft size={18} />
            </button>

            {/* Avatar with Status */}
            <div
              onClick={() => setShowProfileDrawer(prev => !prev)}
              style={{ position: 'relative', width: '44px', height: '44px', cursor: 'pointer' }}
            >
              <img
                src={otherPhoto}
                alt={otherUser?.displayName || 'Chat'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary-pink)',
                }}
              />
              {isOnline && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success-green)',
                  border: '2px solid var(--surface-dark)',
                }} />
              )}
            </div>

            <div
              onClick={() => setShowProfileDrawer(prev => !prev)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {otherUser?.displayName || 'Chat'}
                </h3>
                {otherUser?.isVerified && (
                  <BadgeCheck size={16} fill="var(--verified-blue)" color="#ffffff" />
                )}
              </div>
              <span style={{ fontSize: '11px', color: isOnline ? 'var(--success-green)' : 'var(--text-secondary)' }}>
                {isOnline ? 'Active now' : (otherUser?.userStatus || 'Offline')}
              </span>
            </div>
          </div>

          {/* Right Header Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {otherUser && (
              <button
                onClick={() => setShowProfileDrawer(prev => !prev)}
                title="View Match Profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  backgroundColor: showProfileDrawer ? 'rgba(255, 51, 102, 0.15)' : 'var(--surface-card)',
                  color: showProfileDrawer ? 'var(--primary-pink)' : 'var(--text-secondary)',
                  border: `1px solid ${showProfileDrawer ? 'rgba(255, 51, 102, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <User size={14} />
                <span>Profile</span>
              </button>
            )}

            {otherUser && (
              <button
                onClick={() => setShowSafetyModal(true)}
                title="Safety & Moderation"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--surface-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <ShieldAlert size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Icebreakers Row */}
          {messages.length < 4 && (
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--surface-card)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '10px', letterSpacing: '1px' }}>
                BREAK THE ICE
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {icebreakers.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 51, 102, 0.1)',
                      border: '1px solid rgba(255, 51, 102, 0.3)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 500,
                      textAlign: 'left',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {messages.map((msg, idx) => {
            const isMe = msg.isMe || msg.senderId === currentUser.userId;
            const time = msg.time || (msg.createdAt?.includes('T') ? msg.createdAt.split('T')[1].slice(0, 5) : 'Just now');

            return (
              <div
                key={msg.id || idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    maxWidth: '65%',
                    padding: '12px 18px',
                    borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: isMe ? 'var(--romantic-gradient)' : 'var(--surface-card)',
                    color: '#ffffff',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    boxShadow: isMe ? '0 4px 14px rgba(255, 51, 102, 0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
                    border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '3px',
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  padding: '0 4px',
                }}>
                  <span>{time}</span>
                  {isMe && <CheckCheck size={12} color="var(--neon-cyan)" />}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Desktop Message Input Bar */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'var(--surface-dark)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            placeholder={isBlocked ? 'You cannot reply to this conversation' : `Send a message to ${otherUser?.displayName || 'match'}...`}
            disabled={isBlocked}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '26px',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isSending || isBlocked}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'var(--flame-gradient)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !inputText.trim() || isSending || isBlocked ? 0.4 : 1,
              boxShadow: '0 4px 14px rgba(255, 51, 102, 0.35)',
            }}
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {/* Profile Drawer / Modal (Adaptive for Mobile and Desktop) */}
      {showProfileDrawer && otherUser && (
        <div
          className="animate-fade-in"
          style={isMobile ? {
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'var(--surface-dark)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '24px 20px',
          } : {
            width: '360px',
            height: '100%',
            backgroundColor: 'var(--surface-dark)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '24px',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button onClick={() => setShowProfileDrawer(false)} style={{ color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              margin: '0 auto 12px',
              padding: '2.5px',
              background: 'var(--flame-gradient)',
            }}>
              <img
                src={otherPhoto}
                alt={otherUser.displayName || 'Match'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--surface-dark)',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {otherUser.displayName}
              </h3>
              <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
                {otherUser.age}
              </span>
              {otherUser.isVerified && (
                <BadgeCheck size={18} fill="var(--verified-blue)" color="#ffffff" />
              )}
            </div>

            {(otherUser.occupation || otherUser.city) && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {otherUser.occupation && `${otherUser.occupation} • `}
                {otherUser.city}
              </div>
            )}
          </div>

          {otherUser.bio && (
            <div style={{
              backgroundColor: 'var(--surface-card)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                About
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                {otherUser.bio}
              </p>
            </div>
          )}

          {otherUser.interests && otherUser.interests.length > 0 && (
            <div style={{
              backgroundColor: 'var(--surface-card)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Passions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {otherUser.interests.map((it, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(255, 51, 102, 0.1)',
                      border: '1px solid rgba(255, 51, 102, 0.3)',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                    }}
                  >
                    {it.icon ? `${it.icon} ` : '✨ '}
                    {it.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safety Modal */}
      {showSafetyModal && otherUser && (
        <ReportBlockModal
          targetUserId={otherUser.userId}
          targetUserName={otherUser.displayName}
          onClose={() => setShowSafetyModal(false)}
          onActionComplete={(action) => {
            if (action === 'block') {
              setIsBlocked(true);
              showToast(`${otherUser.displayName} blocked`, 'info');
              onNavigateBack();
            } else {
              showToast('Report submitted to moderation', 'info');
            }
          }}
        />
      )}
    </div>
  );
};
