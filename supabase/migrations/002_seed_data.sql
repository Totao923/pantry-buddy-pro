-- Insert common ingredient categories and examples for quick reference
-- This creates a reference table that can be used for suggestions

-- Create a reference table for common ingredients (not user-specific)
CREATE TABLE IF NOT EXISTS common_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('protein', 'vegetables', 'fruits', 'grains', 'dairy', 'spices', 'herbs', 'oils', 'pantry', 'other')),
    nutritional_value INTEGER, -- calories per 100g
    is_protein BOOLEAN NOT NULL DEFAULT FALSE,
    is_vegetarian BOOLEAN NOT NULL DEFAULT TRUE,
    is_vegan BOOLEAN NOT NULL DEFAULT TRUE,
    common_units TEXT[] DEFAULT '{}', -- common units for this ingredient
    average_shelf_life_days INTEGER, -- average shelf life in days
    storage_tips TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable RLS for common ingredients (public reference data)
ALTER TABLE common_ingredients DISABLE ROW LEVEL SECURITY;

-- Insert common protein ingredients
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('Chicken Breast', 'protein', 165, TRUE, FALSE, FALSE, ARRAY['g', 'kg', 'pieces', 'lbs'], 3, 'Keep refrigerated at 4°C or below'),
('Salmon Fillet', 'protein', 208, TRUE, FALSE, FALSE, ARRAY['g', 'kg', 'pieces', 'lbs'], 2, 'Keep refrigerated, use within 2 days'),
('Ground Beef', 'protein', 250, TRUE, FALSE, FALSE, ARRAY['g', 'kg', 'lbs'], 2, 'Keep refrigerated, cook thoroughly'),
('Tofu', 'protein', 144, TRUE, TRUE, TRUE, ARRAY['g', 'block', 'pieces'], 5, 'Keep refrigerated in water'),
('Eggs', 'protein', 155, TRUE, TRUE, FALSE, ARRAY['pieces', 'dozen'], 21, 'Keep refrigerated'),
('Black Beans', 'protein', 132, TRUE, TRUE, TRUE, ARRAY['g', 'cups', 'cans'], 730, 'Store in dry place'),
('Lentils', 'protein', 116, TRUE, TRUE, TRUE, ARRAY['g', 'cups'], 730, 'Store in dry place'),
('Chickpeas', 'protein', 164, TRUE, TRUE, TRUE, ARRAY['g', 'cups', 'cans'], 730, 'Store in dry place'),
('Greek Yogurt', 'protein', 59, TRUE, TRUE, FALSE, ARRAY['g', 'cups', 'containers'], 14, 'Keep refrigerated'),
('Cottage Cheese', 'protein', 98, TRUE, TRUE, FALSE, ARRAY['g', 'cups', 'containers'], 7, 'Keep refrigerated');

-- Insert common vegetables
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('Onions', 'vegetables', 40, FALSE, TRUE, TRUE, ARRAY['pieces', 'g', 'cups'], 30, 'Store in cool, dry place'),
('Garlic', 'vegetables', 149, FALSE, TRUE, TRUE, ARRAY['cloves', 'bulbs', 'g'], 90, 'Store in cool, dry place'),
('Tomatoes', 'vegetables', 18, FALSE, TRUE, TRUE, ARRAY['pieces', 'g', 'cups'], 7, 'Store at room temperature until ripe'),
('Bell Peppers', 'vegetables', 31, FALSE, TRUE, TRUE, ARRAY['pieces', 'g', 'cups'], 7, 'Keep refrigerated'),
('Carrots', 'vegetables', 41, FALSE, TRUE, TRUE, ARRAY['pieces', 'g', 'cups'], 21, 'Keep refrigerated'),
('Broccoli', 'vegetables', 34, FALSE, TRUE, TRUE, ARRAY['g', 'heads', 'cups'], 5, 'Keep refrigerated'),
('Spinach', 'vegetables', 23, FALSE, TRUE, TRUE, ARRAY['g', 'cups', 'bunches'], 3, 'Keep refrigerated'),
('Potatoes', 'vegetables', 77, FALSE, TRUE, TRUE, ARRAY['pieces', 'g', 'lbs'], 14, 'Store in cool, dark place'),
('Sweet Potatoes', 'vegetables', 86, FALSE, TRUE, TRUE, ARRAY['pieces', 'g', 'lbs'], 14, 'Store in cool, dark place'),
('Mushrooms', 'vegetables', 22, FALSE, TRUE, TRUE, ARRAY['g', 'cups', 'pieces'], 7, 'Keep refrigerated');

