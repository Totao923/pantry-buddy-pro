import { NextApiRequest, NextApiResponse } from 'next';
import { aiService } from '../../../lib/ai/aiService';
import { withAuth } from '../../../lib/middleware/auth';
import { Ingredient, Recipe, NutritionInfo } from '../../../types';

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

    // Check if user has premium access
    if (!userProfile?.subscription || userProfile.subscription === 'free') {
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

    res.status(200).json(aiAnalysis);
  } catch (error) {
    console.error('Error analyzing nutrition:', error);
    res.status(500).json({ error: 'Failed to analyze nutrition' });
  }
}

function calculateCurrentNutrition(
  ingredients: Ingredient[],
  recentRecipes: Recipe[]
): NutritionInfo {
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

  return totalNutrition;
}

async function generateAInutritionAnalysis(
  ingredients: Ingredient[],
  recentRecipes: Recipe[],
  healthGoal: any,
  currentNutrition: NutritionInfo,
  userProfile: any
): Promise<NutritionAnalysis> {
  const prompt = `As an expert AI nutritionist, analyze the following user's nutritional status and provide personalized recommendations.

USER PROFILE:
- Health Goal: ${healthGoal.name} (${healthGoal.description})
- Target Calories: ${healthGoal.targetCalories || 2000}
- Protein Multiplier: ${healthGoal.proteinMultiplier || 1.0}
- Restrictions: ${healthGoal.restrictions?.join(', ') || 'None'}

CURRENT PANTRY INGREDIENTS:
${ingredients.map(ing => `- ${ing.name} (${ing.category}${ing.isProtein ? ', protein source' : ''}${ing.isVegetarian ? ', vegetarian' : ''}${ing.isVegan ? ', vegan' : ''})`).join('\n')}

CURRENT DAILY NUTRITION AVERAGES:
- Calories: ${currentNutrition.calories}
- Protein: ${currentNutrition.protein}g
- Carbs: ${currentNutrition.carbs}g
- Fat: ${currentNutrition.fat}g
- Fiber: ${currentNutrition.fiber}g
- Sodium: ${currentNutrition.sodium}mg

RECENT RECIPES (${recentRecipes.length}):
${recentRecipes
  .slice(0, 5)
  .map(recipe => `- ${recipe.title} (${recipe.cuisine}, ${recipe.difficulty})`)
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
3. Practical, actionable recommendations
4. Balance between nutrition and enjoyability
5. Consider dietary restrictions and preferences from ingredients`;

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
  currentNutrition: NutritionInfo,
  healthGoal: any,
  ingredients: Ingredient[]
): NutritionAnalysis {
  const targetCalories = healthGoal.targetCalories || 2000;
  const targetProtein = (targetCalories * 0.15) / 4; // 15% of calories from protein
  const targetCarbs = (targetCalories * 0.5) / 4; // 50% of calories from carbs
  const targetFats = (targetCalories * 0.35) / 9; // 35% of calories from fat

  const proteinStatus =
    currentNutrition.protein < targetProtein * 0.8
      ? 'low'
      : currentNutrition.protein > targetProtein * 1.2
        ? 'high'
        : 'good';
  const carbStatus =
    currentNutrition.carbs < targetCarbs * 0.8
      ? 'low'
      : currentNutrition.carbs > targetCarbs * 1.2
        ? 'high'
        : 'good';
  const fatStatus =
    currentNutrition.fat < targetFats * 0.8
      ? 'low'
      : currentNutrition.fat > targetFats * 1.2
        ? 'high'
        : 'good';

  // Calculate overall score
  const calorieScore = Math.max(0, 100 - Math.abs(currentNutrition.calories - targetCalories) / 10);
  const macroScore =
    (proteinStatus === 'good' ? 25 : 15) +
    (carbStatus === 'good' ? 25 : 15) +
    (fatStatus === 'good' ? 25 : 15);
  const overallScore = Math.round((calorieScore + macroScore) / 2);

  // Generate basic recommendations
  const recommendations = [];

  if (proteinStatus === 'low') {
    const proteinIngredients = ingredients.filter(ing => ing.isProtein);
    if (proteinIngredients.length > 0) {
      recommendations.push({
        type: 'recipe' as const,
        title: `Create protein-rich meals with your ${proteinIngredients[0].name}`,
        description:
          'Your protein intake is below target. Use your protein sources more frequently.',
        priority: 'high' as const,
        action: 'Generate Protein Recipe',
      });
    } else {
      recommendations.push({
        type: 'ingredient' as const,
        title: 'Add lean protein sources',
        description: 'Consider adding chicken, fish, tofu, or legumes to your pantry.',
        priority: 'high' as const,
        action: 'Add to Shopping List',
      });
    }
  }

  if (currentNutrition.fiber < 25) {
    recommendations.push({
      type: 'ingredient' as const,
      title: 'Increase fiber intake',
      description: 'Add more vegetables, fruits, and whole grains to meet daily fiber needs.',
      priority: 'medium' as const,
      action: 'Find High-Fiber Recipes',
    });
  }

  return {
    overallScore,
    macronutrientBalance: {
      protein: {
        current: currentNutrition.protein,
        recommended: Math.round(targetProtein),
        status: proteinStatus,
      },
      carbs: {
        current: currentNutrition.carbs,
        recommended: Math.round(targetCarbs),
        status: carbStatus,
      },
      fats: {
        current: currentNutrition.fat,
        recommended: Math.round(targetFats),
        status: fatStatus,
      },
    },
    micronutrientGaps: currentNutrition.fiber < 25 ? ['Fiber', 'Vitamin D', 'Iron'] : ['Vitamin D'],
    recommendations,
  };
}

export default withAuth(handler);
