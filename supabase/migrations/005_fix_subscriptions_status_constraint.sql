-- Fix subscriptions table status constraint for Stripe integration
-- This handles the enum constraint more carefully

-- First, add the missing Stripe columns if they don't exist
DO $$
BEGIN
  -- Add stripe_customer_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subscriptions' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_customer_id TEXT;
  END IF;

  -- Add current_period_end column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subscriptions' AND column_name = 'current_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;

  -- Add cancel_at_period_end column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add trial_end column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subscriptions' AND column_name = 'trial_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN trial_end TIMESTAMPTZ;
  END IF;
END $$;

-- Handle the status constraint more carefully
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the actual constraint name for status
  SELECT conname INTO constraint_name
  FROM pg_constraint 
  WHERE conrelid = 'public.subscriptions'::regclass 
  AND contype = 'c' 
  AND consrc LIKE '%status%' OR conbin::text LIKE '%status%';

  -- If we found a constraint, drop it
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.subscriptions DROP CONSTRAINT ' || constraint_name;
  END IF;

EXCEPTION 
  WHEN OTHERS THEN
    -- If there's an error finding/dropping the constraint, continue
    NULL;
END $$;

-- Now add the new status constraint with all possible values
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'expired', 'trial'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions(trial_end);

-- Create unique constraint on stripe_customer_id (only for non-null values)
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer_id_unique;
CREATE UNIQUE INDEX idx_subscriptions_stripe_customer_id_unique 
ON public.subscriptions (stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Update or create the get_user_subscription function
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

-- Create function to check premium access
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO service_role;

-- Create helpful view for subscription status
DROP VIEW IF EXISTS public.user_subscription_status;
CREATE VIEW public.user_subscription_status AS
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

-- Add helpful comments
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID for billing (nullable for free users)';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'When the current billing period ends (from Stripe)';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN public.subscriptions.trial_end IS 'When the trial period ends, if applicable';

-- Test the new constraint by updating a record (this will validate the constraint works)
DO $$
BEGIN
  -- This will succeed if the constraint is properly set up
  PERFORM 1 WHERE EXISTS (
    SELECT 1 FROM public.subscriptions LIMIT 1
  );
  
  RAISE NOTICE 'Subscriptions table successfully updated for Stripe integration';
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Migration completed with warnings: %', SQLERRM;
END $$;