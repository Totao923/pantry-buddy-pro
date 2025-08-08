import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { CuisineType, Ingredient, Recipe } from '../../../types';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import { validateAndSanitize, GenerateRecipeSchema } from '../../../lib/validation/schemas';

interface GenerateRecipeResponse {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  metadata?: {
    model: string;
    provider: string;
    responseTime: number;
    cacheHit: boolean;
  };
  usageStats?: {
    remainingRequests: number;
    providerStatus: string;
  };
}

async function generateRecipeHandler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateRecipeResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    // Validate and sanitize input
    const validatedData = validateAndSanitize(GenerateRecipeSchema, req.body);
    const { ingredients, cuisine, servings = 4, preferences } = validatedData;

    // Use anonymous user for public endpoint
    const userId = 'public-user';

    // Transform validated ingredients to expected format
    const transformedIngredients = ingredients.map(ing => ({
      id: ing.id || Math.random().toString(36).substr(2, 9),
      name: ing.name,
      category: ing.category as any,
      quantity: ing.quantity,
      unit: ing.unit,
    }));

    console.log('🚀 Public AI recipe generation requested:', {
      ingredientCount: transformedIngredients.length,
      cuisine,
      servings,
      preferences
    });

    // Generate recipe using AI service
    const startTime = Date.now();
    const result = await aiService.generateRecipe(
      {
        ingredients: transformedIngredients,
        cuisine: cuisine as any,
        servings,
        preferences,
      },
      userId
    );

    // Get usage stats
    const usageStats = await aiService.getUsageStats(userId);

    const responseTime = Date.now() - startTime;

    if (result.success && result.recipe) {
      console.log('✅ Public AI recipe generated successfully:', {
        title: result.recipe.title,
        provider: result.metadata?.provider,
        model: result.metadata?.model,
        responseTime
      });

      return res.status(200).json({
        success: true,
        recipe: result.recipe,
        metadata: {
          model: result.metadata?.model || 'unknown',
          provider: result.metadata?.provider || 'unknown',
          responseTime,
          cacheHit: result.metadata?.cacheHit || false,
        },
        usageStats,
      });
    } else {
      console.log('❌ Public AI recipe generation failed:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate recipe',
        usageStats,
      });
    }
  } catch (error: unknown) {
    console.error('Public recipe generation API error:', error);
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');

    if (error instanceof Error && error.message && error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: sanitizedError.error || 'Validation failed',
      });
    }

    return res.status(500).json({
      success: false,
      error: sanitizedError.error || 'Internal server error',
    });
  }
}

// Apply security middleware WITHOUT authentication requirement
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 10 }, // Lower limit for public AI operations
  allowedMethods: ['POST'],
  maxBodySize: 50 * 1024, // 50KB for recipe data
})(generateRecipeHandler);