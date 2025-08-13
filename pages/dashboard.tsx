import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import AuthGuard from '../components/auth/AuthGuard';
import { useAuth } from '../lib/auth/AuthProvider';
import { ingredientService } from '../lib/services/ingredientService';
import { AInutritionist } from '../components/AInutritionist';
import QuickSuggestionsAnalytics from '../components/QuickSuggestionsAnalytics';
import CookingStats from '../components/cooking/CookingStats';
import CookingHistory from '../components/cooking/CookingHistory';
import { RecipeService } from '../lib/services/recipeService';
import { databaseSettingsService } from '../lib/services/databaseSettingsService';
import { Ingredient, Recipe } from '../types';

export default function Dashboard() {
  // Force deployment update v1.0.1
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  // Force loading to false after 3 seconds as emergency fallback
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      console.log('🚨 Dashboard: Emergency timeout - forcing loading to false');
      setLoading(false);
    }, 3000);

    return () => clearTimeout(emergencyTimeout);
  }, []);

  console.log(
    '🔍 Dashboard: Component render, authLoading:',
    authLoading,
    'user:',
    user?.id || 'none',
    'loading:',
    loading
  );

  useEffect(() => {
    console.log('📍 Dashboard: useEffect triggered - using simplified loading');

    const loadDashboardData = () => {
      console.log('🚀 Dashboard: Starting simplified data load');

      try {
        // Load ingredients synchronously (mock service)
        console.log('📦 Dashboard: Loading ingredients...');
        ingredientService
          .getAllIngredients()
          .then(userIngredients => {
            console.log('✅ Dashboard: Loaded ingredients:', userIngredients.length);
            setIngredients(userIngredients);
          })
          .catch(error => {
            console.log('❌ Error loading ingredients:', error);
            setIngredients([]);
          });

        // Load recipes from localStorage only (skip database complexity)
        console.log('📚 Dashboard: Loading recipes from localStorage...');
        const savedRecipes = localStorage.getItem('recentRecipes');
        if (savedRecipes) {
          try {
            const recipes = JSON.parse(savedRecipes);
            setRecentRecipes(recipes.slice(0, 6));
            console.log('✅ Dashboard: Loaded recipes from localStorage:', recipes.length);
          } catch (error) {
            console.log('❌ Error parsing recipes:', error);
            setRecentRecipes([]);
          }
        } else {
          console.log('📭 Dashboard: No recipes found in localStorage');
          setRecentRecipes([]);
        }

        // Set loading to false after a short delay to ensure state updates
        setTimeout(() => {
          console.log('🏁 Dashboard: Finished loading, setting loading to false');
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error('❌ Dashboard: Error in simplified loading:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const stats = {
    totalIngredients: ingredients.length,
    totalRecipes: recentRecipes.length,
    cookedToday: 0, // Placeholder for future implementation
    weeklyGoal: 5, // Placeholder for user preferences
  };

  const quickActions = [
    {
      title: 'Generate Recipe',
      description: 'Create a new recipe from your ingredients',
      icon: '✨',
      href: '/dashboard/create-recipe',
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Add Ingredients',
      description: 'Stock up your virtual pantry',
      icon: '🥗',
      href: '/dashboard/pantry',
      color: 'from-orange-500 to-orange-600',
    },
    {
      title: 'Browse Recipes',
      description: 'Explore your recipe collection',
      icon: '📚',
      href: '/dashboard/recipes',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      title: 'Plan Meals',
      description: 'Organize your weekly menu',
      icon: '📅',
      href: '/dashboard/meal-plans',
      color: 'from-gray-100 to-gray-200 text-gray-800',
    },
  ];

  const upcomingFeatures = [
    { name: 'Nutrition Tracking', status: 'Premium', icon: '📊' },
    { name: 'Video Tutorials', status: 'Premium', icon: '🎥' },
    { name: 'Family Sharing', status: 'Family Plan', icon: '👥' },
  ];

  if (loading) {
    return (
      <AuthGuard requireAuth={false}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={false}>
      <Head>
        <title>Dashboard - Pantry Buddy Pro</title>
        <meta name="description" content="Your personalized cooking dashboard" />
      </Head>

      <DashboardLayout>
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-pantry-50 to-orange-50 rounded-2xl p-8 border border-pantry-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.user_metadata?.name || 'Chef'}! 👋
                </h1>
                <p className="text-gray-600 text-lg">
                  Ready to create something delicious? Let's see what's cooking!
                </p>
              </div>
              <div className="hidden md:block">
                <div className="text-6xl">🧑‍🍳</div>
              </div>
            </div>
          </div>

          {/* Quick Recipe Suggestions Analytics */}
          <div className="max-w-2xl mx-auto">
            <QuickSuggestionsAnalytics />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ingredients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalIngredients}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🥗</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Recipes Created</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalRecipes}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cooked Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.cookedToday}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🍳</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Weekly Goal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.cookedToday}/{stats.weeklyGoal}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map(action => (
                <Link key={action.title} href={action.href}>
                  <div className="group cursor-pointer">
                    <div
                      className={`bg-gradient-to-r ${action.color} p-6 rounded-xl ${action.color.includes('text-gray-800') ? '' : 'text-white'} hover:shadow-lg transition-all`}
                    >
                      <div className="text-3xl mb-3">{action.icon}</div>
                      <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Cooking Statistics */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Cooking Journey</h2>
            <CookingStats />
          </div>

          {/* AI Nutritionist Section */}
          <AInutritionist
            ingredients={ingredients}
            recentRecipes={recentRecipes}
            className="mb-8"
          />

          {/* Recent Recipes */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Recipes</h2>
              <Link href="/dashboard/recipes">
                <button className="text-orange-600 hover:text-orange-700 font-medium">
                  View All
                </button>
              </Link>
            </div>

            {recentRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{recipe.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>⏱️ {recipe.totalTime}m</span>
                      <span className="capitalize">{recipe.cuisine}</span>
                      <span>👥 {recipe.servings}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍳</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No recipes yet</h3>
                <p className="text-gray-600 mb-6">
                  Start creating delicious recipes from your ingredients!
                </p>
                <Link href="/dashboard/create-recipe">
                  <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-medium">
                    Generate Your First Recipe
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Cooking History */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <CookingHistory limit={5} />
            <div className="mt-4 text-center">
              <Link href="/dashboard/cooking-history">
                <button className="text-orange-600 hover:text-orange-700 font-medium">
                  View All Cooking History
                </button>
              </Link>
            </div>
          </div>

          {/* Upcoming Features */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Coming Soon</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {upcomingFeatures.map(feature => (
                <div
                  key={feature.name}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{feature.name}</p>
                    <p className="text-xs text-orange-600">{feature.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
