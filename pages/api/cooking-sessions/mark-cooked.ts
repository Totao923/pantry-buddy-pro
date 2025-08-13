import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import { createUserSupabaseClient } from '../../../lib/supabase/server';

interface MarkCookedRequest {
  recipe_id: string;
  recipe_title: string;
  recipe_data?: any;
}

async function markCookedHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    console.log('Mark cooked API called with body:', req.body);
    console.log('Authenticated user:', req.user);

    const { recipe_id, recipe_title, recipe_data }: MarkCookedRequest = req.body;

    if (!recipe_id || !recipe_title) {
      console.log('Missing required fields:', { recipe_id, recipe_title });
      return res.status(400).json({
        error: 'Missing required fields: recipe_id and recipe_title',
        received: { recipe_id, recipe_title },
      });
    }

    // Create user-scoped Supabase client
    const supabase = createUserSupabaseClient(req.headers.authorization!.replace('Bearer ', ''));

    console.log('Creating cooking session with user ID:', req.user.id);

    // Insert cooking session directly with proper auth context
    const { data, error } = await supabase
      .from('cooking_sessions')
      .insert({
        user_id: req.user.id,
        recipe_id,
        recipe_title,
        recipe_data: recipe_data || null,
        recipe_followed_exactly: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Successfully created cooking session:', data.id);

    return res.status(201).json({
      success: true,
      data,
      message: 'Recipe marked as cooked successfully!',
    });
  } catch (error) {
    console.error('Mark cooked API error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      name: error instanceof Error ? error.name : 'Unknown',
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
  allowedMethods: ['POST'],
  maxBodySize: 10 * 1024,
})(withAuth(markCookedHandler));
