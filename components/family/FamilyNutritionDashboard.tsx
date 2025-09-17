import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
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

interface FamilyNutritionSummary {
  totalMembers: number;
  totalMealPlans: number;
  totalCalories: number;
  avgCaloriesPerMember: number;
  childMembers: number;
  adultMembers: number;
}

interface GoalsCompliance {
  userId: string;
  email: string;
  goalsSet: boolean;
  avgDailyCalories: number;
}

interface FamilyNutritionData {
  familyNutrition: FamilyMemberNutrition[];
  summary: FamilyNutritionSummary;
  goalsCompliance: GoalsCompliance[];
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}

interface FamilyNutritionDashboardProps {
  onViewMember?: (member: FamilyMemberNutrition) => void;
}

export default function FamilyNutritionDashboard({ onViewMember }: FamilyNutritionDashboardProps) {
  const [nutritionData, setNutritionData] = useState<FamilyNutritionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      loadNutritionData();
    }
  }, [session, dateRange]);

  const loadNutritionData = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await fetch(`/api/family/nutrition?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data: FamilyNutritionData = await response.json();
        setNutritionData(data);
      }
    } catch (error) {
      console.error('Failed to load family nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCalories = (calories: number) => {
    return calories.toLocaleString();
  };

  const formatMacro = (macro: number) => {
    return `${Math.round(macro)}g`;
  };

  const getCalorieColor = (calories: number, isChild: boolean) => {
    const target = isChild ? 1800 : 2200; // Simplified targets
    const percentage = (calories / target) * 100;

    if (percentage < 80) return 'text-red-600 bg-red-100';
    if (percentage > 120) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Last 30 days

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ startDate: start, endDate: end });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!nutritionData || nutritionData.familyNutrition.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Family Nutrition Data</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Family members need to create meal plans with nutrition information to see nutrition
          tracking.
        </p>
      </div>
    );
  }

  const { familyNutrition, summary, goalsCompliance } = nutritionData;

  return (
    <div className="space-y-6">
      {/* Header with Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Family Nutrition Dashboard</h2>
          <p className="text-gray-600">Track nutrition across all family members</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.startDate || getDefaultDateRange().startDate}
            onChange={e => handleDateRangeChange(e.target.value, dateRange.endDate)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate || getDefaultDateRange().endDate}
            onChange={e => handleDateRangeChange(dateRange.startDate, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👨‍👩‍👧‍👦</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{summary.totalMembers}</div>
              <div className="text-sm text-gray-600">Family Members</div>
              <div className="text-xs text-gray-500">
                {summary.adultMembers} adults, {summary.childMembers} children
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📅</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{summary.totalMealPlans}</div>
              <div className="text-sm text-gray-600">Meal Plans</div>
              <div className="text-xs text-gray-500">Active tracking</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🔥</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCalories(summary.totalCalories)}
              </div>
              <div className="text-sm text-gray-600">Total Calories</div>
              <div className="text-xs text-gray-500">All meal plans</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚡</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCalories(summary.avgCaloriesPerMember)}
              </div>
              <div className="text-sm text-gray-600">Avg per Member</div>
              <div className="text-xs text-gray-500">Daily target</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Family Members Nutrition */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Members</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {familyNutrition.map(member => {
            const avgDailyCalories =
              member.mealPlans.length > 0
                ? Math.round(member.totalCalories / member.mealPlans.length)
                : 0;

            return (
              <Card key={member.userId} hover className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.fullName.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {member.fullName || member.email}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="capitalize">{member.role}</span>
                        {member.isChild && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            👶 Child
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {onViewMember && (
                    <Button variant="ghost" size="sm" onClick={() => onViewMember(member)}>
                      View Details
                    </Button>
                  )}
                </div>

                {/* Nutrition Summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Meal Plans:</span>
                    <span className="font-medium">{member.mealPlans.length}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Calories:</span>
                    <span className="font-medium">{formatCalories(member.totalCalories)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Daily:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getCalorieColor(avgDailyCalories, member.isChild)}`}
                    >
                      {formatCalories(avgDailyCalories)} cal
                    </span>
                  </div>

                  {/* Macros */}
                  {member.totalProtein > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {formatMacro(member.totalProtein)}
                        </div>
                        <div className="text-xs text-gray-500">Protein</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {formatMacro(member.totalCarbs)}
                        </div>
                        <div className="text-xs text-gray-500">Carbs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {formatMacro(member.totalFat)}
                        </div>
                        <div className="text-xs text-gray-500">Fat</div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Goals Compliance */}
      {goalsCompliance.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nutrition Goals Status</h3>
          <Card className="p-6">
            <div className="space-y-4">
              {goalsCompliance.map(compliance => {
                const member = familyNutrition.find(m => m.userId === compliance.userId);
                return (
                  <div key={compliance.userId} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                        {member?.fullName?.charAt(0) || compliance.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{member?.fullName || compliance.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {formatCalories(compliance.avgDailyCalories)} cal/day
                      </span>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          compliance.goalsSet
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {compliance.goalsSet ? '🎯 Goals Set' : '⚠️ No Goals'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
