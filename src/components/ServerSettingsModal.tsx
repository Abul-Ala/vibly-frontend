import React, { useState } from 'react';
import apiClient, { DEFAULT_BASE_URL } from '../api/apiClient';
import { X, Server, Check } from 'lucide-react';

interface ServerSettingsModalProps {
  onClose: () => void;
  onServerChanged: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  onClose,
  onServerChanged,
}) => {
  const [currentUrl, setCurrentUrl] = useState(apiClient.baseUrl);

  const presets = [
    {
      name: 'Railway Cloud (Production)',
      url: DEFAULT_BASE_URL,
      status: 'Live',
    },
    {
      name: 'Local Spring Boot (Dev)',
      url: 'http://localhost:8080/api/v1',
      status: 'Port 8080',
    },
  ];

  const handleSelectPreset = (url: string) => {
    setCurrentUrl(url);
  };

  const handleSave = () => {
    apiClient.baseUrl = currentUrl;
    onServerChanged();
    onClose();
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
          maxWidth: '400px',
          backgroundColor: 'var(--surface-dark)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={20} color="var(--primary-pink)" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Backend Connection
            </h2>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Select backend server or provide your custom API URL:
        </p>

        {/* Preset list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {presets.map((preset, idx) => {
            const isSelected = currentUrl.replace(/\/+$/, '') === preset.url.replace(/\/+$/, '');
            return (
              <div
                key={idx}
                onClick={() => handleSelectPreset(preset.url)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'rgba(255, 51, 102, 0.12)' : 'var(--surface-card)',
                  border: `1.5px solid ${isSelected ? 'var(--primary-pink)' : 'rgba(255, 255, 255, 0.08)'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {preset.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {preset.url}
                  </div>
                </div>
                {isSelected && <Check size={18} color="var(--primary-pink)" />}
              </div>
            );
          })}
        </div>

        {/* Custom Input */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '1px' }}>
            CUSTOM API URL
          </label>
          <input
            type="text"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              marginTop: '6px',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '13px',
            }}
          />
        </div>

        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--flame-gradient)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '0 4px 16px rgba(255, 51, 102, 0.35)',
          }}
        >
          Save & Reconnect
        </button>
      </div>
    </div>
  );
};
