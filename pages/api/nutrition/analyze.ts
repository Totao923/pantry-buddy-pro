import { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { withAuth } from '../../../lib/middleware/auth';
import { Ingredient, Recipe, NutritionInfo } from '../../../types';

// Simple in-memory cache to prevent duplicate expensive API calls
const analysisCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries periodically
const cleanupCache = () => {
  const now = Date.now();
  const entriesRemoved = [];
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      analysisCache.delete(key);
      entriesRemoved.push(key);
    }
  }
  if (entriesRemoved.length > 0) {
    console.log(`🧹 Cache cleanup: Removed ${entriesRemoved.length} expired entries`);
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

interface AnalyzeRequest {
  ingredients: Ingredient[];
  recentRecipes: Recipe[];
  healthGoal: {
    id: string;
    name: string;
    targetCalories?: number;
    proteinMultiplier?: number;
    restrictions?: string[];
  };
  userProfile: any;
}

interface NutritionAnalysis {
  overallScore: number;
  macronutrientBalance: {
    protein: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
    carbs: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
    fats: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
  };
  micronutrientGaps: string[];
  recommendations: Array<{
    type: 'ingredient' | 'recipe' | 'substitution' | 'supplement';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    action?: string;
  }>;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ingredients, recentRecipes, healthGoal, userProfile }: AnalyzeRequest = req.body;

    // Create cache key based on request parameters to prevent duplicate expensive calls
    const cacheKey = JSON.stringify({
      ingredientsCount: ingredients?.length || 0,
      ingredientNames: ingredients?.map(i => i.name).sort(),
      healthGoal: healthGoal?.name,
      userId: userProfile?.id,
    });

    // Check cache first to prevent expensive API calls
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('🔍 Nutrition API: Returning cached result, avoiding duplicate API call');
      return res.status(200).json(cached.data);
    }

    console.log('🔍 Nutrition API: Received request:', {
      ingredientsCount: ingredients?.length || 0,
      recentRecipesCount: recentRecipes?.length || 0,
      healthGoal: healthGoal?.name,
      userSubscription: userProfile?.subscription?.tier,
      cacheKey: cacheKey.substring(0, 100) + '...', // Log truncated cache key
      sampleIngredientData: ingredients?.slice(0, 2).map(ing => ({
        name: ing.name,
        category: ing.category,
        hasRequiredFields: {
          expiryDate: !!ing.expiryDate,
          purchaseDate: !!ing.purchaseDate,
          quantity: !!ing.quantity,
          isProtein: !!ing.isProtein,
          isVegetarian: !!ing.isVegetarian,
          isVegan: !!ing.isVegan,
          isGlutenFree: !!ing.isGlutenFree,
          isDairyFree: !!ing.isDairyFree,
        },
      })),
    });

    // Check if user has premium access (allow development mode)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasPremiumAccess =
      userProfile?.subscription?.tier === 'premium' ||
      userProfile?.subscription?.tier === 'family' ||
      userProfile?.subscription?.tier === 'chef' ||
      isDevelopment;

    if (
      !userProfile?.subscription ||
      (!hasPremiumAccess && userProfile.subscription.tier === 'free')
    ) {
      console.log('❌ Nutrition API: Premium subscription required');
      return res.status(403).json({ error: 'Premium subscription required' });
    }

    // Calculate current nutrition from ingredients and recent recipes
    const currentNutrition = calculateCurrentNutrition(ingredients, recentRecipes);

    // Generate AI nutrition analysis
    const aiAnalysis = await generateAInutritionAnalysis(
      ingredients,
      recentRecipes,
      healthGoal,
      currentNutrition,
      userProfile
    );

    // Cache the result to prevent duplicate expensive API calls
    analysisCache.set(cacheKey, {
      data: aiAnalysis,
      timestamp: Date.now(),
    });

    console.log(
      '🔍 Nutrition API: Cached result for future requests, cache size:',
      analysisCache.size
    );

    res.status(200).json(aiAnalysis);
  } catch (error) {
    console.error('Error analyzing nutrition:', error);
    res.status(500).json({ error: 'Failed to analyze nutrition' });
  }
}

