import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Subscription price IDs - these will be created in Stripe Dashboard
export const PRICE_IDS = {
  premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
  premium_yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly',
  family_monthly: process.env.STRIPE_FAMILY_MONTHLY_PRICE_ID || 'price_family_monthly',
  family_yearly: process.env.STRIPE_FAMILY_YEARLY_PRICE_ID || 'price_family_yearly',
  chef_monthly: process.env.STRIPE_CHEF_MONTHLY_PRICE_ID || 'price_chef_monthly',
  chef_yearly: process.env.STRIPE_CHEF_YEARLY_PRICE_ID || 'price_chef_yearly',
} as const;

// Product metadata
export const SUBSCRIPTION_TIERS = {
  premium: {
    name: 'Premium',
    monthly: 9.99,
    yearly: 95.88,
    features: [
      'Unlimited AI recipes',
      '"What Should I Cook?" suggestions',
      'AI Nutritionist with health goals',
      'Advanced meal planning',
      'Recipe books with PDF export',
      'Nutrition analysis & reports',
      'Priority AI processing',
      'Advanced pantry analytics',
    ],
  },
  family: {
    name: 'Family',
    monthly: 19.99,
    yearly: 191.76,
    features: [
      'Everything in Premium',
      'Up to 6 family members',
      'Shared meal planning',
      'Family recipe collections',
      'Bulk shopping lists',
      'Child-friendly recipe filters',
      'Family nutrition tracking',
    ],
  },
  chef: {
    name: 'Chef',
    monthly: 39.99,
    yearly: 383.52,
    features: [
      'Everything in Family',
      'Advanced recipe customization',
      'Professional cooking techniques',
      'Inventory cost tracking',
      'Recipe scaling for events',
      'Cooking video tutorials',
      'Priority customer support',
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type PriceId = (typeof PRICE_IDS)[keyof typeof PRICE_IDS];

// Helper function to get price ID from tier and billing period
export function getPriceId(tier: SubscriptionTier, period: 'monthly' | 'yearly'): string {
  const key = `${tier}_${period}` as keyof typeof PRICE_IDS;
  return PRICE_IDS[key];
}

// Helper function to extract tier and period from price ID
export function parsePriceId(
  priceId: string
): { tier: SubscriptionTier; period: 'monthly' | 'yearly' } | null {
  const entry = Object.entries(PRICE_IDS).find(([, id]) => id === priceId);
  if (!entry) return null;

  const [key] = entry;
  const [tier, period] = key.split('_') as [SubscriptionTier, 'monthly' | 'yearly'];
  return { tier, period };
}
