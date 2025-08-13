import { NextApiRequest, NextApiResponse } from 'next';
import { SubscriptionService } from '../../../lib/services/subscriptionService';
import { createServerClient } from '@supabase/ssr';

interface CreatePortalSessionRequest {
  returnUrl?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { returnUrl }: CreatePortalSessionRequest = req.body;

    // Get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies[name];
          },
          set(name: string, value: string, options: any) {
            res.setHeader(
              'Set-Cookie',
              `${name}=${value}; ${Object.entries(options)
                .map(([k, v]) => `${k}=${v}`)
                .join('; ')}`
            );
          },
          remove(name: string, options: any) {
            res.setHeader(
              'Set-Cookie',
              `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${Object.entries(options)
                .map(([k, v]) => `${k}=${v}`)
                .join('; ')}`
            );
          },
        },
      }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const defaultReturnUrl = `${baseUrl}/dashboard/subscription`;

    const portalUrl = await SubscriptionService.createPortalSession(
      user.id,
      returnUrl || defaultReturnUrl
    );

    res.status(200).json({ url: portalUrl });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
