import { useRef, useCallback } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeConfig {
  threshold?: number; // Minimum distance for swipe (default: 50px)
  velocity?: number; // Minimum velocity for swipe (default: 0.3)
  preventDefault?: boolean; // Prevent default touch behavior
}

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (direction: SwipeDirection) => void;
  onSwipeEnd?: (direction: SwipeDirection | null) => void;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export const useSwipeGesture = (handlers: SwipeHandlers, config: SwipeConfig = {}) => {
  const { threshold = 50, velocity = 0.3, preventDefault = true } = config;

  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);
  const swipeInProgress = useRef<SwipeDirection | null>(null);

  const getSwipeDirection = useCallback(
    (start: TouchPosition, end: TouchPosition): SwipeDirection | null => {
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const deltaTime = end.time - start.time;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const swipeVelocity = distance / deltaTime;

      // Check if swipe meets threshold and velocity requirements
      if (distance < threshold || swipeVelocity < velocity) {
        return null;
      }

      // Determine direction based on largest delta
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'right' : 'left';
      } else {
        return deltaY > 0 ? 'down' : 'up';
      }
    },
    [threshold, velocity]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (preventDefault) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      touchEnd.current = null;
      swipeInProgress.current = null;
    },
    [preventDefault]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchStart.current) return;

      if (preventDefault) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      const currentPosition = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      const direction = getSwipeDirection(touchStart.current, currentPosition);

      // Trigger swipe start only once per gesture
      if (direction && !swipeInProgress.current) {
        swipeInProgress.current = direction;
        handlers.onSwipeStart?.(direction);
      }
    },
    [preventDefault, getSwipeDirection, handlers]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchStart.current) return;

      if (preventDefault) {
        e.preventDefault();
      }

      const touch = e.changedTouches[0];
      touchEnd.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      const direction = getSwipeDirection(touchStart.current, touchEnd.current);

      if (direction) {
        // Execute the appropriate handler
        switch (direction) {
          case 'left':
            handlers.onSwipeLeft?.();
            break;
          case 'right':
            handlers.onSwipeRight?.();
            break;
          case 'up':
            handlers.onSwipeUp?.();
            break;
          case 'down':
            handlers.onSwipeDown?.();
            break;
        }
      }

      handlers.onSwipeEnd?.(direction);

      // Reset state
      touchStart.current = null;
      touchEnd.current = null;
      swipeInProgress.current = null;
    },
    [preventDefault, getSwipeDirection, handlers]
  );

  // Return touch event handlers for attaching to elements
  const swipeHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return swipeHandlers;
};
