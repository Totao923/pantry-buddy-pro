import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';

interface SuggestionsRequest {
  cuisinePreference?: string;
  mood?: string;
  count?: number;
}

interface SuggestionsResponse {
  success: boolean;
  suggestions: string[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuggestionsResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      suggestions: [],
      error: 'Method not allowed. Use GET.',
    });
  }

  try {
    const { cuisinePreference, mood, count } = req.query;
    const countValue = typeof count === 'string' ? count : '5';

    // Validate count
    const suggestionCount = Math.min(Math.max(parseInt(countValue) || 5, 1), 10);

    // Get suggestions from AI service
    const suggestions = await aiService.getRecipeSuggestions(
      typeof cuisinePreference === 'string' ? cuisinePreference : undefined,
      typeof mood === 'string' ? mood : undefined
    );

    // Limit to requested count
    const limitedSuggestions = suggestions.slice(0, suggestionCount);

    return res.status(200).json({
      success: true,
      suggestions: limitedSuggestions,
    });
  } catch (error) {
    console.error('Recipe suggestions API error:', error);

    return res.status(500).json({
      success: false,
      suggestions: [],
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
