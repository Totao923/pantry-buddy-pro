import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../lib/supabase/client';
import { withApiAuth } from '../../../lib/auth/middleware';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

interface UpdateChildFriendlyRequest {
  recipeId: string;
  isChildFriendly: boolean;
  childFriendlyNotes?: string;
  allergenInfo?: string[];
  ageAppropriateFrom?: number; // age in months
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = createSupabaseServiceClient();
    switch (req.method) {
      case 'GET':
        // Get child-friendly recipes
        const { age, excludeAllergens } = req.query;

        let query = supabase
          .from('recipes')
          .select(
            'id, name, description, image_url, is_child_friendly, child_friendly_notes, allergen_info, age_appropriate_from'
          )
          .eq('is_child_friendly', true)
          .eq('user_id', userId);

        // Filter by age if provided
        if (age) {
          const ageInMonths = parseInt(age as string);
          if (!isNaN(ageInMonths)) {
            query = query.or(
              `age_appropriate_from.is.null,age_appropriate_from.lte.${ageInMonths}`
            );
          }
        }

        const { data: recipes, error: fetchError } = await query.order('created_at', {
          ascending: false,
        });

        if (fetchError) {
          return res.status(500).json({ error: 'Failed to fetch child-friendly recipes' });
        }

        // Filter out recipes with excluded allergens if specified
        let filteredRecipes = recipes || [];
        if (excludeAllergens && typeof excludeAllergens === 'string') {
          const allergenList = excludeAllergens.split(',').map(a => a.trim().toLowerCase());
          filteredRecipes = filteredRecipes.filter(recipe => {
            if (!recipe.allergen_info || !Array.isArray(recipe.allergen_info)) return true;
            const recipeAllergens = recipe.allergen_info.map(a => String(a).toLowerCase());
            return !allergenList.some(allergen => recipeAllergens.includes(allergen));
          });
        }

        return res.status(200).json({ recipes: filteredRecipes });

      case 'POST':
        // Update recipe child-friendly settings
        const { recipeId, isChildFriendly, childFriendlyNotes, allergenInfo, ageAppropriateFrom } =
          req.body as UpdateChildFriendlyRequest;

        if (!recipeId) {
          return res.status(400).json({ error: 'Recipe ID is required' });
        }

        // Verify user owns the recipe
        const { data: recipe } = await supabase
          .from('recipes')
          .select('user_id')
          .eq('id', recipeId)
          .single();

        if (!recipe || recipe.user_id !== userId) {
          return res.status(404).json({ error: 'Recipe not found or not owned by user' });
        }

        // Prepare update data
        const updateData: any = {
          is_child_friendly: isChildFriendly,
        };

        if (isChildFriendly) {
          if (childFriendlyNotes) updateData.child_friendly_notes = childFriendlyNotes;
          if (allergenInfo) updateData.allergen_info = allergenInfo;
          if (ageAppropriateFrom !== undefined)
            updateData.age_appropriate_from = ageAppropriateFrom;
        } else {
          // Clear child-friendly data if setting to false
          updateData.child_friendly_notes = null;
          updateData.allergen_info = null;
          updateData.age_appropriate_from = null;
        }

        const { error: updateError } = await supabase
          .from('recipes')
          .update(updateData)
          .eq('id', recipeId);

        if (updateError) {
          return res.status(500).json({ error: 'Failed to update recipe child-friendly settings' });
        }

        return res.status(200).json({
          success: true,
          message: `Recipe ${isChildFriendly ? 'marked as' : 'unmarked from'} child-friendly`,
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Child-friendly recipes error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
