import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, type AuthenticatedRequest } from '../../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../../lib/middleware/enhanced-security';
import { createUserSupabaseClient } from '../../../../lib/supabase/server';

async function recipeSessionsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { recipeId } = req.query;

  if (!recipeId || typeof recipeId !== 'string') {
    return res.status(400).json({ error: 'Invalid recipe ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        console.log('Fetching cooking sessions for recipe:', recipeId);
        console.log('Authenticated user:', req.user);

        // Create user-scoped Supabase client
        const supabase = createUserSupabaseClient(
          req.headers.authorization!.replace('Bearer ', '')
        );

        // Get cooking sessions for this recipe by current user (RLS will enforce user filtering)
        const { data: sessions, error } = await supabase
          .from('cooking_sessions')
          .select('*')
          .eq('recipe_id', recipeId)
          .order('cooked_at', { ascending: false });

        if (error) {
          console.error('Supabase query error:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        const hasCooked = sessions.length > 0;

        console.log('Found cooking sessions:', { count: sessions.length, hasCooked });

        return res.status(200).json({
          success: true,
          data: {
            sessions: sessions || [],
            hasCooked,
            timesCooked: sessions.length,
          },
        });

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Recipe cooking sessions API error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      recipeId,
      error,
    });
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
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  allowedMethods: ['GET'],
  maxBodySize: 1 * 1024,
})(withAuth(recipeSessionsHandler));
