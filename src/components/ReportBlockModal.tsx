import React, { useState } from 'react';
import apiClient from '../api/apiClient';
import { X, ShieldAlert, Ban, Flag, Loader2 } from 'lucide-react';

interface ReportBlockModalProps {
  targetUserId: number;
  targetUserName?: string;
  onClose: () => void;
  onActionComplete: (action: 'block' | 'report') => void;
}

export const ReportBlockModal: React.FC<ReportBlockModalProps> = ({
  targetUserId,
  targetUserName = 'User',
  onClose,
  onActionComplete,
}) => {
  const [mode, setMode] = useState<'choose' | 'report' | 'block'>('choose');
  const [reportReason, setReportReason] = useState('Inappropriate behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportReasons = [
    'Inappropriate photos or bio',
    'Harassment or hate speech',
    'Fake profile or impersonation',
    'Scam or commercial spam',
    'Underage user',
    'Other safety concern',
  ];

  const handleBlock = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.blockUser({ targetUserId, reason: 'Blocked by user' });
      onActionComplete('block');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to block user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.reportUser({
        targetUserId,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      onActionComplete('report');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 10000,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: 'var(--surface-dark)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="var(--pass-red)" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Safety & Moderation
            </h2>
          </div>
          <button onClick={onClose} disabled={isLoading} style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--pass-red)', fontSize: '12px' }}>
            {error}
          </div>
        )}

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Choose an action for <strong>{targetUserName}</strong>:
            </p>

            <button
              onClick={() => setMode('block')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'left',
              }}
            >
              <Ban size={20} color="var(--pass-red)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Block {targetUserName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  They won't be able to see you or message you.
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('report')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'left',
              }}
            >
              <Flag size={20} color="#FFB800" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Report {targetUserName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Submit an abuse or scam report to Vibly safety team.
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'block' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Are you sure you want to block <strong>{targetUserName}</strong>? Any mutual matches and conversation history will be permanently hidden.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setMode('choose')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Back
              </button>
              <button
                onClick={handleBlock}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--pass-red)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Block'}
              </button>
            </div>
          </div>
        )}

        {mode === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              SELECT REASON
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '13px',
              }}
            >
              {reportReasons.map((r, i) => (
                <option key={i} value={r} style={{ background: '#1E2130' }}>
                  {r}
                </option>
              ))}
            </select>

            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Additional details (optional)..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '13px',
                resize: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setMode('choose')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Back
              </button>
              <button
                onClick={handleReport}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--flame-gradient)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
