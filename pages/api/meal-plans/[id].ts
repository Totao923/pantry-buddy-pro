import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../../lib/supabase/server';
import { MealPlan } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Meal plan ID is required' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res, id);
  } else if (req.method === 'PUT') {
    return handlePut(req, res, id);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, id);
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: mealPlan, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching meal plan:', error);
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Transform to MealPlan interface
    const formattedMealPlan: MealPlan = {
      id: mealPlan.id,
      name: mealPlan.name,
      userId: mealPlan.user_id,
      startDate: new Date(mealPlan.start_date),
      endDate: new Date(mealPlan.end_date),
      meals:
        mealPlan.planned_meals?.map((meal: any) => ({
          id: meal.id,
          recipeId: meal.recipe_id,
          date: new Date(meal.date),
          mealType: meal.meal_type,
          servings: meal.servings,
          prepStatus: meal.prep_status || 'planned',
          notes: meal.notes || '',
          ingredients: meal.ingredients || [],
        })) || [],
      shoppingList: mealPlan.shopping_list || [],
      totalCalories: mealPlan.total_calories || 0,
      status: mealPlan.status,
      createdAt: new Date(mealPlan.created_at),
      updatedAt: new Date(mealPlan.updated_at),
      nutritionGoals: mealPlan.nutrition_goals || undefined,
      isTemplate: mealPlan.is_template || false,
      sharedWith: mealPlan.shared_with || [],
    };

    res.status(200).json({ mealPlan: formattedMealPlan });
  } catch (error) {
    console.error('Error in meal plan GET:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const updates = req.body;

    // Update meal plan
    const supabase = createServerSupabaseClient();
    const { data: updatedMealPlan, error: updateError } = await supabase
      .from('meal_plans')
      .update({
        name: updates.name,
        start_date: updates.startDate ? new Date(updates.startDate).toISOString() : undefined,
        end_date: updates.endDate ? new Date(updates.endDate).toISOString() : undefined,
        shopping_list: updates.shoppingList,
        total_calories: updates.totalCalories,
        status: updates.status,
        nutrition_goals: updates.nutritionGoals,
        is_template: updates.isTemplate,
        shared_with: updates.sharedWith,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating meal plan:', updateError);
      return res.status(500).json({ error: 'Failed to update meal plan' });
    }

    res.status(200).json({
      message: 'Meal plan updated successfully',
      mealPlan: {
        id: updatedMealPlan.id,
        name: updatedMealPlan.name,
        userId: updatedMealPlan.user_id,
        startDate: new Date(updatedMealPlan.start_date),
        endDate: new Date(updatedMealPlan.end_date),
        shoppingList: updatedMealPlan.shopping_list || [],
        totalCalories: updatedMealPlan.total_calories || 0,
        status: updatedMealPlan.status,
        createdAt: new Date(updatedMealPlan.created_at),
        updatedAt: new Date(updatedMealPlan.updated_at),
        nutritionGoals: updatedMealPlan.nutrition_goals || undefined,
        isTemplate: updatedMealPlan.is_template || false,
        sharedWith: updatedMealPlan.shared_with || [],
      },
    });
  } catch (error) {
    console.error('Error in meal plan PUT:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Delete planned meals first (cascade should handle this, but being explicit)
    const supabase = createServerSupabaseClient();
    const { error: mealsDeleteError } = await supabase
      .from('planned_meals')
      .delete()
      .eq('meal_plan_id', id);

    if (mealsDeleteError) {
      console.error('Error deleting planned meals:', mealsDeleteError);
      return res.status(500).json({ error: 'Failed to delete planned meals' });
    }

    // Delete meal plan
    const { error: planDeleteError } = await supabase.from('meal_plans').delete().eq('id', id);

    if (planDeleteError) {
      console.error('Error deleting meal plan:', planDeleteError);
      return res.status(500).json({ error: 'Failed to delete meal plan' });
    }

    res.status(200).json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Error in meal plan DELETE:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
