import type { NextApiRequest, NextApiResponse } from 'next';
import { cookingSessionService } from '../../../../lib/services/cookingSessionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { recipeId } = req.query;

  if (!recipeId || typeof recipeId !== 'string') {
    return res.status(400).json({ error: 'Invalid recipe ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get cooking sessions for this recipe by current user
        const sessions = await cookingSessionService.getUserRecipeCookingSessions(recipeId);
        const hasCooked = sessions.length > 0;

        return res.status(200).json({
          success: true,
          data: {
            sessions,
            hasCooked,
            timesCooked: sessions.length,
          },
        });

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Recipe cooking sessions API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
