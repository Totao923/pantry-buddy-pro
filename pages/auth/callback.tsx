import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '../../lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createSupabaseClient();

        // Handle the auth callback
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        // Check for URL parameters to understand the auth flow
        const { type, access_token, refresh_token } = router.query;

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
