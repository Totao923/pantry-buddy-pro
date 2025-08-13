-- Simple workaround: Add Stripe columns without touching status constraint
-- This avoids the enum/constraint issue entirely

-- Add Stripe columns (safe approach)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Add a separate column for Stripe status (avoids enum conflicts)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_status TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions(trial_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_status ON public.subscriptions(stripe_status);

-- Unique constraint on stripe_customer_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id_unique 
ON public.subscriptions (stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Helper function that uses both status columns
CREATE OR REPLACE FUNCTION public.user_has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  user_status TEXT;
  user_stripe_status TEXT;
  period_end TIMESTAMPTZ;
BEGIN
  SELECT tier, status::TEXT, stripe_status, current_period_end 
  INTO user_tier, user_status, user_stripe_status, period_end
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
  
  -- Check Stripe status first (more accurate)
  IF user_stripe_status IS NOT NULL THEN
    IF user_stripe_status IN ('active', 'trialing') THEN
      IF period_end IS NULL OR period_end > NOW() THEN
        RETURN TRUE;
      END IF;
    END IF;
  ELSE
    -- Fallback to regular status
    IF user_status IN ('active', 'trialing', 'trial') THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get subscription data
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  tier TEXT,
  status TEXT,
  stripe_status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.tier,
    s.status::TEXT,
    s.stripe_status,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.current_period_end,
    s.trial_end,
    s.cancel_at_period_end
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO service_role;

-- Comments
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.subscriptions.stripe_status IS 'Stripe subscription status (active, past_due, trialing, etc.)';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'When current billing period ends';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Whether subscription cancels at period end';
COMMENT ON COLUMN public.subscriptions.trial_end IS 'When trial period ends';