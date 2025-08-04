import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { useAuth } from '../../lib/auth/AuthProvider';
import { aiService } from '../../lib/ai/aiService';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
import { Recipe, CuisineType } from '../../types';

interface AnalyticsData {
  totalRecipes: number;
  aiRequestsUsed: number;
  aiRequestsRemaining: number;
  pantryItems: number;
  cookingSessions: number;
  favoritesCuisines: CuisineType[];
  averageRating: number;
  weeklyRecipeData: Array<{ day: string; recipes: number; aiRecipes: number }>;
  cuisineDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyTrends: Array<{ month: string; recipes: number; sessions: number }>;
  topIngredients: Array<{ name: string; count: number }>;
}

export default function Analytics() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | 'all'>('30d');

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        // Get AI usage stats
        const aiStats = await aiService.getUsageStats(user?.id || 'anonymous');

        // Load data from localStorage (simulating database)
        const recentRecipes = JSON.parse(localStorage.getItem('recentRecipes') || '[]');
        const savedRecipes = JSON.parse(localStorage.getItem('userRecipes') || '[]');
        const cookingHistory = JSON.parse(localStorage.getItem('cookingHistory') || '[]');
        const pantryData = JSON.parse(localStorage.getItem('pantryInventory') || '{"items": []}');
        const recipeRatings = JSON.parse(localStorage.getItem('recipeRatings') || '{}');

        // Calculate analytics
        const allRecipes = [...recentRecipes, ...savedRecipes];
        const totalRecipes = allRecipes.length;

        // Calculate average rating
        const ratings = Object.values(recipeRatings) as any[];
        const averageRating =
          ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating.overallRating, 0) / ratings.length
            : 0;

        // Generate cuisine distribution
        const cuisineCounts: Record<string, number> = {};
        allRecipes.forEach((recipe: Recipe) => {
          const cuisine = recipe.cuisine || 'unknown';
          cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
        });

        const cuisineColors = {
          italian: '#FF6B6B',
          asian: '#4ECDC4',
          mexican: '#45B7D1',
          indian: '#FFA07A',
          american: '#98D8C8',
          mediterranean: '#F7DC6F',
          french: '#BB8FCE',
          thai: '#85C1E9',
          chinese: '#F8C471',
          japanese: '#82E0AA',
        };

        const cuisineDistribution = Object.entries(cuisineCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: (cuisineColors as any)[name] || '#95A5A6',
        }));

        // Generate weekly recipe data (mock data based on recent activity)
        const weeklyRecipeData = [
          {
            day: 'Mon',
            recipes: Math.floor(Math.random() * 5) + 1,
            aiRecipes: Math.floor(Math.random() * 3) + 1,
          },
          {
            day: 'Tue',
            recipes: Math.floor(Math.random() * 5) + 1,
            aiRecipes: Math.floor(Math.random() * 3) + 1,
          },
          {
            day: 'Wed',
            recipes: Math.floor(Math.random() * 5) + 2,
            aiRecipes: Math.floor(Math.random() * 4) + 1,
          },
          {
            day: 'Thu',
            recipes: Math.floor(Math.random() * 4) + 1,
            aiRecipes: Math.floor(Math.random() * 3) + 1,
          },
          {
            day: 'Fri',
            recipes: Math.floor(Math.random() * 6) + 2,
            aiRecipes: Math.floor(Math.random() * 4) + 2,
          },
          {
            day: 'Sat',
            recipes: Math.floor(Math.random() * 7) + 3,
            aiRecipes: Math.floor(Math.random() * 5) + 2,
          },
          {
            day: 'Sun',
            recipes: Math.floor(Math.random() * 5) + 2,
            aiRecipes: Math.floor(Math.random() * 3) + 1,
          },
        ];

        // Generate monthly trends
        const monthlyTrends = [
          { month: 'Jan', recipes: 12, sessions: 8 },
          { month: 'Feb', recipes: 15, sessions: 11 },
          { month: 'Mar', recipes: 18, sessions: 14 },
          { month: 'Apr', recipes: 22, sessions: 16 },
          { month: 'May', recipes: 25, sessions: 19 },
          { month: 'Jun', recipes: totalRecipes, sessions: cookingHistory.length },
        ];

        // Calculate top ingredients (mock data)
        const topIngredients = [
          { name: 'Chicken', count: 15 },
          { name: 'Onions', count: 12 },
          { name: 'Garlic', count: 11 },
          { name: 'Tomatoes', count: 9 },
          { name: 'Rice', count: 8 },
        ];

        setAnalyticsData({
          totalRecipes,
          aiRequestsUsed: 100 - (aiStats.remainingRequests || 0),
          aiRequestsRemaining: aiStats.remainingRequests || 0,
          pantryItems: pantryData.items?.length || 0,
          cookingSessions: cookingHistory.length,
          favoritesCuisines: Object.keys(cuisineCounts).slice(0, 3) as CuisineType[],
          averageRating,
          weeklyRecipeData,
          cuisineDistribution,
          monthlyTrends,
          topIngredients,
        });
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAnalyticsData();
    }
  }, [user, timeRange]);

  if (loading || !analyticsData) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-pantry-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  const calculateCookingStreak = () => {
    // Mock calculation - in real app would be based on cooking history dates
    return Math.floor(Math.random() * 15) + 1;
  };

  const calculatePantryEfficiency = () => {
    // Mock calculation - percentage of pantry items used recently
    return Math.floor(Math.random() * 40) + 60;
  };

  return (
    <AuthGuard>
      <Head>
        <title>Analytics - Pantry Buddy Pro</title>
        <meta name="description" content="Cooking analytics and insights dashboard" />
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Insights into your cooking journey</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="3m">Last 3 months</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Recipes</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {analyticsData.totalRecipes}
                  </p>
                </div>
                <div className="w-12 h-12 bg-pantry-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600">↗ +12%</span>
                <span className="text-gray-500 ml-2">vs last month</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Requests</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {analyticsData.aiRequestsUsed}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Usage</span>
                  <span className="text-gray-900">{analyticsData.aiRequestsUsed}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(analyticsData.aiRequestsUsed / 100) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pantry Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {analyticsData.pantryItems}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏺</span>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600">Efficiency: {calculatePantryEfficiency()}%</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {analyticsData.averageRating.toFixed(1)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⭐</span>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= Math.round(analyticsData.averageRating)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Recipe Generation */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Recipe Activity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.weeklyRecipeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="recipes"
                    stackId="1"
                    stroke="#059669"
                    fill="#10B981"
                    name="Total Recipes"
                  />
                  <Area
                    type="monotone"
                    dataKey="aiRecipes"
                    stackId="2"
                    stroke="#3B82F6"
                    fill="#6366F1"
                    name="AI Generated"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cuisine Distribution */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cuisine Preferences</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.cuisineDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {analyticsData.cuisineDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="recipes"
                  stroke="#10B981"
                  strokeWidth={3}
                  name="Recipes Generated"
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  name="Cooking Sessions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cooking Streak */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="text-2xl mb-3">🔥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cooking Streak</h3>
              <p className="text-3xl font-bold text-orange-600 mb-2">
                {calculateCookingStreak()} days
              </p>
              <p className="text-gray-600 text-sm">Keep it up! You're on a roll.</p>
            </div>

            {/* Top Ingredients */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="text-2xl mb-3">🥗</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Ingredients</h3>
              <div className="space-y-2">
                {analyticsData.topIngredients.slice(0, 3).map((ingredient, index) => (
                  <div key={ingredient.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{ingredient.name}</span>
                    <span className="text-sm font-medium text-green-600">{ingredient.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="text-2xl mb-3">💡</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Insights</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Try Mediterranean cuisine next</li>
                <li>• Peak cooking time: 6-8 PM</li>
                <li>• Consider batch cooking on Sundays</li>
              </ul>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
