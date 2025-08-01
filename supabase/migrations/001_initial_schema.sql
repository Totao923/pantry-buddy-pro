-- Enable Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'family', 'chef')),
    total_recipes_cooked INTEGER NOT NULL DEFAULT 0,
    join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    dietary_restrictions TEXT[] DEFAULT '{}',
    favorite_cuisines TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    spice_level TEXT NOT NULL DEFAULT 'medium' CHECK (spice_level IN ('mild', 'medium', 'hot', 'extra-hot')),
    cooking_time TEXT NOT NULL DEFAULT 'medium' CHECK (cooking_time IN ('quick', 'medium', 'slow')),
    serving_size INTEGER NOT NULL DEFAULT 4,
    budget_range TEXT NOT NULL DEFAULT 'medium' CHECK (budget_range IN ('low', 'medium', 'high')),
    experience_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pantry_items table
CREATE TABLE pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('protein', 'vegetables', 'fruits', 'grains', 'dairy', 'spices', 'herbs', 'oils', 'pantry', 'other')),
    quantity DECIMAL,
    unit TEXT,
    expiry_date DATE,
    purchase_date DATE,
    location TEXT,
    barcode TEXT,
    price DECIMAL(10,2),
    brand TEXT,
    is_running_low BOOLEAN NOT NULL DEFAULT FALSE,
    auto_reorder_level DECIMAL,
    last_used_date DATE,
    usage_frequency INTEGER NOT NULL DEFAULT 0,
    nutritional_value INTEGER, -- calories per 100g
    is_protein BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegetarian BOOLEAN NOT NULL DEFAULT TRUE,
    is_vegan BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create recipes table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cuisine TEXT NOT NULL,
    servings INTEGER NOT NULL,
    prep_time INTEGER NOT NULL, -- minutes
    cook_time INTEGER NOT NULL, -- minutes
    total_time INTEGER NOT NULL, -- minutes
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    nutrition_info JSONB,
    dietary_info JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    rating DECIMAL(2,1) CHECK (rating >= 1 AND rating <= 5),
    reviews INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    video_url TEXT,
    tips TEXT[],
    variations JSONB,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    ai_provider TEXT,
    ai_model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create recipe_ratings table
CREATE TABLE recipe_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    difficulty_accuracy INTEGER CHECK (difficulty_accuracy >= 1 AND difficulty_accuracy <= 5),
    taste_rating INTEGER CHECK (taste_rating >= 1 AND taste_rating <= 5),
    would_cook_again BOOLEAN NOT NULL DEFAULT TRUE,
    review_text TEXT,
    modifications TEXT[],
    cooking_tips TEXT[],
    helpful_votes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(recipe_id, user_id)
);

-- Create recipe_photos table
CREATE TABLE recipe_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    caption TEXT,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('ingredient-prep', 'cooking-process', 'final-dish', 'step-by-step')),
    step_number INTEGER,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    recipe_generations INTEGER NOT NULL DEFAULT 0,
    pantry_items_used INTEGER NOT NULL DEFAULT 0,
    ai_requests INTEGER NOT NULL DEFAULT 0,
    ai_tokens_used INTEGER NOT NULL DEFAULT 0,
    ai_cost_cents INTEGER NOT NULL DEFAULT 0,
    premium_feature_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'family', 'chef')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    payment_method TEXT,
    stripe_subscription_id TEXT,
    last_payment TIMESTAMPTZ,
    next_payment TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ai_cache table
CREATE TABLE ai_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT NOT NULL UNIQUE,
    prompt_hash TEXT NOT NULL,
    response_data JSONB NOT NULL,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    cost_cents INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create shopping_lists table
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    total_estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    shared_with TEXT[],
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_pantry_items_user_id ON pantry_items(user_id);
CREATE INDEX idx_pantry_items_category ON pantry_items(category);
CREATE INDEX idx_pantry_items_expiry ON pantry_items(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_pantry_items_running_low ON pantry_items(user_id, is_running_low) WHERE is_running_low = TRUE;

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_total_time ON recipes(total_time);
CREATE INDEX idx_recipes_ai_generated ON recipes(ai_generated);
CREATE INDEX idx_recipes_rating ON recipes(rating) WHERE rating IS NOT NULL;

CREATE INDEX idx_recipe_ratings_recipe_id ON recipe_ratings(recipe_id);
CREATE INDEX idx_recipe_ratings_user_id ON recipe_ratings(user_id);

CREATE INDEX idx_usage_tracking_user_date ON usage_tracking(user_id, date);
CREATE INDEX idx_usage_tracking_date ON usage_tracking(date);

CREATE INDEX idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON ai_cache(expires_at);
CREATE INDEX idx_ai_cache_user_id ON ai_cache(user_id) WHERE user_id IS NOT NULL;

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- User profiles: Users can read and update their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User preferences: Users can manage their own preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Pantry items: Users can manage their own pantry items
CREATE POLICY "Users can manage their own pantry items" ON pantry_items
    FOR ALL USING (auth.uid() = user_id);

-- Recipes: Users can manage their own recipes, read public recipes
CREATE POLICY "Users can manage their own recipes" ON recipes
    FOR ALL USING (auth.uid() = user_id);

-- Recipe ratings: Users can manage their own ratings, read all ratings
CREATE POLICY "Users can read all recipe ratings" ON recipe_ratings
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can manage their own recipe ratings" ON recipe_ratings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipe ratings" ON recipe_ratings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipe ratings" ON recipe_ratings
    FOR DELETE USING (auth.uid() = user_id);

-- Recipe photos: Users can manage their own photos
CREATE POLICY "Users can manage their own recipe photos" ON recipe_photos
    FOR ALL USING (auth.uid() = user_id);

-- Usage tracking: Users can read their own usage data
CREATE POLICY "Users can read their own usage data" ON usage_tracking
    FOR SELECT USING (auth.uid() = user_id);

-- Service can insert usage data
CREATE POLICY "Service can insert usage data" ON usage_tracking
    FOR INSERT WITH CHECK (TRUE);

-- Subscriptions: Users can read their own subscription data
CREATE POLICY "Users can read their own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Service can manage subscriptions
CREATE POLICY "Service can manage subscriptions" ON subscriptions
    FOR ALL USING (TRUE);

-- AI Cache: Users can read their own cached data, service can manage all
CREATE POLICY "Users can read their own AI cache" ON ai_cache
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service can manage AI cache" ON ai_cache
    FOR ALL USING (TRUE);

-- Shopping lists: Users can manage their own lists and shared lists
CREATE POLICY "Users can manage their own shopping lists" ON shopping_lists
    FOR ALL USING (auth.uid() = user_id OR auth.uid()::text = ANY(shared_with));

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pantry_items_updated_at BEFORE UPDATE ON pantry_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipe_ratings_updated_at BEFORE UPDATE ON recipe_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile and preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    INSERT INTO public.subscriptions (user_id, tier, status)
    VALUES (NEW.id, 'free', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user last_active_date
CREATE OR REPLACE FUNCTION public.update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET last_active_date = NOW()
    WHERE id = auth.uid();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired AI cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM public.ai_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;