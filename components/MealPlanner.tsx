import React, { useState, useEffect } from 'react';
import { MealPlan, PlannedMeal, Recipe, MealType, PrepStatus, NutritionGoals } from '../types';

interface MealPlannerProps {
  mealPlans: MealPlan[];
  recipes: Recipe[];
  currentMealPlan?: MealPlan;
  onCreateMealPlan: (mealPlan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateMealPlan: (id: string, updates: Partial<MealPlan>) => void;
  onDeleteMealPlan: (id: string) => void;
  onAddMealToPlan: (mealPlanId: string, meal: Omit<PlannedMeal, 'id'>) => void;
  onUpdateMeal: (mealPlanId: string, mealId: string, updates: Partial<PlannedMeal>) => void;
  onRemoveMealFromPlan: (mealPlanId: string, mealId: string) => void;
  userId: string;
}

const MEAL_TYPES: { value: MealType; label: string; icon: string; color: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🍳', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'lunch', label: 'Lunch', icon: '🥪', color: 'bg-green-100 text-green-800' },
  { value: 'dinner', label: 'Dinner', icon: '🍽️', color: 'bg-blue-100 text-blue-800' },
  { value: 'snack', label: 'Snack', icon: '🍿', color: 'bg-purple-100 text-purple-800' },
];

const PREP_STATUS_CONFIG: { [key in PrepStatus]: { label: string; color: string; icon: string } } =
  {
    planned: { label: 'Planned', color: 'bg-gray-100 text-gray-700', icon: '📋' },
    shopping: { label: 'Shopping', color: 'bg-blue-100 text-blue-700', icon: '🛒' },
    prepped: { label: 'Prepped', color: 'bg-yellow-100 text-yellow-700', icon: '🥄' },
    cooking: { label: 'Cooking', color: 'bg-orange-100 text-orange-700', icon: '👨‍🍳' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: '✅' },
  };

export default function MealPlanner({
  mealPlans,
  recipes,
  currentMealPlan,
  onCreateMealPlan,
  onUpdateMealPlan,
  onDeleteMealPlan,
  onAddMealToPlan,
  onUpdateMeal,
  onRemoveMealFromPlan,
  userId,
}: MealPlannerProps) {
  const [activeView, setActiveView] = useState<'calendar' | 'plans' | 'nutrition'>('calendar');
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(currentMealPlan || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner');
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek;
    return new Date(today.setDate(diff));
  });

  const [newMealPlan, setNewMealPlan] = useState({
    name: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    nutritionGoals: {
      dailyCalories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
      fiber: 25,
      sodium: 2300,
      restrictions: [] as string[],
    } as NutritionGoals,
    isTemplate: false,
  });

  const [selectedRecipeForMeal, setSelectedRecipeForMeal] = useState<Recipe | null>(null);

  // Get current week dates
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Get meals for a specific date
  const getMealsForDate = (date: Date): PlannedMeal[] => {
    if (!selectedPlan) return [];
    return selectedPlan.meals
      .filter(meal => meal.date.toDateString() === date.toDateString())
      .sort((a, b) => {
        const mealOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
        return mealOrder[a.mealType] - mealOrder[b.mealType];
      });
  };

  // Get recipe by ID
  const getRecipeById = (recipeId: string): Recipe | undefined => {
    return recipes.find(recipe => recipe.id === recipeId);
  };

  // Calculate nutrition for a day
  const getDayNutrition = (date: Date) => {
    const dayMeals = getMealsForDate(date);
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    dayMeals.forEach(meal => {
      const recipe = getRecipeById(meal.recipeId);
      if (recipe?.nutritionInfo && meal.servings) {
        const servingMultiplier = meal.servings / recipe.servings;
        totalCalories += recipe.nutritionInfo.calories * servingMultiplier;
        totalProtein += recipe.nutritionInfo.protein * servingMultiplier;
        totalCarbs += recipe.nutritionInfo.carbs * servingMultiplier;
        totalFat += recipe.nutritionInfo.fat * servingMultiplier;
      }
    });

    return { totalCalories, totalProtein, totalCarbs, totalFat };
  };

