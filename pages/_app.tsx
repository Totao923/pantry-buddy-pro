import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth/AuthProvider';
import { IngredientsProvider } from '../contexts/IngredientsProvider';
import { HealthGoalProvider } from '../lib/contexts/HealthGoalContext';
import { ToastProvider } from '../components/ui/Toast';
import { PullToRefreshProvider } from '../contexts/PullToRefreshProvider';
import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  // Initialize Safari polyfills
  useEffect(() => {
    import('../lib/utils/safari-polyfill');
  }, []);

  // Always wrap in AuthProvider to avoid context errors
  return (
    <AuthProvider>
      <HealthGoalProvider>
        <IngredientsProvider>
          <ToastProvider>
            <PullToRefreshProvider>
              <Component {...pageProps} />
            </PullToRefreshProvider>
          </ToastProvider>
        </IngredientsProvider>
      </HealthGoalProvider>
    </AuthProvider>
  );
}
