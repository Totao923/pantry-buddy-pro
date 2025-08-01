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

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

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

-- Recipes: Users can manage their own recipes
CREATE POLICY "Users can manage their own recipes" ON recipes
    FOR ALL USING (auth.uid() = user_id);

-- Function for automatic timestamps
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

-- Function to automatically create user profile and preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();