function calculateCurrentNutrition(
  ingredients: Ingredient[],
  recentRecipes: Recipe[]
): NutritionInfo & { ingredientAnalysis: any } {
  // Calculate nutrition from recent recipes (last 7 days worth)
  const totalNutrition: NutritionInfo = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    cholesterol: 0,
  };

  // Add up nutrition from recent recipes
  recentRecipes.forEach(recipe => {
    if (recipe.nutritionInfo) {
      totalNutrition.calories += recipe.nutritionInfo.calories;
      totalNutrition.protein += recipe.nutritionInfo.protein;
      totalNutrition.carbs += recipe.nutritionInfo.carbs;
      totalNutrition.fat += recipe.nutritionInfo.fat;
      totalNutrition.fiber += recipe.nutritionInfo.fiber;
      totalNutrition.sugar += recipe.nutritionInfo.sugar;
      totalNutrition.sodium += recipe.nutritionInfo.sodium;
      totalNutrition.cholesterol += recipe.nutritionInfo.cholesterol;
    }
  });

  // Average over the days (assuming 7 days of data)
  const days = Math.max(1, Math.min(7, recentRecipes.length));
  Object.keys(totalNutrition).forEach(key => {
    totalNutrition[key as keyof NutritionInfo] = Math.round(
      totalNutrition[key as keyof NutritionInfo] / days
    );
  });

  // Analyze pantry ingredients for nutritional potential
  const ingredientAnalysis = analyzeIngredientNutrition(ingredients);

  return { ...totalNutrition, ingredientAnalysis };
}

