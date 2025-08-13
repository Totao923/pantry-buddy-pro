-- Pantry Buddy Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'family', 'chef');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired', 'trial');
CREATE TYPE spice_level AS ENUM ('mild', 'medium', 'hot', 'extra-hot');
CREATE TYPE cooking_time AS ENUM ('quick', 'medium', 'slow');
CREATE TYPE budget_range AS ENUM ('low', 'medium', 'high');
CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE photo_type AS ENUM ('ingredient-prep', 'cooking-process', 'final-dish', 'step-by-step');

-- User profiles table (extends auth.users)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    subscription_tier subscription_tier DEFAULT 'free',
    total_recipes_cooked INTEGER DEFAULT 0,
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE public.user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    dietary_restrictions TEXT[] DEFAULT '{}',
    favorite_cuisines TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    spice_level spice_level DEFAULT 'medium',
    cooking_time cooking_time DEFAULT 'medium',
    serving_size INTEGER DEFAULT 4,
    budget_range budget_range DEFAULT 'medium',
    experience_level experience_level DEFAULT 'intermediate',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Pantry items table
CREATE TABLE public.pantry_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC,
    unit TEXT,
    expiry_date DATE,
    purchase_date DATE DEFAULT CURRENT_DATE,
    location TEXT,
    barcode TEXT,
    price NUMERIC(10,2),
    brand TEXT,
    is_running_low BOOLEAN DEFAULT FALSE,
    auto_reorder_level NUMERIC DEFAULT 0,
    last_used_date TIMESTAMP WITH TIME ZONE,
    usage_frequency INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table
CREATE TABLE public.recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cuisine TEXT NOT NULL,
    servings INTEGER NOT NULL DEFAULT 4,
    prep_time INTEGER NOT NULL DEFAULT 0,
    cook_time INTEGER NOT NULL DEFAULT 0,
    total_time INTEGER GENERATED ALWAYS AS (prep_time + cook_time) STORED,
    difficulty TEXT NOT NULL,
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    nutrition_info JSONB,
    dietary_info JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    rating NUMERIC(2,1) CHECK (rating >= 1 AND rating <= 5),
    reviews INTEGER DEFAULT 0,
    image_url TEXT,
    video_url TEXT,
    tips TEXT[],
    variations JSONB,
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_provider TEXT,
    ai_model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe ratings table
CREATE TABLE public.recipe_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    difficulty_accuracy INTEGER DEFAULT 3 CHECK (difficulty_accuracy >= 1 AND difficulty_accuracy <= 5),
    taste_rating INTEGER DEFAULT 3 CHECK (taste_rating >= 1 AND taste_rating <= 5),
    would_cook_again BOOLEAN DEFAULT TRUE,
    review_text TEXT,
    modifications TEXT[],
    cooking_tips TEXT[],
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, user_id)
);

-- Recipe photos table
CREATE TABLE public.recipe_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    caption TEXT,
    photo_type photo_type NOT NULL,
    step_number INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE public.usage_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recipe_generations INTEGER DEFAULT 0,
    pantry_items_used INTEGER DEFAULT 0,
    ai_requests INTEGER DEFAULT 0,
    ai_tokens_used INTEGER DEFAULT 0,
    ai_cost_cents INTEGER DEFAULT 0,
    premium_feature_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    tier subscription_tier DEFAULT 'free',
    status subscription_status DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_method TEXT,
    stripe_subscription_id TEXT,
    last_payment TIMESTAMP WITH TIME ZONE,
    next_payment TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- AI cache table
CREATE TABLE public.ai_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cache_key TEXT NOT NULL UNIQUE,
    prompt_hash TEXT NOT NULL,
    response_data JSONB NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping lists table