-- Insert common fruits
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('Bananas', 'fruits', 89, FALSE, TRUE, TRUE, ARRAY['pieces', 'g'], 5, 'Store at room temperature'),
('Apples', 'fruits', 52, FALSE, TRUE, TRUE, ARRAY['pieces', 'g'], 14, 'Keep refrigerated'),
('Lemons', 'fruits', 29, FALSE, TRUE, TRUE, ARRAY['pieces', 'g'], 14, 'Keep refrigerated'),
('Limes', 'fruits', 30, FALSE, TRUE, TRUE, ARRAY['pieces', 'g'], 14, 'Keep refrigerated'),
('Oranges', 'fruits', 47, FALSE, TRUE, TRUE, ARRAY['pieces', 'g'], 14, 'Keep refrigerated'),
('Avocados', 'fruits', 160, FALSE, TRUE, TRUE, ARRAY['pieces', 'g'], 3, 'Ripen at room temperature'),
('Berries', 'fruits', 57, FALSE, TRUE, TRUE, ARRAY['g', 'cups', 'pints'], 3, 'Keep refrigerated'),
('Strawberries', 'fruits', 32, FALSE, TRUE, TRUE, ARRAY['g', 'cups', 'pieces'], 3, 'Keep refrigerated');

-- Insert common grains
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('White Rice', 'grains', 130, FALSE, TRUE, TRUE, ARRAY['g', 'cups'], 730, 'Store in dry place'),
('Brown Rice', 'grains', 123, FALSE, TRUE, TRUE, ARRAY['g', 'cups'], 180, 'Store in dry place'),
('Pasta', 'grains', 131, FALSE, TRUE, TRUE, ARRAY['g', 'cups'], 730, 'Store in dry place'),
('Bread', 'grains', 265, FALSE, TRUE, TRUE, ARRAY['slices', 'loaves'], 5, 'Store at room temperature'),
('Quinoa', 'grains', 120, FALSE, TRUE, TRUE, ARRAY['g', 'cups'], 730, 'Store in dry place'),
('Oats', 'grains', 389, FALSE, TRUE, TRUE, ARRAY['g', 'cups'], 365, 'Store in dry place'),
('Flour', 'grains', 364, FALSE, TRUE, TRUE, ARRAY['g', 'cups', 'kg'], 365, 'Store in dry place'),
('Barley', 'grains', 123, FALSE, TRUE, TRUE, ARRAY['g', 'cups'], 730, 'Store in dry place');

-- Insert common dairy
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('Milk', 'dairy', 42, FALSE, TRUE, FALSE, ARRAY['ml', 'cups', 'liters'], 5, 'Keep refrigerated'),
('Cheese', 'dairy', 113, FALSE, TRUE, FALSE, ARRAY['g', 'slices', 'cups'], 14, 'Keep refrigerated'),
('Butter', 'dairy', 717, FALSE, TRUE, FALSE, ARRAY['g', 'tbsp', 'sticks'], 30, 'Keep refrigerated'),
('Heavy Cream', 'dairy', 345, FALSE, TRUE, FALSE, ARRAY['ml', 'cups'], 7, 'Keep refrigerated'),
('Sour Cream', 'dairy', 193, FALSE, TRUE, FALSE, ARRAY['g', 'cups'], 14, 'Keep refrigerated'),
('Mozzarella', 'dairy', 280, FALSE, TRUE, FALSE, ARRAY['g', 'cups', 'pieces'], 7, 'Keep refrigerated'),
('Parmesan', 'dairy', 431, FALSE, TRUE, FALSE, ARRAY['g', 'cups'], 30, 'Keep refrigerated');

