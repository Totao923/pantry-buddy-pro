import type { AppProps } from 'next/app'
import { AuthProvider } from '../lib/auth/AuthProvider'
import { isAuthEnabled } from '../lib/config/environment'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  // Check if authentication is enabled
  const authEnabled = isAuthEnabled();

  if (authEnabled) {
    return (
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    );
  }

  // Fallback to non-authenticated mode
  return <Component {...pageProps} />;
}