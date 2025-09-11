import React, { createContext, useContext, useState, useCallback } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useRouter } from 'next/router';

interface PullToRefreshContextType {
  triggerRefresh: () => void;
  setRefreshHandler: (handler: () => Promise<void> | void) => void;
  isRefreshing: boolean;
  pullToRefresh: ReturnType<typeof usePullToRefresh>;
}

const PullToRefreshContext = createContext<PullToRefreshContextType | null>(null);

export const usePullToRefreshContext = () => {
  const context = useContext(PullToRefreshContext);
  if (!context) {
    throw new Error('usePullToRefreshContext must be used within PullToRefreshProvider');
  }
  return context;
};

interface PullToRefreshProviderProps {
  children: React.ReactNode;
}

export const PullToRefreshProvider: React.FC<PullToRefreshProviderProps> = ({ children }) => {
  const router = useRouter();
  const [refreshHandler, setRefreshHandler] = useState<(() => Promise<void> | void) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGlobalRefresh = useCallback(async () => {
    console.log('Global refresh triggered for:', router.pathname);
    setIsRefreshing(true);

    try {
      if (refreshHandler) {
        await refreshHandler();
      } else {
        // Default behavior: reload current page
        console.log('No custom refresh handler, reloading page');

        // Simulate refresh delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));

        // Reload the current page to refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error during global refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshHandler, router.pathname]);

  const pullToRefresh = usePullToRefresh(handleGlobalRefresh, {
    threshold: 80,
    resistance: 2.5,
    enabled: false,
  });

  const triggerRefresh = useCallback(() => {
    pullToRefresh.triggerRefresh();
  }, [pullToRefresh]);

  const setCustomRefreshHandler = useCallback((handler: () => Promise<void> | void) => {
    setRefreshHandler(handler);
  }, []);

  const value = {
    triggerRefresh,
    setRefreshHandler: setCustomRefreshHandler,
    isRefreshing: isRefreshing || pullToRefresh.isRefreshing,
    pullToRefresh,
  };

  return <PullToRefreshContext.Provider value={value}>{children}</PullToRefreshContext.Provider>;
};
