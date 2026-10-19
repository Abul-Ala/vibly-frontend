import React from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
  icon?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className="animate-slide-up"
          style={{
            pointerEvents: 'auto',
            background: 'rgba(22, 24, 34, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <span>{toast.icon || (toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✨' : '💬')}</span>
          <span style={{ flex: 1 }}>{toast.text}</span>
        </div>
      ))}
    </div>
  );
};
