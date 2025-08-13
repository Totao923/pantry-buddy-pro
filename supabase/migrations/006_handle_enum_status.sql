-- Handle ENUM status column for Stripe integration
-- This migration deals with PostgreSQL ENUMs properly

-- First, let's check what we're dealing with and add columns safely
DO $$
BEGIN
  -- Add stripe_customer_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subscriptions' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_customer_id TEXT;
  END IF;

  -- Add current_period_end column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subscriptions' AND column_name = 'current_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;

  -- Add cancel_at_period_end column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add trial_end column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'subscriptions' AND column_name = 'trial_end') THEN
    ALTER TABLE public.subscriptions ADD COLUMN trial_end TIMESTAMPTZ;
  END IF;

  RAISE NOTICE 'Added Stripe columns to subscriptions table';
END $$;

-- Handle the status column - check if it's an ENUM and update it accordingly
DO $$
DECLARE
  enum_name TEXT;
  column_type TEXT;
BEGIN
  -- Check what type the status column is
  SELECT data_type, udt_name INTO column_type, enum_name
  FROM information_schema.columns 
  WHERE table_name = 'subscriptions' 
  AND column_name = 'status';

  RAISE NOTICE 'Status column type: %, UDT: %', column_type, enum_name;

  -- If it's a USER-DEFINED type (ENUM), we need to handle it differently
  IF column_type = 'USER-DEFINED' THEN
    -- Check if the enum already has our new values
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = enum_name
      AND e.enumlabel = 'past_due'
    ) THEN
      -- Add new enum values
      ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';
      ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
      ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
      
      RAISE NOTICE 'Added new values to subscription_status enum';
    ELSE
      RAISE NOTICE 'Enum already contains new values';
    END IF;
  ELSE
    -- It's not an enum, try to handle as CHECK constraint
    RAISE NOTICE 'Status column is not an enum, treating as CHECK constraint';
    
    -- Remove existing CHECK constraint if any
    PERFORM 1 FROM pg_constraint 
    WHERE conrelid = 'public.subscriptions'::regclass 
    AND contype = 'c' 
    AND conname LIKE '%status%';
    
    IF FOUND THEN
      -- Find and drop the constraint
      EXECUTE (
        SELECT 'ALTER TABLE public.subscriptions DROP CONSTRAINT ' || conname
        FROM pg_constraint 
        WHERE conrelid = 'public.subscriptions'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%status%'
        LIMIT 1
      );
    END IF;
    
    -- Add new CHECK constraint
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_status_check 
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'expired', 'trial'));
  END IF;

EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update status constraint: %. Continuing with other changes.', SQLERRM;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions(trial_end);

-- Create unique constraint on stripe_customer_id
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer_id_unique;
CREATE UNIQUE INDEX idx_subscriptions_stripe_customer_id_unique 
ON public.subscriptions (stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Create or replace helper functions
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  tier TEXT,
  status TEXT,
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
    s.status::TEXT,  -- Cast to TEXT to handle both enum and varchar
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.current_period_end,
    s.trial_end,
    s.cancel_at_period_end
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create function to check premium access (handles both enum and text status)
CREATE OR REPLACE FUNCTION public.user_has_premium_access(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  user_status TEXT;
  period_end TIMESTAMPTZ;
BEGIN
  SELECT tier, status::TEXT, current_period_end 
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
  IF user_status IN ('active', 'trialing', 'trial') THEN
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

-- Add helpful comments
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID for billing (nullable for free users)';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'When the current billing period ends (from Stripe)';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN public.subscriptions.trial_end IS 'When the trial period ends, if applicable';

-- Create a view that safely handles status regardless of type
DROP VIEW IF EXISTS public.user_subscription_status;
CREATE VIEW public.user_subscription_status AS
SELECT 
  s.user_id,
  s.tier,
  s.status::TEXT as status,  -- Cast to handle both enum and text
  s.stripe_customer_id IS NOT NULL as has_stripe_customer,
  s.stripe_subscription_id IS NOT NULL as has_active_stripe_subscription,
  public.user_has_premium_access(s.user_id) as has_premium_access,
  s.current_period_end,
  s.trial_end,
  s.cancel_at_period_end,
  CASE 
    WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW() THEN 'trial'
    WHEN s.status::TEXT IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end > NOW()) THEN 'active'
    WHEN s.status::TEXT = 'past_due' THEN 'past_due'
    WHEN s.status::TEXT = 'canceled' THEN 'canceled'
    ELSE 'inactive'
  END as computed_status
FROM public.subscriptions s;

-- Grant access to the view
GRANT SELECT ON public.user_subscription_status TO authenticated;
GRANT SELECT ON public.user_subscription_status TO service_role;

-- Final check and notification
DO $$
BEGIN
  RAISE NOTICE 'Migration completed. Subscriptions table now has Stripe integration columns.';
  RAISE NOTICE 'Status column type handling completed (enum or check constraint).';
END $$;