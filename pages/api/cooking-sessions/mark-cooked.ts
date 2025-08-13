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
    console.log('Mark cooked API called with body:', req.body);
    const { recipe_id, recipe_title, recipe_data }: MarkCookedRequest = req.body;

    if (!recipe_id || !recipe_title) {
      console.log('Missing required fields:', { recipe_id, recipe_title });
      return res.status(400).json({
        error: 'Missing required fields: recipe_id and recipe_title',
        received: { recipe_id, recipe_title },
      });
    }

    console.log('Calling cookingSessionService.markRecipeAsCooked with:', {
      recipe_id,
      recipe_title,
      has_recipe_data: !!recipe_data,
    });

    const session = await cookingSessionService.markRecipeAsCooked(
      recipe_id,
      recipe_title,
      recipe_data
    );

    console.log('Successfully created cooking session:', session.id);

    return res.status(201).json({
      success: true,
      data: session,
      message: 'Recipe marked as cooked successfully!',
    });
  } catch (error) {
    console.error('Mark cooked API error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      name: error instanceof Error ? error.name : 'Unknown',
      error,
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      debug: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
}
