import { stripe, getPriceId, parsePriceId, SubscriptionTier } from '../stripe/stripe';
import { createSupabaseClient } from '../supabase/client';
import Stripe from 'stripe';

// Get Supabase client
const supabase = createSupabaseClient();

export interface SubscriptionData {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  tier: 'free' | 'premium' | 'family' | 'chef';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export class SubscriptionService {
  static async createCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          user_id: userId,
        },
        name,
      });

      // Save customer ID to Supabase
      const { error } = await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          stripe_customer_id: customer.id,
          tier: 'free',
          status: 'active',
        },
        {
          onConflict: 'user_id',
        }
      );

      if (error) {
        console.error('Error saving customer to database:', error);
        throw new Error('Failed to save customer data');
      }

      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  static async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      // Check if customer already exists in our database
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (subscription?.stripe_customer_id) {
        // Verify customer exists in Stripe
        try {
          await stripe.customers.retrieve(subscription.stripe_customer_id);
          return subscription.stripe_customer_id;
        } catch (error) {
          // Customer doesn't exist in Stripe, create new one
          console.warn('Customer not found in Stripe, creating new one');
        }
      }

      // Create new customer
      return await this.createCustomer(userId, email, name);
    } catch (error) {
      console.error('Error getting or creating customer:', error);
      throw new Error('Failed to get or create customer');
    }
  }

  static async createCheckoutSession(
    userId: string,
    email: string,
    tier: SubscriptionTier,
    period: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string,
    name?: string
  ): Promise<string> {
    try {
      const customerId = await this.getOrCreateCustomer(userId, email, name);
      const priceId = getPriceId(tier, period);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        metadata: {
          user_id: userId,
          tier,
          period,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            tier,
            period,
          },
          trial_period_days: tier === 'premium' ? 7 : 0, // 7-day trial for premium
        },
      });

      if (!session.url) {
        throw new Error('Failed to create checkout session URL');
      }

      return session.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  static async createPortalSession(userId: string, returnUrl: string): Promise<string> {
    try {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (!subscription?.stripe_customer_id) {
        throw new Error('No customer found');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
      });

      return session.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error('Failed to create portal session');
    }
  }

  static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata.user_id;
      if (!userId) {
        console.error('No user_id in subscription metadata');
        return;
      }

      const priceId = subscription.items.data[0]?.price.id;
      const tierInfo = priceId ? parsePriceId(priceId) : null;

      const subscriptionData = {
        user_id: userId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        tier: tierInfo?.tier || 'free',
        stripe_status: subscription.status, // Use stripe_status for Stripe statuses
        status: 'active', // Keep original status as 'active' to avoid enum conflicts
        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancel_at_period_end: (subscription as any).cancel_at_period_end,
        trial_end: (subscription as any).trial_end
          ? new Date((subscription as any).trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('subscriptions').upsert(subscriptionData, {
        onConflict: 'user_id',
      });

      if (error) {
        console.error('Error updating subscription in database:', error);
        throw error;
      }

      console.log(`Subscription updated for user ${userId}`);
    } catch (error) {
      console.error('Error handling subscription update:', error);
      throw error;
    }
  }

  static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata.user_id;
      if (!userId) {
        console.error('No user_id in subscription metadata');
        return;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          stripe_subscription_id: null,
          tier: 'free',
          stripe_status: 'canceled', // Use stripe_status instead of status
          status: 'active', // Keep original status to avoid enum conflicts
          current_period_end: null,
          cancel_at_period_end: false,
          trial_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error canceling subscription in database:', error);
        throw error;
      }

      console.log(`Subscription canceled for user ${userId}`);
    } catch (error) {
      console.error('Error handling subscription deletion:', error);
      throw error;
    }
  }

  static async getUserSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found"
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  }

  static async isFeatureAvailable(userId: string, feature: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription || subscription.tier === 'free') {
        // Check free tier limits
        return this.checkFreeTierLimits(userId, feature);
      }

      // Premium features are available for all paid tiers
      // Check both stripe_status and regular status for compatibility
      const effectiveStatus = (subscription as any).stripe_status || subscription.status;
      if (effectiveStatus === 'active' || effectiveStatus === 'trialing') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking feature availability:', error);
      return false;
    }
  }

  private static async checkFreeTierLimits(userId: string, feature: string): Promise<boolean> {
    // Implement free tier limits logic here
    // For now, allow basic features
    const freeTierFeatures = [
      'basic_recipe_generation',
      'pantry_management',
      'simple_meal_planning',
    ];

    return freeTierFeatures.includes(feature);
  }
}
