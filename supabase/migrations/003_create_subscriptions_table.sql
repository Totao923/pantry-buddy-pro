-- Create subscriptions table for managing user subscription data
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'family', 'chef')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON public.subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Users can only see their own subscription data
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own subscription data (for customer portal)
CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert/update/delete any subscription (for webhooks)
CREATE POLICY "Service role can manage all subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user subscription with caching
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  tier TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.tier,
    s.status,
    s.current_period_end,
    s.trial_end,
    s.cancel_at_period_end
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription(UUID) TO service_role;

-- Comment on table
COMMENT ON TABLE public.subscriptions IS 'User subscription and billing information managed by Stripe';
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe subscription ID, null for free tier';
COMMENT ON COLUMN public.subscriptions.tier IS 'Subscription tier: free, premium, family, or chef';
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status from Stripe';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'When the current billing period ends';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN public.subscriptions.trial_end IS 'When the trial period ends, if applicable';