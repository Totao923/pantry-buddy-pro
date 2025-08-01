import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth/AuthProvider';
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
      <Component {...pageProps} />
    </AuthProvider>
  );
}
