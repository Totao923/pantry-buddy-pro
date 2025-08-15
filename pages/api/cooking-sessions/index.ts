import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { withSecurity, sanitizeError } from '../../../lib/middleware/enhanced-security';
import {
  cookingSessionService,
  CookingSessionInput,
} from '../../../lib/services/cookingSessionService';

async function cookingSessionsHandler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'POST':
        // Create a new cooking session
        const sessionData: CookingSessionInput = {
          ...req.body,
          user_id: req.user.id,
        };

        if (!sessionData.recipe_id || !sessionData.recipe_title) {
          return res.status(400).json({
            error: 'Missing required fields: recipe_id and recipe_title',
          });
        }

        const newSession = await cookingSessionService.createCookingSession(sessionData);
        return res.status(201).json({ success: true, data: newSession });

      case 'GET':
        // Get user's cooking sessions
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const sessions = await cookingSessionService.getUserCookingSessions(
          req.user.id,
          limit,
          offset
        );
        return res.status(200).json({ success: true, data: sessions });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Cooking sessions API error:', error);
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
  allowedMethods: ['GET', 'POST'],
  maxBodySize: 10 * 1024,
})(withAuth(cookingSessionsHandler));
