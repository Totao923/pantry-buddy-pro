import type { NextApiRequest, NextApiResponse } from 'next';
import { cookingSessionService } from '../../../lib/services/cookingSessionService';
import { createSupabaseClient } from '../../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { recipe_id, type } = req.query;

    // Handle authentication - check if user is authenticated
    const supabase = createSupabaseClient();
    const authHeader = req.headers.authorization;

    let user = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser(token);
        if (!error && authUser) {
          user = authUser;
        }
      } catch (error) {
        console.log('Auth token validation failed:', error);
      }
    }

    // For unauthenticated users, return empty/default data instead of errors
    if (!user) {
      console.log('User not authenticated, returning empty stats');

      switch (type) {
        case 'recipe':
          return res.status(200).json({
            success: true,
            data: { totalCooks: 0, averageRating: 0, lastCooked: null },
          });
        case 'popular':
          return res.status(200).json({
            success: true,
            data: [],
          });
        case 'user':
          return res.status(200).json({
            success: true,
            data: {
              preferences: null,
              streak: { current: 0, longest: 0 },
              recentActivity: [],
            },
          });
        default:
          return res.status(400).json({
            error: 'Invalid stats type. Use: recipe, popular, or user',
          });
      }
    }

    switch (type) {
      case 'recipe':
        // Get stats for a specific recipe
        if (!recipe_id || typeof recipe_id !== 'string') {
          return res.status(400).json({ error: 'recipe_id is required for recipe stats' });
        }

        const recipeStats = await cookingSessionService.getRecipeCookingStats(recipe_id);
        return res.status(200).json({ success: true, data: recipeStats });

      case 'popular':
        // Get popular recipes
        const limit = parseInt(req.query.limit as string) || 10;
        const popularRecipes = await cookingSessionService.getPopularRecipes(limit);
        return res.status(200).json({ success: true, data: popularRecipes });

      case 'user':
        // Get user's cooking preferences and stats
        const userPreferences = await cookingSessionService.getUserCookingPreferences();
        const streak = await cookingSessionService.getCookingStreak();
        const recentActivity = await cookingSessionService.getUserRecentCookingActivity(30);

        return res.status(200).json({
          success: true,
          data: {
            preferences: userPreferences,
            streak,
            recentActivity,
          },
        });

      default:
        return res.status(400).json({
          error: 'Invalid stats type. Use: recipe, popular, or user',
        });
    }
  } catch (error) {
    console.error('Cooking stats API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
