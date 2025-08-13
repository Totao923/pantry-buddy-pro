-- Complete migration schema - adds missing tables for ALL localStorage usage
-- Run this in Supabase SQL Editor to add remaining tables

-- User settings table for UI preferences and app state
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, setting_key)
);

-- Receipt scanning history table
CREATE TABLE IF NOT EXISTS public.receipt_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    receipt_data JSONB NOT NULL,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    items_extracted INTEGER DEFAULT 0,
    total_amount NUMERIC(10,2),
    store_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barcode scanning history table  
CREATE TABLE IF NOT EXISTS public.barcode_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    barcode TEXT NOT NULL,
    product_name TEXT,
    product_data JSONB,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    added_to_pantry BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recent items table (for dashboard widgets)
CREATE TABLE IF NOT EXISTS public.recent_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL, -- 'recipe', 'ingredient', 'meal_plan', etc.
    item_id UUID NOT NULL,
    item_data JSONB NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auth rate limiting table (for security)
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    identifier TEXT NOT NULL, -- email or IP
    action_type TEXT NOT NULL, -- 'password_reset', 'login_attempt', etc.
    attempts INTEGER DEFAULT 1,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, action_type)
);

-- Migration tracking table
CREATE TABLE IF NOT EXISTS public.data_migrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    migration_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    data_migrated JSONB,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, migration_type)
);

-- Enable RLS on new tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_migrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

-- User settings: Users can manage their own settings
CREATE POLICY "Users can manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Receipt history: Users can manage their own receipts
CREATE POLICY "Users can manage own receipts" ON public.receipt_history
    FOR ALL USING (auth.uid() = user_id);

-- Barcode history: Users can manage their own barcode scans
CREATE POLICY "Users can manage own barcode history" ON public.barcode_history
    FOR ALL USING (auth.uid() = user_id);

-- Recent items: Users can manage their own recent items
CREATE POLICY "Users can manage own recent items" ON public.recent_items
    FOR ALL USING (auth.uid() = user_id);

-- Auth rate limits: System can manage, users can read their own
CREATE POLICY "System can manage auth rate limits" ON public.auth_rate_limits
    FOR ALL USING (true);

-- Data migrations: Users can view their own migrations
CREATE POLICY "Users can view own migrations" ON public.data_migrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage migrations" ON public.data_migrations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update migrations" ON public.data_migrations
    FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON public.user_settings(user_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_receipt_history_user_date ON public.receipt_history(user_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_barcode_history_user_date ON public.barcode_history(user_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_items_user_type_date ON public.recent_items(user_id, item_type, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON public.auth_rate_limits(identifier, action_type);
CREATE INDEX IF NOT EXISTS idx_data_migrations_user_type ON public.data_migrations(user_id, migration_type);

-- Update triggers for new tables
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Functions to manage user settings (key-value store)
CREATE OR REPLACE FUNCTION public.get_user_setting(
    user_uuid UUID,
    setting_key TEXT,
    default_value JSONB DEFAULT 'null'
)
RETURNS JSONB AS $$
DECLARE
    setting_value JSONB;
BEGIN
    SELECT us.setting_value INTO setting_value
    FROM public.user_settings us
    WHERE us.user_id = user_uuid AND us.setting_key = setting_key;
    
    RETURN COALESCE(setting_value, default_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_user_setting(
    user_uuid UUID,
    setting_key TEXT,
    setting_value JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_settings (user_id, setting_key, setting_value)
    VALUES (user_uuid, setting_key, setting_value)
    ON CONFLICT (user_id, setting_key)
    DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old recent items (keep last 50 per user per type)
CREATE OR REPLACE FUNCTION public.cleanup_recent_items()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH items_to_keep AS (
        SELECT id
        FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY user_id, item_type ORDER BY accessed_at DESC) as rn
            FROM public.recent_items
        ) ranked
        WHERE rn <= 50
    )
    DELETE FROM public.recent_items
    WHERE id NOT IN (SELECT id FROM items_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired auth rate limits
CREATE OR REPLACE FUNCTION public.cleanup_auth_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.auth_rate_limits WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.user_settings IS 'Key-value store for user UI preferences and app settings';
COMMENT ON TABLE public.receipt_history IS 'History of scanned receipts and extracted items';
COMMENT ON TABLE public.barcode_history IS 'History of scanned product barcodes';
COMMENT ON TABLE public.recent_items IS 'Recently accessed items for dashboard widgets';
COMMENT ON TABLE public.auth_rate_limits IS 'Rate limiting for authentication actions';
COMMENT ON TABLE public.data_migrations IS 'Tracking of data migration from localStorage to database';