import React, { useState, useRef } from 'react';
import { useSwipeGesture, SwipeDirection } from '../../hooks/useSwipeGesture';
import { useHaptic } from '../../hooks/useHaptic';

export interface SwipeAction {
  direction: SwipeDirection;
  icon: string;
  label: string;
  color: string;
  action: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  actions?: SwipeAction[];
  className?: string;
  disabled?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  actions = [],
  className = '',
  disabled = false,
}) => {
  const [activeAction, setActiveAction] = useState<SwipeAction | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const haptic = useHaptic();
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle swipe actions
  const handleSwipe = (direction: SwipeDirection) => {
    if (disabled) return;

    const action = actions.find(a => a.direction === direction);
    if (action) {
      haptic.medium();
      action.action();
    }
  };

  // Handle swipe start for visual feedback
  const handleSwipeStart = (direction: SwipeDirection) => {
    if (disabled) return;

    const action = actions.find(a => a.direction === direction);
    if (action) {
      setActiveAction(action);
      haptic.light();
    }
  };

  // Handle swipe end
  const handleSwipeEnd = () => {
    setActiveAction(null);
    setSwipeProgress(0);
  };

  // Configure swipe gesture
  const swipeHandlers = useSwipeGesture(
    {
      onSwipeLeft: () => handleSwipe('left'),
      onSwipeRight: () => handleSwipe('right'),
      onSwipeUp: () => handleSwipe('up'),
      onSwipeDown: () => handleSwipe('down'),
      onSwipeStart: handleSwipeStart,
      onSwipeEnd: handleSwipeEnd,
    },
    {
      threshold: 50,
      velocity: 0.3,
      preventDefault: true,
    }
  );

  // Get action for direction
  const getActionForDirection = (direction: SwipeDirection) => {
    return actions.find(a => a.direction === direction);
  };

  // Render action indicator
  const renderActionIndicator = (direction: SwipeDirection, position: string) => {
    const action = getActionForDirection(direction);
    if (!action) return null;

    const isActive = activeAction?.direction === direction;

    return (
      <div
        className={`absolute ${position} top-1/2 transform -translate-y-1/2 transition-all duration-200 ${
          isActive ? 'opacity-100 scale-110' : 'opacity-0 scale-90'
        }`}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${action.color}`}
        >
          <span className="text-lg">{action.icon}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden transition-transform duration-200 ${
        activeAction ? 'scale-[0.98]' : 'scale-100'
      } ${className}`}
      {...swipeHandlers}
    >
      {/* Left action indicator */}
      {renderActionIndicator('right', 'left-4')}

      {/* Right action indicator */}
      {renderActionIndicator('left', 'right-4')}

      {/* Top action indicator */}
      {renderActionIndicator('down', 'top-4 left-1/2 transform -translate-x-1/2 -translate-y-1/2')}

      {/* Bottom action indicator */}
      {renderActionIndicator('up', 'bottom-4 left-1/2 transform -translate-x-1/2 translate-y-1/2')}

      {/* Card content */}
      <div
        className={`transition-all duration-200 ${
          activeAction ? 'brightness-90' : 'brightness-100'
        }`}
      >
        {children}
      </div>

      {/* Active action overlay */}
      {activeAction && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-black bg-opacity-10 transition-opacity duration-200" />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div
              className={`px-3 py-1 rounded-full text-white text-sm font-medium ${activeAction.color}`}
            >
              {activeAction.label}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Preset action configurations
export const SWIPE_ACTIONS = {
  favorite: {
    direction: 'right' as SwipeDirection,
    icon: '⭐',
    label: 'Favorite',
    color: 'bg-yellow-500',
  },
  delete: {
    direction: 'left' as SwipeDirection,
    icon: '🗑️',
    label: 'Delete',
    color: 'bg-red-500',
  },
  share: {
    direction: 'up' as SwipeDirection,
    icon: '📤',
    label: 'Share',
    color: 'bg-blue-500',
  },
  archive: {
    direction: 'down' as SwipeDirection,
    icon: '📁',
    label: 'Archive',
    color: 'bg-gray-500',
  },
} as const;
