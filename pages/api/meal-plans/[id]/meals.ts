import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../../../lib/supabase/server';
import { PlannedMeal } from '../../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query; // meal plan ID

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Meal plan ID is required' });
  }

  if (req.method === 'POST') {
    return handlePost(req, res, id);
  } else if (req.method === 'PUT') {
    return handlePut(req, res, id);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, id);
  }

  res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
  res.status(405).json({ error: 'Method not allowed' });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, mealPlanId: string) {
  try {
    console.log('🍽️ Meals API: POST request received for meal plan:', mealPlanId);
    const mealData: Omit<PlannedMeal, 'id'> = req.body;

    console.log('🍽️ Meals API: Request data:', {
      recipeId: mealData.recipeId,
      recipeIdType: typeof mealData.recipeId,
      date: mealData.date,
      dateType: typeof mealData.date,
      mealType: mealData.mealType,
      servings: mealData.servings,
      prepStatus: mealData.prepStatus,
    });

    if (!mealData.recipeId || !mealData.date || !mealData.mealType) {
      console.error('❌ Meals API: Missing required fields:', {
        hasRecipeId: !!mealData.recipeId,
        hasDate: !!mealData.date,
        hasMealType: !!mealData.mealType,
      });
      return res.status(400).json({ error: 'Recipe ID, date, and meal type are required' });
    }

    const supabase = createServerSupabaseClient();
    console.log('🗄️ Meals API: Attempting to insert to database:', {
      meal_plan_id: mealPlanId,
      recipe_id: mealData.recipeId,
      date: new Date(mealData.date).toISOString(),
      meal_type: mealData.mealType,
      servings: mealData.servings || 2,
    });

    const { data: newMeal, error } = await supabase
      .from('planned_meals')
      .insert({
        meal_plan_id: mealPlanId,
        recipe_id: mealData.recipeId,
        date: new Date(mealData.date).toISOString(),
        meal_type: mealData.mealType,
        servings: mealData.servings || 2,
        prep_status: mealData.prepStatus || 'planned',
        notes: mealData.notes || '',
        ingredients: mealData.ingredients || [],
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Meals API: Database error adding meal to plan:', {
        error: error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return res.status(500).json({
        error: 'Failed to add meal to plan',
        details: error.message,
        code: error.code,
      });
    }

    const plannedMeal: PlannedMeal = {
      id: newMeal.id,
      recipeId: newMeal.recipe_id,
      date: new Date(newMeal.date),
      mealType: newMeal.meal_type,
      servings: newMeal.servings,
      prepStatus: newMeal.prep_status,
      notes: newMeal.notes,
      ingredients: newMeal.ingredients,
    };

    console.log('✅ Meals API: Sending success response:', { meal: plannedMeal });
    res.status(201).json({ meal: plannedMeal });
  } catch (error) {
    console.error('Error in meal POST:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, mealPlanId: string) {
  try {
    const { mealId, updates } = req.body;

    if (!mealId) {
      return res.status(400).json({ error: 'Meal ID is required for updates' });
    }

    const supabase = createServerSupabaseClient();
    const { data: updatedMeal, error } = await supabase
      .from('planned_meals')
      .update({
        recipe_id: updates.recipeId,
        date: updates.date ? new Date(updates.date).toISOString() : undefined,
        meal_type: updates.mealType,
        servings: updates.servings,
        prep_status: updates.prepStatus,
        notes: updates.notes,
        ingredients: updates.ingredients,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mealId)
      .eq('meal_plan_id', mealPlanId)
      .select()
      .single();

    if (error) {
      console.error('Error updating planned meal:', error);
      return res.status(500).json({ error: 'Failed to update meal' });
    }

    const plannedMeal: PlannedMeal = {
      id: updatedMeal.id,
      recipeId: updatedMeal.recipe_id,
      date: new Date(updatedMeal.date),
      mealType: updatedMeal.meal_type,
      servings: updatedMeal.servings,
      prepStatus: updatedMeal.prep_status,
      notes: updatedMeal.notes,
      ingredients: updatedMeal.ingredients,
    };

    res.status(200).json({ meal: plannedMeal });
  } catch (error) {
    console.error('Error in meal PUT:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, mealPlanId: string) {
  try {
    const { mealId } = req.body;

    if (!mealId) {
      return res.status(400).json({ error: 'Meal ID is required for deletion' });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from('planned_meals')
      .delete()
      .eq('id', mealId)
      .eq('meal_plan_id', mealPlanId);

    if (error) {
      console.error('Error deleting planned meal:', error);
      return res.status(500).json({ error: 'Failed to delete meal' });
    }

    res.status(200).json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Error in meal DELETE:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
