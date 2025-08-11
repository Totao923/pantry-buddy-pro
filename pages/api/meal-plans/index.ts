import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { MealPlan, PlannedMeal } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { user_id } = req.query;

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch meal plans from database
    const supabase = createServerSupabaseClient();
    const { data: mealPlansData, error: mealPlansError } = await supabase
      .from('meal_plans')
      .select(
        `
        *,
        planned_meals (
          id,
          recipe_id,
          date,
          meal_type,
          servings,
          prep_status,
          notes,
          ingredients
        )
      `
      )
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (mealPlansError) {
      console.error('Error fetching meal plans:', mealPlansError);
      return res.status(500).json({ error: 'Failed to fetch meal plans' });
    }

    // Transform database structure to match MealPlan interface
    const mealPlans: MealPlan[] = mealPlansData.map(plan => ({
      id: plan.id,
      name: plan.name,
      userId: plan.user_id,
      startDate: new Date(plan.start_date),
      endDate: new Date(plan.end_date),
      meals:
        plan.planned_meals?.map((meal: any) => ({
          id: meal.id,
          recipeId: meal.recipe_id,
          date: new Date(meal.date),
          mealType: meal.meal_type,
          servings: meal.servings,
          prepStatus: meal.prep_status || 'planned',
          notes: meal.notes || '',
          ingredients: meal.ingredients || [],
        })) || [],
      shoppingList: plan.shopping_list || [],
      totalCalories: plan.total_calories || 0,
      status: plan.status,
      createdAt: new Date(plan.created_at),
      updatedAt: new Date(plan.updated_at),
      nutritionGoals: plan.nutrition_goals || undefined,
      isTemplate: plan.is_template || false,
      sharedWith: plan.shared_with || [],
    }));

    res.status(200).json({ mealPlans });
  } catch (error) {
    console.error('Error in meal plans GET:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const mealPlanData: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'> = req.body;

    if (!mealPlanData.name || !mealPlanData.userId) {
      return res.status(400).json({ error: 'Name and userId are required' });
    }

    // Start transaction
    const supabase = createServerSupabaseClient();
    const { data: newMealPlan, error: mealPlanError } = await supabase
      .from('meal_plans')
      .insert({
        name: mealPlanData.name,
        user_id: mealPlanData.userId,
        start_date: mealPlanData.startDate.toISOString(),
        end_date: mealPlanData.endDate.toISOString(),
        shopping_list: mealPlanData.shoppingList || [],
        total_calories: mealPlanData.totalCalories || 0,
        status: mealPlanData.status || 'draft',
        nutrition_goals: mealPlanData.nutritionGoals || null,
        is_template: mealPlanData.isTemplate || false,
        shared_with: mealPlanData.sharedWith || [],
      })
      .select()
      .single();

    if (mealPlanError) {
      console.error('Error creating meal plan:', mealPlanError);
      return res.status(500).json({ error: 'Failed to create meal plan' });
    }

    // Insert planned meals if any
    if (mealPlanData.meals && mealPlanData.meals.length > 0) {
      const plannedMealsData = mealPlanData.meals.map(meal => ({
        meal_plan_id: newMealPlan.id,
        recipe_id: meal.recipeId,
        date: meal.date.toISOString(),
        meal_type: meal.mealType,
        servings: meal.servings,
        prep_status: meal.prepStatus || 'planned',
        notes: meal.notes || '',
        ingredients: meal.ingredients || [],
      }));

      const { error: mealsError } = await supabase.from('planned_meals').insert(plannedMealsData);

      if (mealsError) {
        console.error('Error creating planned meals:', mealsError);
        // Clean up meal plan if meals failed to insert
        await supabase.from('meal_plans').delete().eq('id', newMealPlan.id);
        return res.status(500).json({ error: 'Failed to create planned meals' });
      }
    }

    // Return the created meal plan
    const createdMealPlan: MealPlan = {
      id: newMealPlan.id,
      name: newMealPlan.name,
      userId: newMealPlan.user_id,
      startDate: new Date(newMealPlan.start_date),
      endDate: new Date(newMealPlan.end_date),
      meals: mealPlanData.meals || [],
      shoppingList: newMealPlan.shopping_list || [],
      totalCalories: newMealPlan.total_calories || 0,
      status: newMealPlan.status,
      createdAt: new Date(newMealPlan.created_at),
      updatedAt: new Date(newMealPlan.updated_at),
      nutritionGoals: newMealPlan.nutrition_goals || undefined,
      isTemplate: newMealPlan.is_template || false,
      sharedWith: newMealPlan.shared_with || [],
    };

    res.status(201).json({ mealPlan: createdMealPlan });
  } catch (error) {
    console.error('Error in meal plans POST:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
