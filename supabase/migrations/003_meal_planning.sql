-- Create meal_plans table
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    shopping_list JSONB NOT NULL DEFAULT '[]',
    total_calories INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    nutrition_goals JSONB,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    shared_with TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create planned_meals table
CREATE TABLE planned_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    servings INTEGER NOT NULL DEFAULT 2,
    prep_status TEXT NOT NULL DEFAULT 'planned' CHECK (prep_status IN ('planned', 'shopping', 'prepped', 'cooking', 'completed')),
    notes TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meal_plan_templates table (for reusable meal plan structures)
CREATE TABLE meal_plan_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL DEFAULT 7,
    nutrition_goals JSONB,
    meal_structure JSONB NOT NULL, -- JSON structure defining meal types per day
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX idx_meal_plans_status ON meal_plans(status);
CREATE INDEX idx_meal_plans_date_range ON meal_plans(start_date, end_date);
CREATE INDEX idx_meal_plans_is_template ON meal_plans(is_template) WHERE is_template = TRUE;

CREATE INDEX idx_planned_meals_meal_plan_id ON planned_meals(meal_plan_id);
CREATE INDEX idx_planned_meals_recipe_id ON planned_meals(recipe_id);
CREATE INDEX idx_planned_meals_date ON planned_meals(date);
CREATE INDEX idx_planned_meals_meal_type ON planned_meals(meal_type);
CREATE INDEX idx_planned_meals_prep_status ON planned_meals(prep_status);

CREATE INDEX idx_meal_plan_templates_user_id ON meal_plan_templates(user_id);
CREATE INDEX idx_meal_plan_templates_public ON meal_plan_templates(is_public) WHERE is_public = TRUE;

-- Enable Row Level Security
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for meal_plans
CREATE POLICY "Users can manage their own meal plans" ON meal_plans
    FOR ALL USING (auth.uid() = user_id OR auth.uid()::text = ANY(shared_with));

-- Create RLS policies for planned_meals
CREATE POLICY "Users can manage planned meals in their meal plans" ON planned_meals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM meal_plans mp 
            WHERE mp.id = planned_meals.meal_plan_id 
            AND (auth.uid() = mp.user_id OR auth.uid()::text = ANY(mp.shared_with))
        )
    );

-- Create RLS policies for meal_plan_templates
CREATE POLICY "Users can manage their own meal plan templates" ON meal_plan_templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read public meal plan templates" ON meal_plan_templates
    FOR SELECT USING (is_public = TRUE);

-- Add update triggers
CREATE TRIGGER update_meal_plans_updated_at 
    BEFORE UPDATE ON meal_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planned_meals_updated_at 
    BEFORE UPDATE ON planned_meals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plan_templates_updated_at 
    BEFORE UPDATE ON meal_plan_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total calories for a meal plan