function analyzeIngredientNutrition(ingredients: Ingredient[]) {
  const now = new Date();

  const analysis = {
    proteinSources: ingredients.filter(ing => ing.isProtein || ing.category === 'protein'),
    expiringItems: ingredients.filter(ing => {
      if (!ing.expiryDate) return false;
      const daysUntilExpiry = Math.ceil(
        (new Date(ing.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
    }),
    freshItems: ingredients.filter(ing => {
      if (!ing.purchaseDate) return false;
      const daysSincePurchase = Math.ceil(
        (now.getTime() - new Date(ing.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSincePurchase <= 2;
    }),
    lowStockItems: ingredients.filter(ing => {
      const quantity = parseFloat(ing.quantity || '0');
      return quantity <= 1;
    }),
    categoryDistribution: ingredients.reduce(
      (acc, ing) => {
        acc[ing.category] = (acc[ing.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    dietaryFlags: {
      vegetarian: ingredients.filter(ing => ing.isVegetarian).length,
      vegan: ingredients.filter(ing => ing.isVegan).length,
      glutenFree: ingredients.filter(ing => ing.isGlutenFree).length,
      dairyFree: ingredients.filter(ing => ing.isDairyFree).length,
    },
    totalItems: ingredients.length,
    averageUsageFrequency:
      ingredients.reduce((sum, ing) => sum + (ing.usageFrequency || 0), 0) /
      Math.max(1, ingredients.length),
  };

  return analysis;
}

async function generateAInutritionAnalysis(
  ingredients: Ingredient[],
  recentRecipes: Recipe[],
  healthGoal: any,
  currentNutrition: NutritionInfo & { ingredientAnalysis: any },
  userProfile: any
): Promise<NutritionAnalysis> {
  const { ingredientAnalysis, ...nutritionData } = currentNutrition;

  const prompt = `As an expert AI nutritionist, analyze the following user's nutritional status and provide personalized recommendations.

USER PROFILE:
- Health Goal: ${healthGoal.name} (${healthGoal.description})
- Target Calories: ${healthGoal.targetCalories || 2000}
- Protein Multiplier: ${healthGoal.proteinMultiplier || 1.0}
- Restrictions: ${healthGoal.restrictions?.join(', ') || 'None'}
- Subscription: ${userProfile?.subscription?.tier || 'free'}

PANTRY ANALYSIS (${ingredientAnalysis.totalItems} items):
- Protein Sources Available: ${ingredientAnalysis.proteinSources.map((p: Ingredient) => p.name).join(', ') || 'None'}
- Expiring Soon (≤3 days): ${ingredientAnalysis.expiringItems.map((e: Ingredient) => `${e.name} (${Math.ceil((new Date(e.expiryDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days)`).join(', ') || 'None'}
- Fresh Items (≤2 days old): ${ingredientAnalysis.freshItems.map((f: Ingredient) => f.name).join(', ') || 'None'}
- Low Stock Items: ${ingredientAnalysis.lowStockItems.map((l: Ingredient) => l.name).join(', ') || 'None'}
- Category Distribution: ${Object.entries(ingredientAnalysis.categoryDistribution)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ')}
- Dietary Preferences: Vegetarian=${ingredientAnalysis.dietaryFlags.vegetarian}, Vegan=${ingredientAnalysis.dietaryFlags.vegan}, Gluten-Free=${ingredientAnalysis.dietaryFlags.glutenFree}, Dairy-Free=${ingredientAnalysis.dietaryFlags.dairyFree}
- Average Usage Frequency: ${ingredientAnalysis.averageUsageFrequency.toFixed(1)} uses/week

DETAILED PANTRY INGREDIENTS:
${ingredients
  .map(ing => {
    const expiryInfo = ing.expiryDate
      ? ` (expires ${Math.ceil((new Date(ing.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days)`
      : '';
    const quantityInfo = ing.quantity ? ` - ${ing.quantity} ${ing.unit || 'units'}` : '';
    const dietaryFlags = [
      ing.isProtein && 'protein',
      ing.isVegetarian && 'vegetarian',
      ing.isVegan && 'vegan',
      ing.isGlutenFree && 'gluten-free',
      ing.isDairyFree && 'dairy-free',
    ]
      .filter(Boolean)
      .join(', ');
    return `- ${ing.name} (${ing.category}${quantityInfo}${expiryInfo}${dietaryFlags ? ` - ${dietaryFlags}` : ''})`;
  })
  .join('\n')}

CURRENT DAILY NUTRITION AVERAGES:
- Calories: ${nutritionData.calories}
- Protein: ${nutritionData.protein}g
- Carbs: ${nutritionData.carbs}g
- Fat: ${nutritionData.fat}g
- Fiber: ${nutritionData.fiber}g
- Sugar: ${nutritionData.sugar}g
- Sodium: ${nutritionData.sodium}mg
- Cholesterol: ${nutritionData.cholesterol}mg

RECENT RECIPES (${recentRecipes.length} in last 7 days):
${recentRecipes
  .slice(0, 5)
  .map(
    recipe =>
      `- ${recipe.title} (${recipe.cuisine}, ${recipe.difficulty}${recipe.nutritionInfo ? ` - ${recipe.nutritionInfo.calories} cal` : ''})`
  )
  .join('\n')}

Please provide a comprehensive nutrition analysis in the following JSON format:

{
  "overallScore": [0-100 score based on nutritional completeness and alignment with health goal],
  "macronutrientBalance": {
    "protein": {
      "current": [current daily average],
      "recommended": [recommended amount based on health goal],
      "status": ["low", "good", or "high"]
    },
    "carbs": {
      "current": [current daily average],
      "recommended": [recommended amount],
      "status": ["low", "good", or "high"]
    },
    "fats": {
      "current": [current daily average],
      "recommended": [recommended amount],
      "status": ["low", "good", or "high"]
    }
  },
  "micronutrientGaps": [array of likely deficient vitamins/minerals based on ingredient analysis],
  "recommendations": [
    {
      "type": "ingredient",
      "title": "Add [specific ingredient]",
      "description": "Explanation of why this ingredient would help",
      "priority": "high",
      "action": "Add to Shopping List"
    },
    {
      "type": "recipe",
      "title": "Try [specific type of recipe]",
      "description": "Recipe suggestion aligned with health goal",
      "priority": "medium",
      "action": "Generate Recipe"
    }
  ]
}

Focus on:
1. Alignment with the user's specific health goal
2. Nutritional gaps that can be filled with available ingredients
3. Expiring ingredient utilization to prevent waste
4. Practical, actionable recommendations based on actual pantry contents
5. Balance between nutrition and enjoyability
6. Consider dietary restrictions and preferences from ingredients
7. Stock level considerations for shopping recommendations
8. Usage frequency patterns to suggest variety

CRITICAL ANALYSIS POINTS:
- Prioritize expiring items: ${currentNutrition.ingredientAnalysis.expiringItems.map((e: Ingredient) => e.name).join(', ') || 'None'}
- Address low stock items for meal planning
- Leverage fresh ingredients for maximum nutritional value
- Consider category gaps in pantry for balanced nutrition
- Account for actual quantities available for portion planning`;

  try {
    const response = await aiService.generateContent(prompt);

    // Extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysisData = JSON.parse(jsonMatch[0]);
      return analysisData;
    } else {
      // Fallback analysis if AI doesn't return proper JSON
      return generateFallbackAnalysis(currentNutrition, healthGoal, ingredients);
    }
  } catch (error) {
    console.error('Error generating AI nutrition analysis:', error);
    // Return fallback analysis
    return generateFallbackAnalysis(currentNutrition, healthGoal, ingredients);
  }
}

function generateFallbackAnalysis(
  currentNutrition: NutritionInfo & { ingredientAnalysis: any },
  healthGoal: any,
  ingredients: Ingredient[]
): NutritionAnalysis {
  const { ingredientAnalysis, ...nutritionData } = currentNutrition;
  const targetCalories = healthGoal.targetCalories || 2000;
  const targetProtein = (targetCalories * 0.15) / 4; // 15% of calories from protein
  const targetCarbs = (targetCalories * 0.5) / 4; // 50% of calories from carbs
  const targetFats = (targetCalories * 0.35) / 9; // 35% of calories from fat

  const proteinStatus =
    nutritionData.protein < targetProtein * 0.8
      ? 'low'
      : nutritionData.protein > targetProtein * 1.2
        ? 'high'
        : 'good';
  const carbStatus =
    nutritionData.carbs < targetCarbs * 0.8
      ? 'low'
      : nutritionData.carbs > targetCarbs * 1.2
        ? 'high'
        : 'good';
  const fatStatus =
    nutritionData.fat < targetFats * 0.8
      ? 'low'
      : nutritionData.fat > targetFats * 1.2
        ? 'high'
        : 'good';

  // Calculate overall score with ingredient analysis
  const calorieScore = Math.max(0, 100 - Math.abs(nutritionData.calories - targetCalories) / 10);
  const macroScore =
    (proteinStatus === 'good' ? 25 : 15) +
    (carbStatus === 'good' ? 25 : 15) +
    (fatStatus === 'good' ? 25 : 15);

  // Bonus for pantry diversity and freshness
  const diversityBonus = Math.min(
    15,
    Object.keys(ingredientAnalysis.categoryDistribution).length * 2
  );
  const freshnessBonus = Math.min(10, ingredientAnalysis.freshItems.length * 2);
  const overallScore = Math.round(
    (calorieScore + macroScore + diversityBonus + freshnessBonus) / 2
  );

  // Generate enhanced recommendations based on ingredient analysis
  const recommendations = [];

  // Prioritize expiring items
  if (ingredientAnalysis.expiringItems.length > 0) {
    recommendations.push({
      type: 'recipe' as const,
      title: `Use expiring ingredients: ${ingredientAnalysis.expiringItems.map((e: Ingredient) => e.name).join(', ')}`,
      description: `These ingredients are expiring soon. Create meals to prevent waste and maximize nutrition.`,
      priority: 'high' as const,
      action: 'Generate Quick Recipe',
    });
  }

  if (proteinStatus === 'low') {
    if (ingredientAnalysis.proteinSources.length > 0) {
      recommendations.push({
        type: 'recipe' as const,
        title: `Create protein-rich meals with your ${ingredientAnalysis.proteinSources[0].name}`,
        description: `Your protein intake is below target. You have ${ingredientAnalysis.proteinSources.length} protein sources available.`,
        priority: 'high' as const,
        action: 'Generate Protein Recipe',
      });
    } else {
      recommendations.push({
        type: 'ingredient' as const,
        title: 'Add lean protein sources',
        description:
          'Your pantry lacks protein sources. Consider adding chicken, fish, tofu, or legumes.',
        priority: 'high' as const,
        action: 'Add to Shopping List',
      });
    }
  }

  // Low stock recommendations
  if (ingredientAnalysis.lowStockItems.length > 0) {
    recommendations.push({
      type: 'ingredient' as const,
      title: `Restock low items: ${ingredientAnalysis.lowStockItems.map((l: Ingredient) => l.name).join(', ')}`,
      description: 'These items are running low and may affect your meal planning.',
      priority: 'medium' as const,
      action: 'Add to Shopping List',
    });
  }

  if (nutritionData.fiber < 25) {
    const fiberSources = ingredients.filter(ing =>
      ['vegetables', 'fruits', 'grains', 'legumes'].includes(ing.category)
    );
    recommendations.push({
      type: fiberSources.length > 0 ? ('recipe' as const) : ('ingredient' as const),
      title: fiberSources.length > 0 ? 'Create high-fiber meals' : 'Increase fiber intake',
      description:
        fiberSources.length > 0
          ? `Use your ${fiberSources
              .slice(0, 3)
              .map((f: Ingredient) => f.name)
              .join(', ')} to boost fiber intake.`
          : 'Add more vegetables, fruits, and whole grains to meet daily fiber needs.',
      priority: 'medium' as const,
      action: fiberSources.length > 0 ? 'Find High-Fiber Recipes' : 'Add to Shopping List',
    });
  }

  // Category balance recommendations
  const categoryCount = Object.keys(ingredientAnalysis.categoryDistribution).length;
  if (categoryCount < 4) {
    const missingCategories = ['proteins', 'vegetables', 'fruits', 'grains', 'dairy'].filter(
      cat => !ingredientAnalysis.categoryDistribution[cat]
    );
    if (missingCategories.length > 0) {
      recommendations.push({
        type: 'ingredient' as const,
        title: `Diversify your pantry`,
        description: `Consider adding ${missingCategories.slice(0, 2).join(' and ')} for better nutritional balance.`,
        priority: 'low' as const,
        action: 'Add to Shopping List',
      });
    }
  }

  // Enhanced micronutrient gap analysis
  const micronutrientGaps = [];
  if (nutritionData.fiber < 25) micronutrientGaps.push('Fiber');
  if (nutritionData.sodium > 2300) micronutrientGaps.push('High Sodium');
  if (ingredientAnalysis.categoryDistribution.vegetables < 3)
    micronutrientGaps.push('Vitamin C', 'Folate');
  if (
    ingredientAnalysis.categoryDistribution.dairy < 1 &&
    !ingredientAnalysis.dietaryFlags.dairyFree
  )
    micronutrientGaps.push('Calcium');
  if (ingredientAnalysis.proteinSources.length < 2) micronutrientGaps.push('B12', 'Iron');
  if (!ingredientAnalysis.categoryDistribution.fruits)
    micronutrientGaps.push('Vitamin A', 'Potassium');

  return {
    overallScore,
    macronutrientBalance: {
      protein: {
        current: nutritionData.protein,
        recommended: Math.round(targetProtein),
        status: proteinStatus,
      },
      carbs: {
        current: nutritionData.carbs,
        recommended: Math.round(targetCarbs),
        status: carbStatus,
      },
      fats: {
        current: nutritionData.fat,
        recommended: Math.round(targetFats),
        status: fatStatus,
      },
    },
    micronutrientGaps,
    recommendations,
  };
}

export default withAuth(handler);
