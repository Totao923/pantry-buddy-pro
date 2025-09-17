import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseServiceClient } from '../../../lib/supabase/client';
import { withApiAuth } from '../../../lib/auth/middleware';

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
  };
}

interface FamilyNutritionQuery {
  familyId?: string;
  startDate?: string;
  endDate?: string;
  memberIds?: string[];
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { familyId, startDate, endDate, memberIds } = req.query as FamilyNutritionQuery;

  try {
    const supabase = createSupabaseServiceClient();
    // Get user's families if no specific family requested
    let targetFamilyIds: string[] = [];

    if (familyId) {
      // Verify user has access to this family
      const { data: membership } = await supabase
        .from('family_memberships')
        .select('id')
        .eq('family_id', familyId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        return res.status(403).json({ error: 'No access to this family' });
      }

      targetFamilyIds = [familyId];
    } else {
      // Get all user's families
      const { data: userFamilies } = await supabase
        .from('family_memberships')
        .select('family_id')
        .eq('user_id', userId);

      if (!userFamilies || userFamilies.length === 0) {
        return res.status(200).json({
          familyNutrition: [],
          summary: { totalMembers: 0, totalMealPlans: 0, avgCaloriesPerMember: 0 },
        });
      }

      targetFamilyIds = userFamilies.map(f => f.family_id);
    }

    // Get family members
    const { data: familyMembers } = await supabase
      .from('family_memberships')
      .select(
        `
        user_id,
        role,
        is_child,
        user_profiles(email, full_name)
      `
      )
      .in('family_id', targetFamilyIds);

    if (!familyMembers) {
      return res.status(500).json({ error: 'Failed to fetch family members' });
    }

    // Filter by specific member IDs if requested
    const relevantMembers = memberIds
      ? familyMembers.filter(member => memberIds.includes(member.user_id))
      : familyMembers;

    const memberUserIds = relevantMembers.map(member => member.user_id);

    // Build meal plans query
    let mealPlansQuery = supabase
      .from('meal_plans')
      .select(
        `
        id,
        name,
        user_id,
        start_date,
        end_date,
        total_calories,
        nutrition_goals
      `
      )
      .or(`user_id.in.(${memberUserIds.join(',')}),shared_with.ov.{${memberUserIds.join(',')}}`);

    // Apply date filters if provided
    if (startDate) {
      mealPlansQuery = mealPlansQuery.gte('start_date', startDate);
    }
    if (endDate) {
      mealPlansQuery = mealPlansQuery.lte('end_date', endDate);
    }

    const { data: mealPlans } = await mealPlansQuery.order('start_date', { ascending: false });

    // Get detailed nutrition data for each meal plan
    const nutritionPromises = (mealPlans || []).map(async plan => {
      const { data: nutritionSummary, error: nutritionError } = await supabase.rpc(
        'get_meal_plan_nutrition_summary',
        {
          plan_id: plan.id,
        }
      );

      if (nutritionError) {
        console.error(`Nutrition summary error for meal plan ${plan.id}:`, nutritionError);
      }

      return {
        mealPlan: plan,
        nutrition: nutritionSummary,
        error: nutritionError,
      };
    });

    const nutritionData = await Promise.all(nutritionPromises);

    // Log nutrition data for debugging
    console.log('Family Nutrition Debug:', {
      totalMealPlans: mealPlans?.length || 0,
      nutritionDataCount: nutritionData.length,
      hasNutritionErrors: nutritionData.some(item => item.error),
      sampleNutrition: nutritionData.slice(0, 2).map(item => ({
        planId: item.mealPlan.id,
        planName: item.mealPlan.name,
        hasNutrition: !!item.nutrition,
        nutritionTotals: item.nutrition?.totals,
        error: item.error,
      })),
    });

    // Aggregate family nutrition statistics
    const familyStats = {
      totalMembers: relevantMembers.length,
      totalMealPlans: mealPlans?.length || 0,
      totalCalories: nutritionData.reduce((sum, item) => {
        const calories = item.nutrition?.totals?.calories || 0;
        return sum + calories;
      }, 0),
      avgCaloriesPerMember: 0,
      childMembers: relevantMembers.filter(member => member.is_child).length,
      adultMembers: relevantMembers.filter(member => !member.is_child).length,
    };

    familyStats.avgCaloriesPerMember =
      familyStats.totalMembers > 0
        ? Math.round(familyStats.totalCalories / familyStats.totalMembers)
        : 0;

    // Group nutrition data by family member
    const memberNutritionMap = new Map();

    nutritionData.forEach(({ mealPlan, nutrition }) => {
      const ownerId = mealPlan.user_id;

      if (!memberNutritionMap.has(ownerId)) {
        const memberInfo = relevantMembers.find(m => m.user_id === ownerId);
        const userProfile = Array.isArray(memberInfo?.user_profiles)
          ? memberInfo.user_profiles[0]
          : memberInfo?.user_profiles;
        memberNutritionMap.set(ownerId, {
          userId: ownerId,
          email: userProfile?.email || 'Unknown',
          fullName: userProfile?.full_name || 'Unknown',
          role: memberInfo?.role || 'member',
          isChild: memberInfo?.is_child || false,
          mealPlans: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
        });
      }

      const memberData = memberNutritionMap.get(ownerId);
      memberData.mealPlans.push({
        id: mealPlan.id,
        name: mealPlan.name,
        startDate: mealPlan.start_date,
        endDate: mealPlan.end_date,
        calories: nutrition?.totals?.calories || 0,
        nutrition: nutrition,
      });

      // Aggregate totals
      if (nutrition?.totals) {
        memberData.totalCalories += nutrition.totals.calories || 0;
        memberData.totalProtein += nutrition.totals.protein || 0;
        memberData.totalCarbs += nutrition.totals.carbs || 0;
        memberData.totalFat += nutrition.totals.fat || 0;
      } else if (nutrition === null) {
        console.log(`No nutrition data for meal plan ${mealPlan.id} (${mealPlan.name})`);
      }
    });

    const familyNutrition = Array.from(memberNutritionMap.values());

    // Calculate nutrition goals compliance
    const goalsCompliance = familyNutrition.map(member => {
      const memberGoals = member.mealPlans
        .map((plan: any) => plan.nutrition?.goals)
        .filter((goals: any) => goals);

      return {
        userId: member.userId,
        email: member.email,
        goalsSet: memberGoals.length > 0,
        avgDailyCalories:
          member.mealPlans.length > 0
            ? Math.round(member.totalCalories / member.mealPlans.length)
            : 0,
      };
    });

    return res.status(200).json({
      familyNutrition,
      summary: familyStats,
      goalsCompliance,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (error) {
    console.error('Family nutrition tracking error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withApiAuth(handler);
