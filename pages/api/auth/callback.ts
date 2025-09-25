import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, error } = req.query;

    if (error) {
      console.error('Auth callback error:', error);
      return res.redirect(`/?auth=error&message=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      return res.redirect('/?auth=error&message=No+authorization+code+provided');
    }

    const supabase = createServerSupabaseClient();

    // Exchange the code for a session
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(
      code as string
    );

    if (sessionError) {
      console.error('Error exchanging code for session:', sessionError);
      return res.redirect(`/?auth=error&message=${encodeURIComponent(sessionError.message)}`);
    }

    // Set session cookies
    if (data?.session) {
      const { access_token, refresh_token } = data.session;

      // Set secure cookies for the session
      res.setHeader('Set-Cookie', [
        `sb-access-token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`, // 7 days
        `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`, // 30 days
      ]);
    }

    // Successful email confirmation - redirect to dashboard
    console.log('Email confirmation successful via API route');
    return res.redirect('/dashboard?welcome=true&confirmed=true');
  } catch (error) {
    console.error('Error in auth callback API:', error);
    return res.redirect('/?auth=error&message=Authentication+failed');
  }
}