  // Handle adding meal to plan
  const handleAddMeal = () => {
    if (!selectedPlan || !selectedDate || !selectedRecipeForMeal) return;

    const newMeal: Omit<PlannedMeal, 'id'> = {
      date: selectedDate,
      mealType: selectedMealType,
      recipeId: selectedRecipeForMeal.id,
      servings: selectedRecipeForMeal.servings,
      prepStatus: 'planned',
      notes: '',
      ingredients: selectedRecipeForMeal.ingredients,
    };

    onAddMealToPlan(selectedPlan.id, newMeal);
    setShowAddMealModal(false);
    setSelectedRecipeForMeal(null);
    setSelectedDate(null);
  };

  // Handle creating new meal plan
  const handleCreateMealPlan = () => {
    onCreateMealPlan({
      ...newMealPlan,
      userId,
      meals: [],
      shoppingListId: undefined,
      totalCalories: 0,
      status: 'draft',
      isTemplate: newMealPlan.isTemplate,
      sharedWith: [],
    });

    setNewMealPlan({
      name: '',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      nutritionGoals: {
        dailyCalories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        fiber: 25,
        sodium: 2300,
        restrictions: [],
      },
      isTemplate: false,
    });
    setShowCreateModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Meal Planner</h1>
          <p className="text-gray-600">Plan your meals and track your nutrition goals</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedPlan?.id || ''}
            onChange={e => {
              const plan = mealPlans.find(p => p.id === e.target.value);
              setSelectedPlan(plan || null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a meal plan</option>
            {mealPlans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg"
          >
            + New Plan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveView('calendar')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeView === 'calendar'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📅 Calendar View
        </button>
        <button
          onClick={() => setActiveView('plans')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeView === 'plans'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📋 My Plans
        </button>
        <button
          onClick={() => setActiveView('nutrition')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeView === 'nutrition'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📊 Nutrition
        </button>
      </div>

      {/* Calendar View */}
      {activeView === 'calendar' && selectedPlan && (
        <div>
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                const newWeekStart = new Date(weekStart);
                newWeekStart.setDate(weekStart.getDate() - 7);
                setWeekStart(newWeekStart);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Previous Week
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              {weekStart.toLocaleDateString()} -{' '}
              {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </h2>
            <button
              onClick={() => {
                const newWeekStart = new Date(weekStart);
                newWeekStart.setDate(weekStart.getDate() + 7);
                setWeekStart(newWeekStart);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Next Week →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-4">
            {getWeekDates().map(date => {
              const dayMeals = getMealsForDate(date);
              const nutrition = getDayNutrition(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={date.toISOString()}
                  className={`bg-white rounded-xl shadow-lg p-4 min-h-[300px] ${
                    isToday ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Nutrition Summary */}
                  <div className="mb-4 p-2 bg-gray-50 rounded-lg text-xs">
                    <div className="text-center font-medium text-gray-700">
                      {Math.round(nutrition.totalCalories)} cal
                    </div>
                    <div className="flex justify-between text-gray-500 mt-1">
                      <span>P: {Math.round(nutrition.totalProtein)}g</span>
                      <span>C: {Math.round(nutrition.totalCarbs)}g</span>
                      <span>F: {Math.round(nutrition.totalFat)}g</span>
                    </div>
                  </div>

                  {/* Meals */}
                  <div className="space-y-2">
                    {MEAL_TYPES.map(mealType => {
                      const meal = dayMeals.find(m => m.mealType === mealType.value);
                      const recipe = meal ? getRecipeById(meal.recipeId) : null;

                      return (
                        <div key={mealType.value} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-600 flex items-center gap-1">
                              {mealType.icon} {mealType.label}
                            </span>
                            {!meal && (
                              <button
                                onClick={() => {
                                  setSelectedDate(date);
                                  setSelectedMealType(mealType.value);
                                  setShowAddMealModal(true);
                                }}
                                className="text-blue-500 hover:text-blue-600 text-lg leading-none"
                              >
                                +
                              </button>
                            )}
                          </div>
                          {meal && recipe ? (
                            <div className="bg-gray-50 rounded-lg p-2">
                              <div className="font-medium text-gray-800 mb-1 truncate">
                                {recipe.title}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">{meal.servings} servings</span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs ${PREP_STATUS_CONFIG[meal.prepStatus].color}`}
                                >
                                  {PREP_STATUS_CONFIG[meal.prepStatus].icon}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-400 italic text-center py-2">
                              No meal planned
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plans Management View */}
      {activeView === 'plans' && (
        <div className="space-y-6">
          {mealPlans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                  <p className="text-gray-600">
                    {plan.startDate.toLocaleDateString()} - {plan.endDate.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      plan.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : plan.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-700'
                          : plan.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                  </span>
                  <button
                    onClick={() => setSelectedPlan(plan)}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onDeleteMealPlan(plan.id)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Meals Planned:</span>
                  <span className="font-medium ml-2">{plan.meals.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Target Calories:</span>
                  <span className="font-medium ml-2">
                    {plan.nutritionGoals?.dailyCalories || 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="font-medium ml-2">
                    {Math.ceil(
                      (plan.endDate.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Template:</span>
                  <span className="font-medium ml-2">{plan.isTemplate ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          ))}

          {mealPlans.length === 0 && (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📅</span>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No meal plans yet</h3>
              <p className="text-gray-500 mb-4">Create your first meal plan to get started!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold"
              >
                Create First Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nutrition Tracking View */}
      {activeView === 'nutrition' && selectedPlan && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Nutrition Goals vs Actual</h3>
            {selectedPlan.nutritionGoals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Daily Calories</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {selectedPlan.nutritionGoals.dailyCalories}
                  </div>
                  <div className="text-sm text-green-600">Target</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Protein</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {selectedPlan.nutritionGoals.protein}g
                  </div>
                  <div className="text-sm text-green-600">Target</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Carbs</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {selectedPlan.nutritionGoals.carbs}g
                  </div>
                  <div className="text-sm text-green-600">Target</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Fat</div>
                  <div className="text-2xl font-bold text-gray-800">
                    {selectedPlan.nutritionGoals.fat}g
                  </div>
                  <div className="text-sm text-green-600">Target</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Meal Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create New Meal Plan</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
                  <input
                    type="text"
                    value={newMealPlan.name}
                    onChange={e => setNewMealPlan({ ...newMealPlan, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Weekly Meal Plan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={newMealPlan.startDate.toISOString().split('T')[0]}
                      onChange={e =>
                        setNewMealPlan({ ...newMealPlan, startDate: new Date(e.target.value) })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newMealPlan.endDate.toISOString().split('T')[0]}
                      onChange={e =>
                        setNewMealPlan({ ...newMealPlan, endDate: new Date(e.target.value) })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-4">Nutrition Goals</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Daily Calories</label>
                      <input
                        type="number"
                        value={newMealPlan.nutritionGoals.dailyCalories}
                        onChange={e =>
                          setNewMealPlan({
                            ...newMealPlan,
                            nutritionGoals: {
                              ...newMealPlan.nutritionGoals,
                              dailyCalories: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Protein (g)</label>
                      <input
                        type="number"
                        value={newMealPlan.nutritionGoals.protein}
                        onChange={e =>
                          setNewMealPlan({
                            ...newMealPlan,
                            nutritionGoals: {
                              ...newMealPlan.nutritionGoals,
                              protein: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Carbs (g)</label>
                      <input
                        type="number"
                        value={newMealPlan.nutritionGoals.carbs}
                        onChange={e =>
                          setNewMealPlan({
                            ...newMealPlan,
                            nutritionGoals: {
                              ...newMealPlan.nutritionGoals,
                              carbs: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Fat (g)</label>
                      <input
                        type="number"
                        value={newMealPlan.nutritionGoals.fat}
                        onChange={e =>
                          setNewMealPlan({
                            ...newMealPlan,
                            nutritionGoals: {
                              ...newMealPlan.nutritionGoals,
                              fat: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={newMealPlan.isTemplate}
                      onChange={e =>
                        setNewMealPlan({ ...newMealPlan, isTemplate: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-700">Save as template</span>
                      <p className="text-sm text-gray-500">
                        Reuse this plan structure for future weeks
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateMealPlan}
                    disabled={!newMealPlan.name.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddMealModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Add {MEAL_TYPES.find(mt => mt.value === selectedMealType)?.label} for{' '}
                  {selectedDate?.toLocaleDateString()}
                </h2>
                <button
                  onClick={() => {
                    setShowAddMealModal(false);
                    setSelectedRecipeForMeal(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    onClick={() => setSelectedRecipeForMeal(recipe)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedRecipeForMeal?.id === recipe.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-800 mb-2">{recipe.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{recipe.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>⏱️ {recipe.totalTime}m</span>
                      <span>{recipe.servings} servings</span>
                      {recipe.nutritionInfo && <span>{recipe.nutritionInfo.calories} cal</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  onClick={() => {
                    setShowAddMealModal(false);
                    setSelectedRecipeForMeal(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMeal}
                  disabled={!selectedRecipeForMeal}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Meal Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
