import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient } from '../../lib/supabase/client';

const SCHEMA_SQL = `
-- Enable Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
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
CREATE TABLE IF NOT EXISTS user_preferences (
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
CREATE TABLE IF NOT EXISTS pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('protein', 'vegetables', 'fruits', 'grains', 'dairy', 'spices', 'herbs', 'oils', 'pantry', 'other')),
    quantity DECIMAL(10,2),
    unit TEXT,
    expiry_date DATE,
    purchase_date DATE DEFAULT CURRENT_DATE,
    location TEXT DEFAULT 'pantry',
    notes TEXT,
    nutritional_info JSONB DEFAULT '{}',
    barcode TEXT,
    brand TEXT,
    cost DECIMAL(10,2),
    is_organic BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name, category)
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cuisine_type TEXT NOT NULL DEFAULT 'international',
    difficulty_level TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    prep_time_minutes INTEGER NOT NULL DEFAULT 15,
    cook_time_minutes INTEGER NOT NULL DEFAULT 30,
    total_time_minutes INTEGER GENERATED ALWAYS AS (prep_time_minutes + cook_time_minutes) STORED,
    servings INTEGER NOT NULL DEFAULT 4,
    ingredients JSONB NOT NULL DEFAULT '[]',
    instructions JSONB NOT NULL DEFAULT '[]',
    nutritional_info JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    source TEXT DEFAULT 'ai_generated',
    ai_model TEXT,
    ai_prompt TEXT,
    estimated_cost DECIMAL(10,2),
    rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    times_cooked INTEGER NOT NULL DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own pantry items" ON pantry_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own pantry items" ON pantry_items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recipes" ON recipes FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can manage own recipes" ON recipes FOR ALL USING (auth.uid() = user_id);
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const supabase = createSupabaseClient();

    if (!supabase) {
      return res.status(400).json({
        success: false,
        message: 'Supabase credentials not configured',
      });
    }

    // Execute the schema SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: SCHEMA_SQL });

    if (error) {
      console.error('Database setup error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to set up database',
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database setup completed successfully',
      tablesCreated: ['user_profiles', 'user_preferences', 'pantry_items', 'recipes'],
    });
  } catch (error: any) {
    console.error('Database setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to set up database',
      error: error.message,
    });
  }
}
