import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Restrict access in production - this endpoint exposes internal service information
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables first
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isValidUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project');

    const supabase = createSupabaseClient();

    if (!supabase) {
      return res.status(200).json({
        status: 'demo_mode',
        message: 'Running in demo mode - Supabase credentials not found',
        debug: {
          hasUrl,
          hasKey,
          isValidUrl,
          urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        },
      });
    }

    // Test with a simple auth check first
    const { data: authData, error: authError } = await supabase.auth.getSession();

    if (authError) {
      return res.status(200).json({
        status: 'auth_error',
        message: 'Authentication service error',
        error: authError.message,
        debug: { hasUrl, hasKey, isValidUrl },
      });
    }

    // Test basic database connection
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);

    if (error) {
      return res.status(200).json({
        status: 'db_error',
        message: 'Database query failed',
        error: error.message,
        code: error.code,
        hint: error.hint || 'Tables may not exist yet',
        debug: { hasUrl, hasKey, isValidUrl },
      });
    }

    return res.status(200).json({
      status: 'connected',
      message: 'Database connection successful!',
      tableExists: true,
      debug: { hasUrl, hasKey, isValidUrl },
    });
  } catch (error: any) {
    return res.status(200).json({
      status: 'error',
      message: 'Connection test failed',
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });
  }
}
