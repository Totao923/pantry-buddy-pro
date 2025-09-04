import React, { useState, useEffect, useMemo, memo } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import SpendingAnalytics from '../../components/SpendingAnalytics';
import { useAuth } from '../../lib/auth/AuthProvider';
import { createSupabaseClient } from '../../lib/supabase/client';
import { aiService } from '../../lib/ai/aiService';
import { receiptService } from '../../lib/services/receiptService';
import { useIngredients } from '../../contexts/IngredientsProvider';
import { barcodeService } from '../../lib/services/barcodeService';
import { cookingSessionService } from '../../lib/services/cookingSessionService';
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
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
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
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [receipts, setReceipts] = useState<ExtractedReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Split useEffect into two: one for initial data load, one for timeRange-specific updates
  useEffect(() => {
    const loadStaticAnalyticsData = async () => {
      console.log('🚀 Analytics: Starting to load analytics data for user:', user?.id);
      console.log('🔍 Analytics: Component mounted and function called');

      // Quick check for localStorage receipts
      const localReceipts = localStorage.getItem('userReceipts') || '[]';
      console.log('📱 Analytics: localStorage receipts check:', {
        hasLocalStorage: !!localReceipts,
        localStorageLength: localReceipts.length,
        parsedCount: JSON.parse(localReceipts).length,
      });

      try {
        if (!user) {
          console.log('❌ Analytics: No user found, stopping load');
          setLoading(false);
          return;
        }

        // Check for cached analytics data first
        const cacheKey = `analytics-${user.id}`;
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(`${cacheKey}-timestamp`);
        const now = Date.now();
        const cacheAge = cacheTimestamp ? now - parseInt(cacheTimestamp) : Infinity;

        console.log('🗄️ Analytics: Cache check:', {
          hasCachedData: !!cachedData,
          cacheAge: Math.round(cacheAge / 1000),
          willUseCache: cachedData && cacheAge < 5 * 60 * 1000,
        });

        // Temporarily disable cache to debug spending calculation issue
        // Use cache if less than 5 minutes old (analytics data changes less frequently)
        if (false && cachedData && cacheAge < 5 * 60 * 1000) {
          try {
            const cached = JSON.parse(cachedData!);
            console.log('✅ Analytics: Using cached data');
            setAnalyticsData(cached);
            setLoading(false);
            return;
          } catch (error) {
            console.warn('Failed to parse cached analytics data, fetching fresh');
          }
        }

        console.log('🔄 Analytics: Fetching fresh data...');

        // Get session once for all authenticated calls
        const supabase = createSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Load static data that doesn't change with timeRange
        const [
          aiStatsResult,
          userReceiptsResult,
          pantryItemsResult,
          scanningStatsResult,
          cookingPreferencesResult,
          cookingStreakResult,
          cookingSessionsResult,
        ] = await Promise.allSettled([
          aiService.getUsageStats(user.id),
          receiptService.getUserReceipts(user.id, supabase),
          Promise.resolve(ingredients),
          barcodeService.getScanningStats(user.id),
          // For cooking preferences, provide fallback for demo/anonymous users
          session?.access_token && session?.user
            ? cookingSessionService.getUserCookingPreferences()
            : Promise.resolve(null),
          // For cooking streak, provide fallback for demo/anonymous users
          session?.access_token && session?.user
            ? cookingSessionService.getCookingStreak()
            : Promise.resolve({ current: 0, longest: 0 }),
          // Use authenticated API for cooking sessions only if authenticated
          session?.access_token
            ? fetch('/api/cooking-sessions?limit=20', {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
              }).then(res => (res.ok ? res.json().then(data => data.data || []) : []))
            : Promise.resolve([]),
        ]);

        // Extract results with fallbacks
        const aiStats =
          aiStatsResult.status === 'fulfilled'
            ? aiStatsResult.value
            : { aiEnabled: false, requestsUsed: 0, requestsRemaining: 100 };

        const userReceipts =
          userReceiptsResult.status === 'fulfilled' ? userReceiptsResult.value : [];
        console.log('🧾 Analytics: Receipt loading result:', {
          status: userReceiptsResult.status,
          count: userReceipts.length,
          error: userReceiptsResult.status === 'rejected' ? userReceiptsResult.reason : null,
          sample: userReceipts.slice(0, 2).map(r => ({
            storeName: r.storeName,
            totalAmount: r.totalAmount,
            itemCount: r.items?.length,
          })),
        });

        const pantryItems = pantryItemsResult.status === 'fulfilled' ? pantryItemsResult.value : [];

        const scanningStats =
          scanningStatsResult.status === 'fulfilled' ? scanningStatsResult.value : {};

        const cookingPreferences =
          cookingPreferencesResult.status === 'fulfilled' ? cookingPreferencesResult.value : null;

        const cookingStreak =
          cookingStreakResult.status === 'fulfilled'
            ? cookingStreakResult.value
            : { current: 0, longest: 0 };

        const recentCookingSessions =
          cookingSessionsResult.status === 'fulfilled' ? cookingSessionsResult.value : [];

        setReceipts(userReceipts);

        // Load data from localStorage (for recipes and cooking history) with deleted recipe filtering
        const recentRecipes = JSON.parse(localStorage.getItem('recentRecipes') || '[]');
        const savedRecipes = JSON.parse(localStorage.getItem('userRecipes') || '[]');
        const cookingHistory = JSON.parse(localStorage.getItem('cookingHistory') || '[]');
        const recipeRatings = JSON.parse(localStorage.getItem('recipeRatings') || '{}');

        // Filter out deleted recipes using the same logic as recipes page
        const deletedRecipes = JSON.parse(localStorage.getItem('deletedRecipes') || '[]');
        const filteredRecentRecipes = recentRecipes.filter(
          (recipe: Recipe) => !deletedRecipes.includes(recipe.id)
        );
        const filteredSavedRecipes = savedRecipes.filter(
          (recipe: Recipe) => !deletedRecipes.includes(recipe.id)
        );

        // Calculate analytics with filtered recipes
        const allRecipes = [...filteredRecentRecipes, ...filteredSavedRecipes];
        const totalRecipes = allRecipes.length;

        // Calculate spending analytics
        const totalSpent = userReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
        const totalReceiptsCount = userReceipts.length;
        const avgReceiptValue = totalReceiptsCount > 0 ? totalSpent / totalReceiptsCount : 0;

        console.log('💰 Analytics: Spending calculation:', {
          totalSpent,
          totalReceiptsCount,
          avgReceiptValue,
          receiptAmounts: userReceipts.map(r => r.totalAmount),
        });

        // Calculate pantry analytics
        const pantryItemsCount = pantryItems.length;
        const currentDate = new Date();
        const expiringItems = pantryItems.filter(item => {
          if (!item.expiryDate) return false;
          const expiryDate = new Date(item.expiryDate);
          const daysUntilExpiry =
            (expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysUntilExpiry <= 7; // Expiring within a week
        }).length;

        // Use memoized pantry value calculation
        const pantryValue = memoizedPantryValue;

        // Use memoized category breakdown calculation
        const categoryBreakdown = memoizedCategoryBreakdown;

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

        // Use memoized top ingredients calculation
        const topIngredients = memoizedTopIngredients;

        // Process cooking statistics
        const totalRecipesCooked = cookingPreferences?.total_recipes_cooked || 0;
        const uniqueRecipesCooked = [...new Set(recentCookingSessions.map((s: any) => s.recipe_id))]
          .length;
        const averageUserRating = cookingPreferences?.average_rating_given || 0;

        // Get most cooked recipes from sessions
        const recipeCounts = recentCookingSessions.reduce((acc: any, session: any) => {
          acc[session.recipe_title] = (acc[session.recipe_title] || 0) + 1;
          return acc;
        }, {});

        const mostCookedRecipes = Object.entries(recipeCounts)
          .map(([recipe_title, times_cooked]) => ({
            recipe_title,
            times_cooked: times_cooked as number,
          }))
          .sort((a, b) => b.times_cooked - a.times_cooked)
          .slice(0, 5);

        const analyticsResult = {
          totalRecipes,
          aiRequestsUsed:
            100 - ((aiStats as any).remainingRequests || (aiStats as any).requestsRemaining || 0),
          aiRequestsRemaining:
            (aiStats as any).remainingRequests || (aiStats as any).requestsRemaining || 0,
          pantryItems: pantryItemsCount,
          cookingSessions: cookingHistory.length,
          favoritesCuisines: Object.keys(cuisineCounts).slice(0, 3) as CuisineType[],
          averageRating,
          weeklyRecipeData,
          cuisineDistribution,
          monthlyTrends,
          topIngredients,
          totalSpent,
          totalReceipts: totalReceiptsCount,
          avgReceiptValue,
          pantryValue,
          expiringItems,
          categoryBreakdown,
          // Cooking statistics
          totalRecipesCooked,
          uniqueRecipesCooked,
          cookingStreak,
          averageUserRating,
          mostCookedRecipes,
        };

        // Cache the analytics data
        try {
          const cacheKey = `analytics-${user.id}`;
          localStorage.setItem(cacheKey, JSON.stringify(analyticsResult));
          localStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString());
        } catch (error) {
          console.warn('Failed to cache analytics data:', error);
        }

        setAnalyticsData(analyticsResult);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    console.log('🔄 Analytics: useEffect triggered with user:', {
      userId: user?.id,
      hasUser: !!user,
    });
    console.log('🔍 Analytics: useEffect execution check');

    if (user) {
      loadStaticAnalyticsData();
    } else {
      console.log('⚠️ Analytics: No user found, setting loading to false');
      // Set loading to false if no user to prevent infinite loading
      setLoading(false);
    }
  }, [
    user?.id,
    ingredients,
    memoizedTopIngredients,
    memoizedCategoryBreakdown,
    memoizedPantryValue,
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
                    {analyticsData.topIngredients.slice(0, 3).map((ingredient, index) => (
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
                  {analyticsData.topIngredients.map((ingredient, index) => (
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
                    {analyticsData.averageUserRating.toFixed(1)}
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
                      {analyticsData.cookingStreak.current} / {analyticsData.cookingStreak.longest}{' '}
                      days
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
                {analyticsData.mostCookedRecipes.length > 0 ? (
                  <div className="space-y-3">
                    {analyticsData.mostCookedRecipes.map((recipe, index) => (
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
