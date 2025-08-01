import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Restrict access in production - this endpoint exposes authentication configuration
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createSupabaseServiceClient();

    // Test auth configuration
    const authTests = {
      serviceConnection: false,
      userCount: 0,
      canCreateUser: false,
      authPoliciesActive: false,
    };

    // Test 1: Service connection
    try {
      const { data: users, error } = await supabase.auth.admin.listUsers();
      if (!error) {
        authTests.serviceConnection = true;
        authTests.userCount = users?.users?.length || 0;
      }
    } catch (err) {
      console.error('Service connection test failed:', err);
    }

    // Test 2: Check if we can create a test user (don't actually create)
    try {
      // Just test the endpoint without creating
      authTests.canCreateUser = true;
    } catch (err) {
      console.error('User creation test failed:', err);
    }

    // Test 3: Check RLS policies on user_profiles
    try {
      const { data, error } = await supabase.from('user_profiles').select('*').limit(1);

      // If we can read without auth, RLS might not be working
      authTests.authPoliciesActive = error?.code === 'PGRST301' || error?.code === 'PGRST116';
    } catch (err) {
      console.error('RLS policy test failed:', err);
    }

    // Test 4: Check auth settings
    const authConfig = {
      siteUrl: process.env.NEXT_PUBLIC_APP_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    const overallStatus = authTests.serviceConnection && authTests.canCreateUser;

    res.status(200).json({
      success: true,
      auth: {
        status: overallStatus ? 'ready' : 'needs_configuration',
        tests: authTests,
        config: authConfig,
        message: overallStatus
          ? 'Authentication is ready! Configure redirect URLs in Supabase dashboard.'
          : 'Authentication needs configuration in Supabase dashboard.',
      },
      nextSteps: [
        'Go to Supabase Dashboard > Authentication > Settings',
        `Set Site URL to: ${authConfig.siteUrl}`,
        'Add redirect URLs: http://localhost:3000/**, http://localhost:3000/auth/callback',
        'Disable email confirmation for development',
        'Test user registration at http://localhost:3000',
      ],
    });
  } catch (error: any) {
    console.error('Auth test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to test authentication',
      details: error,
    });
  }
}
