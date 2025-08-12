-- Schema updates to add missing columns to pantry_items table
-- Fixed version without ON CONFLICT issues
-- Run this in Supabase SQL Editor to update the schema

-- Add missing nutritional and dietary columns to pantry_items
ALTER TABLE public.pantry_items 
ADD COLUMN IF NOT EXISTS nutritional_value NUMERIC,
ADD COLUMN IF NOT EXISTS is_protein BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT FALSE;

-- Create an index for nutritional queries
CREATE INDEX IF NOT EXISTS idx_pantry_items_nutritional ON public.pantry_items(nutritional_value) WHERE nutritional_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pantry_items_protein ON public.pantry_items(user_id, is_protein) WHERE is_protein = TRUE;

-- Add a function to get ingredient suggestions (mentioned in databaseIngredientService)
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
    RETURN QUERY
    WITH ingredient_stats AS (
        SELECT 
            p.name,
            p.category,
            AVG(p.nutritional_value) as avg_nutritional_value,
            BOOL_OR(p.is_protein) as has_protein,
            BOOL_AND(p.is_vegetarian) as all_vegetarian,
            BOOL_AND(p.is_vegan) as all_vegan,
            ARRAY_AGG(DISTINCT p.unit) FILTER (WHERE p.unit IS NOT NULL) as units
        FROM public.pantry_items p
        WHERE 
            (search_term = '' OR p.name ILIKE '%' || search_term || '%')
            AND (category_filter = 'all' OR p.category = category_filter)
        GROUP BY p.name, p.category
        HAVING COUNT(*) >= 1
    )
    SELECT 
        s.name::TEXT,
        s.category::TEXT,
        s.avg_nutritional_value,
        s.has_protein,
        s.all_vegetarian,
        s.all_vegan,
        COALESCE(s.units, ARRAY['unit']::TEXT[]) as common_units,
        CASE s.category
            WHEN 'vegetables' THEN 'Store in refrigerator crisper drawer'
            WHEN 'fruits' THEN 'Store at room temperature, refrigerate when ripe'
            WHEN 'dairy' THEN 'Keep refrigerated below 40°F'
            WHEN 'protein' THEN 'Keep refrigerated or frozen'
            WHEN 'grains' THEN 'Store in cool, dry place'
            ELSE 'Store in cool, dry place away from light'
        END::TEXT as storage_tips
    FROM ingredient_stats s
    WHERE 
        (dietary_filter = 'all' 
         OR (dietary_filter = 'vegetarian' AND s.all_vegetarian)
         OR (dietary_filter = 'vegan' AND s.all_vegan)
         OR (dietary_filter = 'protein' AND s.has_protein))
    ORDER BY 
        s.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the pantry_items table trigger to include new columns
DROP TRIGGER IF EXISTS update_pantry_items_updated_at ON public.pantry_items;
CREATE TRIGGER update_pantry_items_updated_at
    BEFORE UPDATE ON public.pantry_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add some common ingredient data for suggestions (using INSERT with WHERE NOT EXISTS to avoid duplicates)
DO $$
BEGIN
    -- Only insert if there are no existing system ingredients
    IF NOT EXISTS (SELECT 1 FROM public.pantry_items WHERE user_id = '00000000-0000-0000-0000-000000000000') THEN
        INSERT INTO public.pantry_items (user_id, name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, unit, quantity)
        VALUES 
            -- These are template/suggestion ingredients (using a system UUID)
            -- Real user ingredients will be added through the app
            ('00000000-0000-0000-0000-000000000000', 'Chicken Breast', 'protein', 165, TRUE, FALSE, FALSE, 'lb', 1),
            ('00000000-0000-0000-0000-000000000000', 'Salmon Fillet', 'protein', 206, TRUE, FALSE, FALSE, 'lb', 1),
            ('00000000-0000-0000-0000-000000000000', 'Tofu', 'protein', 144, TRUE, TRUE, TRUE, 'lb', 1),
            ('00000000-0000-0000-0000-000000000000', 'Black Beans', 'protein', 227, TRUE, TRUE, TRUE, 'can', 1),
            ('00000000-0000-0000-0000-000000000000', 'Broccoli', 'vegetables', 25, FALSE, TRUE, TRUE, 'head', 1),
            ('00000000-0000-0000-0000-000000000000', 'Spinach', 'vegetables', 7, FALSE, TRUE, TRUE, 'bunch', 1),
            ('00000000-0000-0000-0000-000000000000', 'Carrots', 'vegetables', 25, FALSE, TRUE, TRUE, 'lb', 1),
            ('00000000-0000-0000-0000-000000000000', 'Tomatoes', 'vegetables', 18, FALSE, TRUE, TRUE, 'lb', 1),
            ('00000000-0000-0000-0000-000000000000', 'Bananas', 'fruits', 89, FALSE, TRUE, TRUE, 'bunch', 1),
            ('00000000-0000-0000-0000-000000000000', 'Apples', 'fruits', 52, FALSE, TRUE, TRUE, 'lb', 1),
            ('00000000-0000-0000-0000-000000000000', 'Rice', 'grains', 130, FALSE, TRUE, TRUE, 'cup', 1),
            ('00000000-0000-0000-0000-000000000000', 'Quinoa', 'grains', 222, FALSE, TRUE, TRUE, 'cup', 1),
            ('00000000-0000-0000-0000-000000000000', 'Milk', 'dairy', 42, FALSE, TRUE, FALSE, 'gallon', 1),
            ('00000000-0000-0000-0000-000000000000', 'Cheese', 'dairy', 113, FALSE, TRUE, FALSE, 'lb', 1),
            ('00000000-0000-0000-0000-000000000000', 'Olive Oil', 'oils', 884, FALSE, TRUE, TRUE, 'bottle', 1);
    END IF;
END $$;

-- Add comments explaining the schema
COMMENT ON COLUMN public.pantry_items.nutritional_value IS 'Calories per 100g serving';
COMMENT ON COLUMN public.pantry_items.is_protein IS 'Whether this ingredient is primarily a protein source';
COMMENT ON COLUMN public.pantry_items.is_vegetarian IS 'Whether this ingredient is vegetarian-friendly';
COMMENT ON COLUMN public.pantry_items.is_vegan IS 'Whether this ingredient is vegan-friendly';