import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/middleware/auth';
import { createSupabaseClient } from '../../../lib/supabase/client';
import { aiService } from '../../../lib/ai/aiService';

interface WeeklyReportRequest {
  userId: string;
  healthGoal: {
    id: string;
    name: string;
    targetCalories?: number;
  };
}

interface WeeklyReport {
  avgCalories: number;
  mealsLogged: number;
  insights: string;
  trends: {
    caloriesTrend: 'increasing' | 'decreasing' | 'stable';
    nutritionScore: number;
    topIngredients: string[];
    improvementAreas: string[];
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, healthGoal }: WeeklyReportRequest = req.body;

    // Get user's recipes and meal data from the last 7 days
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = createSupabaseClient();
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // Get user's ingredients for context
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('*')
      .eq('user_id', userId);

    // Calculate weekly statistics
    const weeklyStats = calculateWeeklyStats(recipes || []);

    // Generate AI insights
    const insights = await generateWeeklyInsights(
      recipes || [],
      ingredients || [],
      healthGoal,
      weeklyStats
    );

    const report: WeeklyReport = {
      avgCalories: weeklyStats.avgCalories,
      mealsLogged: recipes?.length || 0,
      insights,
      trends: {
        caloriesTrend: weeklyStats.caloriesTrend,
        nutritionScore: weeklyStats.nutritionScore,
        topIngredients: weeklyStats.topIngredients,
        improvementAreas: weeklyStats.improvementAreas,
      },
    };

    res.status(200).json(report);
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
}

function calculateWeeklyStats(recipes: any[]) {
  if (recipes.length === 0) {
    return {
      avgCalories: 0,
      caloriesTrend: 'stable' as const,
      nutritionScore: 50,
      topIngredients: [],
      improvementAreas: ['Log more meals to get better insights'],
    };
  }

  // Calculate average calories
  const totalCalories = recipes.reduce((sum, recipe) => {
    return sum + (recipe.nutrition_info?.calories || 0);
  }, 0);
  const avgCalories = Math.round(totalCalories / Math.max(1, recipes.length));

  // Analyze calorie trend (simplified - compare first half vs second half of week)
  const midPoint = Math.floor(recipes.length / 2);
  const firstHalfAvg =
    recipes
      .slice(0, midPoint)
      .reduce((sum, recipe) => sum + (recipe.nutrition_info?.calories || 0), 0) /
    Math.max(1, midPoint);
  const secondHalfAvg =
    recipes
      .slice(midPoint)
      .reduce((sum, recipe) => sum + (recipe.nutrition_info?.calories || 0), 0) /
    Math.max(1, recipes.length - midPoint);

  const caloriesTrend: 'increasing' | 'decreasing' | 'stable' =
    secondHalfAvg > firstHalfAvg * 1.1
      ? 'increasing'
      : secondHalfAvg < firstHalfAvg * 0.9
        ? 'decreasing'
        : 'stable';

  // Extract top ingredients
  const ingredientCounts: { [key: string]: number } = {};
  recipes.forEach(recipe => {
    if (recipe.ingredients) {
      recipe.ingredients.forEach((ing: any) => {
        const name = ing.name || ing;
        ingredientCounts[name] = (ingredientCounts[name] || 0) + 1;
      });
    }
  });

  const topIngredients = Object.entries(ingredientCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name]) => name);

  // Calculate basic nutrition score
  const hasNutritionInfo = recipes.filter(r => r.nutrition_info).length;
  const nutritionScore = Math.round((hasNutritionInfo / recipes.length) * 100);

  // Identify improvement areas
  const improvementAreas = [];
  if (avgCalories < 1200) improvementAreas.push('Consider increasing calorie intake');
  if (avgCalories > 2500) improvementAreas.push('Consider moderating calorie intake');
  if (nutritionScore < 50) improvementAreas.push('Add more nutritionally complete recipes');

  return {
    avgCalories,
    caloriesTrend,
    nutritionScore,
    topIngredients,
    improvementAreas,
  };
}

async function generateWeeklyInsights(
  recipes: any[],
  ingredients: any[],
  healthGoal: any,
  weeklyStats: any
): Promise<string> {
  const prompt = `As an AI nutritionist, provide a personalized weekly nutrition insight for a user based on their cooking and meal data.

USER'S HEALTH GOAL: ${healthGoal.name}
TARGET CALORIES: ${healthGoal.targetCalories || 2000}

WEEKLY STATISTICS:
- Meals logged: ${recipes.length}
- Average daily calories: ${weeklyStats.avgCalories}
- Calorie trend: ${weeklyStats.caloriesTrend}
- Top ingredients used: ${weeklyStats.topIngredients.join(', ')}
- Nutrition score: ${weeklyStats.nutritionScore}/100

RECIPES THIS WEEK:
${recipes
  .slice(0, 10)
  .map(recipe => `- ${recipe.title} (${recipe.cuisine || 'unknown cuisine'})`)
  .join('\n')}

PANTRY INGREDIENTS AVAILABLE:
${ingredients
  .slice(0, 20)
  .map(ing => `- ${ing.name} (${ing.category})`)
  .join('\n')}

Provide a concise, encouraging weekly insight (2-3 sentences) that:
1. Acknowledges their progress toward their health goal
2. Highlights positive patterns or achievements
3. Offers one specific, actionable suggestion for next week
4. Maintains a supportive, motivational tone

Keep it under 150 words and focus on being helpful rather than critical.`;

  try {
    const insight = await aiService.generateContent(prompt);
    // Clean up the response and ensure it's concise
    return insight.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    console.error('Error generating AI insights:', error);
    // Fallback insight
    if (weeklyStats.avgCalories > 0) {
      return `Great work logging ${recipes.length} meals this week! Your average of ${weeklyStats.avgCalories} calories ${
        weeklyStats.caloriesTrend === 'stable'
          ? 'shows good consistency'
          : weeklyStats.caloriesTrend === 'increasing'
            ? 'is trending up'
            : 'is trending down'
      } toward your ${healthGoal.name} goal. ${
        weeklyStats.topIngredients.length > 0
          ? `I noticed you're making great use of ${weeklyStats.topIngredients[0]} - `
          : ''
      }For next week, try incorporating more variety in your protein sources to keep your nutrition balanced and interesting.`;
    } else {
      return `Start your nutrition journey by logging some meals! Even tracking a few recipes will help me provide personalized insights for your ${healthGoal.name} goal.`;
    }
  }
}

export default withAuth(handler);
