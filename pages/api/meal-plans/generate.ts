import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { Ingredient, Recipe, DifficultyLevel } from '../../../types';
import { databaseRecipeService } from '../../../lib/services/databaseRecipeService';
import { HealthGoal } from '../../../lib/health-goals';

interface GenerateMealPlanRequest {
  ingredients: Ingredient[];
  userId: string;
  healthGoal?: HealthGoal;
  mealPlanMode?: 'health-goal' | 'family-friendly' | 'pantry-based';
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
    const {
      ingredients,
      userId,
      healthGoal,
      mealPlanMode = 'pantry-based',
      preferences,
    } = req.body as GenerateMealPlanRequest;

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
    console.log(`🎯 Meal plan mode: ${mealPlanMode}`);
    if (mealPlanMode === 'health-goal' && healthGoal) {
      console.log(`🎯 Using health goal: ${healthGoal.name} (${healthGoal.id})`);
      console.log(
        `📊 Target calories: ${healthGoal.targetCalories}, Protein multiplier: ${healthGoal.proteinMultiplier}`
      );
      console.log(`🚫 Restrictions: ${healthGoal.restrictions || 'None'}`);
    } else if (mealPlanMode === 'family-friendly') {
      console.log('🍴 Generating family-friendly meal plan');
    } else {
      console.log('🥫 Generating pantry-based meal plan (original mode)');
    }

    const baseRecipes: { [key: string]: Recipe[] } = {
      breakfast: [],
      lunch: [],
      dinner: [],
    };

    // Generate multiple base recipes per meal type for more variety
    for (const mealType of mealTypes) {
      const recipesNeeded = 3; // Generate 3 base recipes per meal type for variety

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

          // Apply meal plan mode specific parameters
          let enhancedPreferences: any = {
            maxTime: baseTime,
            difficulty: preferences?.difficulty || 'Easy',
          };

          if (mealPlanMode === 'health-goal' && healthGoal) {
            // Health-focused mode with specific targets
            let targetCalories = 400;
            if (healthGoal.targetCalories) {
              const mealsPerDay = 3; // breakfast, lunch, dinner
              targetCalories = Math.round(healthGoal.targetCalories / mealsPerDay);
            }

            const healthGoalRestrictions = healthGoal.restrictions || [];
            enhancedPreferences = {
              ...enhancedPreferences,
              targetCalories,
              proteinFocus: healthGoal.proteinMultiplier
                ? healthGoal.proteinMultiplier > 1.2
                : false,
              lowSodium: healthGoalRestrictions.includes('low-sodium'),
              heartHealthy: healthGoalRestrictions.includes('omega-3-rich'),
              healthGoal: healthGoal.name,
            };
          } else if (mealPlanMode === 'family-friendly') {
            // Family-friendly mode with balanced approach
            enhancedPreferences = {
              ...enhancedPreferences,
              familyFriendly: true,
              balancedNutrition: true,
              moderatePortions: true,
            };
          } else {
            // Pantry-based mode (original) - use what you have efficiently
            enhancedPreferences = {
              ...enhancedPreferences,
              pantryFocused: true,
              useWhatYouHave: true,
              practical: true,
            };
          }

          const response = await aiService.generateRecipe(
            {
              ingredients: selectedIngredients,
              cuisine: selectedCuisine as any,
              servings: 2,
              preferences: enhancedPreferences,
            },
            userId
          );

          if (response.success && response.recipe) {
            // Tag the recipe based on meal plan mode
            const modeTags = [`mode-${mealPlanMode}`];
            const healthGoalTags =
              mealPlanMode === 'health-goal' && healthGoal ? [`health-goal-${healthGoal.id}`] : [];
            const aiRecipe = {
              ...response.recipe,
              tags: [
                ...(response.recipe.tags || []),
                'ai-generated',
                'meal-plan',
                ...modeTags,
                ...healthGoalTags,
              ],
            };

            // Save the AI-generated recipe to user's collection
            try {
              const saveResult = await databaseRecipeService.saveRecipe(aiRecipe, userId);
              if (saveResult.success) {
                console.log(`✅ Saved AI recipe "${aiRecipe.title}" to user collection`);
              } else {
                console.warn(`⚠️ Failed to save AI recipe "${aiRecipe.title}":`, saveResult.error);
              }
            } catch (error) {
              console.error(`❌ Error saving AI recipe "${aiRecipe.title}":`, error);
            }

            baseRecipes[mealType].push(aiRecipe);
          }

          // Short delay between recipe generation calls
          await new Promise(resolve => setTimeout(resolve, 150));
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
          // Rotate through available recipes for variety
          const baseRecipe = availableRecipes[dayIndex % availableRecipes.length];

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
