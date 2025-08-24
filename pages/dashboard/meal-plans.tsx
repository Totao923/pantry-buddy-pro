import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import MealPlanner from '../../components/MealPlanner';
import { useAuth } from '../../lib/auth/AuthProvider';
import { aiService } from '../../lib/ai/aiService';
import { getIngredientService } from '../../lib/services/ingredientServiceFactory';
import { MealPlanService } from '../../lib/services/mealPlanService';
import { Recipe, MealPlan, Ingredient, PlannedMeal } from '../../types';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const { user, session } = useAuth();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, 1 = next week, etc.
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanWeek, setNewPlanWeek] = useState<WeekDay[]>([]);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedMealSlot, setSelectedMealSlot] = useState<{
    dayIndex: number;
    mealType: string;
  } | null>(null);
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null);
  const [showMealPlanner, setShowMealPlanner] = useState(false);

  const generateWeekStructure = useCallback(() => {
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
  }, [selectedWeek]);

  useEffect(() => {
    const loadMealPlans = async () => {
      if (!user) return;

      try {
        // Load meal plans from database
        const plans = await MealPlanService.getMealPlans(user.id);
        setMealPlans(plans);

        // Load available ingredients
        const ingredientService = await getIngredientService();
        const ingredients = await ingredientService.getAllIngredients();
        setAvailableIngredients(ingredients);

        // Load available recipes from localStorage (will be replaced with API call later)
        const savedRecipes = localStorage.getItem('recentRecipes');
        if (savedRecipes) {
          const recipes = JSON.parse(savedRecipes);
          setAvailableRecipes(recipes);
        }

        // Initialize AI service
        await aiService.initialize();

        // Generate current week structure
        generateWeekStructure();
        setLoading(false);
      } catch (error) {
        console.error('Error loading meal plans:', error);
        setLoading(false);
      }
    };

    loadMealPlans();
  }, [user, selectedWeek, generateWeekStructure]);

  // CRUD handlers for MealPlanner component
  const handleCreateMealPlanFromPlanner = async (
    mealPlan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) return;

    try {
      const createdPlan = await MealPlanService.createMealPlan(mealPlan);
      setMealPlans([...mealPlans, createdPlan]);
    } catch (error) {
      console.error('Error creating meal plan:', error);
      alert('Failed to create meal plan. Please try again.');
    }
  };

  const handleUpdateMealPlan = async (id: string, updates: Partial<MealPlan>) => {
    try {
      const updatedPlan = await MealPlanService.updateMealPlan(id, updates);
      setMealPlans(mealPlans.map(plan => (plan.id === id ? updatedPlan : plan)));

      // Update current meal plan if it's the one being updated
      if (currentMealPlan?.id === id) {
        setCurrentMealPlan(updatedPlan);
      }
    } catch (error) {
      console.error('Error updating meal plan:', error);
      alert('Failed to update meal plan. Please try again.');
    }
  };

  const handleDeleteMealPlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) return;

    try {
      await MealPlanService.deleteMealPlan(id);
      setMealPlans(mealPlans.filter(plan => plan.id !== id));

      // Clear current meal plan if it's the one being deleted
      if (currentMealPlan?.id === id) {
        setCurrentMealPlan(null);
      }
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      alert('Failed to delete meal plan. Please try again.');
    }
  };

  const handleAddMealToPlan = async (mealPlanId: string, meal: Omit<PlannedMeal, 'id'>) => {
    try {
      const newMeal = await MealPlanService.addMealToPlan(mealPlanId, meal);

      // Update the meal plan in our state
      setMealPlans(
        mealPlans.map(plan =>
          plan.id === mealPlanId ? { ...plan, meals: [...plan.meals, newMeal] } : plan
        )
      );

      // Update current meal plan if needed
      if (currentMealPlan?.id === mealPlanId) {
        setCurrentMealPlan({
          ...currentMealPlan,
          meals: [...currentMealPlan.meals, newMeal],
        });
      }
    } catch (error) {
      console.error('Error adding meal to plan:', error);
      alert('Failed to add meal to plan. Please try again.');
    }
  };

  const handleUpdateMeal = async (
    mealPlanId: string,
    mealId: string,
    updates: Partial<PlannedMeal>
  ) => {
    try {
      const updatedMeal = await MealPlanService.updateMeal(mealPlanId, mealId, updates);

      // Update the meal plan in our state
      setMealPlans(
        mealPlans.map(plan =>
          plan.id === mealPlanId
            ? { ...plan, meals: plan.meals.map(meal => (meal.id === mealId ? updatedMeal : meal)) }
            : plan
        )
      );

      // Update current meal plan if needed
      if (currentMealPlan?.id === mealPlanId) {
        setCurrentMealPlan({
          ...currentMealPlan,
          meals: currentMealPlan.meals.map(meal => (meal.id === mealId ? updatedMeal : meal)),
        });
      }
    } catch (error) {
      console.error('Error updating meal:', error);
      alert('Failed to update meal. Please try again.');
    }
  };

  const handleRemoveMealFromPlan = async (mealPlanId: string, mealId: string) => {
    try {
      await MealPlanService.removeMealFromPlan(mealPlanId, mealId);

      // Update the meal plan in our state
      setMealPlans(
        mealPlans.map(plan =>
          plan.id === mealPlanId
            ? { ...plan, meals: plan.meals.filter(meal => meal.id !== mealId) }
            : plan
        )
      );

      // Update current meal plan if needed
      if (currentMealPlan?.id === mealPlanId) {
        setCurrentMealPlan({
          ...currentMealPlan,
          meals: currentMealPlan.meals.filter(meal => meal.id !== mealId),
        });
      }
    } catch (error) {
      console.error('Error removing meal from plan:', error);
      alert('Failed to remove meal from plan. Please try again.');
    }
  };

  const handleCreateMealPlan = () => {
    // Initialize new plan with empty week structure
    const emptyWeek = generateEmptyWeek();
    setNewPlanWeek(emptyWeek);
    setNewPlanName('');
    setShowCreateModal(true);
  };

  const generateEmptyWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

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

    return week;
  };

  const handleSelectMealSlot = (dayIndex: number, mealType: string) => {
    setSelectedMealSlot({ dayIndex, mealType });
    setShowRecipeSelector(true);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    if (!selectedMealSlot) return;

    const updatedWeek = [...newPlanWeek];
    (updatedWeek[selectedMealSlot.dayIndex].meals as any)[selectedMealSlot.mealType] = recipe;
    setNewPlanWeek(updatedWeek);
    setShowRecipeSelector(false);
    setSelectedMealSlot(null);
  };

  const handleSaveManualPlan = async () => {
    if (!user || !newPlanName.trim()) return;

    try {
      // Convert to proper MealPlan format
      const plannedMeals: Omit<PlannedMeal, 'id'>[] = [];
      const startDate = new Date();

      newPlanWeek.forEach((day, dayIndex) => {
        const mealDate = new Date(startDate);
        mealDate.setDate(startDate.getDate() + dayIndex);

        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
          const recipe = (day.meals as any)[mealType];
          if (recipe) {
            plannedMeals.push({
              recipeId: recipe.id,
              date: mealDate,
              mealType: mealType as any,
              servings: recipe.servings || 2,
              prepStatus: 'planned',
              notes: '',
              ingredients: recipe.ingredients || [],
            });
          }
        });
      });

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const newMealPlan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'> = {
        name: newPlanName.trim(),
        userId: user.id,
        startDate,
        endDate,
        meals: plannedMeals as PlannedMeal[],
        shoppingList: [],
        totalCalories: 0,
        status: 'active',
        isTemplate: false,
        sharedWith: [],
      };

      // Create meal plan using API
      const createdPlan = await MealPlanService.createMealPlan(newMealPlan);

      // Update local state
      setMealPlans([...mealPlans, createdPlan]);

      // Reset form and close modal
      setNewPlanName('');
      setNewPlanWeek([]);
      setShowCreateModal(false);

      alert('Meal plan created successfully!');
    } catch (error) {
      console.error('Error creating meal plan:', error);
      alert('Failed to create meal plan. Please try again.');
    }
  };

  const handleAddMeal = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    // Placeholder for adding meals to specific days
    console.log(`Add ${mealType} to ${currentWeek[dayIndex].day}`);
  };

  const generateAIMealPlan = async () => {
    if (!user || generatingPlan) return;

    setGeneratingPlan(true);
    try {
      console.log('🍳 Generating AI meal plan with ingredients:', availableIngredients.length);

      // Call the dedicated meal plan generation API
      const response = await fetch('/api/meal-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: availableIngredients,
          userId: user.id,
          preferences: {
            difficulty: 'Easy',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.weekPlan) {
        console.log('✅ AI meal plan generated successfully');
        setCurrentWeek(result.weekPlan);
      } else {
        throw new Error(result.error || 'Failed to generate meal plan');
      }

      // Convert week structure to PlannedMeal format
      const plannedMeals: any[] = [];
      const startDate = new Date();

      result.weekPlan.forEach((day: any, dayIndex: number) => {
        const mealDate = new Date(startDate);
        mealDate.setDate(startDate.getDate() + dayIndex);

        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
          const recipe = (day.meals as any)[mealType];
          if (recipe) {
            plannedMeals.push({
              id: uuidv4(),
              recipeId: recipe.id,
              date: mealDate,
              mealType,
              servings: recipe.servings || 2,
            });
          }
        });
      });

      // Save the meal plan using the correct MealPlan interface
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const newMealPlan: MealPlan = {
        id: uuidv4(),
        name: `AI Generated Plan - ${new Date().toLocaleDateString()}`,
        userId: user.id,
        startDate,
        endDate,
        meals: plannedMeals,
        shoppingList: [], // Empty shopping list initially
        totalCalories: 0, // Calculate from meals if needed
        status: 'active' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        isTemplate: false,
      };

      const updatedPlans = [...mealPlans, newMealPlan];
      setMealPlans(updatedPlans);
      localStorage.setItem('userMealPlans', JSON.stringify(updatedPlans));
    } catch (error) {
      console.error('Error generating AI meal plan:', error);
      alert('Failed to generate meal plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const generateShoppingList = () => {
    if (!user) return;

    try {
      // Collect all ingredients from planned meals
      const allMealIngredients: {
        [key: string]: { name: string; quantity: number; unit: string; category: string };
      } = {};

      currentWeek.forEach(day => {
        [day.meals.breakfast, day.meals.lunch, day.meals.dinner].forEach(meal => {
          if (meal && meal.ingredients) {
            meal.ingredients.forEach(ingredient => {
              const key = ingredient.name.toLowerCase();
              if (allMealIngredients[key]) {
                allMealIngredients[key].quantity += ingredient.amount;
              } else {
                allMealIngredients[key] = {
                  name: ingredient.name,
                  quantity: ingredient.amount,
                  unit: ingredient.unit,
                  category: 'other', // RecipeIngredient doesn't have category
                };
              }
            });
          }
        });
      });

      // Compare with available ingredients to find missing items
      const availableIngredientNames = availableIngredients.map(ing => ing.name.toLowerCase());
      const missingIngredients = Object.values(allMealIngredients).filter(
        ingredient => !availableIngredientNames.includes(ingredient.name.toLowerCase())
      );

      if (missingIngredients.length === 0) {
        alert('You have all ingredients needed for your meal plan!');
        return;
      }

      // Create shopping list items
      const shoppingListItems = missingIngredients.map(ingredient => ({
        id: uuidv4(),
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category as any,
        purchased: false,
        priority: 'medium' as const,
        addedDate: new Date(),
      }));

      // Create new shopping list
      const newShoppingList = {
        id: uuidv4(),
        name: `Meal Plan Shopping List - ${new Date().toLocaleDateString()}`,
        userId: user.id,
        items: shoppingListItems,
        createdDate: new Date(),
        lastModified: new Date(),
        isActive: true,
        totalEstimatedCost: 0,
        completedItems: 0,
      };

      // Save to localStorage (same key as shopping-lists.tsx)
      const existingLists = JSON.parse(localStorage.getItem('shoppingLists') || '[]');
      const updatedLists = [...existingLists, newShoppingList];
      localStorage.setItem('shoppingLists', JSON.stringify(updatedLists));

      alert(
        `Shopping list created with ${missingIngredients.length} items! View it in the Shopping Lists page.`
      );
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Failed to generate shopping list. Please try again.');
    }
  };

  const calculateNutritionAnalysis = () => {
    // Calculate weekly nutrition from all planned meals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let mealCount = 0;

    const dailyNutrition: Array<{
      day: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }> = [];

    currentWeek.forEach(day => {
      let dayCalories = 0;
      let dayProtein = 0;
      let dayCarbs = 0;
      let dayFat = 0;

      [day.meals.breakfast, day.meals.lunch, day.meals.dinner].forEach(meal => {
        if (meal && meal.nutritionInfo) {
          const nutrition = meal.nutritionInfo;
          dayCalories += nutrition.calories || 0;
          dayProtein += nutrition.protein || 0;
          dayCarbs += nutrition.carbs || 0;
          dayFat += nutrition.fat || 0;

          totalCalories += nutrition.calories || 0;
          totalProtein += nutrition.protein || 0;
          totalCarbs += nutrition.carbs || 0;
          totalFat += nutrition.fat || 0;
          totalFiber += nutrition.fiber || 0;
          mealCount++;
        }
      });

      dailyNutrition.push({
        day: day.day.substring(0, 3),
        calories: Math.round(dayCalories),
        protein: Math.round(dayProtein),
        carbs: Math.round(dayCarbs),
        fat: Math.round(dayFat),
      });
    });

    // Calculate macronutrient distribution
    const macroDistribution = [
      {
        name: 'Protein',
        value: Math.round(totalProtein),
        calories: Math.round(totalProtein * 4),
        color: '#FF6B6B',
      },
      {
        name: 'Carbs',
        value: Math.round(totalCarbs),
        calories: Math.round(totalCarbs * 4),
        color: '#4ECDC4',
      },
      {
        name: 'Fat',
        value: Math.round(totalFat),
        calories: Math.round(totalFat * 9),
        color: '#45B7D1',
      },
    ];

    return {
      totalCalories: Math.round(totalCalories),
      averageCalories: mealCount > 0 ? Math.round(totalCalories / 7) : 0,
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      totalFiber: Math.round(totalFiber),
      dailyNutrition,
      macroDistribution,
      mealCount,
    };
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
              {!showMealPlanner && (
                <>
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
                </>
              )}
              <button
                onClick={() => setShowMealPlanner(!showMealPlanner)}
                className={`px-6 py-2 rounded-xl font-medium transition-all ${
                  showMealPlanner
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {showMealPlanner ? 'Quick View' : '📋 Full Planner'}
              </button>
              <button
                onClick={handleCreateMealPlan}
                className="px-6 py-2 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium"
              >
                + Create Plan
              </button>
            </div>
          </div>

          {/* MealPlanner Component */}
          {showMealPlanner && user && (
            <MealPlanner
              mealPlans={mealPlans}
              recipes={availableRecipes}
              currentMealPlan={currentMealPlan || undefined}
              onCreateMealPlan={handleCreateMealPlanFromPlanner}
              onUpdateMealPlan={handleUpdateMealPlan}
              onDeleteMealPlan={handleDeleteMealPlan}
              onAddMealToPlan={handleAddMealToPlan}
              onUpdateMeal={handleUpdateMeal}
              onRemoveMealFromPlan={handleRemoveMealFromPlan}
              userId={user.id}
            />
          )}

          {/* Week View */}
          {!showMealPlanner && (
            <>
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
                  <button
                    onClick={() => {
                      console.log('🔍 AI Button Debug:', {
                        generatingPlan,
                        availableIngredientsLength: availableIngredients.length,
                        availableIngredients: availableIngredients.slice(0, 3),
                        isDisabled: generatingPlan || availableIngredients.length === 0,
                      });
                      generateAIMealPlan();
                    }}
                    disabled={generatingPlan || availableIngredients.length === 0}
                    className="w-full px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingPlan ? 'Generating...' : 'Generate AI Plan'}
                  </button>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                  <div className="text-2xl mb-3">📝</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Shopping List</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Generate a shopping list based on your planned meals and current pantry.
                  </p>
                  <button
                    onClick={() => {
                      const hasNoMeals = currentWeek.every(
                        day => !day.meals.breakfast && !day.meals.lunch && !day.meals.dinner
                      );
                      console.log('🔍 Shopping List Button Debug:', {
                        currentWeekLength: currentWeek.length,
                        hasNoMeals,
                        firstDayMeals: currentWeek[0]?.meals,
                        isDisabled: hasNoMeals,
                      });
                      generateShoppingList();
                    }}
                    disabled={currentWeek.every(
                      day => !day.meals.breakfast && !day.meals.lunch && !day.meals.dinner
                    )}
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create List
                  </button>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="text-2xl mb-3">📊</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nutrition Analysis</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    View nutritional breakdown and balance of your weekly meal plan.
                  </p>
                  <button
                    onClick={() => setShowNutritionModal(true)}
                    disabled={currentWeek.every(
                      day => !day.meals.breakfast && !day.meals.lunch && !day.meals.dinner
                    )}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    View Analysis
                  </button>
                </div>
              </div>

              {/* Empty State */}
              {!showMealPlanner && mealPlans.length === 0 && (
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
            </>
          )}
        </div>

        {/* Nutrition Analysis Modal */}
        {showNutritionModal &&
          (() => {
            const nutritionData = calculateNutritionAnalysis();
            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Weekly Nutrition Analysis
                    </h3>
                    <button
                      onClick={() => setShowNutritionModal(false)}
                      className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {nutritionData.mealCount === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📊</div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        No nutrition data available
                      </h4>
                      <p className="text-gray-600">
                        Add meals to your plan to see nutrition analysis.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-blue-600 font-medium">Total Calories</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {nutritionData.totalCalories}
                          </p>
                          <p className="text-xs text-blue-700">
                            ~{nutritionData.averageCalories}/day
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-red-600 font-medium">Protein</p>
                          <p className="text-2xl font-bold text-red-900">
                            {nutritionData.totalProtein}g
                          </p>
                          <p className="text-xs text-red-700">
                            ~{Math.round(nutritionData.totalProtein / 7)}g/day
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-green-600 font-medium">Carbs</p>
                          <p className="text-2xl font-bold text-green-900">
                            {nutritionData.totalCarbs}g
                          </p>
                          <p className="text-xs text-green-700">
                            ~{Math.round(nutritionData.totalCarbs / 7)}g/day
                          </p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                          <p className="text-sm text-orange-600 font-medium">Fat</p>
                          <p className="text-2xl font-bold text-orange-900">
                            {nutritionData.totalFat}g
                          </p>
                          <p className="text-xs text-orange-700">
                            ~{Math.round(nutritionData.totalFat / 7)}g/day
                          </p>
                        </div>
                      </div>

                      {/* Charts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Daily Calories */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">
                            Daily Calories
                          </h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={nutritionData.dailyNutrition}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="day" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="calories" fill="#3B82F6" name="Calories" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Macro Distribution */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">
                            Macronutrient Distribution
                          </h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={nutritionData.macroDistribution}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="calories"
                                label={({ name, percent }) =>
                                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                                }
                              >
                                {nutritionData.macroDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => `${value} calories`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Daily Macros */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Daily Macronutrients
                        </h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={nutritionData.dailyNutrition}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="protein" fill="#FF6B6B" name="Protein (g)" />
                            <Bar dataKey="carbs" fill="#4ECDC4" name="Carbs (g)" />
                            <Bar dataKey="fat" fill="#45B7D1" name="Fat (g)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Health Insights */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-blue-900 mb-3">
                          💡 Health Insights
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-blue-800">
                            • Average daily calories: {nutritionData.averageCalories} (Target:
                            1800-2200 for most adults)
                          </p>
                          <p className="text-blue-800">
                            • Average daily protein: {Math.round(nutritionData.totalProtein / 7)}g
                            (Target: 50-100g)
                          </p>
                          <p className="text-blue-800">
                            • Protein makes up{' '}
                            {Math.round(
                              ((nutritionData.totalProtein * 4) / nutritionData.totalCalories) * 100
                            )}
                            % of calories (Target: 10-35%)
                          </p>
                          {nutritionData.totalFiber > 0 && (
                            <p className="text-blue-800">
                              • Total fiber: {nutritionData.totalFiber}g (Target: 175g+ per week)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        {/* Manual Meal Plan Creation Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Create New Meal Plan</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Plan Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Plan Name
                  </label>
                  <input
                    type="text"
                    value={newPlanName}
                    onChange={e => setNewPlanName(e.target.value)}
                    placeholder="Enter meal plan name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                  />
                </div>

                {/* Weekly Meal Grid */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Plan Your Week</h4>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {newPlanWeek.map((day, dayIndex) => (
                      <div key={day.day} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-center mb-3">
                          <h5 className="font-semibold text-gray-900">{day.day}</h5>
                          <p className="text-sm text-gray-500">{day.date}</p>
                        </div>

                        <div className="space-y-2">
                          {/* Breakfast */}
                          <div className="bg-yellow-50 rounded-lg p-2">
                            <h6 className="text-xs font-medium text-yellow-800 mb-1">BREAKFAST</h6>
                            {day.meals.breakfast ? (
                              <div>
                                <p className="text-xs text-gray-900 font-medium">
                                  {day.meals.breakfast.title}
                                </p>
                                <button
                                  onClick={() => handleSelectMealSlot(dayIndex, 'breakfast')}
                                  className="text-xs text-yellow-600 hover:text-yellow-700 mt-1"
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSelectMealSlot(dayIndex, 'breakfast')}
                                className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                              >
                                + Add Recipe
                              </button>
                            )}
                          </div>

                          {/* Lunch */}
                          <div className="bg-green-50 rounded-lg p-2">
                            <h6 className="text-xs font-medium text-green-800 mb-1">LUNCH</h6>
                            {day.meals.lunch ? (
                              <div>
                                <p className="text-xs text-gray-900 font-medium">
                                  {day.meals.lunch.title}
                                </p>
                                <button
                                  onClick={() => handleSelectMealSlot(dayIndex, 'lunch')}
                                  className="text-xs text-green-600 hover:text-green-700 mt-1"
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSelectMealSlot(dayIndex, 'lunch')}
                                className="text-xs text-green-600 hover:text-green-700 font-medium"
                              >
                                + Add Recipe
                              </button>
                            )}
                          </div>

                          {/* Dinner */}
                          <div className="bg-blue-50 rounded-lg p-2">
                            <h6 className="text-xs font-medium text-blue-800 mb-1">DINNER</h6>
                            {day.meals.dinner ? (
                              <div>
                                <p className="text-xs text-gray-900 font-medium">
                                  {day.meals.dinner.title}
                                </p>
                                <button
                                  onClick={() => handleSelectMealSlot(dayIndex, 'dinner')}
                                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleSelectMealSlot(dayIndex, 'dinner')}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                + Add Recipe
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveManualPlan}
                    disabled={!newPlanName.trim()}
                    className="px-6 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Meal Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Selector Modal */}
        {showRecipeSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Select Recipe for {selectedMealSlot?.mealType}
                </h3>
                <button
                  onClick={() => setShowRecipeSelector(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {availableRecipes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🍽️</div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No recipes available</h4>
                  <p className="text-gray-600 mb-6">
                    You need to create some recipes first before you can add them to meal plans.
                  </p>
                  <Link href="/dashboard/create-recipe">
                    <button className="px-6 py-3 bg-pantry-600 text-white rounded-xl hover:bg-pantry-700 transition-all font-medium">
                      Create Your First Recipe
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableRecipes.map(recipe => (
                    <div
                      key={recipe.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => handleSelectRecipe(recipe)}
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{recipe.title}</h4>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>⏱️ {recipe.totalTime}m</span>
                        <span className="capitalize">{recipe.cuisine}</span>
                        <span>👥 {recipe.servings}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
