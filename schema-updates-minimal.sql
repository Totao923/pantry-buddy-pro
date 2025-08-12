-- Minimal schema updates - just add the missing columns
-- Run this in Supabase SQL Editor to update the schema

-- Add missing nutritional and dietary columns to pantry_items
ALTER TABLE public.pantry_items 
ADD COLUMN IF NOT EXISTS nutritional_value NUMERIC,
ADD COLUMN IF NOT EXISTS is_protein BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pantry_items_nutritional ON public.pantry_items(nutritional_value) WHERE nutritional_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pantry_items_protein ON public.pantry_items(user_id, is_protein) WHERE is_protein = TRUE;

-- Add a function to get ingredient suggestions
CREATE OR REPLACE FUNCTION public.get_ingredient_suggestions(
    search_term TEXT DEFAULT '',
    category_filter TEXT DEFAULT 'all',
    dietary_filter TEXT DEFAULT 'all',
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    name TEXT,
    category TEXT,
    nutritional_value NUMERIC,
    is_protein BOOLEAN,
    is_vegetarian BOOLEAN,
    is_vegan BOOLEAN,
    common_units TEXT[],
    storage_tips TEXT
) AS $$
BEGIN
    -- Return simple hardcoded suggestions since we don't have data yet
    RETURN QUERY
    SELECT 
        t.name::TEXT,
        t.category::TEXT,
        t.nutritional_value::NUMERIC,
        t.is_protein::BOOLEAN,
        t.is_vegetarian::BOOLEAN,
        t.is_vegan::BOOLEAN,
        t.common_units::TEXT[],
        t.storage_tips::TEXT
    FROM (VALUES
        ('Chicken Breast', 'protein', 165, TRUE, FALSE, FALSE, ARRAY['lb', 'piece']::TEXT[], 'Keep refrigerated or frozen'),
        ('Salmon Fillet', 'protein', 206, TRUE, FALSE, FALSE, ARRAY['lb', 'fillet']::TEXT[], 'Keep refrigerated or frozen'),
        ('Tofu', 'protein', 144, TRUE, TRUE, TRUE, ARRAY['lb', 'block']::TEXT[], 'Keep refrigerated'),
        ('Black Beans', 'protein', 227, TRUE, TRUE, TRUE, ARRAY['can', 'cup']::TEXT[], 'Store in cool, dry place'),
        ('Broccoli', 'vegetables', 25, FALSE, TRUE, TRUE, ARRAY['head', 'cup']::TEXT[], 'Store in refrigerator crisper drawer'),
        ('Spinach', 'vegetables', 7, FALSE, TRUE, TRUE, ARRAY['bunch', 'cup']::TEXT[], 'Store in refrigerator crisper drawer'),
        ('Carrots', 'vegetables', 25, FALSE, TRUE, TRUE, ARRAY['lb', 'piece']::TEXT[], 'Store in refrigerator crisper drawer'),
        ('Tomatoes', 'vegetables', 18, FALSE, TRUE, TRUE, ARRAY['lb', 'piece']::TEXT[], 'Store at room temperature, then refrigerate'),
        ('Bananas', 'fruits', 89, FALSE, TRUE, TRUE, ARRAY['bunch', 'piece']::TEXT[], 'Store at room temperature, refrigerate when ripe'),
        ('Apples', 'fruits', 52, FALSE, TRUE, TRUE, ARRAY['lb', 'piece']::TEXT[], 'Store in refrigerator crisper drawer'),
        ('Rice', 'grains', 130, FALSE, TRUE, TRUE, ARRAY['cup', 'lb']::TEXT[], 'Store in cool, dry place'),
        ('Quinoa', 'grains', 222, FALSE, TRUE, TRUE, ARRAY['cup', 'lb']::TEXT[], 'Store in cool, dry place'),
        ('Milk', 'dairy', 42, FALSE, TRUE, FALSE, ARRAY['gallon', 'cup']::TEXT[], 'Keep refrigerated below 40°F'),
        ('Cheese', 'dairy', 113, FALSE, TRUE, FALSE, ARRAY['lb', 'slice']::TEXT[], 'Keep refrigerated below 40°F'),
        ('Olive Oil', 'oils', 884, FALSE, TRUE, TRUE, ARRAY['bottle', 'tbsp']::TEXT[], 'Store in cool, dry place away from light')
    ) AS t(name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, storage_tips)
    WHERE 
        (search_term = '' OR t.name ILIKE '%' || search_term || '%')
        AND (category_filter = 'all' OR t.category = category_filter)
        AND (dietary_filter = 'all' 
             OR (dietary_filter = 'vegetarian' AND t.is_vegetarian)
             OR (dietary_filter = 'vegan' AND t.is_vegan)
             OR (dietary_filter = 'protein' AND t.is_protein))
    ORDER BY t.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the pantry_items table trigger
DROP TRIGGER IF EXISTS update_pantry_items_updated_at ON public.pantry_items;
CREATE TRIGGER update_pantry_items_updated_at
    BEFORE UPDATE ON public.pantry_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments explaining the schema
COMMENT ON COLUMN public.pantry_items.nutritional_value IS 'Calories per 100g serving';
COMMENT ON COLUMN public.pantry_items.is_protein IS 'Whether this ingredient is primarily a protein source';
COMMENT ON COLUMN public.pantry_items.is_vegetarian IS 'Whether this ingredient is vegetarian-friendly';
COMMENT ON COLUMN public.pantry_items.is_vegan IS 'Whether this ingredient is vegan-friendly';