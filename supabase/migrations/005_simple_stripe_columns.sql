-- Simple migration to add Stripe columns to existing subscriptions table
-- Run this if the automated constraint detection fails

-- Add missing columns for Stripe integration
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions(trial_end);

-- Create unique constraint on stripe_customer_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id_unique 
ON public.subscriptions (stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Create helper function for premium access
CREATE OR REPLACE FUNCTION public.user_has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  user_status TEXT;
BEGIN
  SELECT tier, status INTO user_tier, user_status
  FROM public.subscriptions 
  WHERE user_id = p_user_id;
  
  -- If no subscription or free tier, no premium access
  IF user_tier IS NULL OR user_tier = 'free' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if subscription is active
  IF user_status IN ('active', 'trialing', 'trial') THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO service_role;

-- Add comments
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'When the current billing period ends';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN public.subscriptions.trial_end IS 'When trial period ends';