-- Insert common spices
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('Salt', 'spices', 0, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1825, 'Store in dry place'),
('Black Pepper', 'spices', 251, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place'),
('Paprika', 'spices', 282, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place'),
('Cumin', 'spices', 375, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place'),
('Chili Powder', 'spices', 282, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place'),
('Garlic Powder', 'spices', 331, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place'),
('Onion Powder', 'spices', 341, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place'),
('Cinnamon', 'spices', 247, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place');

-- Insert common herbs
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('Basil', 'herbs', 22, FALSE, TRUE, TRUE, ARRAY['g', 'leaves', 'bunches'], 3, 'Keep refrigerated'),
('Oregano', 'herbs', 265, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place'),
('Thyme', 'herbs', 101, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 1095, 'Store in dry place'),
('Rosemary', 'herbs', 131, FALSE, TRUE, TRUE, ARRAY['g', 'sprigs'], 7, 'Keep refrigerated'),
('Parsley', 'herbs', 36, FALSE, TRUE, TRUE, ARRAY['g', 'bunches', 'cups'], 7, 'Keep refrigerated'),
('Cilantro', 'herbs', 23, FALSE, TRUE, TRUE, ARRAY['g', 'bunches', 'cups'], 3, 'Keep refrigerated'),
('Dill', 'herbs', 43, FALSE, TRUE, TRUE, ARRAY['g', 'bunches'], 7, 'Keep refrigerated');

-- Insert common oils
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('Olive Oil', 'oils', 884, FALSE, TRUE, TRUE, ARRAY['ml', 'tbsp', 'cups'], 730, 'Store in cool, dark place'),
('Vegetable Oil', 'oils', 884, FALSE, TRUE, TRUE, ARRAY['ml', 'tbsp', 'cups'], 730, 'Store in cool, dark place'),
('Coconut Oil', 'oils', 862, FALSE, TRUE, TRUE, ARRAY['ml', 'tbsp', 'cups'], 730, 'Store in cool place'),
('Sesame Oil', 'oils', 884, FALSE, TRUE, TRUE, ARRAY['ml', 'tbsp'], 365, 'Store in cool, dark place'),
('Avocado Oil', 'oils', 884, FALSE, TRUE, TRUE, ARRAY['ml', 'tbsp', 'cups'], 365, 'Store in cool, dark place');

-- Insert common pantry items
INSERT INTO common_ingredients (name, category, nutritional_value, is_protein, is_vegetarian, is_vegan, common_units, average_shelf_life_days, storage_tips) VALUES
('Sugar', 'pantry', 387, FALSE, TRUE, TRUE, ARRAY['g', 'cups', 'tbsp'], 730, 'Store in dry place'),
('Baking Powder', 'pantry', 53, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 540, 'Store in dry place'),
('Baking Soda', 'pantry', 0, FALSE, TRUE, TRUE, ARRAY['g', 'tsp', 'tbsp'], 730, 'Store in dry place'),
('Vanilla Extract', 'pantry', 288, FALSE, TRUE, TRUE, ARRAY['ml', 'tsp', 'tbsp'], 1825, 'Store in cool, dark place'),
('Honey', 'pantry', 304, FALSE, TRUE, FALSE, ARRAY['g', 'tbsp', 'cups'], 1825, 'Store at room temperature'),
('Soy Sauce', 'pantry', 8, FALSE, TRUE, TRUE, ARRAY['ml', 'tbsp'], 1095, 'Store in cool place'),
('Vinegar', 'pantry', 18, FALSE, TRUE, TRUE, ARRAY['ml', 'tbsp', 'cups'], 1825, 'Store in cool, dark place'),
('Tomato Paste', 'pantry', 82, FALSE, TRUE, TRUE, ARRAY['g', 'tbsp', 'cans'], 730, 'Store in cool, dry place'),
('Chicken Stock', 'pantry', 86, FALSE, FALSE, FALSE, ARRAY['ml', 'cups', 'cans'], 730, 'Store in cool, dry place'),
('Vegetable Stock', 'pantry', 12, FALSE, TRUE, TRUE, ARRAY['ml', 'cups', 'cans'], 730, 'Store in cool, dry place');

-- Create indexes for common ingredients
CREATE INDEX idx_common_ingredients_category ON common_ingredients(category);
CREATE INDEX idx_common_ingredients_name ON common_ingredients(name);
CREATE INDEX idx_common_ingredients_vegan ON common_ingredients(is_vegan);
CREATE INDEX idx_common_ingredients_vegetarian ON common_ingredients(is_vegetarian);
CREATE INDEX idx_common_ingredients_protein ON common_ingredients(is_protein);

-- Create a function to get ingredient suggestions
CREATE OR REPLACE FUNCTION get_ingredient_suggestions(
    search_term TEXT DEFAULT '',
    category_filter TEXT DEFAULT 'all',
    dietary_filter TEXT DEFAULT 'all',
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    name TEXT,
    category TEXT,
    nutritional_value INTEGER,
    is_protein BOOLEAN,
    is_vegetarian BOOLEAN,
    is_vegan BOOLEAN,
    common_units TEXT[],
    storage_tips TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.name,
        ci.category,
        ci.nutritional_value,
        ci.is_protein,
        ci.is_vegetarian,
        ci.is_vegan,
        ci.common_units,
        ci.storage_tips
    FROM common_ingredients ci
    WHERE 
        (search_term = '' OR ci.name ILIKE '%' || search_term || '%')
        AND (category_filter = 'all' OR ci.category = category_filter)
        AND (
            dietary_filter = 'all' 
            OR (dietary_filter = 'vegan' AND ci.is_vegan = TRUE)
            OR (dietary_filter = 'vegetarian' AND ci.is_vegetarian = TRUE)
            OR (dietary_filter = 'protein' AND ci.is_protein = TRUE)
        )
    ORDER BY 
        CASE WHEN ci.name ILIKE search_term || '%' THEN 1 ELSE 2 END,
        ci.name
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;