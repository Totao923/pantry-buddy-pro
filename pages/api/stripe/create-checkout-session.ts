import { NextApiRequest, NextApiResponse } from 'next';
import { SubscriptionService } from '../../../lib/services/subscriptionService';
import { SubscriptionTier } from '../../../lib/stripe/stripe';
import { createServerClient } from '@supabase/ssr';

interface CreateCheckoutSessionRequest {
  tier: SubscriptionTier;
  period: 'monthly' | 'yearly';
  returnUrl?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tier, period, returnUrl }: CreateCheckoutSessionRequest = req.body;

    if (!tier || !period) {
      return res.status(400).json({ error: 'Missing required parameters: tier and period' });
    }

    if (!['premium', 'family', 'chef'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    if (!['monthly', 'yearly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

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
    const successUrl = `${baseUrl}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = returnUrl || `${baseUrl}/dashboard/subscription?canceled=true`;

    const checkoutUrl = await SubscriptionService.createCheckoutSession(
      user.id,
      user.email!,
      tier,
      period,
      successUrl,
      cancelUrl,
      user.user_metadata?.name
    );

    res.status(200).json({ url: checkoutUrl });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
