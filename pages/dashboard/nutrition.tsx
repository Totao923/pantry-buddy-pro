import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { AInutritionist } from '../../components/AInutritionist';
import { useAuth } from '../../lib/auth/AuthProvider';
import { ingredientService } from '../../lib/services/ingredientService';
import { Ingredient, Recipe } from '../../types';
import { Card } from '../../components/ui/Card';

export default function NutritionDashboard() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNutritionData = async () => {
      try {
        // Load ingredients
        const userIngredients = await ingredientService.getAllIngredients();
        setIngredients(userIngredients);

        // Load recent recipes from localStorage
        const savedRecipes = localStorage.getItem('recentRecipes');
        if (savedRecipes) {
          const recipes = JSON.parse(savedRecipes);
          setRecentRecipes(recipes.slice(0, 20)); // Show last 20 recipes for nutrition analysis
        }
      } catch (error) {
        console.error('Error loading nutrition data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNutritionData();
  }, []);

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
            <div className="text-5xl">🥗</div>
          </div>

          {/* AI Nutritionist - Full Width */}
          <AInutritionist 
            ingredients={ingredients}
            recentRecipes={recentRecipes}
          />

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
                          const percentage = ingredients.length > 0 ? Math.round((count / ingredients.length) * 100) : 0;
                          return (
                            <div key={category} className="flex items-center justify-between text-sm">
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
                    <p>Add ingredients to your pantry to see nutrition insights</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Recipe Nutrition History */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">📊 Recent Recipe Nutrition</h3>
              <div className="space-y-4">
                {recentRecipes.filter(recipe => recipe.nutritionInfo).length > 0 ? (
                  <>
                    <div className="text-sm text-gray-600 mb-3">
                      Showing nutrition data from {recentRecipes.filter(recipe => recipe.nutritionInfo).length} recipes
                    </div>
                    {recentRecipes
                      .filter(recipe => recipe.nutritionInfo)
                      .slice(0, 5)
                      .map(recipe => (
                        <div key={recipe.id} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-2">{recipe.title}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>Calories: {recipe.nutritionInfo?.calories || 0}</div>
                            <div>Protein: {recipe.nutritionInfo?.protein || 0}g</div>
                            <div>Carbs: {recipe.nutritionInfo?.carbs || 0}g</div>
                            <div>Fat: {recipe.nutritionInfo?.fat || 0}g</div>
                          </div>
                        </div>
                      ))
                    }
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📈</div>
                    <p>Create recipes with nutrition info to see your history</p>
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
                <p className="text-sm text-gray-600">Aim for 8 glasses of water daily to support your cooking and nutrition goals.</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">🌈</div>
                <h4 className="font-medium">Eat the Rainbow</h4>
                <p className="text-sm text-gray-600">Include colorful fruits and vegetables to maximize nutrient variety.</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl mb-2">⚖️</div>
                <h4 className="font-medium">Balance Macros</h4>
                <p className="text-sm text-gray-600">Aim for a balanced ratio of proteins, carbs, and healthy fats in each meal.</p>
              </div>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}