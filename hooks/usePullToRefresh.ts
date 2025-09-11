import { useRef, useCallback, useState, useEffect } from 'react';

export interface PullToRefreshConfig {
  threshold?: number; // Distance to trigger refresh (default: 80px)
  resistance?: number; // Pull resistance factor (default: 2.5)
  refreshTimeout?: number; // Auto-hide refresh after timeout (default: 3000ms)
  enabled?: boolean; // Enable/disable pull to refresh
}

export interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

export const usePullToRefresh = (
  onRefresh: () => Promise<void> | void,
  config: PullToRefreshConfig = {}
) => {
  const { threshold = 80, resistance = 2.5, refreshTimeout = 3000, enabled = true } = config;

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false,
  });

  const touchStart = useRef<{ y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect if running as PWA in standalone mode
  const isPWAStandalone = useCallback(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }, []);

  // Check if container is at the top (can pull to refresh)
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop === 0;
  }, []);

  // Calculate pull distance with resistance
  const calculatePullDistance = useCallback(
    (rawDistance: number) => {
      return Math.max(0, rawDistance / resistance);
    },
    [resistance]
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isAtTop()) return;

      touchStart.current = {
        y: e.touches[0].clientY,
        time: Date.now(),
      };

      setState(prev => ({ ...prev, isPulling: false, pullDistance: 0 }));

      // In PWA standalone mode, be more aggressive about preventing default
      if (isPWAStandalone()) {
        e.preventDefault();
      }
    },
    [enabled, isAtTop, isPWAStandalone]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStart.current || !isAtTop()) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStart.current.y;

      // Only handle downward pulls
      if (deltaY <= 0) return;

      // In PWA mode, prevent default more aggressively
      if (isPWAStandalone() || deltaY > 5) {
        e.preventDefault();
      }

      // Prevent default scrolling when pulling down
      if (deltaY > 10) {
        e.preventDefault();
      }

      const pullDistance = calculatePullDistance(deltaY);
      const canRefresh = pullDistance >= threshold;

      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance,
        canRefresh,
      }));
    },
    [enabled, isAtTop, calculatePullDistance, threshold, isPWAStandalone]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !touchStart.current) return;

    const { canRefresh, isPulling } = state;

    if (isPulling && canRefresh) {
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false,
        pullDistance: threshold,
      }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }

      // Auto-hide refresh indicator after timeout
      refreshTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          canRefresh: false,
        }));
      }, refreshTimeout);
    } else {
      // Reset state if refresh not triggered
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false,
      }));
    }

    touchStart.current = null;
  }, [enabled, state, onRefresh, threshold, refreshTimeout]);

  // Manual refresh trigger
  const triggerRefresh = useCallback(async () => {
    if (!enabled || state.isRefreshing) return;

    setState(prev => ({
      ...prev,
      isRefreshing: true,
      pullDistance: threshold,
    }));

    try {
      await onRefresh();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        pullDistance: 0,
        canRefresh: false,
      }));
    }, refreshTimeout);
  }, [enabled, state.isRefreshing, onRefresh, threshold, refreshTimeout]);

  // Set container ref for scroll detection
  const setContainerRef = useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Attach event listeners to container
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // In PWA standalone mode, use non-passive events for better control
    const eventOptions = {
      passive: !isPWAStandalone(),
    };

    container.addEventListener('touchstart', handleTouchStart, eventOptions);
    container.addEventListener('touchmove', handleTouchMove, eventOptions);
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, isPWAStandalone]);

  // Calculate refresh indicator styles
  const getRefreshStyles = useCallback(() => {
    const { pullDistance, isRefreshing } = state;
    const displayDistance = isRefreshing ? threshold : pullDistance;

    return {
      transform: `translateY(${displayDistance}px)`,
      opacity: displayDistance > 0 ? Math.min(displayDistance / threshold, 1) : 0,
      transition: state.isPulling ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
    };
  }, [state, threshold]);

  // Get refresh indicator content based on state
  const getRefreshContent = useCallback(() => {
    const { isRefreshing, canRefresh, isPulling } = state;

    if (isRefreshing) {
      return {
        icon: '⟳',
        text: 'Refreshing...',
        spinning: true,
      };
    }

    if (isPulling && canRefresh) {
      return {
        icon: '↓',
        text: 'Release to refresh',
        spinning: false,
      };
    }

    if (isPulling) {
      return {
        icon: '↓',
        text: 'Pull to refresh',
        spinning: false,
      };
    }

    return {
      icon: '↓',
      text: 'Pull to refresh',
      spinning: false,
    };
  }, [state]);

  return {
    // State
    ...state,

    // Functions
    triggerRefresh,
    setContainerRef,

    // Styling helpers
    getRefreshStyles,
    getRefreshContent,

    // Configuration
    threshold,
    enabled,
  };
};