CREATE OR REPLACE FUNCTION calculate_meal_plan_calories(plan_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_calories INTEGER := 0;
    meal_record RECORD;
    recipe_record RECORD;
BEGIN
    FOR meal_record IN 
        SELECT pm.servings, pm.recipe_id, r.servings as recipe_servings, r.nutrition_info
        FROM planned_meals pm
        JOIN recipes r ON r.id = pm.recipe_id
        WHERE pm.meal_plan_id = plan_id
    LOOP
        -- Calculate calories based on serving size ratio
        IF meal_record.nutrition_info IS NOT NULL AND meal_record.nutrition_info ? 'calories' THEN
            total_calories := total_calories + 
                ROUND((meal_record.nutrition_info->>'calories')::DECIMAL * 
                      (meal_record.servings::DECIMAL / meal_record.recipe_servings::DECIMAL));
        END IF;
    END LOOP;
    
    RETURN total_calories;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update meal plan calories automatically
CREATE OR REPLACE FUNCTION update_meal_plan_calories()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE meal_plans 
    SET total_calories = calculate_meal_plan_calories(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.meal_plan_id
            ELSE NEW.meal_plan_id
        END
    )
    WHERE id = (
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.meal_plan_id
            ELSE NEW.meal_plan_id
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to automatically update meal plan calories when planned meals change
CREATE TRIGGER update_meal_plan_calories_on_planned_meal_change
    AFTER INSERT OR UPDATE OR DELETE ON planned_meals
    FOR EACH ROW EXECUTE FUNCTION update_meal_plan_calories();

-- Function to get meal plan nutrition summary
CREATE OR REPLACE FUNCTION get_meal_plan_nutrition_summary(plan_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH meal_nutrition AS (
        SELECT 
            DATE(pm.date) as meal_date,
            pm.meal_type,
            CASE 
                WHEN r.nutrition_info IS NOT NULL THEN
                    JSON_BUILD_OBJECT(
                        'calories', ROUND((r.nutrition_info->>'calories')::DECIMAL * (pm.servings::DECIMAL / r.servings::DECIMAL)),
                        'protein', ROUND((r.nutrition_info->>'protein')::DECIMAL * (pm.servings::DECIMAL / r.servings::DECIMAL), 1),
                        'carbs', ROUND((r.nutrition_info->>'carbs')::DECIMAL * (pm.servings::DECIMAL / r.servings::DECIMAL), 1),
                        'fat', ROUND((r.nutrition_info->>'fat')::DECIMAL * (pm.servings::DECIMAL / r.servings::DECIMAL), 1),
                        'fiber', ROUND((r.nutrition_info->>'fiber')::DECIMAL * (pm.servings::DECIMAL / r.servings::DECIMAL), 1),
                        'sodium', ROUND((r.nutrition_info->>'sodium')::DECIMAL * (pm.servings::DECIMAL / r.servings::DECIMAL), 1)
                    )
                ELSE NULL
            END as nutrition
        FROM planned_meals pm
        JOIN recipes r ON r.id = pm.recipe_id
        WHERE pm.meal_plan_id = plan_id
    ),
    daily_totals AS (
        SELECT 
            meal_date,
            SUM((nutrition->>'calories')::INTEGER) as daily_calories,
            SUM((nutrition->>'protein')::DECIMAL) as daily_protein,
            SUM((nutrition->>'carbs')::DECIMAL) as daily_carbs,
            SUM((nutrition->>'fat')::DECIMAL) as daily_fat,
            SUM((nutrition->>'fiber')::DECIMAL) as daily_fiber,
            SUM((nutrition->>'sodium')::DECIMAL) as daily_sodium
        FROM meal_nutrition
        WHERE nutrition IS NOT NULL
        GROUP BY meal_date
        ORDER BY meal_date
    ),
    totals AS (
        SELECT 
            SUM(daily_calories) as total_calories,
            ROUND(AVG(daily_calories)) as avg_calories,
            SUM(daily_protein) as total_protein,
            ROUND(AVG(daily_protein), 1) as avg_protein,
            SUM(daily_carbs) as total_carbs,
            ROUND(AVG(daily_carbs), 1) as avg_carbs,
            SUM(daily_fat) as total_fat,
            ROUND(AVG(daily_fat), 1) as avg_fat,
            SUM(daily_fiber) as total_fiber,
            ROUND(AVG(daily_fiber), 1) as avg_fiber,
            SUM(daily_sodium) as total_sodium,
            ROUND(AVG(daily_sodium), 1) as avg_sodium,
            COUNT(*) as days_count
        FROM daily_totals
    )
    SELECT JSON_BUILD_OBJECT(
        'totals', JSON_BUILD_OBJECT(
            'calories', t.total_calories,
            'protein', t.total_protein,
            'carbs', t.total_carbs,
            'fat', t.total_fat,
            'fiber', t.total_fiber,
            'sodium', t.total_sodium
        ),
        'averages', JSON_BUILD_OBJECT(
            'calories', t.avg_calories,
            'protein', t.avg_protein,
            'carbs', t.avg_carbs,
            'fat', t.avg_fat,
            'fiber', t.avg_fiber,
            'sodium', t.avg_sodium
        ),
        'daily_breakdown', JSON_AGG(
            JSON_BUILD_OBJECT(
                'date', dt.meal_date,
                'calories', dt.daily_calories,
                'protein', dt.daily_protein,
                'carbs', dt.daily_carbs,
                'fat', dt.daily_fat,
                'fiber', dt.daily_fiber,
                'sodium', dt.daily_sodium
            ) ORDER BY dt.meal_date
        ),
        'days_count', t.days_count
    ) INTO result
    FROM totals t, daily_totals dt
    GROUP BY t.total_calories, t.avg_calories, t.total_protein, t.avg_protein, 
             t.total_carbs, t.avg_carbs, t.total_fat, t.avg_fat,
             t.total_fiber, t.avg_fiber, t.total_sodium, t.avg_sodium, t.days_count;
    
    RETURN COALESCE(result, '{"error": "No nutrition data available"}'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;