CREATE TABLE public.shopping_lists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Shopping List',
    items JSONB NOT NULL DEFAULT '[]',
    total_estimated_cost NUMERIC(10,2) DEFAULT 0,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with TEXT[],
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_pantry_items_user_id ON public.pantry_items(user_id);
CREATE INDEX idx_pantry_items_expiry ON public.pantry_items(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_pantry_items_category ON public.pantry_items(category);
CREATE INDEX idx_pantry_items_running_low ON public.pantry_items(user_id, is_running_low) WHERE is_running_low = TRUE;

CREATE INDEX idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX idx_recipes_cuisine ON public.recipes(cuisine);
CREATE INDEX idx_recipes_difficulty ON public.recipes(difficulty);
CREATE INDEX idx_recipes_ai_generated ON public.recipes(ai_generated);
CREATE INDEX idx_recipes_created_at ON public.recipes(created_at DESC);

CREATE INDEX idx_recipe_ratings_recipe_id ON public.recipe_ratings(recipe_id);
CREATE INDEX idx_recipe_ratings_user_id ON public.recipe_ratings(user_id);

CREATE INDEX idx_usage_tracking_user_date ON public.usage_tracking(user_id, date);
CREATE INDEX idx_ai_cache_key ON public.ai_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_cache(expires_at);

-- Cooking tracking indexes
CREATE INDEX idx_cooking_sessions_user_id ON public.cooking_sessions(user_id);
CREATE INDEX idx_cooking_sessions_recipe_id ON public.cooking_sessions(recipe_id);
CREATE INDEX idx_cooking_sessions_cooked_at ON public.cooking_sessions(cooked_at);
CREATE INDEX idx_cooking_sessions_rating ON public.cooking_sessions(rating);

CREATE INDEX idx_recipe_stats_times_cooked ON public.recipe_cooking_stats(total_times_cooked);
CREATE INDEX idx_recipe_stats_rating ON public.recipe_cooking_stats(average_rating);
CREATE INDEX idx_recipe_stats_last_cooked ON public.recipe_cooking_stats(last_cooked_at);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_cooking_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cooking_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User preferences: Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Pantry items: Users can manage their own pantry
CREATE POLICY "Users can manage own pantry items" ON public.pantry_items
    FOR ALL USING (auth.uid() = user_id);

-- Recipes: Users can manage their own recipes
CREATE POLICY "Users can manage own recipes" ON public.recipes
    FOR ALL USING (auth.uid() = user_id);

-- Recipe ratings: Users can manage their own ratings
CREATE POLICY "Users can manage own ratings" ON public.recipe_ratings
    FOR ALL USING (auth.uid() = user_id);

-- Recipe photos: Users can manage their own photos
CREATE POLICY "Users can manage own recipe photos" ON public.recipe_photos
    FOR ALL USING (auth.uid() = user_id);

-- Usage tracking: Users can view their own usage
CREATE POLICY "Users can view own usage tracking" ON public.usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage tracking" ON public.usage_tracking
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update usage tracking" ON public.usage_tracking
    FOR UPDATE USING (true);

-- Subscriptions: Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON public.subscriptions
    FOR ALL USING (true);

-- AI cache: Users can access cached responses
CREATE POLICY "Users can access own cached responses" ON public.ai_cache
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can manage ai cache" ON public.ai_cache
    FOR ALL USING (true);

-- Shopping lists: Users can manage their own lists
CREATE POLICY "Users can manage own shopping lists" ON public.shopping_lists
    FOR ALL USING (auth.uid() = user_id);

-- Cooking sessions: Users can manage their own cooking sessions
CREATE POLICY "Users can view own cooking sessions" ON public.cooking_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cooking sessions" ON public.cooking_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cooking sessions" ON public.cooking_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cooking sessions" ON public.cooking_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Recipe stats: Publicly readable, system managed
CREATE POLICY "Recipe stats are publicly readable" ON public.recipe_cooking_stats
    FOR SELECT USING (true);

-- User cooking preferences: Users can manage their own preferences
CREATE POLICY "Users can view own cooking preferences" ON public.user_cooking_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cooking preferences" ON public.user_cooking_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cooking preferences" ON public.user_cooking_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Cooking Sessions table (from migration 007)
CREATE TABLE public.cooking_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    recipe_id TEXT NOT NULL,
    recipe_title TEXT NOT NULL,
    recipe_data JSONB,
    cooked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional user feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    cooking_notes TEXT,
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    cook_time_actual INTEGER,
    
    -- Success indicators
    would_cook_again BOOLEAN,
    recipe_followed_exactly BOOLEAN DEFAULT TRUE,
    modifications_made TEXT,
    
    -- Additional metadata
    cooking_method TEXT,
    servings_made INTEGER,
    photo_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe cooking stats table
CREATE TABLE public.recipe_cooking_stats (
    recipe_id TEXT PRIMARY KEY,
    recipe_title TEXT NOT NULL,
    
    -- Cooking frequency stats
    total_times_cooked INTEGER DEFAULT 0,
    unique_users_cooked INTEGER DEFAULT 0,
    last_cooked_at TIMESTAMP WITH TIME ZONE,
    first_cooked_at TIMESTAMP WITH TIME ZONE,
    
    -- Rating aggregations
    average_rating DECIMAL(3,2),
    total_ratings INTEGER DEFAULT 0,
    average_difficulty DECIMAL(3,2),
    
    -- Success metrics
    success_rate DECIMAL(5,2),
    exact_follow_rate DECIMAL(5,2),
    
    -- Time tracking
    average_cook_time INTEGER,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User cooking preferences table
CREATE TABLE public.user_cooking_preferences (
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- Cooking frequency
    total_recipes_cooked INTEGER DEFAULT 0,
    cooking_streak_current INTEGER DEFAULT 0,
    cooking_streak_longest INTEGER DEFAULT 0,
    last_cooked_at TIMESTAMP WITH TIME ZONE,
    first_cooked_at TIMESTAMP WITH TIME ZONE,
    
    -- Preferences derived from cooking history
    favorite_cuisines TEXT[],
    preferred_cook_times INTEGER[],
    preferred_difficulty INTEGER,
    
    -- Cooking patterns
    most_active_cooking_day TEXT,
    most_active_cooking_hour INTEGER,
    
    -- Success patterns
    average_rating_given DECIMAL(3,2),
    recipe_completion_rate DECIMAL(5,2),
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Functions

-- Function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    INSERT INTO public.subscriptions (user_id, tier, status)
    VALUES (NEW.id, 'free', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pantry_items_updated_at
    BEFORE UPDATE ON public.pantry_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON public.recipes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipe_ratings_updated_at
    BEFORE UPDATE ON public.recipe_ratings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at
    BEFORE UPDATE ON public.shopping_lists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cooking_sessions_updated_at
    BEFORE UPDATE ON public.cooking_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_cooking_preferences_updated_at
    BEFORE UPDATE ON public.user_cooking_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.ai_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user subscription features
CREATE OR REPLACE FUNCTION public.get_subscription_features(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    user_tier subscription_tier;
    features JSONB;
BEGIN
    SELECT tier INTO user_tier
    FROM public.subscriptions
    WHERE user_id = user_uuid AND status = 'active';
    
    IF user_tier IS NULL THEN
        user_tier := 'free';
    END IF;
    
    features := CASE user_tier
        WHEN 'free' THEN jsonb_build_object(
            'max_pantry_items', 50,
            'daily_recipe_generations', 5,
            'has_advanced_ai', false,
            'has_nutrition_tracking', false,
            'has_meal_planning', false,
            'has_photo_uploads', false,
            'has_ad_free_experience', false,
            'max_family_members', 1
        )
        WHEN 'premium' THEN jsonb_build_object(
            'max_pantry_items', 500,
            'daily_recipe_generations', 50,
            'has_advanced_ai', true,
            'has_nutrition_tracking', true,
            'has_meal_planning', true,
            'has_photo_uploads', true,
            'has_ad_free_experience', true,
            'max_family_members', 1
        )
        WHEN 'family' THEN jsonb_build_object(
            'max_pantry_items', 1000,
            'daily_recipe_generations', 100,
            'has_advanced_ai', true,
            'has_nutrition_tracking', true,
            'has_meal_planning', true,
            'has_photo_uploads', true,
            'has_ad_free_experience', true,
            'max_family_members', 6
        )
        WHEN 'chef' THEN jsonb_build_object(
            'max_pantry_items', -1,
            'daily_recipe_generations', -1,
            'has_advanced_ai', true,
            'has_nutrition_tracking', true,
            'has_meal_planning', true,
            'has_photo_uploads', true,
            'has_ad_free_experience', true,
            'max_family_members', -1
        )
    END;
    
    RETURN features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functions to update cooking statistics
CREATE OR REPLACE FUNCTION public.update_recipe_cooking_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert recipe cooking stats
    INSERT INTO public.recipe_cooking_stats (
        recipe_id,
        recipe_title,
        total_times_cooked,
        unique_users_cooked,
        last_cooked_at,
        first_cooked_at,
        average_rating,
        total_ratings,
        average_difficulty,
        success_rate,
        exact_follow_rate,
        average_cook_time
    )
    SELECT 
        NEW.recipe_id,
        NEW.recipe_title,
        COUNT(*) as total_times_cooked,
        COUNT(DISTINCT user_id) as unique_users_cooked,
        MAX(cooked_at) as last_cooked_at,
        MIN(cooked_at) as first_cooked_at,
        AVG(rating) as average_rating,
        COUNT(*) FILTER (WHERE rating IS NOT NULL) as total_ratings,
        AVG(difficulty_rating) as average_difficulty,
        AVG(CASE WHEN would_cook_again THEN 100.0 ELSE 0.0 END) as success_rate,
        AVG(CASE WHEN recipe_followed_exactly THEN 100.0 ELSE 0.0 END) as exact_follow_rate,
        AVG(cook_time_actual) as average_cook_time
    FROM public.cooking_sessions 
    WHERE recipe_id = NEW.recipe_id
    ON CONFLICT (recipe_id) DO UPDATE SET
        total_times_cooked = EXCLUDED.total_times_cooked,
        unique_users_cooked = EXCLUDED.unique_users_cooked,
        last_cooked_at = EXCLUDED.last_cooked_at,
        first_cooked_at = EXCLUDED.first_cooked_at,
        average_rating = EXCLUDED.average_rating,
        total_ratings = EXCLUDED.total_ratings,
        average_difficulty = EXCLUDED.average_difficulty,
        success_rate = EXCLUDED.success_rate,
        exact_follow_rate = EXCLUDED.exact_follow_rate,
        average_cook_time = EXCLUDED.average_cook_time,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update recipe stats when cooking session is added
CREATE TRIGGER trigger_update_recipe_cooking_stats
    AFTER INSERT OR UPDATE ON public.cooking_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_recipe_cooking_stats();

-- Function to update user cooking preferences
CREATE OR REPLACE FUNCTION public.update_user_cooking_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user cooking preferences
    INSERT INTO public.user_cooking_preferences (
        user_id,
        total_recipes_cooked,
        last_cooked_at,
        first_cooked_at,
        average_rating_given
    )
    SELECT 
        NEW.user_id,
        COUNT(*) as total_recipes_cooked,
        MAX(cooked_at) as last_cooked_at,
        MIN(cooked_at) as first_cooked_at,
        AVG(rating) as average_rating_given
    FROM public.cooking_sessions 
    WHERE user_id = NEW.user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_recipes_cooked = EXCLUDED.total_recipes_cooked,
        last_cooked_at = EXCLUDED.last_cooked_at,
        first_cooked_at = GREATEST(public.user_cooking_preferences.first_cooked_at, EXCLUDED.first_cooked_at),
        average_rating_given = EXCLUDED.average_rating_given,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user preferences when cooking session is added
CREATE TRIGGER trigger_update_user_cooking_preferences
    AFTER INSERT OR UPDATE ON public.cooking_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_cooking_preferences();