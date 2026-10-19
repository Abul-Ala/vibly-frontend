import React from 'react';
import { UserStoryGroup } from '../api/types';
import apiClient from '../api/apiClient';
import { Plus } from 'lucide-react';

interface StoriesTrayProps {
  groups: UserStoryGroup[];
  myAvatarUrl?: string;
  onOpenGroup: (index: number) => void;
  onAddStory: () => void;
}

export const StoriesTray: React.FC<StoriesTrayProps> = ({
  groups,
  myAvatarUrl,
  onOpenGroup,
  onAddStory,
}) => {
  const myGroupIndex = groups.findIndex(g => g.isMe);
  const myGroup = myGroupIndex !== -1 ? groups[myGroupIndex] : null;
  const hasMyStories = myGroup && myGroup.stories.length > 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 16px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      {/* My Story Node */}
      <div
        onClick={hasMyStories ? () => onOpenGroup(myGroupIndex) : onAddStory}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          padding: hasMyStories ? '2.5px' : '0px',
          background: hasMyStories ? 'var(--romantic-gradient)' : 'transparent',
        }}>
          <img
            src={apiClient.resolveMediaUrl(myAvatarUrl) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'}
            alt="Your Story"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: hasMyStories ? '2px solid var(--surface-dark)' : '1px solid rgba(255, 255, 255, 0.15)',
            }}
          />

          {/* Plus Add Button Badge */}
          {!hasMyStories && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onAddStory();
              }}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'var(--primary-pink)',
                border: '2px solid var(--surface-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 6px rgba(255, 51, 102, 0.5)',
              }}
            >
              <Plus size={14} strokeWidth={3} />
            </div>
          )}
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: hasMyStories ? 'var(--text-primary)' : 'var(--text-secondary)',
          maxWidth: '68px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>
          {hasMyStories ? 'Your Story' : 'Add Story'}
        </span>
      </div>

      {/* Other Users' Stories */}
      {groups.filter(g => !g.isMe).map((group, idx) => {
        const actualIndex = groups.indexOf(group);
        const avatar = apiClient.resolveMediaUrl(group.userAvatarUrl) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800';

        return (
          <div
            key={group.userId || idx}
            onClick={() => onOpenGroup(actualIndex)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: '2.5px',
              background: 'var(--flame-gradient)',
              boxShadow: '0 0 12px rgba(255, 51, 102, 0.35)',
            }}>
              <img
                src={avatar}
                alt={group.userName || 'Story'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--surface-dark)',
                }}
              />
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              maxWidth: '68px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}>
              {group.userName ? group.userName.split(' ')[0] : 'Member'}
            </span>
          </div>
        );
      })}
    </div>
  );
};
