import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { Recipe } from '../../../types';

interface EnhanceRecipeRequest {
  originalRecipe: Recipe;
  enhancement: 'add-tips' | 'create-variations' | 'improve-instructions' | 'optimize-nutrition';
  userFeedback?: {
    rating?: number;
    comments?: string;
    issues?: string[];
  };
}

interface EnhanceRecipeResponse {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  metadata?: {
    model: string;
    provider: string;
    responseTime: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnhanceRecipeResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    const { originalRecipe, enhancement, userFeedback }: EnhanceRecipeRequest = req.body;

    // Validate required fields
    if (!originalRecipe || !enhancement) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: originalRecipe and enhancement',
      });
    }

    // Validate enhancement type
    const validEnhancements = [
      'add-tips',
      'create-variations',
      'improve-instructions',
      'optimize-nutrition',
    ];
    if (!validEnhancements.includes(enhancement)) {
      return res.status(400).json({
        success: false,
        error: `Invalid enhancement type. Must be one of: ${validEnhancements.join(', ')}`,
      });
    }

    // Enhance recipe using AI service
    const startTime = Date.now();
    const result = await aiService.enhanceRecipe(originalRecipe, enhancement, userFeedback);
    const responseTime = Date.now() - startTime;

    if (result.success && result.recipe) {
      return res.status(200).json({
        success: true,
        recipe: result.recipe,
        metadata: {
          model: result.metadata?.model || 'unknown',
          provider: result.metadata?.provider || 'unknown',
          responseTime,
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to enhance recipe',
      });
    }
  } catch (error) {
    console.error('Recipe enhancement API error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
