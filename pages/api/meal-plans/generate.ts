import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { Ingredient, Recipe, DifficultyLevel } from '../../../types';

interface GenerateMealPlanRequest {
  ingredients: Ingredient[];
  userId: string;
  preferences?: {
    maxTime?: number;
    difficulty?: DifficultyLevel;
  };
}

interface WeekDay {
  day: string;
  date: string;
  meals: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
  };
}

interface GenerateMealPlanResponse {
  success: boolean;
  weekPlan?: WeekDay[];
  error?: string;
}

async function generateMealPlanHandler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateMealPlanResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    const { ingredients, userId, preferences } = req.body as GenerateMealPlanRequest;

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one ingredient is required',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    // Generate week structure
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'] as const;
    const cuisineVariety = [
      'italian',
      'asian',
      'mexican',
      'american',
      'mediterranean',
      'indian',
      'any',
    ];

    const weekWithMeals: WeekDay[] = [];

    // Generate meals for each day
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + dayIndex);

      const dayPlan: WeekDay = {
        day: dayNames[dayIndex],
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        meals: {},
      };

      // Generate meals for each meal type
      for (const mealType of mealTypes) {
        try {
          // Add variety by using different ingredients and cuisines
          const ingredientVariety = [...ingredients];

          // Shuffle ingredients and take a subset for variety
          for (let i = ingredientVariety.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ingredientVariety[i], ingredientVariety[j]] = [
              ingredientVariety[j],
              ingredientVariety[i],
            ];
          }

          const selectedIngredients = ingredientVariety.slice(0, Math.min(8, ingredients.length));
          const selectedCuisine = cuisineVariety[Math.floor(Math.random() * cuisineVariety.length)];

          // Vary time constraints by meal type and add randomness
          const baseTime = mealType === 'breakfast' ? 30 : mealType === 'lunch' ? 45 : 60;
          const timeVariation = Math.floor(Math.random() * 20) - 10; // ±10 minutes
          const maxTime = Math.max(15, baseTime + timeVariation);

          const response = await aiService.generateRecipe(
            {
              ingredients: selectedIngredients,
              cuisine: selectedCuisine as any,
              servings: 2,
              preferences: {
                maxTime,
                difficulty: preferences?.difficulty || 'Easy',
                // Add meal-specific preferences for variety
                mealType: mealType,
                dayOfWeek: dayNames[dayIndex],
                avoidRepeat: true,
              },
            },
            userId
          );

          if (response.success && response.recipe) {
            dayPlan.meals[mealType] = response.recipe;
          }

          // Add small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error generating ${mealType} for ${dayNames[dayIndex]}:`, error);
        }
      }

      weekWithMeals.push(dayPlan);
    }

    return res.status(200).json({
      success: true,
      weekPlan: weekWithMeals,
    });
  } catch (error: unknown) {
    console.error('Meal plan generation API error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Export without authentication middleware to match existing meal plans API pattern
export default generateMealPlanHandler;
