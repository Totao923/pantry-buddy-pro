import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '../../lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createSupabaseClient();

        // Check for error parameters first (Supabase sends these when links expire or fail)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlParams = new URLSearchParams(window.location.search.substring(1));

        const errorCode = hashParams.get('error_code') || urlParams.get('error_code');
        const errorDescription =
          hashParams.get('error_description') || urlParams.get('error_description');

        // Handle Supabase errors in URL
        if (errorCode) {
          console.error('Auth callback error from URL:', { errorCode, errorDescription });

          // Provide user-friendly error messages
          let friendlyMessage = 'Authentication failed. Please try again.';

          if (errorCode === 'otp_expired') {
            friendlyMessage =
              'This confirmation link has expired. Please sign up again to receive a new link.';
          } else if (errorCode === 'access_denied') {
            friendlyMessage = 'Access denied. Please check your email and try again.';
          } else if (errorDescription) {
            friendlyMessage = errorDescription.replace(/\+/g, ' ');
          }

          router.push(`/?auth=error&message=${encodeURIComponent(friendlyMessage)}`);
          return;
        }

        // First, try to exchange the URL hash for a session (for email confirmations)
        const { data, error } = await supabase.auth.getSession();

        // If no session from getSession, try exchanging URL parameters
        if (!data?.session && !error) {
          // Check for access token in URL hash (email confirmation flow)
          const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
          const tokenType = hashParams.get('token_type') || urlParams.get('token_type');
          const type = hashParams.get('type') || urlParams.get('type');

          console.log('Auth callback URL params:', {
            type,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            tokenType,
            hash: window.location.hash,
            search: window.location.search,
          });

          if (accessToken && refreshToken) {
            // Set the session with the tokens from the URL
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Error setting session:', sessionError);
              router.push(`/?auth=error&message=${encodeURIComponent(sessionError.message)}`);
              return;
            }

            // Successfully confirmed email and created session
            console.log('Email confirmation successful, session created');
            router.push('/dashboard?welcome=true&confirmed=true');
            return;
          }
        }

        const session = data?.session;
        const { type } = router.query;

        console.log('Auth callback:', { type, hasSession: !!session, error });

        if (error) {
          console.error('Auth callback error:', error);
          // Redirect to home with specific error message
          router.push(`/?auth=error&message=${encodeURIComponent(error.message)}`);
          return;
        }

        // Handle different auth flow types
        if (type === 'signup' || type === 'invite') {
          // Email confirmation successful
          router.push('/dashboard?welcome=true');
        } else if (type === 'recovery') {
          // Password reset flow
          router.push('/dashboard/settings?reset=true');
        } else if (session) {
          // Regular auth flow with active session
          router.push('/dashboard');
        } else {
          // No session but no error - likely email not confirmed yet
          router.push('/?auth=check-email');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.push('/?auth=error');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
