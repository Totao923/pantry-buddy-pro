/**
 * SECURE VERSION of ingredients API endpoint
 * This is how the current API endpoints should be refactored
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import {
  validateAndSanitize,
  CreateIngredientSchema,
  UpdateIngredientSchema,
} from '../../../lib/validation/schemas';
import { createUserSupabaseClient } from '../../../lib/supabase/server';

/**
 * SECURE Ingredients API - GET /api/secure/ingredients
 * - Requires authentication
 * - Rate limited
 * - Input validated
 * - RLS enforced
 */
async function ingredientsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    // Create user-scoped Supabase client (enforces RLS)
    const supabase = createUserSupabaseClient(req.headers.authorization!.replace('Bearer ', ''));

    switch (method) {
      case 'GET':
        return await handleGetIngredients(req, res, supabase);
      case 'POST':
        return await handleCreateIngredient(req, res, supabase);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED',
        });
    }
  } catch (error) {
    console.error('Ingredients API error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');
    return res.status(500).json(sanitizedError);
  }
}

async function handleGetIngredients(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  supabase: any
) {
  try {
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
  } catch (error) {
    throw error;
  }
}

async function handleCreateIngredient(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  supabase: any
) {
  try {
    // Validate and sanitize input
    const validatedData = validateAndSanitize(CreateIngredientSchema, req.body);

    // Create ingredient with user ID (RLS will enforce ownership)
    const { data: ingredient, error } = await supabase
      .from('pantry_items')
      .insert([
        {
          ...validatedData,
          user_id: req.user.id, // Explicit user association
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return res.status(409).json({
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR',
      });
    }
    throw error;
  }
}

// Apply security middleware with authentication requirement
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
  allowedMethods: ['GET', 'POST'],
  maxBodySize: 10 * 1024, // 10KB max body size
})(withAuth(ingredientsHandler));
