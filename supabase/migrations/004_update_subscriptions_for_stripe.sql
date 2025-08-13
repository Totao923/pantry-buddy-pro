-- Update existing subscriptions table for Stripe integration
-- This migrates the existing subscriptions table to support Stripe

-- First, add the missing Stripe columns
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Update the status enum to match Stripe statuses
-- We need to be careful here since there might be existing data
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_status_check' 
    AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
  END IF;
  
  -- Add the new constraint with Stripe statuses
  ALTER TABLE public.subscriptions 
  ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'expired', 'trial'));
END $$;

-- Make stripe_customer_id NOT NULL after we populate it for existing users
-- For now, we'll leave it nullable and populate it when users upgrade

-- Create unique constraint on stripe_customer_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id_unique 
ON public.subscriptions (stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions(trial_end);

-- Update the get_user_subscription function to include new fields
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  tier TEXT,
  status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.tier,
    s.status,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.current_period_end,
    s.trial_end,
    s.cancel_at_period_end,
    s.start_date,
    s.end_date
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Add helpful function to check if user has premium features
CREATE OR REPLACE FUNCTION public.user_has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  user_status TEXT;
  period_end TIMESTAMPTZ;
BEGIN
  SELECT tier, status, current_period_end 
  INTO user_tier, user_status, period_end
  FROM public.subscriptions 
  WHERE user_id = p_user_id;
  
  -- If no subscription found, they're free tier
  IF user_tier IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Free tier doesn't have premium access
  IF user_tier = 'free' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if subscription is active or trialing
  IF user_status IN ('active', 'trialing') THEN
    -- If there's a period end, make sure we haven't passed it
    IF period_end IS NULL OR period_end > NOW() THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions on the new function
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO service_role;

-- Update comments
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID for billing (nullable for free users)';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'When the current billing period ends (from Stripe)';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN public.subscriptions.trial_end IS 'When the trial period ends, if applicable';

-- Add a helpful view for easy subscription checking
CREATE OR REPLACE VIEW public.user_subscription_status AS
SELECT 
  s.user_id,
  s.tier,
  s.status,
  s.stripe_customer_id IS NOT NULL as has_stripe_customer,
  s.stripe_subscription_id IS NOT NULL as has_active_stripe_subscription,
  public.user_has_premium_access(s.user_id) as has_premium_access,
  s.current_period_end,
  s.trial_end,
  s.cancel_at_period_end,
  CASE 
    WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW() THEN 'trial'
    WHEN s.status IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end > NOW()) THEN 'active'
    WHEN s.status = 'past_due' THEN 'past_due'
    WHEN s.status = 'canceled' THEN 'canceled'
    ELSE 'inactive'
  END as computed_status
FROM public.subscriptions s;

-- Grant access to the view
GRANT SELECT ON public.user_subscription_status TO authenticated;
GRANT SELECT ON public.user_subscription_status TO service_role;

-- Create RLS policy for the view
ALTER VIEW public.user_subscription_status SET (security_barrier = true);

-- Note: We're not dropping the old columns (start_date, end_date, etc.) to maintain backward compatibility
-- They can be removed in a future migration once we confirm everything is working