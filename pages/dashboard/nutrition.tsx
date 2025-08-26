import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { AInutritionist } from '../../components/AInutritionist';
import { useAuth } from '../../lib/auth/AuthProvider';
import { getIngredientService } from '../../lib/services/ingredientServiceFactory';
import { RecipeService } from '../../lib/services/recipeService';
import { Ingredient, Recipe } from '../../types';
import { Card } from '../../components/ui/Card';

interface NutritionDashboardProps {
  ingredients?: Ingredient[];
  recentRecipes?: Recipe[];
}

export default function NutritionDashboard({
  ingredients: propIngredients = [],
  recentRecipes: propRecentRecipes = [],
}: NutritionDashboardProps = {}) {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>(propIngredients);
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>(propRecentRecipes);
  const [loading, setLoading] = useState(true);

  const addSampleData = async () => {
    try {
      console.log('🧪 Adding sample ingredients and recipes...');

      // Sample ingredients
      const sampleIngredients: Ingredient[] = [
        {
          id: 'sample-1',
          name: 'Chicken Breast',
          category: 'protein',
          quantity: '2',
          unit: 'lbs',
          expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          purchaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          isProtein: true,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: true,
          isDairyFree: true,
          usageFrequency: 3,
        },
        {
          id: 'sample-2',
          name: 'Spinach',
          category: 'vegetables',
          quantity: '1',
          unit: 'bag',
          expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          isProtein: false,
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: true,
          isDairyFree: true,
          usageFrequency: 2,
        },
        {
          id: 'sample-3',
          name: 'Brown Rice',
          category: 'grains',
          quantity: '5',
          unit: 'lbs',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          purchaseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          isProtein: false,
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: true,
          isDairyFree: true,
          usageFrequency: 5,
        },
        {
          id: 'sample-4',
          name: 'Greek Yogurt',
          category: 'dairy',
          quantity: '32',
          unit: 'oz',
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          isProtein: true,
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: true,
          isDairyFree: false,
          usageFrequency: 4,
        },
      ];

      // Sample recipes
      const sampleRecipes: Recipe[] = [
        {
          id: 'recipe-1',
          title: 'Grilled Chicken with Spinach',
          description: 'A healthy and delicious protein-rich meal',
          cuisine: 'american',
          servings: 4,
          prepTime: 15,
          cookTime: 20,
          totalTime: 35,
          difficulty: 'Easy',
          ingredients: [
            { name: 'Chicken Breast', amount: 1, unit: 'lb' },
            { name: 'Spinach', amount: 2, unit: 'cups' },
            { name: 'Olive Oil', amount: 2, unit: 'tbsp' },
          ],
          instructions: [
            { step: 1, instruction: 'Season chicken breast with salt and pepper' },
            {
              step: 2,
              instruction: 'Heat olive oil in a pan and cook chicken for 6-7 minutes per side',
            },
            { step: 3, instruction: 'Add spinach and cook until wilted' },
            { step: 4, instruction: 'Serve hot' },
          ],
          nutritionInfo: {
            calories: 285,
            protein: 35,
            carbs: 3,
            fat: 14,
            fiber: 2,
            sugar: 1,
            sodium: 320,
            cholesterol: 85,
          },
          tags: ['healthy', 'high-protein', 'low-carb'],
          rating: 4.5,
          reviews: 12,
          variations: [],
          dietaryInfo: {
            isVegetarian: false,
            isVegan: false,
            isGlutenFree: true,
            isDairyFree: true,
            isKeto: true,
            isPaleo: true,
            allergens: [],
          },
        },
        {
          id: 'recipe-2',
          title: 'Brown Rice Bowl with Yogurt',
          description: 'A wholesome grain bowl with protein',
          cuisine: 'mediterranean',
          servings: 2,
          prepTime: 10,
          cookTime: 25,
          totalTime: 35,
          difficulty: 'Easy',
          ingredients: [
            { name: 'Brown Rice', amount: 1, unit: 'cup' },
            { name: 'Greek Yogurt', amount: 0.5, unit: 'cup' },
            { name: 'Spinach', amount: 1, unit: 'cup' },
          ],
          instructions: [
            { step: 1, instruction: 'Cook brown rice according to package instructions' },
            { step: 2, instruction: 'Sauté spinach until wilted' },
            { step: 3, instruction: 'Serve rice topped with spinach and yogurt' },
          ],
          nutritionInfo: {
            calories: 320,
            protein: 18,
            carbs: 52,
            fat: 6,
            fiber: 4,
            sugar: 8,
            sodium: 180,
            cholesterol: 15,
          },
          tags: ['vegetarian', 'healthy', 'fiber-rich'],
          rating: 4.2,
          reviews: 8,
          variations: [],
          dietaryInfo: {
            isVegetarian: true,
            isVegan: false,
            isGlutenFree: true,
            isDairyFree: false,
            isKeto: false,
            isPaleo: false,
            allergens: ['dairy'],
          },
        },
      ];

      // Add to local storage for persistence
      localStorage.setItem('sampleIngredients', JSON.stringify(sampleIngredients));
      localStorage.setItem('recentRecipes', JSON.stringify(sampleRecipes));

      // Update state
      setIngredients(sampleIngredients);
      setRecentRecipes(sampleRecipes);

      console.log('✅ Sample data added successfully');
    } catch (error) {
      console.error('❌ Error adding sample data:', error);
    }
  };

  // Sync props to state immediately when they change
  useEffect(() => {
    if (propIngredients.length > 0) {
      console.log('🔄 Syncing ingredients from props:', propIngredients.length);
      setIngredients(propIngredients);
    }
  }, [propIngredients.length]);

  useEffect(() => {
    if (propRecentRecipes.length > 0) {
      console.log('🔄 Syncing recipes from props:', propRecentRecipes.length);
      setRecentRecipes(propRecentRecipes);
    }
  }, [propRecentRecipes.length]);

  useEffect(() => {
    const loadNutritionData = async () => {
      try {
        console.log('🍽️ Nutrition Dashboard: Initializing with data...', {
          propIngredientsCount: propIngredients.length,
          propRecipesCount: propRecentRecipes.length,
          currentIngredientsCount: ingredients.length,
          currentRecipesCount: recentRecipes.length,
        });

        // If props were provided, use them directly (from parent dashboard)
        if (propIngredients.length > 0) {
          console.log('✅ Using ingredients passed from parent:', propIngredients.length);
          setIngredients(propIngredients);
        } else {
          // Fallback: Load ingredients using service (for direct navigation)
          const ingredientService = await getIngredientService();
          const userIngredients = await ingredientService.getAllIngredients();
          console.log('🥬 Nutrition Dashboard: Loaded ingredients from service:', {
            count: userIngredients.length,
            service: ingredientService.constructor.name,
            sampleItems: userIngredients.slice(0, 3).map(ing => ({
              id: ing.id,
              name: ing.name,
              category: ing.category,
              quantity: ing.quantity,
            })),
          });
          setIngredients(userIngredients);
        }

        // If props were provided, use them directly
        if (propRecentRecipes.length > 0) {
          console.log('✅ Using recipes passed from parent:', propRecentRecipes.length);
          setRecentRecipes(propRecentRecipes);
        } else {
          // Fallback: Load recipes using RecipeService with deleted recipe filtering
          console.log('🔍 Loading recipes using RecipeService...');
          try {
            const userId = user?.id || 'anonymous';
            const recipeServiceResult = await RecipeService.getSavedRecipes(userId);
            if (recipeServiceResult.success && recipeServiceResult.data) {
              // Filter out deleted recipes using the same logic as recipes page
              const deletedRecipes = JSON.parse(localStorage.getItem('deletedRecipes') || '[]');
              const nonDeletedRecipes = recipeServiceResult.data.filter(
                recipe => !deletedRecipes.includes(recipe.id)
              );

              console.log(
                `✅ RecipeService found ${recipeServiceResult.data.length} recipes, ${nonDeletedRecipes.length} after filtering deleted`
              );
              setRecentRecipes(nonDeletedRecipes.slice(0, 20)); // Show last 20 recipes for nutrition analysis
            } else {
              console.log(
                '❌ RecipeService failed or returned no recipes:',
                recipeServiceResult.error
              );
              // Fallback to manual localStorage search as last resort
              await fallbackLoadRecipesFromStorage();
            }
          } catch (error) {
            console.error('❌ Error using RecipeService:', error);
            await fallbackLoadRecipesFromStorage();
          }
        }

        async function fallbackLoadRecipesFromStorage() {
          console.log('🔍 Fallback: Searching for recipes in multiple storage locations...');

          const storageKeys = ['recentRecipes', 'savedRecipes', 'userRecipes'];
          let foundRecipes: Recipe[] = [];

          for (const key of storageKeys) {
            const savedData = localStorage.getItem(key);
            console.log(
              `🔍 Checking localStorage.${key}:`,
              savedData ? `${savedData.length} chars` : 'null'
            );
            if (savedData) {
              try {
                const recipes = JSON.parse(savedData);
                if (Array.isArray(recipes) && recipes.length > 0) {
                  console.log(
                    `🍲 Found ${recipes.length} recipes in localStorage.${key}:`,
                    recipes
                      .slice(0, 2)
                      .map(r => ({ id: r.id, title: r.title, hasNutrition: !!r.nutritionInfo }))
                  );
                  foundRecipes = [...foundRecipes, ...recipes];
                } else {
                  console.log(
                    `📭 localStorage.${key} is empty or not an array:`,
                    typeof recipes,
                    Array.isArray(recipes) ? `array with ${recipes.length} items` : 'not an array'
                  );
                }
              } catch (error) {
                console.log(`❌ Error parsing ${key}:`, error);
              }
            }
          }

          // Remove duplicates and filter out deleted recipes
          const uniqueRecipes = foundRecipes.filter(
            (recipe, index, self) => index === self.findIndex(r => r.id === recipe.id)
          );

          // Filter out deleted recipes using the same logic as recipes page
          const deletedRecipes = JSON.parse(localStorage.getItem('deletedRecipes') || '[]');
          const nonDeletedRecipes = uniqueRecipes.filter(
            recipe => !deletedRecipes.includes(recipe.id)
          );

          if (nonDeletedRecipes.length > 0) {
            console.log(
              `✅ Total unique recipes found: ${uniqueRecipes.length}, ${nonDeletedRecipes.length} after filtering deleted`
            );
            setRecentRecipes(nonDeletedRecipes.slice(0, 20)); // Show last 20 recipes for nutrition analysis
          } else {
            console.log('🍲 No recipes found in any localStorage location after filtering deleted');
          }
        }

        // Load sample data only if no real data is available
        if (propIngredients.length === 0 && ingredients.length === 0) {
          const sampleIngredients = localStorage.getItem('sampleIngredients');
          if (sampleIngredients) {
            console.log('📦 Nutrition Dashboard: Loading sample ingredients from localStorage');
            const parsedSampleIngredients = JSON.parse(sampleIngredients);
            setIngredients(parsedSampleIngredients);
          }
        }
      } catch (error) {
        console.error('❌ Nutrition Dashboard: Error loading nutrition data:', error);
      } finally {
        setLoading(false);
        console.log('✅ Nutrition Dashboard: Loading complete');
      }
    };

    loadNutritionData();
  }, [propIngredients.length, propRecentRecipes.length, user?.id]);

  if (loading) {
    return (
      <AuthGuard requireAuth={false}>
        <DashboardLayout>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={false}>
      <Head>
        <title>Nutrition Dashboard - Pantry Buddy Pro</title>
        <meta name="description" content="AI-powered nutrition analysis and recommendations" />
      </Head>

      <DashboardLayout>
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nutrition Dashboard</h1>
              <p className="text-gray-600 mt-2">
                AI-powered insights into your nutritional health and cooking patterns
              </p>
            </div>
            <div className="flex items-center gap-4">
              {process.env.NODE_ENV === 'development' && (
                <div className="flex gap-2">
                  <button
                    onClick={addSampleData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    🧪 Add Sample Data
                  </button>
                  <div className="text-sm text-gray-600 flex items-center">
                    Recipes: {recentRecipes.length} | With nutrition:{' '}
                    {recentRecipes.filter(r => r.nutritionInfo).length}
                  </div>
                </div>
              )}
              <div className="text-5xl">🥗</div>
            </div>
          </div>

          {/* AI Nutritionist - Full Width */}
          <AInutritionist ingredients={ingredients} recentRecipes={recentRecipes} />

          {/* Additional Nutrition Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pantry Nutrition Overview */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">🏪 Pantry Nutrition Profile</h3>
              <div className="space-y-4">
                {ingredients.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Ingredients</span>
                      <span className="font-semibold">{ingredients.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Protein Sources</span>
                      <span className="font-semibold">
                        {ingredients.filter(ing => ing.isProtein).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Vegetarian Items</span>
                      <span className="font-semibold">
                        {ingredients.filter(ing => ing.isVegetarian).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Vegan Items</span>
                      <span className="font-semibold">
                        {ingredients.filter(ing => ing.isVegan).length}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium mb-2">Category Distribution</h4>
                      <div className="space-y-1">
                        {['protein', 'vegetables', 'fruits', 'grains', 'dairy'].map(category => {
                          const count = ingredients.filter(ing => ing.category === category).length;
                          const percentage =
                            ingredients.length > 0
                              ? Math.round((count / ingredients.length) * 100)
                              : 0;
                          return (
                            <div
                              key={category}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="capitalize text-gray-600">{category}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500 w-8">{count}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📦</div>
                    <p className="mb-4">
                      Your pantry is empty! Add ingredients to see nutrition insights.
                    </p>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">👇 Get started by adding some ingredients:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          🥩 Proteins
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          🥬 Vegetables
                        </span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                          🍎 Fruits
                        </span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          🌾 Grains
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => (window.location.href = '/dashboard/pantry')}
                      className="mt-4 px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors text-sm"
                    >
                      Add Ingredients to Pantry
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Recipe Nutrition History */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">📊 Recent Recipe Nutrition</h3>
              <div className="space-y-4">
                {/* Debug info - development only (hidden from users) */}
                {false && process.env.NODE_ENV === 'development' && (
                  <div className="text-xs bg-gray-100 p-2 rounded mb-4">
                    <strong>Debug:</strong> Total recipes: {recentRecipes.length}, With nutrition:{' '}
                    {recentRecipes.filter(recipe => recipe.nutritionInfo).length}
                    {recentRecipes.length > 0 && (
                      <div className="mt-1">
                        Sample recipes:{' '}
                        {recentRecipes
                          .slice(0, 3)
                          .map(r => r.title)
                          .join(', ')}
                      </div>
                    )}
                    {recentRecipes.length > 0 && (
                      <div className="mt-2">
                        <strong>Recipe structure sample:</strong>
                        <div className="text-xs bg-gray-50 p-2 mt-1 rounded border">
                          <div>Title: {recentRecipes[0]?.title}</div>
                          <div>
                            Has Nutrition: {!!recentRecipes[0]?.nutritionInfo ? 'Yes' : 'No'}
                          </div>
                          {recentRecipes[0]?.nutritionInfo && (
                            <div>
                              Sample: {recentRecipes[0].nutritionInfo?.calories} cal,{' '}
                              {recentRecipes[0].nutritionInfo?.protein}g protein
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {recentRecipes.length > 0 ? (
                  <>
                    {recentRecipes.filter(recipe => recipe.nutritionInfo).length > 0 ? (
                      <>
                        <div className="text-sm text-gray-600 mb-3">
                          Showing nutrition data from{' '}
                          {recentRecipes.filter(recipe => recipe.nutritionInfo).length} of{' '}
                          {recentRecipes.length} recipes
                        </div>
                        {recentRecipes
                          .filter(recipe => recipe.nutritionInfo)
                          .slice(0, 5)
                          .map(recipe => (
                            <div
                              key={recipe.id}
                              className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="font-medium text-sm">{recipe.title}</div>
                                <div className="text-xs text-gray-500">{recipe.cuisine}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                                <div>🔥 Calories: {recipe.nutritionInfo?.calories || 0}</div>
                                <div>🥩 Protein: {recipe.nutritionInfo?.protein || 0}g</div>
                                <div>🌾 Carbs: {recipe.nutritionInfo?.carbs || 0}g</div>
                                <div>🥑 Fat: {recipe.nutritionInfo?.fat || 0}g</div>
                              </div>
                              {recipe.nutritionInfo?.fiber && recipe.nutritionInfo?.sodium && (
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                  <div>🌿 Fiber: {recipe.nutritionInfo.fiber}g</div>
                                  <div>🧂 Sodium: {recipe.nutritionInfo.sodium}mg</div>
                                </div>
                              )}
                            </div>
                          ))}
                      </>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <div className="text-3xl mb-2">📝</div>
                        <p className="mb-2">
                          You have {recentRecipes.length} recipes but none with nutrition data.
                        </p>
                        <p className="text-sm text-gray-600">
                          Generate new AI recipes to get detailed nutrition information.
                        </p>
                        <button
                          onClick={() => (window.location.href = '/dashboard/create-recipe')}
                          className="mt-3 px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors text-sm"
                        >
                          Generate AI Recipe with Nutrition
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📈</div>
                    <p className="mb-4">No recent recipes with nutrition data found.</p>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">Start tracking nutrition by:</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs">🤖</span>
                          <span>Generate AI recipes with nutrition info</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs">📝</span>
                          <span>Create custom recipes with nutrition data</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs">🍳</span>
                          <span>Track cooking sessions</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => (window.location.href = '/dashboard/recipes')}
                      className="mt-4 px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors text-sm"
                    >
                      Create Your First Recipe
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Tips */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">💡 Nutrition Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🥛</div>
                <h4 className="font-medium">Stay Hydrated</h4>
                <p className="text-sm text-gray-600">
                  Aim for 8 glasses of water daily to support your cooking and nutrition goals.
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🌈</div>
                <h4 className="font-medium">Eat the Rainbow</h4>
                <p className="text-sm text-gray-600">
                  Include colorful fruits and vegetables to maximize nutrient variety.
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">⚖️</div>
                <h4 className="font-medium">Balance Macros</h4>
                <p className="text-sm text-gray-600">
                  Aim for a balanced ratio of proteins, carbs, and healthy fats in each meal.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
