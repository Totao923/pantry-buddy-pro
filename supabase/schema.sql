-- Create ingredients table with usage tracking fields
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  expiry_date TIMESTAMP,
  nutritional_value JSONB,
  is_protein BOOLEAN DEFAULT false,
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Usage tracking fields
  usage_history JSONB DEFAULT '[]',
  total_used DECIMAL DEFAULT 0,
  cost_per_unit DECIMAL,
  last_used_date TIMESTAMP,
  low_stock_threshold DECIMAL DEFAULT 1
);

-- Add RLS (Row Level Security) policies
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own ingredients
CREATE POLICY "Users can view their own ingredients" ON ingredients
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own ingredients
CREATE POLICY "Users can insert their own ingredients" ON ingredients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own ingredients
CREATE POLICY "Users can update their own ingredients" ON ingredients
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own ingredients
CREATE POLICY "Users can delete their own ingredients" ON ingredients
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();