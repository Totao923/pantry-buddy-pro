import type { NextApiRequest, NextApiResponse } from 'next';
import { cookingSessionService } from '../../../lib/services/cookingSessionService';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import { createUserSupabaseClient } from '../../../lib/supabase/server';

async function statsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { recipe_id, type } = req.query;

    console.log('Stats API called with authenticated user:', req.user);

    // Create user-scoped Supabase client
    const supabase = createUserSupabaseClient(req.headers.authorization!.replace('Bearer ', ''));

    switch (type) {
      case 'recipe':
        // Get stats for a specific recipe
        if (!recipe_id || typeof recipe_id !== 'string') {
          return res.status(400).json({ error: 'recipe_id is required for recipe stats' });
        }

        const { data: recipeStatsData, error: recipeStatsError } = await supabase
          .from('recipe_cooking_stats')
          .select('*')
          .eq('recipe_id', recipe_id)
          .single();

        return res.status(200).json({
          success: true,
          data: recipeStatsData || { totalCooks: 0, averageRating: 0, lastCooked: null },
        });

      case 'popular':
        // Get popular recipes
        const limit = parseInt(req.query.limit as string) || 10;
        const { data: popularData, error: popularError } = await supabase
          .from('recipe_cooking_stats')
          .select('*')
          .order('total_times_cooked', { ascending: false })
          .limit(limit);

        return res.status(200).json({ success: true, data: popularData || [] });

      case 'user':
        // Get user's cooking preferences and stats directly from database
        const [prefsResult, sessionsResult] = await Promise.all([
          supabase.from('user_cooking_preferences').select('*').eq('user_id', req.user.id).single(),
          supabase
            .from('cooking_sessions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('cooked_at', { ascending: false })
            .limit(30),
        ]);

        const preferences = prefsResult.data;
        const sessions = sessionsResult.data || [];

        // Calculate streak from sessions
        let currentStreak = 0;
        let longestStreak = 0;

        if (sessions.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Group sessions by date
          const sessionsByDate = new Map();
          sessions.forEach(session => {
            const date = new Date(session.cooked_at);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            if (!sessionsByDate.has(dateKey)) {
              sessionsByDate.set(dateKey, []);
            }
            sessionsByDate.get(dateKey).push(session);
          });

          // Calculate current and longest streak
          const sortedDates = Array.from(sessionsByDate.keys()).sort().reverse();
          let tempStreak = 0;

          for (let i = 0; i < sortedDates.length; i++) {
            const currentDate = new Date(sortedDates[i]);

            if (i === 0) {
              const daysDiff = Math.floor(
                (today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (daysDiff <= 1) {
                currentStreak = 1;
                tempStreak = 1;
              }
            } else {
              const prevDate = new Date(sortedDates[i - 1]);
              const daysDiff = Math.floor(
                (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              if (daysDiff === 1) {
                tempStreak++;
                if (currentStreak > 0) currentStreak = tempStreak;
              } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
                if (currentStreak === 0) break;
              }
            }
          }
          longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
        }

        return res.status(200).json({
          success: true,
          data: {
            preferences,
            streak: { current: currentStreak, longest: longestStreak },
            recentActivity: sessions.slice(0, 10),
          },
        });

      default:
        return res.status(400).json({
          error: 'Invalid stats type. Use: recipe, popular, or user',
        });
    }
  } catch (error) {
    console.error('Cooking stats API error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');
    return res.status(500).json({
      success: false,
      error: sanitizedError.error || 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Apply security middleware with authentication requirement
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 200 },
  allowedMethods: ['GET'],
  maxBodySize: 1024,
})(withAuth(statsHandler));
