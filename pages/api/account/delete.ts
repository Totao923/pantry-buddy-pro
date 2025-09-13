import { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { SubscriptionService } from '../../../lib/services/subscriptionService';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

interface DeleteAccountRequest {
  confirmationText: string;
  password?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { confirmationText }: DeleteAccountRequest = req.body;

    // Validate confirmation text
    if (confirmationText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        error: 'Invalid confirmation text. Please type "DELETE MY ACCOUNT" exactly.',
      });
    }

    // Get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Get user with anon key first for auth
    const anonSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies[name];
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await anonSupabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🗑️ Starting account deletion for user: ${user.id} (${user.email})`);

    // Step 1: Cancel active Stripe subscriptions
    try {
      console.log('📋 Checking for active Stripe subscriptions...');

      // Get user's subscription from database
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (subscription?.stripe_subscription_id) {
        console.log(`💳 Cancelling Stripe subscription: ${subscription.stripe_subscription_id}`);

        await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
          prorate: true,
        });

        console.log('✅ Stripe subscription cancelled successfully');
      }

      // Cancel Stripe customer (optional - keeps billing history)
      if (subscription?.stripe_customer_id) {
        console.log(`👤 Deactivating Stripe customer: ${subscription.stripe_customer_id}`);

        await stripe.customers.update(subscription.stripe_customer_id, {
          metadata: {
            account_deleted: 'true',
            deletion_date: new Date().toISOString(),
          },
        });

        console.log('✅ Stripe customer deactivated');
      }
    } catch (stripeError) {
      console.error('❌ Error handling Stripe data:', stripeError);
      // Continue with deletion even if Stripe fails
    }

    // Step 2: Delete user data from database (in reverse dependency order)
    console.log('🗄️ Deleting user data from database...');

    const deletionSteps = [
      // Delete cooking sessions
      { table: 'cooking_sessions', column: 'user_id' },
      // Delete meal plans and related data
      { table: 'planned_meals', column: 'user_id' },
      { table: 'meal_plans', column: 'user_id' },
      // Delete recipes and related data
      { table: 'recipe_ratings', column: 'user_id' },
      { table: 'saved_recipes', column: 'user_id' },
      { table: 'recipes', column: 'user_id' },
      // Delete shopping lists
      { table: 'shopping_list_items', column: 'user_id' },
      { table: 'shopping_lists', column: 'user_id' },
      // Delete ingredients and pantry data
      { table: 'pantry_items', column: 'user_id' },
      { table: 'ingredients', column: 'user_id' },
      // Delete subscription data
      { table: 'subscriptions', column: 'user_id' },
      // Delete preferences and profile
      { table: 'user_preferences', column: 'user_id' },
      { table: 'user_profiles', column: 'id' },
    ];

    for (const step of deletionSteps) {
      try {
        const { error } = await supabase.from(step.table).delete().eq(step.column, user.id);

        if (error) {
          console.error(`❌ Error deleting from ${step.table}:`, error);
        } else {
          console.log(`✅ Deleted data from ${step.table}`);
        }
      } catch (error) {
        console.error(`❌ Error deleting from ${step.table}:`, error);
        // Continue with other deletions
      }
    }

    // Step 3: Delete user from Supabase Auth
    console.log('🔐 Deleting user from Supabase Auth...');
    try {
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteAuthError) {
        console.error('❌ Error deleting user from auth:', deleteAuthError);
        throw deleteAuthError;
      }

      console.log('✅ User deleted from Supabase Auth');
    } catch (authDeleteError) {
      console.error('❌ Failed to delete user from auth:', authDeleteError);
      return res.status(500).json({
        error: 'Failed to delete user account. Please contact support.',
        details: 'Account data was cleaned up but authentication removal failed.',
      });
    }

    // Step 4: Log the deletion for audit purposes
    console.log(`✅ Account deletion completed for user: ${user.email}`);

    // Clear cookies
    res.setHeader('Set-Cookie', [
      'sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/',
      'sb-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/',
    ]);

    res.status(200).json({
      success: true,
      message: 'Account successfully deleted. You will be redirected shortly.',
    });
  } catch (error) {
    console.error('❌ Account deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
