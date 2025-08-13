import type { NextApiRequest, NextApiResponse } from 'next';
import { Ingredient, IngredientCategory } from '../../../types';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import { validateAndSanitize, CreateIngredientSchema } from '../../../lib/validation/schemas';
import { createUserSupabaseClient } from '../../../lib/supabase/server';
import { withSubscription, type SubscriptionRequest } from '../../../lib/middleware/subscription';

interface IngredientsResponse {
  success: boolean;
  ingredients?: Ingredient[];
  error?: string;
}

async function ingredientsHandler(
  req: SubscriptionRequest,
  res: NextApiResponse<IngredientsResponse | Ingredient>
) {
  const { method } = req;

  try {
    // Create user-scoped Supabase client (enforces RLS)
    const supabase = createUserSupabaseClient(req.headers.authorization!.replace('Bearer ', ''));

    switch (method) {
      case 'GET':
        return await handleGetIngredients(req, res, supabase);
      case 'POST':
        return await handleCreateIngredient(req, res, supabase);
      case 'DELETE':
        return await handleDeleteAllIngredients(req, res, supabase);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        return res.status(405).json({
          success: false,
          error: `Method ${method} not allowed`,
        });
    }
  } catch (error: unknown) {
    console.error('Ingredients API error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');
    return res.status(500).json({
      success: false,
      error: sanitizedError.error || 'Internal server error',
    });
  }
}

async function handleGetIngredients(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  supabase: any
) {
  // RLS will automatically filter by user_id
  const { data: ingredients, error } = await supabase
    .from('pantry_items')
    .select('*')
    .order('name');

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return res.status(200).json({
    success: true,
    ingredients: ingredients || [],
    count: ingredients?.length || 0,
  });
}

async function handleCreateIngredient(
  req: SubscriptionRequest,
  res: NextApiResponse,
  supabase: any
) {
  // Validate and sanitize input
  const validatedData = validateAndSanitize(CreateIngredientSchema, req.body);

  // Check current pantry count
  const { count: currentCount, error: countError } = await supabase
    .from('pantry_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', req.user.id);

  if (countError) {
    throw new Error(`Failed to check pantry count: ${countError.message}`);
  }

  // Check if user can add more pantry items
  const { allowed, remaining } = await req.subscription.canAddPantryItem(currentCount || 0);

  if (!allowed) {
    return res.status(402).json({
      success: false,
      error: 'Pantry item limit reached',
      code: 'PANTRY_LIMIT_EXCEEDED',
      currentCount,
      remaining: 0,
      upgradeUrl: '/dashboard/subscription',
    });
  }

  // Create ingredient with user ID (RLS will enforce ownership)
  const { data: ingredient, error } = await supabase
    .from('pantry_items')
    .insert([
      {
        ...validatedData,
        user_id: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Ingredient already exists',
        code: 'DUPLICATE_INGREDIENT',
      });
    }
    throw new Error(`Database error: ${error.message}`);
  }

  return res.status(201).json({
    success: true,
    ingredient,
  });
}

async function handleDeleteAllIngredients(
  req: SubscriptionRequest,
  res: NextApiResponse,
  supabase: any
) {
  // Delete all user's ingredients (RLS enforces user_id filter)
  const { error } = await supabase.from('pantry_items').delete().eq('user_id', req.user.id);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return res.status(200).json({
    success: true,
    ingredients: [],
  });
}

// Apply security middleware with authentication requirement and subscription limits
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 },
  allowedMethods: ['GET', 'POST', 'DELETE'],
  maxBodySize: 10 * 1024,
})(withAuth(withSubscription(ingredientsHandler)));
