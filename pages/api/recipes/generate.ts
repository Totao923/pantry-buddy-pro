import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { CuisineType, Ingredient, Recipe } from '../../../types';

interface GenerateRecipeRequest {
  ingredients: Ingredient[];
  cuisine: CuisineType;
  servings?: number;
  preferences?: {
    maxTime?: number;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    dietary?: string[];
    spiceLevel?: 'mild' | 'medium' | 'hot' | 'extra-hot';
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };
  userId?: string;
}

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

export default async function handler(
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
    const {
      ingredients,
      cuisine,
      servings = 4,
      preferences,
      userId = 'anonymous',
    }: GenerateRecipeRequest = req.body;

    // Validate required fields
    if (!ingredients || !cuisine) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ingredients and cuisine',
      });
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one ingredient is required',
      });
    }

    // Validate servings
    if (servings < 1 || servings > 12) {
      return res.status(400).json({
        success: false,
        error: 'Servings must be between 1 and 12',
      });
    }

    // Generate recipe using AI service
    const startTime = Date.now();
    const result = await aiService.generateRecipe(
      {
        ingredients,
        cuisine,
        servings,
        preferences,
      },
      userId
    );

    // Get usage stats
    const usageStats = await aiService.getUsageStats(userId);

    const responseTime = Date.now() - startTime;

    if (result.success && result.recipe) {
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
  } catch (error) {
    console.error('Recipe generation API error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
