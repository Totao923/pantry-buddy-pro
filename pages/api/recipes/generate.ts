import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { CuisineType, Ingredient, Recipe } from '../../../types';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import { validateAndSanitize, GenerateRecipeSchema } from '../../../lib/validation/schemas';
import { checkRecipeLimit, type SubscriptionRequest } from '../../../lib/middleware/subscription';
import { UsageTrackingService } from '../../../lib/services/usageTrackingService';

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
  req: SubscriptionRequest,
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
    const { ingredients, cuisine, servings = 4, preferences, aiSuggestedContext } = validatedData;

    // Use authenticated user ID
    const userId = req.user.id;

    // Transform validated ingredients to expected format
    const transformedIngredients = ingredients.map(ing => ({
      id: ing.id || Math.random().toString(36).substr(2, 9),
      name: ing.name,
      category: ing.category as any,
      quantity: ing.quantity,
      unit: ing.unit,
    }));

    // Generate recipe using AI service
    const startTime = Date.now();
    const result = await aiService.generateRecipe(
      {
        ingredients: transformedIngredients,
        cuisine: cuisine as any,
        servings,
        preferences,
        aiSuggestedContext, // Pass AI nutritionist context
      },
      userId
    );

    // Get usage stats
    const usageStats = await aiService.getUsageStats(userId);

    const responseTime = Date.now() - startTime;

    if (result.success && result.recipe) {
      // Track successful recipe generation
      await UsageTrackingService.trackRecipeGeneration(userId, 0, 0);

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
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate recipe',
        usageStats,
      });
    }
  } catch (error: unknown) {
    console.error('Recipe generation API error:', error);
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

// Apply security middleware with authentication requirement and subscription limits
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 20 }, // Lower limit for AI operations
  allowedMethods: ['POST'],
  maxBodySize: 50 * 1024, // 50KB for recipe data
})(withAuth(checkRecipeLimit(generateRecipeHandler)));
