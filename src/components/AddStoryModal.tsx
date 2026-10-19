import React, { useState, useRef } from 'react';
import apiClient from '../api/apiClient';
import { X, ImagePlus, Send, Loader2 } from 'lucide-react';

interface AddStoryModalProps {
  onClose: () => void;
  onStoryCreated: () => void;
}

export const AddStoryModal: React.FC<AddStoryModalProps> = ({
  onClose,
  onStoryCreated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image for your story');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await apiClient.uploadStory(selectedFile, caption.trim() || undefined);
      onStoryCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to share story');
    } finally {
      setIsUploading(false);
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
          maxWidth: '400px',
          backgroundColor: 'var(--surface-dark)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Share a Story
          </h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Media Preview / Selector */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            height: '240px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--surface-card)',
            border: '2px dashed rgba(255, 255, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Story preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                Tap to change photo
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
              <ImagePlus size={36} color="var(--primary-pink)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Choose a photo
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Photos disappear after 24 hours
              </div>
            </div>
          )}
        </div>

        {/* Caption Input */}
        <div>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add an optional caption..."
            maxLength={120}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '14px',
            }}
          />
        </div>

        {error && (
          <div style={{ color: 'var(--pass-red)', fontSize: '12px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Share Button */}
        <button
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--flame-gradient)',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: isUploading || !selectedFile ? 0.5 : 1,
            boxShadow: '0 4px 16px rgba(255, 51, 102, 0.35)',
          }}
        >
          {isUploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Posting Story...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Share to Stories</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
