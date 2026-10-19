import React, { useState, useEffect, useRef } from 'react';
import { UserStoryGroup } from '../api/types';
import apiClient from '../api/apiClient';
import { X, Eye, Trash2 } from 'lucide-react';

interface StoryViewerModalProps {
  groups: UserStoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onStoryDeleted?: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  groups,
  initialGroupIndex,
  onClose,
  onStoryDeleted,
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentGroup = groups[groupIndex];
  const stories = currentGroup?.stories || [];
  const currentStory = stories[storyIndex];

  // Duration in milliseconds per story slide
  const STORY_DURATION = 5000;
  const progressIntervalRef = useRef<number | null>(null);

  // Trigger view tracking when a story opens
  useEffect(() => {
    if (currentStory && currentStory.id) {
      apiClient.viewStory(currentStory.id);
    }
  }, [currentStory]);

  // Handle auto-advancing progress
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const startTime = Date.now() - (progress / 100) * STORY_DURATION;

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(nextProgress);

      if (nextProgress >= 100) {
        handleNext();
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [groupIndex, storyIndex, isPaused]);

  const handleNext = () => {
    setProgress(0);
    if (storyIndex < stories.length - 1) {
      setStoryIndex(prev => prev + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(prev => prev - 1);
      const prevStories = groups[groupIndex - 1]?.stories || [];
      setStoryIndex(Math.max(0, prevStories.length - 1));
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    try {
      await apiClient.deleteStory(currentStory.id);
      onStoryDeleted?.();
      handleNext();
    } catch {
      // ignore
    }
  };

  if (!currentGroup || !currentStory) {
    onClose();
    return null;
  }

  const avatar = apiClient.resolveMediaUrl(currentGroup.userAvatarUrl) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800';
  const mediaUrl = apiClient.resolveMediaUrl(currentStory.mediaUrl);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      backgroundColor: '#000000',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
    }}>
      {/* Background Story Image */}
      <img
        src={mediaUrl}
        alt="Story"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* Top Header Overlay with Progress Bars and User Info */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 16px 30px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {/* Progress Bars */}
        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
          {stories.map((_, i) => {
            const barWidth = i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%';
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: '3px',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: barWidth,
                    backgroundColor: '#ffffff',
                    transition: i === storyIndex ? 'none' : 'width 0.1s linear',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* User Info Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={avatar}
              alt={currentGroup.userName || 'User'}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #ffffff',
              }}
            />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                {currentGroup.isMe ? 'Your Story' : currentGroup.userName}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
                {currentStory.timeAgo || 'Recently'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentGroup.isMe && (
              <button
                onClick={handleDeleteStory}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: 'var(--pass-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Tap Zones: Left (30%) & Right (70%) */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', zIndex: 3 }}>
        <div
          onClick={handlePrev}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerCancel={() => setIsPaused(false)}
          style={{ width: '35%', height: '100%', cursor: 'pointer' }}
        />
        <div
          onClick={handleNext}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerCancel={() => setIsPaused(false)}
          style={{ width: '65%', height: '100%', cursor: 'pointer' }}
        />
      </div>

      {/* Bottom Caption & View Count */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '30px 20px 24px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
      }}>
        {currentStory.caption && (
          <p style={{
            fontSize: '15px',
            color: '#ffffff',
            fontWeight: 500,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {currentStory.caption}
          </p>
        )}

        {currentGroup.isMe && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.8)',
          }}>
            <Eye size={14} />
            <span>{currentStory.viewCount || 0} views</span>
          </div>
        )}
      </div>
    </div>
  );
};
