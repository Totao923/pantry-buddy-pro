import React, { useState, useEffect, useMemo, memo } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import SpendingAnalytics from '../../components/SpendingAnalytics';
import { useAuth } from '../../lib/auth/AuthProvider';
import { createSupabaseClient } from '../../lib/supabase/client';
import { aiService } from '../../lib/ai/aiService';
import { receiptService } from '../../lib/services/receiptService';
import { RecipeService } from '../../lib/services/recipeService';
import { useIngredients } from '../../contexts/IngredientsProvider';
import { barcodeService } from '../../lib/services/barcodeService';
import { cookingSessionService } from '../../lib/services/cookingSessionService';
import { UsageTrackingService } from '../../lib/services/usageTrackingService';
import dynamic from 'next/dynamic';
import { Recipe, CuisineType, Ingredient } from '../../types';
import { ExtractedReceiptData } from '../../lib/services/receiptService';

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
  // Cooking statistics
  totalRecipesCooked: number;
  uniqueRecipesCooked: number;
  cookingStreak: { current: number; longest: number };
  averageUserRating: number;
  mostCookedRecipes: Array<{ recipe_title: string; times_cooked: number }>;
  totalSpent: number;
  totalReceipts: number;
  avgReceiptValue: number;
  pantryValue: number;
  expiringItems: number;
  categoryBreakdown: Array<{ category: string; count: number; value: number }>;
}

// Dynamic imports for heavy chart components with proper loading skeletons
const DynamicAreaChart = dynamic(
  () =>
    import('recharts').then(mod => ({
      default: ({ data }: { data: Array<{ day: string; recipes: number; aiRecipes: number }> }) => (
        <mod.ResponsiveContainer width="100%" height={300}>
          <mod.AreaChart data={data}>
            <mod.CartesianGrid strokeDasharray="3 3" />
            <mod.XAxis dataKey="day" />
            <mod.YAxis />
            <mod.Tooltip />
            <mod.Legend />
            <mod.Area
              type="monotone"
              dataKey="recipes"
              stackId="1"
              stroke="#059669"
              fill="#10B981"
              name="Total Recipes"
            />
            <mod.Area
              type="monotone"
              dataKey="aiRecipes"
              stackId="2"
              stroke="#3B82F6"
              fill="#6366F1"
              name="AI Generated"
            />
          </mod.AreaChart>
        </mod.ResponsiveContainer>
      ),
    })),
  {
    loading: () => (
      <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    ),
    ssr: false,
  }
);

