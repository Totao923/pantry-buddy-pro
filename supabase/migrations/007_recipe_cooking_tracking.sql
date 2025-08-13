-- Recipe Cooking Tracking Schema
-- This migration creates tables to track when users cook recipes

-- Table to track individual cooking sessions
CREATE TABLE IF NOT EXISTS cooking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL, -- Can reference external recipe IDs or internal recipe storage
  recipe_title TEXT NOT NULL,
  recipe_data JSONB, -- Store recipe details for historical purposes
  cooked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional user feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  cooking_notes TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  cook_time_actual INTEGER, -- Actual time taken in minutes
  
  -- Success indicators
  would_cook_again BOOLEAN,
  recipe_followed_exactly BOOLEAN DEFAULT true,
  modifications_made TEXT,
  
  -- Additional metadata
  cooking_method TEXT, -- 'stove', 'oven', 'microwave', 'grill', etc.
  servings_made INTEGER,
  photo_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for aggregated recipe statistics
CREATE TABLE IF NOT EXISTS recipe_cooking_stats (
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
  success_rate DECIMAL(5,2), -- Percentage who would cook again
  exact_follow_rate DECIMAL(5,2), -- Percentage who followed exactly
  
  -- Time tracking
  average_cook_time INTEGER,
  estimated_vs_actual_time_diff INTEGER, -- Average difference from estimated time
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track user cooking preferences and patterns
CREATE TABLE IF NOT EXISTS user_cooking_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Cooking frequency
  total_recipes_cooked INTEGER DEFAULT 0,
  cooking_streak_current INTEGER DEFAULT 0,
  cooking_streak_longest INTEGER DEFAULT 0,
  last_cooked_at TIMESTAMP WITH TIME ZONE,
  first_cooked_at TIMESTAMP WITH TIME ZONE,
  
  -- Preferences derived from cooking history
  favorite_cuisines TEXT[], -- Array of preferred cuisine types
  preferred_cook_times INTEGER[], -- Preferred cooking time ranges
  preferred_difficulty INTEGER, -- Preferred difficulty level (1-5)
  
  -- Cooking patterns
  most_active_cooking_day TEXT, -- Day of week user cooks most
  most_active_cooking_hour INTEGER, -- Hour of day (0-23)
  
  -- Success patterns
  average_rating_given DECIMAL(3,2),
  recipe_completion_rate DECIMAL(5,2), -- How often they complete recipes they start
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_user_id ON cooking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_recipe_id ON cooking_sessions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_cooked_at ON cooking_sessions(cooked_at);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_rating ON cooking_sessions(rating);

CREATE INDEX IF NOT EXISTS idx_recipe_stats_times_cooked ON recipe_cooking_stats(total_times_cooked);
CREATE INDEX IF NOT EXISTS idx_recipe_stats_rating ON recipe_cooking_stats(average_rating);
CREATE INDEX IF NOT EXISTS idx_recipe_stats_last_cooked ON recipe_cooking_stats(last_cooked_at);

-- Row Level Security (RLS) policies
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_cooking_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cooking_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cooking sessions
CREATE POLICY "Users can view own cooking sessions" ON cooking_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cooking sessions" ON cooking_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cooking sessions" ON cooking_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cooking sessions" ON cooking_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Recipe stats are publicly readable but only system can write
CREATE POLICY "Recipe stats are publicly readable" ON recipe_cooking_stats
  FOR SELECT USING (true);

-- Only authenticated users can read recipe stats for now
-- In production, you might want to make this public
CREATE POLICY "Authenticated users can view recipe stats" ON recipe_cooking_stats
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only see their own cooking preferences
CREATE POLICY "Users can view own cooking preferences" ON user_cooking_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cooking preferences" ON user_cooking_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cooking preferences" ON user_cooking_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions to update aggregated statistics
CREATE OR REPLACE FUNCTION update_recipe_cooking_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert recipe cooking stats
  INSERT INTO recipe_cooking_stats (
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
  FROM cooking_sessions 
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
  AFTER INSERT OR UPDATE ON cooking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_cooking_stats();

-- Function to update user cooking preferences
CREATE OR REPLACE FUNCTION update_user_cooking_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert user cooking preferences
  INSERT INTO user_cooking_preferences (
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
  FROM cooking_sessions 
  WHERE user_id = NEW.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_recipes_cooked = EXCLUDED.total_recipes_cooked,
    last_cooked_at = EXCLUDED.last_cooked_at,
    first_cooked_at = GREATEST(user_cooking_preferences.first_cooked_at, EXCLUDED.first_cooked_at),
    average_rating_given = EXCLUDED.average_rating_given,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user preferences when cooking session is added
CREATE TRIGGER trigger_update_user_cooking_preferences
  AFTER INSERT OR UPDATE ON cooking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_cooking_preferences();