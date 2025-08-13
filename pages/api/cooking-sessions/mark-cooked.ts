import type { NextApiRequest, NextApiResponse } from 'next';
import { cookingSessionService } from '../../../lib/services/cookingSessionService';

interface MarkCookedRequest {
  recipe_id: string;
  recipe_title: string;
  recipe_data?: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { recipe_id, recipe_title, recipe_data }: MarkCookedRequest = req.body;

    if (!recipe_id || !recipe_title) {
      return res.status(400).json({
        error: 'Missing required fields: recipe_id and recipe_title',
      });
    }

    const session = await cookingSessionService.markRecipeAsCooked(
      recipe_id,
      recipe_title,
      recipe_data
    );

    return res.status(201).json({
      success: true,
      data: session,
      message: 'Recipe marked as cooked successfully!',
    });
  } catch (error) {
    console.error('Mark cooked API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
