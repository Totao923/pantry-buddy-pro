import type { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { Ingredient, Recipe, DifficultyLevel } from '../../../types';
import { databaseRecipeService } from '../../../lib/services/databaseRecipeService';
import { HealthGoal } from '../../../lib/health-goals';
import { withAuth, type AuthenticatedRequest } from '../../../lib/middleware/auth';
import { createUserSupabaseClient } from '../../../lib/supabase/server';

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
  req: AuthenticatedRequest,
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
      healthGoal,
      mealPlanMode = 'pantry-based',
      preferences,
    } = req.body as Omit<GenerateMealPlanRequest, 'userId'>;

    // Use authenticated user ID from middleware
    const userId = req.user.id;

    // Extract JWT token from request headers and create authenticated Supabase client
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || '';
    console.log('🔒 Setting up user Supabase client with token length:', token.length);
    const userSupabase = createUserSupabaseClient(token);
    databaseRecipeService.setSupabaseClient(userSupabase);

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one ingredient is required',
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

    // Generate multiple base recipes per meal type for variety (balanced approach)
    for (const mealType of mealTypes) {
      const recipesNeeded = 2; // Generate 2 different recipes per meal type (balance variety vs performance)

      for (let i = 0; i < recipesNeeded; i++) {
        // Prepare ingredients with more variety for each recipe
        const ingredientVariety = [...ingredients];

        // Shuffle and select different ingredient combinations for each recipe
        for (let j = ingredientVariety.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [ingredientVariety[j], ingredientVariety[k]] = [
            ingredientVariety[k],
            ingredientVariety[j],
          ];
        }

        // Select different ingredient subsets for each recipe to ensure variety
        const startIndex = (i * 3) % Math.max(1, ingredients.length - 5);
        const endIndex = Math.min(startIndex + 6 + i, ingredients.length);
        const selectedIngredients = ingredientVariety.slice(startIndex, endIndex);

        // Ensure minimum ingredients
        if (selectedIngredients.length < 4) {
          selectedIngredients.push(...ingredientVariety.slice(0, 4 - selectedIngredients.length));
        }

        try {
          // Ensure different cuisines for each recipe iteration
          const selectedCuisine =
            cuisineVariety[(i + mealTypes.indexOf(mealType)) % cuisineVariety.length];

          console.log(
            `🍳 Generating ${mealType} recipe ${i + 1}/2 with ${selectedCuisine} cuisine and ${selectedIngredients.length} ingredients`
          );
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

          // Add timeout to AI service call
          const response = await Promise.race([
            aiService.generateRecipe(
              {
                ingredients: selectedIngredients,
                cuisine: selectedCuisine as any,
                servings: 2,
                preferences: enhancedPreferences,
              },
              userId
            ),
            new Promise<{ success: false; error: string }>(
              (_, reject) => setTimeout(() => reject(new Error('AI service timeout')), 30000) // 30 second timeout
            ),
          ]);

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

          // Longer delay between recipe generation calls to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error generating base ${mealType} recipe ${i + 1}:`, error);

          // Add fallback recipe if AI generation fails
          const fallbackRecipe: Recipe = {
            id: `fallback-${mealType}-${Date.now()}`,
            title: `Simple ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
            description: `A quick and easy ${mealType} using your available ingredients`,
            cuisine: 'any' as any,
            servings: 2,
            prepTime: 10,
            cookTime: mealType === 'breakfast' ? 15 : mealType === 'lunch' ? 20 : 30,
            totalTime: mealType === 'breakfast' ? 25 : mealType === 'lunch' ? 30 : 40,
            difficulty: 'Easy' as DifficultyLevel,
            ingredients: selectedIngredients.slice(0, 5).map(ing => ({
              name: ing.name,
              amount: 1,
              unit: ing.unit || 'serving',
            })),
            instructions: [
              {
                step: 1,
                instruction: 'Prepare your ingredients',
              },
              {
                step: 2,
                instruction: 'Combine ingredients according to taste',
              },
              {
                step: 3,
                instruction: 'Cook as desired',
              },
              {
                step: 4,
                instruction: 'Serve and enjoy!',
              },
            ],
            tags: ['simple', 'quick', 'fallback'],
            dietaryInfo: {
              isVegetarian: false,
              isVegan: false,
              isGlutenFree: false,
              isDairyFree: false,
              isKeto: false,
              isPaleo: false,
              allergens: [],
            },
          };

          baseRecipes[mealType].push(fallbackRecipe);
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

      // Assign recipes from base recipes with real variety
      for (const mealType of mealTypes) {
        const availableRecipes = baseRecipes[mealType];
        if (availableRecipes.length > 0) {
          // Use different actual recipes, not just title variations
          const selectedRecipe = availableRecipes[dayIndex % availableRecipes.length];

          // Create unique recipe for this day with proper UUID
          const uniqueRecipe = {
            ...selectedRecipe,
            id: crypto.randomUUID(),
            // Keep original title - no fake variations
          };

          dayPlan.meals[mealType] = uniqueRecipe;
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

// Configure API timeout
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60, // 60 second timeout for meal plan generation
};

// Export with authentication middleware to enable recipe saving
export default withAuth(generateMealPlanHandler);
