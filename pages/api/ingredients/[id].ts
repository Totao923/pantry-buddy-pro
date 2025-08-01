import type { NextApiRequest, NextApiResponse } from 'next';
import { Ingredient, IngredientCategory } from '../../../types';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import { validateAndSanitize, UpdateIngredientSchema } from '../../../lib/validation/schemas';
import { createUserSupabaseClient } from '../../../lib/supabase/server';

interface IngredientResponse {
  success: boolean;
  ingredient?: Ingredient;
  error?: string;
}

async function ingredientHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse<IngredientResponse>
) {
  const { method, query } = req;
  const { id } = query;

  if (typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ingredient ID',
    });
  }

  try {
    // Create user-scoped Supabase client (enforces RLS)
    const supabase = createUserSupabaseClient(req.headers.authorization!.replace('Bearer ', ''));

    switch (method) {
      case 'GET':
        return await handleGetIngredient(req, res, supabase, id);
      case 'PUT':
        return await handleUpdateIngredient(req, res, supabase, id);
      case 'DELETE':
        return await handleDeleteIngredient(req, res, supabase, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: `Method ${method} not allowed`,
        });
    }
  } catch (error) {
    console.error('Ingredient API error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');
    return res.status(500).json({
      success: false,
      error: sanitizedError.error,
    });
  }
}

async function handleGetIngredient(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  supabase: any,
  id: string
) {
  const { data: ingredient, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }
    throw new Error(`Database error: ${error.message}`);
  }

  return res.status(200).json({
    success: true,
    ingredient,
  });
}

async function handleUpdateIngredient(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  supabase: any,
  id: string
) {
  // Validate and sanitize input
  const validatedData = validateAndSanitize(UpdateIngredientSchema, req.body);

  const { data: ingredient, error } = await supabase
    .from('pantry_items')
    .update({
      ...validatedData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ingredient name already exists',
        code: 'DUPLICATE_INGREDIENT',
      });
    }
    throw new Error(`Database error: ${error.message}`);
  }

  return res.status(200).json({
    success: true,
    ingredient,
  });
}

async function handleDeleteIngredient(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  supabase: any,
  id: string
) {
  const { data: ingredient, error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }
    throw new Error(`Database error: ${error.message}`);
  }

  return res.status(200).json({
    success: true,
    ingredient,
  });
}

// Apply security middleware with authentication requirement
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 50 },
  allowedMethods: ['GET', 'PUT', 'DELETE'],
  maxBodySize: 10 * 1024,
})(withAuth(ingredientHandler));
