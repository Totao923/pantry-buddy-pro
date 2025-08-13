import type { NextApiRequest, NextApiResponse } from 'next';
import { cookingSessionService, CookingSessionInput } from '../../../lib/services/cookingSessionService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'POST':
        // Create a new cooking session
        const sessionData: CookingSessionInput = req.body;
        
        if (!sessionData.recipe_id || !sessionData.recipe_title) {
          return res.status(400).json({
            error: 'Missing required fields: recipe_id and recipe_title'
          });
        }

        const newSession = await cookingSessionService.createCookingSession(sessionData);
        return res.status(201).json({ success: true, data: newSession });

      case 'GET':
        // Get user's cooking sessions
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;
        
        const sessions = await cookingSessionService.getUserCookingSessions(limit, offset);
        return res.status(200).json({ success: true, data: sessions });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Cooking sessions API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}