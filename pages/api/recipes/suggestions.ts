import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';

interface SuggestionsResponse {
  success: boolean;
  suggestions: string[];
  error?: string;
}

async function suggestionsHandler(
  req: AuthenticatedRequest,
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
    const sanitizedError = sanitizeError(error, process.env.NODE_ENV === 'development');

    return res.status(500).json({
      success: false,
      suggestions: [],
      error: sanitizedError.error || 'Internal server error',
    });
  }
}

// Apply security middleware with authentication requirement
export default withSecurity({
  rateLimit: { windowMs: 15 * 60 * 1000, max: 30 }, // Moderate limit for suggestions
  allowedMethods: ['GET'],
  maxBodySize: 1024, // Small body for GET requests
})(withAuth(suggestionsHandler));
