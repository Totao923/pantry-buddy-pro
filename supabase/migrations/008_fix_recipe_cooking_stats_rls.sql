-- Fix RLS policies for recipe_cooking_stats table
-- The triggers need to be able to insert/update aggregated statistics

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Recipe stats are publicly readable" ON recipe_cooking_stats;
DROP POLICY IF EXISTS "Authenticated users can view recipe stats" ON recipe_cooking_stats;

-- Allow public read access to recipe statistics
CREATE POLICY "Public can view recipe stats" ON recipe_cooking_stats
  FOR SELECT USING (true);

-- Allow system/triggers to insert and update recipe statistics
-- This is needed for the database triggers to work
CREATE POLICY "System can insert recipe stats" ON recipe_cooking_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update recipe stats" ON recipe_cooking_stats
  FOR UPDATE USING (true);

-- Alternative: Disable RLS for recipe_cooking_stats since it's aggregated public data
-- This table contains only aggregated public statistics, no sensitive user data
-- ALTER TABLE recipe_cooking_stats DISABLE ROW LEVEL SECURITY;