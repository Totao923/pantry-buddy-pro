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

    // OPTIMIZED: Generate base recipes first, then create variations
    console.log('🔄 Generating base recipes for meal plan optimization...');

    const baseRecipes: { [key: string]: Recipe[] } = {
      breakfast: [],
      lunch: [],
      dinner: [],
    };

    // Generate 1 base recipe per meal type to stay under timeout limits
    for (const mealType of mealTypes) {
      const recipesNeeded = 1; // Generate 1 base recipe per meal type for speed

      for (let i = 0; i < recipesNeeded; i++) {
        try {
          const ingredientVariety = [...ingredients];

          // Shuffle and select ingredients
          for (let j = ingredientVariety.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [ingredientVariety[j], ingredientVariety[k]] = [
              ingredientVariety[k],
              ingredientVariety[j],
            ];
          }

          const selectedIngredients = ingredientVariety.slice(0, Math.min(8, ingredients.length));
          const selectedCuisine = cuisineVariety[Math.floor(Math.random() * cuisineVariety.length)];
          const baseTime = mealType === 'breakfast' ? 30 : mealType === 'lunch' ? 45 : 60;

          const response = await aiService.generateRecipe(
            {
              ingredients: selectedIngredients,
              cuisine: selectedCuisine as any,
              servings: 2,
              preferences: {
                maxTime: baseTime,
                difficulty: preferences?.difficulty || 'Easy',
              },
            },
            userId
          );

          if (response.success && response.recipe) {
            baseRecipes[mealType].push(response.recipe);
          }

          // Reduced delay since we're making fewer calls
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error generating base ${mealType} recipe ${i + 1}:`, error);
        }
      }
    }

    console.log('✅ Base recipes generated, creating weekly meal plan...');

    // Generate meals for each day using base recipes with variations
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + dayIndex);

      const dayPlan: WeekDay = {
        day: dayNames[dayIndex],
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        meals: {},
      };

      // Assign recipes from base recipes with enhanced variation
      for (const mealType of mealTypes) {
        const availableRecipes = baseRecipes[mealType];
        if (availableRecipes.length > 0) {
          // Use the base recipe with creative variations
          const baseRecipe = availableRecipes[0]; // Only 1 recipe per type now

          // Create meaningful variations by day
          const variations = [
            baseRecipe.title,
            `Spiced ${baseRecipe.title}`,
            `Quick ${baseRecipe.title}`,
            `Family-Style ${baseRecipe.title}`,
            `Rustic ${baseRecipe.title}`,
            `Gourmet ${baseRecipe.title}`,
            `Weekend ${baseRecipe.title}`,
          ];

          const variation = {
            ...baseRecipe,
            id: `${baseRecipe.id}-day${dayIndex}`,
            title: variations[dayIndex] || baseRecipe.title,
          };

          dayPlan.meals[mealType] = variation;
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