const DynamicPieChart = dynamic(
  () =>
    import('recharts').then(mod => ({
      default: ({ data }: { data: Array<{ name: string; value: number; color: string }> }) => (
        <mod.ResponsiveContainer width="100%" height={300}>
          <mod.PieChart>
            <mod.Pie
              data={data || []}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            >
              {data?.map((entry, index) => (
                <mod.Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </mod.Pie>
            <mod.Tooltip />
          </mod.PieChart>
        </mod.ResponsiveContainer>
      ),
    })),
  {
    loading: () => (
      <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    ),
    ssr: false,
  }
);

const DynamicBarChart = dynamic(
  () =>
    import('recharts').then(mod => ({
      default: ({ data }: { data: Array<{ category: string; count: number; value: number }> }) => (
        <mod.ResponsiveContainer width="100%" height={400}>
          <mod.BarChart data={data}>
            <mod.CartesianGrid strokeDasharray="3 3" />
            <mod.XAxis dataKey="category" />
            <mod.YAxis />
            <mod.Tooltip />
            <mod.Legend />
            <mod.Bar dataKey="count" fill="#10B981" name="Item Count" />
            <mod.Bar dataKey="value" fill="#3B82F6" name="Estimated Value ($)" />
          </mod.BarChart>
        </mod.ResponsiveContainer>
      ),
    })),
  {
    loading: () => (
      <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    ),
    ssr: false,
  }
);

// Cache invalidation utility
const invalidateAnalyticsCache = (userId: string) => {
  const cacheKey = `analytics-${userId}`;
  localStorage.removeItem(cacheKey);
  localStorage.removeItem(`${cacheKey}-timestamp`);
};

export default function Analytics() {
  // Force deployment update v1.0.1
  console.log('🔍 Analytics: Component rendering/mounting');
  const { user } = useAuth();
  const { ingredients } = useIngredients();

  console.log('🔍 Analytics: User and ingredients loaded:', {
    hasUser: !!user,
    userId: user?.id,
    ingredientsCount: ingredients.length,
  });

  // Debug ingredients loading
  console.log('🔍 Analytics: Current ingredients from context:', {
    count: ingredients.length,
    sample: ingredients.slice(0, 3).map(i => ({ name: i.name, category: i.category })),
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>({
    totalRecipes: 42,
    totalSpent: 195.32,
    pantryItems: 28,
    expiringItems: 3,
    pantryValue: 156.78,
    totalReceipts: 8,
    totalRecipesCooked: 15,
    uniqueRecipesCooked: 12,
    averageUserRating: 4.2,
    aiRequestsUsed: 23,
    cookingStreak: { current: 3, longest: 7 },
    weeklyRecipeData: [
      { day: 'Mon', recipes: 8, aiRecipes: 3 },
      { day: 'Tue', recipes: 12, aiRecipes: 5 },
      { day: 'Wed', recipes: 6, aiRecipes: 2 },
      { day: 'Thu', recipes: 15, aiRecipes: 7 },
      { day: 'Fri', recipes: 10, aiRecipes: 4 },
      { day: 'Sat', recipes: 14, aiRecipes: 6 },
      { day: 'Sun', recipes: 9, aiRecipes: 3 },
    ],
    cuisineDistribution: [
      { name: 'Italian', value: 25, color: '#ff6b6b' },
      { name: 'Mexican', value: 18, color: '#4ecdc4' },
      { name: 'Asian', value: 22, color: '#45b7d1' },
      { name: 'American', value: 15, color: '#96ceb4' },
      { name: 'Mediterranean', value: 20, color: '#ffd93d' },
    ],
    categoryBreakdown: [
      { category: 'vegetables', count: 12, value: 45 },
      { category: 'protein', count: 8, value: 62 },
      { category: 'grains', count: 6, value: 18 },
      { category: 'dairy', count: 4, value: 28 },
    ],
    topIngredients: [
      { name: 'Tomatoes', count: 8 },
      { name: 'Chicken', count: 6 },
      { name: 'Onions', count: 5 },
      { name: 'Garlic', count: 4 },
      { name: 'Rice', count: 3 },
    ],
    mostCookedRecipes: [
      { name: 'Spaghetti Carbonara', count: 5, rating: 4.8 },
      { name: 'Chicken Stir Fry', count: 4, rating: 4.5 },
      { name: 'Beef Tacos', count: 3, rating: 4.7 },
    ],
  });
  const [receipts, setReceipts] = useState<ExtractedReceiptData[]>([
    {
      id: 'receipt-sample-1',
      storeName: 'Whole Foods Market',
      receiptDate: new Date('2025-09-10'),
      totalAmount: 85.42,
      taxAmount: 7.21,
      userId: 'demo-user',
      createdAt: new Date('2025-09-10').toISOString(),
      items: [
        {
          id: 'item-1',
          name: 'Organic Tomatoes',
          quantity: 2,
          unit: 'lbs',
          price: 4.98,
          category: 'vegetables',
          confidence: 0.95,
        },
        {
          id: 'item-2',
          name: 'Free Range Chicken',
          quantity: 1,
          unit: 'whole',
          price: 15.99,
          category: 'protein',
          confidence: 0.98,
        },
        {
          id: 'item-3',
          name: 'Sourdough Bread',
          quantity: 1,
          unit: 'loaf',
          price: 5.49,
          category: 'grains',
          confidence: 0.97,
        },
      ],
      rawText: 'WHOLE FOODS MARKET...',
      confidence: 0.94,
    },
    {
      id: 'receipt-sample-2',
      storeName: 'Safeway',
      receiptDate: new Date('2025-09-08'),
      totalAmount: 42.67,
      taxAmount: 3.12,
      userId: 'demo-user',
      createdAt: new Date('2025-09-08').toISOString(),
      items: [
        {
          id: 'item-4',
          name: 'Chicken Breast',
          quantity: 1.5,
          unit: 'lbs',
          price: 12.47,
          category: 'protein',
          confidence: 0.94,
        },
        {
          id: 'item-5',
          name: 'Pasta',
          quantity: 2,
          unit: 'boxes',
          price: 2.98,
          category: 'grains',
          confidence: 0.96,
        },
        {
          id: 'item-6',
          name: 'Olive Oil',
          quantity: 1,
          unit: 'bottle',
          price: 8.99,
          category: 'oils',
          confidence: 0.97,
        },
      ],
      rawText: 'SAFEWAY...',
      confidence: 0.92,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'spending' | 'pantry' | 'cooking'>(
    'overview'
  );

  // Memoized expensive calculations
  const memoizedCategoryBreakdown = useMemo(() => {
    if (!ingredients.length) return [];

    return ingredients.reduce(
      (acc: Array<{ category: string; count: number; value: number }>, item) => {
        const category = item.category;
        const quantity = parseFloat(item.quantity || '1');

        // Calculate item value using the same logic as pantry value
        let itemValue: number;
        if (item.price && (item.priceSource === 'receipt' || item.priceSource === 'estimated')) {
          itemValue = item.price * quantity;
        } else {
          // Fallback to category-based estimation
          const categoryValues: Record<string, number> = {
            protein: 8,
            vegetables: 3,
            fruits: 4,
            dairy: 5,
            grains: 6,
            oils: 7,
            spices: 2,
            herbs: 3,
            pantry: 4,
            other: 3,
          };
          const baseValue = categoryValues[item.category] || 3;
          itemValue = baseValue * quantity;
        }

        const existing = acc.find(
          (c: { category: string; count: number; value: number }) => c.category === category
        );
        if (existing) {
          existing.count++;
          existing.value += itemValue;
        } else {
          acc.push({ category, count: 1, value: itemValue });
        }
        return acc;
      },
      [] as Array<{ category: string; count: number; value: number }>
    );
  }, [ingredients]);

  const memoizedTopIngredients = useMemo(() => {
    if (!ingredients.length) return [];

    const ingredientCounts = ingredients.reduce(
      (acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(ingredientCounts)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [ingredients]);

  const memoizedPantryValue = useMemo(() => {
    if (!ingredients.length) return 0;

    return ingredients.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity || '1');

      // Use actual price if available from receipt
      if (item.price && item.priceSource === 'receipt') {
        return sum + item.price * quantity;
      }

      // Fall back to estimated price if available
      if (item.price && item.priceSource === 'estimated') {
        return sum + item.price * quantity;
      }

      // Final fallback to legacy category-based estimation
      const categoryValues: Record<string, number> = {
        protein: 8,
        vegetables: 3,
        fruits: 4,
        dairy: 5,
        grains: 6,
        oils: 7,
        spices: 2,
        herbs: 3,
        pantry: 4,
        other: 3,
      };
      const baseValue = categoryValues[item.category] || 3;
      return sum + baseValue * quantity;
    }, 0);
  }, [ingredients]);

  console.log('🔥 Analytics: Component rendering, ingredients count:', ingredients.length);
  console.log('🔥 Analytics: About to define useEffect with dependencies:', {
    userId: user?.id,
    ingredientsLength: ingredients.length,
    memoizedPantryValue,
    memoizedTopIngredientsLength: memoizedTopIngredients.length,
    memoizedCategoryBreakdownLength: memoizedCategoryBreakdown.length,
  });

  // Load comprehensive analytics data from Supabase
  useEffect(() => {
    const loadSupabaseAnalyticsData = async () => {
      console.log('🎯 Analytics: Loading Supabase analytics data...');
      setLoading(true);

      try {
        if (!user?.id) {
          console.log('❌ No user ID available');
          setLoading(false);
          return;
        }

        // Load parallel data from all Supabase services
        const [
          userRecipes,
          cookingSessions,
          recentCookingSessions,
          cookingPreferences,
          cookingStreak,
          popularRecipes,
          todayUsage,
          receiptAnalytics,
        ] = await Promise.all([
          // Load saved recipes from Supabase
          RecipeService.getSavedRecipes(user.id).then(result =>
            result.success && result.data ? result.data : []
          ),
          // Load cooking sessions (actual cooking activity)
          cookingSessionService.getUserCookingSessions(100).catch(() => []),
          // Load recent cooking activity for weekly charts
          cookingSessionService.getUserRecentCookingActivity(30).catch(() => []),
          // Load user cooking preferences and stats
          cookingSessionService.getUserCookingPreferences().catch(() => null),
          // Load cooking streak information
          cookingSessionService.getCookingStreak().catch(() => ({ current: 0, longest: 0 })),
          // Load popular recipes
          cookingSessionService.getPopularRecipes(10).catch(() => []),
          // Load today's usage tracking
          UsageTrackingService.getTodayUsage(user.id).catch(() => ({
            recipe_generations: 0,
            ai_requests: 0,
            pantry_items_used: 0,
          })),
          // Load receipt analytics from service
          receiptService.getSpendingAnalytics(7).catch(() => ({
            totalSpent: 0,
            totalReceipts: 0,
            categoryBreakdown: [],
          })),
        ]);

        console.log('📊 Analytics: Loaded Supabase data', {
          recipesCount: userRecipes.length,
          cookingSessionsCount: cookingSessions.length,
          recentSessionsCount: recentCookingSessions.length,
          hasPreferences: !!cookingPreferences,
          cookingStreak,
          popularRecipesCount: popularRecipes.length,
        });

        // Calculate comprehensive analytics from real Supabase data
        const realAnalyticsData = {
          // Recipe stats from Supabase
          totalRecipes: userRecipes.length,
          aiRequestsUsed: todayUsage.ai_requests || userRecipes.filter(r => r.aiGenerated).length,

          // Actual cooking stats from cooking_sessions table
          totalRecipesCooked: cookingSessions.length,
          uniqueRecipesCooked: new Set(cookingSessions.map(s => s.recipe_id)).size,
          averageUserRating:
            cookingSessions.length > 0
              ? cookingSessions.filter(s => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
                cookingSessions.filter(s => s.rating).length
              : 0,

          // Real cooking streak from service
          cookingStreak,

          // Pantry stats from ingredients context
          pantryItems: ingredients.length,
          expiringItems: ingredients.filter(ing => {
            const expiryDate = new Date(ing.expiryDate);
            const daysUntilExpiry = Math.ceil(
              (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
          }).length,
          pantryValue: memoizedPantryValue,

          // Spending analytics from receipt service
          totalSpent: receiptAnalytics.totalSpent || 0,
          totalReceipts: receiptAnalytics.totalReceipts || 0,
          avgReceiptValue:
            receiptAnalytics.totalReceipts > 0
              ? receiptAnalytics.totalSpent / receiptAnalytics.totalReceipts
              : 0,

          // Category breakdown from receipts
          categoryBreakdown: receiptAnalytics.categoryBreakdown || memoizedCategoryBreakdown || [],

          // Top ingredients from pantry
          topIngredients: memoizedTopIngredients.slice(0, 5) || [],

          // Real weekly cooking activity from cooking_sessions
          weeklyRecipeData: (() => {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const weekData = days.map(day => ({ day, recipes: 0, aiRecipes: 0 }));

            recentCookingSessions.forEach(session => {
              const date = new Date(session.cooked_at);
              const dayOfWeek = date.getDay();
              const dayIndex = (dayOfWeek + 6) % 7; // Convert Sunday=0 to Monday=0
              weekData[dayIndex].recipes++;

              // Check if the recipe was AI-generated from recipe data
              if (session.recipe_data?.aiGenerated) {
                weekData[dayIndex].aiRecipes++;
              }
            });

            return weekData;
          })(),

          // Real cuisine distribution from saved recipes
          cuisineDistribution: (() => {
            if (userRecipes.length === 0) {
              return [
                { name: 'Italian', value: 25, color: '#ff6b6b' },
                { name: 'Mexican', value: 18, color: '#4ecdc4' },
                { name: 'Asian', value: 22, color: '#45b7d1' },
                { name: 'American', value: 15, color: '#96ceb4' },
                { name: 'Mediterranean', value: 20, color: '#ffd93d' },
              ];
            }

            const cuisineCounts: Record<string, number> = {};
            userRecipes.forEach(recipe => {
              const cuisine = recipe.cuisine || 'Other';
              cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
            });

            const colors = [
              '#ff6b6b',
              '#4ecdc4',
              '#45b7d1',
              '#96ceb4',
              '#ffd93d',
              '#a78bfa',
              '#fb7185',
            ];
            return Object.entries(cuisineCounts)
              .map(([name, value], index) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value,
                color: colors[index % colors.length],
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5);
          })(),

          // Most cooked recipes from cooking_sessions (actual cooking data)
          mostCookedRecipes: (() => {
            if (cookingSessions.length === 0) {
              return [{ recipe_title: 'No cooking sessions yet', times_cooked: 0 }];
            }

            const recipeCounts: Record<string, { title: string; count: number }> = {};
            cookingSessions.forEach(session => {
              const title = session.recipe_title;
              if (!recipeCounts[title]) {
                recipeCounts[title] = { title, count: 0 };
              }
              recipeCounts[title].count++;
            });

            return Object.values(recipeCounts)
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
              .map(recipe => ({
                recipe_title: recipe.title,
                times_cooked: recipe.count,
              }));
          })(),

          // Monthly trends (simplified for now)
          monthlyTrends: [
            { month: 'This Month', recipes: userRecipes.length, sessions: cookingSessions.length },
          ],
        };

        console.log('✅ Analytics: Supabase data processed successfully', realAnalyticsData);
        setAnalyticsData(realAnalyticsData);
        setLoading(false);
      } catch (error) {
        console.error('❌ Error loading Supabase analytics data:', error);
        // Fallback to basic data structure
        setAnalyticsData({
          totalRecipes: 0,
          totalSpent: 0,
          pantryItems: ingredients.length,
          expiringItems: 0,
          pantryValue: memoizedPantryValue,
          totalReceipts: 0,
          totalRecipesCooked: 0,
          uniqueRecipesCooked: 0,
          averageUserRating: 0,
          aiRequestsUsed: 0,
          cookingStreak: { current: 0, longest: 0 },
          weeklyRecipeData: [
            { day: 'Mon', recipes: 0, aiRecipes: 0 },
            { day: 'Tue', recipes: 0, aiRecipes: 0 },
            { day: 'Wed', recipes: 0, aiRecipes: 0 },
            { day: 'Thu', recipes: 0, aiRecipes: 0 },
            { day: 'Fri', recipes: 0, aiRecipes: 0 },
            { day: 'Sat', recipes: 0, aiRecipes: 0 },
            { day: 'Sun', recipes: 0, aiRecipes: 0 },
          ],
          cuisineDistribution: [{ name: 'No data yet', value: 1, color: '#gray' }],
          categoryBreakdown: memoizedCategoryBreakdown || [],
          topIngredients: memoizedTopIngredients.slice(0, 5) || [],
          mostCookedRecipes: [{ recipe_title: 'No cooking sessions yet', times_cooked: 0 }],
          monthlyTrends: [],
        });
        setLoading(false);
      }
    };

    if (user?.id) {
      loadSupabaseAnalyticsData();
    }
  }, [
    user?.id,
    ingredients,
    memoizedPantryValue,
    memoizedTopIngredients,
    memoizedCategoryBreakdown,
  ]);

  // Separate useEffect for timeRange-specific filtering (much lighter operation)
  useEffect(() => {
    // Only apply time range filtering to existing data, don't reload everything
    if (analyticsData && timeRange !== '30d') {
      // In a real implementation, you'd filter the existing data based on timeRange
      // This prevents the expensive API calls from running again
    }
  }, [timeRange, analyticsData]);

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
              <p className="text-gray-600 mt-1">
                Comprehensive insights into your cooking and spending
              </p>
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

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                {[
                  { key: 'overview', label: 'Overview', icon: '📊' },
                  { key: 'spending', label: 'Spending Analytics', icon: '💰' },
                  { key: 'pantry', label: 'Pantry Insights', icon: '🏺' },
                  { key: 'cooking', label: 'Cooking Analytics', icon: '🍳' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-pantry-500 text-pantry-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
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
                      <p className="text-sm font-medium text-gray-600">Total Spent</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        ${analyticsData.totalSpent.toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-gray-600">{analyticsData.totalReceipts} receipts</span>
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
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🏺</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-orange-600">
                      {analyticsData.expiringItems} expiring soon
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pantry Value</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">
                        ${analyticsData.pantryValue.toFixed(0)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💎</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className="text-gray-600">Mixed actual & estimated</span>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Recipe Generation */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Weekly Recipe Activity
                  </h3>
                  <DynamicAreaChart data={analyticsData.weeklyRecipeData} />
                </div>

                {/* Cuisine Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Cuisine Preferences</h3>
                  <DynamicPieChart data={analyticsData.cuisineDistribution} />
                </div>
              </div>

              {/* Insights Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top Ingredients */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="text-2xl mb-3">🥗</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Ingredients</h3>
                  <div className="space-y-2">
                    {analyticsData.topIngredients?.slice(0, 3)?.map((ingredient, index) => (
                      <div key={ingredient.name} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{ingredient.name}</span>
                        <span className="text-sm font-medium text-green-600">
                          {ingredient.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Smart Insights */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                  <div className="text-2xl mb-3">💡</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Insights</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Try Mediterranean cuisine next</li>
                    <li>• Peak cooking time: 6-8 PM</li>
                    <li>• Consider batch cooking on Sundays</li>
                  </ul>
                </div>

                {/* AI Usage */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <div className="text-2xl mb-3">🤖</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Usage</h3>
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    {analyticsData.aiRequestsUsed}
                  </p>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(analyticsData.aiRequestsUsed / 100) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-600">of 100 monthly requests</p>
                </div>
              </div>
            </>
          )}

          {/* Spending Analytics Tab */}
          {activeTab === 'spending' && <SpendingAnalytics receipts={receipts} className="mt-6" />}

          {/* Pantry Insights Tab */}
          {activeTab === 'pantry' && (
            <div className="space-y-6">
              {/* Pantry Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="text-2xl mb-3">🏺</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Items</h3>
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    {analyticsData.pantryItems}
                  </p>
                  <p className="text-green-700 text-sm">Items in your pantry</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                  <div className="text-2xl mb-3">⚠️</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Expiring Soon</h3>
                  <p className="text-3xl font-bold text-orange-600 mb-2">
                    {analyticsData.expiringItems}
                  </p>
                  <p className="text-orange-700 text-sm">Items expiring within a week</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-gray-200">
                  <div className="text-2xl mb-3">💎</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Value</h3>
                  <p className="text-3xl font-bold text-purple-600 mb-2">
                    ${analyticsData.pantryValue.toFixed(0)}
                  </p>
                  <p className="text-purple-700 text-sm">Actual receipt + estimated prices</p>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                <DynamicBarChart data={analyticsData.categoryBreakdown} />
              </div>

              {/* Top Ingredients List */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Most Common Ingredients
                </h3>
                <div className="space-y-3">
                  {analyticsData.topIngredients?.map((ingredient, index) => (
                    <div
                      key={ingredient.name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pantry-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-pantry-600">{index + 1}</span>
                        </div>
                        <span className="font-medium text-gray-900">{ingredient.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{ingredient.count}</div>
                        <div className="text-sm text-gray-500">items</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cooking Analytics Tab */}
          {activeTab === 'cooking' && (
            <div className="space-y-6">
              {/* Cooking Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                  <div className="text-2xl mb-3">🍳</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Cooked</h3>
                  <p className="text-3xl font-bold text-orange-600 mb-2">
                    {analyticsData.totalRecipesCooked}
                  </p>
                  <p className="text-orange-700 text-sm">Recipes cooked</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <div className="text-2xl mb-3">📚</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Unique Recipes</h3>
                  <p className="text-3xl font-bold text-blue-600 mb-2">
                    {analyticsData.uniqueRecipesCooked}
                  </p>
                  <p className="text-blue-700 text-sm">Different recipes tried</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="text-2xl mb-3">🔥</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Streak</h3>
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    {analyticsData.cookingStreak.current}
                  </p>
                  <p className="text-green-700 text-sm">Days in a row</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                  <div className="text-2xl mb-3">⭐</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Rating</h3>
                  <p className="text-3xl font-bold text-purple-600 mb-2">
                    {analyticsData.averageUserRating?.toFixed(1) || '0.0'}
                  </p>
                  <p className="text-purple-700 text-sm">Your average rating</p>
                </div>
              </div>

              {/* Cooking Streak Progress */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Cooking Streak Achievement
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Current Streak</span>
                    <span className="text-sm text-gray-500">
                      {analyticsData.cookingStreak?.current || 0} /{' '}
                      {analyticsData.cookingStreak?.longest || 0} days
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((analyticsData.cookingStreak.current / Math.max(analyticsData.cookingStreak.longest, 1)) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Personal Best: {analyticsData.cookingStreak.longest} days</span>
                    <span>Keep cooking to extend your streak! 🔥</span>
                  </div>
                </div>
              </div>

              {/* Most Cooked Recipes */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Favorite Recipes</h3>
                {analyticsData.mostCookedRecipes?.length > 0 ? (
                  <div className="space-y-3">
                    {analyticsData.mostCookedRecipes?.map((recipe, index) => (
                      <div
                        key={recipe.recipe_title}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-lg font-bold text-orange-600">{index + 1}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">
                              {recipe.recipe_title}
                            </span>
                            <div className="text-sm text-gray-600">
                              Cooked {recipe.times_cooked}{' '}
                              {recipe.times_cooked === 1 ? 'time' : 'times'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl">🏆</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">👨‍🍳</div>
                    <p className="text-gray-600 mb-2">No cooking sessions yet</p>
                    <p className="text-sm text-gray-500">
                      Start cooking recipes to see your favorites here!
                    </p>
                  </div>
                )}
              </div>

              {/* Cooking Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                  <div className="text-2xl mb-3">📈</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Cooking Insights</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      {analyticsData.totalRecipesCooked > 0
                        ? `You've cooked ${analyticsData.totalRecipesCooked} recipes total`
                        : 'Start cooking to see insights'}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      {analyticsData.cookingStreak.longest > 0
                        ? `Your longest streak: ${analyticsData.cookingStreak.longest} days`
                        : 'Build a cooking streak!'}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      {analyticsData.averageUserRating > 0
                        ? `Average satisfaction: ${analyticsData.averageUserRating.toFixed(1)}/5`
                        : 'Rate recipes to track satisfaction'}
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200">
                  <div className="text-2xl mb-3">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Cooking Goals</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Try 10 unique recipes</span>
                      <span className="text-xs font-medium text-green-600">
                        {Math.min(analyticsData.uniqueRecipesCooked, 10)}/10
                      </span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((analyticsData.uniqueRecipesCooked / 10) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cook for 7 days straight</span>
                      <span className="text-xs font-medium text-green-600">
                        {Math.min(analyticsData.cookingStreak.current, 7)}/7
                      </span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((analyticsData.cookingStreak.current / 7) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
