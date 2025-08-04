import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { Recipe, MealPlan } from '../../types';

interface WeekDay {
  day: string;
  date: string;
  meals: {
    breakfast?: Recipe;
    lunch?: Recipe;
    dinner?: Recipe;
    snacks?: Recipe[];
  };
}

export default function MealPlans() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, 1 = next week, etc.
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const loadMealPlans = async () => {
      try {
        // Load meal plans from localStorage (placeholder for database)
        const savedPlans = localStorage.getItem('userMealPlans');
        if (savedPlans) {
          setMealPlans(JSON.parse(savedPlans));
        }

        // Generate current week structure
        generateWeekStructure();
        setLoading(false);
      } catch (error) {
        console.error('Error loading meal plans:', error);
        setLoading(false);
      }
    };

    loadMealPlans();
  }, [selectedWeek]);

  const generateWeekStructure = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + selectedWeek * 7);

    const week: WeekDay[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      week.push({
        day: dayNames[i],
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        meals: {
          breakfast: undefined,
          lunch: undefined,
          dinner: undefined,
          snacks: [],
        },
      });
    }

    setCurrentWeek(week);
  };

  const handleCreateMealPlan = () => {
    // Placeholder for meal plan creation
    setShowCreateModal(true);
  };

  const handleAddMeal = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    // Placeholder for adding meals to specific days
    console.log(`Add ${mealType} to ${currentWeek[dayIndex].day}`);
  };

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-pantry-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading meal plans...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Head>
        <title>Meal Plans - Pantry Buddy Pro</title>
        <meta name="description" content="Plan your meals for the week with AI-generated recipes" />
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meal Plans</h1>
              <p className="text-gray-600 mt-1">Plan your meals for the week ahead</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
                disabled={selectedWeek === 0}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous Week
              </button>
              <button
                onClick={() => setSelectedWeek(selectedWeek + 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Next Week →
              </button>
              <button
                onClick={handleCreateMealPlan}
                className="px-6 py-2 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium"
              >
                + Create Plan
              </button>
            </div>
          </div>

          {/* Week View */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedWeek === 0
                  ? 'This Week'
                  : selectedWeek === 1
                    ? 'Next Week'
                    : `Week ${selectedWeek + 1}`}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {currentWeek.map((day, index) => (
                <div key={day.day} className="p-4 min-h-[300px]">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-gray-900">{day.day}</h3>
                    <p className="text-sm text-gray-500">{day.date}</p>
                  </div>

                  <div className="space-y-3">
                    {/* Breakfast */}
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-yellow-800 mb-2">BREAKFAST</h4>
                      {day.meals.breakfast ? (
                        <p className="text-sm text-gray-900">{day.meals.breakfast.title}</p>
                      ) : (
                        <button
                          onClick={() => handleAddMeal(index, 'breakfast')}
                          className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                        >
                          + Add meal
                        </button>
                      )}
                    </div>

                    {/* Lunch */}
                    <div className="bg-green-50 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-green-800 mb-2">LUNCH</h4>
                      {day.meals.lunch ? (
                        <p className="text-sm text-gray-900">{day.meals.lunch.title}</p>
                      ) : (
                        <button
                          onClick={() => handleAddMeal(index, 'lunch')}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          + Add meal
                        </button>
                      )}
                    </div>

                    {/* Dinner */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-blue-800 mb-2">DINNER</h4>
                      {day.meals.dinner ? (
                        <p className="text-sm text-gray-900">{day.meals.dinner.title}</p>
                      ) : (
                        <button
                          onClick={() => handleAddMeal(index, 'dinner')}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          + Add meal
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-pantry-50 to-pantry-100 rounded-2xl p-6 border border-pantry-200">
              <div className="text-2xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Meal Planning</h3>
              <p className="text-gray-600 text-sm mb-4">
                Let AI create a balanced meal plan based on your preferences and pantry items.
              </p>
              <button className="w-full px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors text-sm font-medium">
                Generate AI Plan
              </button>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="text-2xl mb-3">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Shopping List</h3>
              <p className="text-gray-600 text-sm mb-4">
                Generate a shopping list based on your planned meals and current pantry.
              </p>
              <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                Create List
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nutrition Analysis</h3>
              <p className="text-gray-600 text-sm mb-4">
                View nutritional breakdown and balance of your weekly meal plan.
              </p>
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                View Analysis
              </button>
            </div>
          </div>

          {/* Empty State */}
          {mealPlans.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No meal plans yet</h3>
              <p className="text-gray-600 mb-6">
                Start planning your meals to eat better and save time during the week.
              </p>
              <button
                onClick={handleCreateMealPlan}
                className="px-8 py-3 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium"
              >
                Create Your First Meal Plan
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
