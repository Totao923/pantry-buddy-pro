import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient } from '../../../lib/supabase/client';

/**
 * Temporary debug endpoint to manually upgrade user to premium
 * This simulates what webhooks should do automatically
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, tier = 'premium' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const supabase = createSupabaseClient();

    // Update or create subscription record
    const { data, error } = await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        stripe_customer_id: `cus_test_${Date.now()}`, // Temporary customer ID
        stripe_subscription_id: `sub_test_${Date.now()}`, // Temporary subscription ID
        tier: tier,
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        cancel_at_period_end: false,
        trial_end: null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database update failed', details: error.message });
    }

    console.log(`✅ User ${userId} upgraded to ${tier} tier`);

    return res.status(200).json({
      success: true,
      message: `User upgraded to ${tier}`,
      data,
    });
  } catch (error) {
    console.error('Upgrade user error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
