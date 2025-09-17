import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MealPlanNutrition {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  calories: number;
  nutrition?: {
    totals?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
  };
}

interface FamilyMemberNutrition {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isChild: boolean;
  mealPlans: MealPlanNutrition[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface FamilyMemberNutritionProps {
  member: FamilyMemberNutrition;
  onBack?: () => void;
}

export default function FamilyMemberNutrition({ member, onBack }: FamilyMemberNutritionProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [sortBy, setSortBy] = useState<'date' | 'calories' | 'name'>('date');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCalories = (calories: number) => {
    return calories.toLocaleString();
  };

  const formatMacro = (macro: number) => {
    return `${Math.round(macro)}g`;
  };

  const getRecommendedCalories = (isChild: boolean) => {
    return isChild ? 1800 : 2200; // Simplified recommendations
  };

  const getCalorieStatus = (calories: number, isChild: boolean) => {
    const recommended = getRecommendedCalories(isChild);
    const percentage = (calories / recommended) * 100;

    if (percentage < 80) {
      return { status: 'low', color: 'text-red-600 bg-red-100', label: 'Below Target' };
    } else if (percentage > 120) {
      return { status: 'high', color: 'text-orange-600 bg-orange-100', label: 'Above Target' };
    } else {
      return { status: 'good', color: 'text-green-600 bg-green-100', label: 'On Target' };
    }
  };

  const getFilteredMealPlans = () => {
    let filtered = [...member.mealPlans];

    // Apply time filter
    if (selectedTimeframe !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();

      if (selectedTimeframe === 'week') {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (selectedTimeframe === 'month') {
        cutoffDate.setDate(now.getDate() - 30);
      }

      filtered = filtered.filter(plan => new Date(plan.startDate) >= cutoffDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'calories':
          return b.calories - a.calories;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredMealPlans = getFilteredMealPlans();
  const avgDailyCalories =
    filteredMealPlans.length > 0
      ? Math.round(
          filteredMealPlans.reduce((sum, plan) => sum + plan.calories, 0) / filteredMealPlans.length
        )
      : 0;

  const calorieStatus = getCalorieStatus(avgDailyCalories, member.isChild);
  const recommendedCalories = getRecommendedCalories(member.isChild);

  // Calculate weekly averages for macros
  const totalMacros = filteredMealPlans.reduce(
    (totals, plan) => {
      const nutrition = plan.nutrition?.totals;
      return {
        protein: totals.protein + (nutrition?.protein || 0),
        carbs: totals.carbs + (nutrition?.carbs || 0),
        fat: totals.fat + (nutrition?.fat || 0),
        fiber: totals.fiber + (nutrition?.fiber || 0),
        sugar: totals.sugar + (nutrition?.sugar || 0),
        sodium: totals.sodium + (nutrition?.sodium || 0),
      };
    },
    { protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  );

  const avgMacros = {
    protein: filteredMealPlans.length > 0 ? totalMacros.protein / filteredMealPlans.length : 0,
    carbs: filteredMealPlans.length > 0 ? totalMacros.carbs / filteredMealPlans.length : 0,
    fat: filteredMealPlans.length > 0 ? totalMacros.fat / filteredMealPlans.length : 0,
    fiber: filteredMealPlans.length > 0 ? totalMacros.fiber / filteredMealPlans.length : 0,
    sugar: filteredMealPlans.length > 0 ? totalMacros.sugar / filteredMealPlans.length : 0,
    sodium: filteredMealPlans.length > 0 ? totalMacros.sodium / filteredMealPlans.length : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
              {member.fullName.charAt(0) || member.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {member.fullName || member.email}
              </h2>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="capitalize">{member.role}</span>
                {member.isChild && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    👶 Child
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeframe}
            onChange={e => setSelectedTimeframe(e.target.value as typeof selectedTimeframe)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="all">All Time</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="calories">Sort by Calories</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Nutrition Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calorie Summary */}
        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {formatCalories(avgDailyCalories)}
            </div>
            <div className="text-sm text-gray-600 mb-3">Average Daily Calories</div>
            <div
              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${calorieStatus.color}`}
            >
              {calorieStatus.label}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Target: {formatCalories(recommendedCalories)} cal
            </div>
          </div>
        </Card>

        {/* Meal Plans Count */}
        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{filteredMealPlans.length}</div>
            <div className="text-sm text-gray-600 mb-3">
              Meal Plans ({selectedTimeframe === 'all' ? 'all time' : `last ${selectedTimeframe}`})
            </div>
            <div className="text-xs text-gray-500">{member.mealPlans.length} total meal plans</div>
          </div>
        </Card>

        {/* Macro Balance */}
        <Card className="p-6">
          <div className="text-center">
            <div className="text-3xl mb-2">⚖️</div>
            <div className="text-lg font-semibold text-gray-900 mb-3">Daily Macros</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Protein:</span>
                <span className="font-medium">{formatMacro(avgMacros.protein)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Carbs:</span>
                <span className="font-medium">{formatMacro(avgMacros.carbs)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fat:</span>
                <span className="font-medium">{formatMacro(avgMacros.fat)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Meal Plans */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Meal Plans ({filteredMealPlans.length})
        </h3>

        {filteredMealPlans.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Meal Plans Found</h4>
            <p className="text-gray-600">
              No meal plans found for the selected timeframe. Try adjusting your filters.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMealPlans.map(plan => {
              const planCalorieStatus = getCalorieStatus(plan.calories, member.isChild);
              const nutrition = plan.nutrition?.totals;

              return (
                <Card key={plan.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">{plan.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${planCalorieStatus.color}`}
                    >
                      {formatCalories(plan.calories)} cal
                    </div>
                  </div>

                  {nutrition && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {formatMacro(nutrition.protein)}
                        </div>
                        <div className="text-xs text-gray-500">Protein</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {formatMacro(nutrition.carbs)}
                        </div>
                        <div className="text-xs text-gray-500">Carbs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {formatMacro(nutrition.fat)}
                        </div>
                        <div className="text-xs text-gray-500">Fat</div>
                      </div>
                      {nutrition.fiber && (
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {formatMacro(nutrition.fiber)}
                          </div>
                          <div className="text-xs text-gray-500">Fiber</div>
                        </div>
                      )}
                      {nutrition.sugar && (
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {formatMacro(nutrition.sugar)}
                          </div>
                          <div className="text-xs text-gray-500">Sugar</div>
                        </div>
                      )}
                      {nutrition.sodium && (
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {Math.round(nutrition.sodium)}mg
                          </div>
                          <div className="text-xs text-gray-500">Sodium</div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Nutrition Insights */}
      {filteredMealPlans.length > 0 && (
        <Card className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Nutrition Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Calorie Trends</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Average Daily:</span>
                  <span
                    className={`font-medium ${calorieStatus.status === 'good' ? 'text-green-600' : calorieStatus.status === 'low' ? 'text-red-600' : 'text-orange-600'}`}
                  >
                    {formatCalories(avgDailyCalories)} cal
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Recommended:</span>
                  <span className="text-gray-600">{formatCalories(recommendedCalories)} cal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Variance:</span>
                  <span
                    className={`font-medium ${avgDailyCalories >= recommendedCalories ? 'text-orange-600' : 'text-red-600'}`}
                  >
                    {avgDailyCalories >= recommendedCalories ? '+' : ''}
                    {avgDailyCalories - recommendedCalories} cal
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Macro Distribution</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Protein:</span>
                  <span className="font-medium">{formatMacro(avgMacros.protein)} (daily avg)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Carbohydrates:</span>
                  <span className="font-medium">{formatMacro(avgMacros.carbs)} (daily avg)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fat:</span>
                  <span className="font-medium">{formatMacro(avgMacros.fat)} (daily avg)</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
