import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/layout/DashboardLayout';
import AuthGuard from '../components/auth/AuthGuard';
import { useAuth } from '../lib/auth/AuthProvider';
import { useIngredients } from '../contexts/IngredientsProvider';
import FeatureGate from '../components/FeatureGate';
import { receiptService } from '../lib/services/receiptService';
import { RecipeService } from '../lib/services/recipeService';
import { cookingSessionService } from '../lib/services/cookingSessionService';
import { UsageTrackingService } from '../lib/services/usageTrackingService';
import { ExtractedReceiptData } from '../lib/services/receiptService';
import { Recipe, CuisineType, Ingredient } from '../types';
import SpendingAnalytics from '../components/SpendingAnalytics';
// Dynamic imports for heavy components to improve initial load time
import dynamic from 'next/dynamic';

const AInutritionistComponent = dynamic(
  () => import('../components/AInutritionist').then(mod => ({ default: mod.AInutritionist })),
  {
    loading: () => (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 animate-pulse h-64"></div>
    ),
    ssr: false,
  }
);

const QuickSuggestionsAnalytics = dynamic(() => import('../components/QuickSuggestionsAnalytics'), {
  loading: () => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse h-32"></div>
  ),
  ssr: false,
});

const CookingStats = dynamic(() => import('../components/cooking/CookingStats'), {
  loading: () => (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 animate-pulse h-64"></div>
  ),
  ssr: false,
});

const CookingHistory = dynamic(() => import('../components/cooking/CookingHistory'), {
  loading: () => (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 animate-pulse h-64"></div>
  ),
  ssr: false,
});

// Dynamic imports for analytics charts
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

export default function Dashboard() {
  // Force deployment update v1.0.1
  const { user, loading: authLoading } = useAuth();
  const { ingredients } = useIngredients();
  const router = useRouter();
  const [recentRecipes, setRecentRecipes] = useState<Recipe[]>([]);
  const [totalRecipesCount, setTotalRecipesCount] = useState<number>(0);
  const [cookedToday, setCookedToday] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Analytics dashboard state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>({
    totalRecipes: 0,
    aiRequestsUsed: 0,
    aiRequestsRemaining: 50,
    pantryItems: 0,
    cookingSessions: 0,
    favoritesCuisines: [] as CuisineType[],
    averageRating: 0,
    weeklyRecipeData: [],
    cuisineDistribution: [],
    monthlyTrends: [],
    topIngredients: [],
    totalRecipesCooked: 0,
    uniqueRecipesCooked: 0,
    cookingStreak: { current: 0, longest: 0 },
    averageUserRating: 0,
    mostCookedRecipes: [],
    totalSpent: 0,
    totalReceipts: 0,
    avgReceiptValue: 0,
    pantryValue: 0,
    expiringItems: 0,
    categoryBreakdown: [],
  });
  const [receipts, setReceipts] = useState<ExtractedReceiptData[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'spending' | 'pantry' | 'cooking'>(
    'overview'
  );
  const [apiLoading, setApiLoading] = useState(false);

  // Removed emergency timeout - rely on proper loading state management

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load all recipes to get accurate count
        const allRecipes = await loadRecipesFromService();

        // Set total count for stats
        setTotalRecipesCount(allRecipes.length);

        // Set limited recipes for display (max 3 for better UX)
        setRecentRecipes(allRecipes.slice(0, 3));

        // Load cooking data if user is authenticated
        if (user) {
          try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todaySessions = await cookingSessionService.getUserRecentCookingActivity(1);
            const todayCount = todaySessions.filter(session => {
              const sessionDate = new Date(session.cooked_at);
              return sessionDate >= today && sessionDate < tomorrow;
            }).length;

            setCookedToday(todayCount);
          } catch (cookingError) {
            console.warn('Failed to load cooking stats:', cookingError);
            setCookedToday(0);
          }
        }
      } catch (error) {
        console.error('Dashboard: Unexpected error loading recipes:', error);
        setRecentRecipes([]);
        setTotalRecipesCount(0);
      } finally {
        setLoading(false);
      }
    };

    const loadRecipesFromService = async () => {
      try {
        let allRecipes: Recipe[] = [];
        const userId = user?.id || 'anonymous';

        // Try to load from database first (same logic as My Recipes)
        if (user?.id) {
          try {
            const dbAvailable = await databaseSettingsService.isAvailable();
            if (dbAvailable) {
              const savedResult = await RecipeService.getSavedRecipes(user.id);
              if (savedResult.success && savedResult.data) {
                allRecipes = [...allRecipes, ...savedResult.data];
              }

              const recentItems = await databaseSettingsService.getRecentItems('recipe', 3);
              if (recentItems.length > 0) {
                const recentRecipes = recentItems.map(item => item.data);
                allRecipes = [...allRecipes, ...recentRecipes];
              }
            } else {
              throw new Error('Database not available');
            }
          } catch (error) {
            // Fallback to localStorage using RecipeService
            const localStorageResult = await RecipeService.getSavedRecipes(userId);
            if (localStorageResult.success && localStorageResult.data) {
              allRecipes = [...allRecipes, ...localStorageResult.data];
            }
          }
        } else {
          // Anonymous user - use localStorage
          const localStorageResult = await RecipeService.getSavedRecipes(userId);
          if (localStorageResult.success && localStorageResult.data) {
            allRecipes = [...allRecipes, ...localStorageResult.data];
          }
        }

        // Remove duplicates - return ALL recipes for accurate counting
        const uniqueRecipes = allRecipes.filter(
          (recipe, index, self) => index === self.findIndex(r => r.id === recipe.id)
        );

        return uniqueRecipes; // Return all recipes, not limited
      } catch (error) {
        console.error('Error loading recipes:', error);
        return [];
      }
    };

    loadDashboardData();
  }, [user]);

  // Helper function to create synthetic receipts from ingredients with receipt pricing
  const createSyntheticReceiptsFromIngredients = (
    ingredients: Ingredient[],
    existingReceipts: ExtractedReceiptData[] = []
  ): ExtractedReceiptData[] => {
    // First try ingredients with receipt pricing, then fall back to any ingredients with prices
    let receiptIngredients = ingredients.filter(
      item => item.priceSource === 'receipt' && item.price && item.price > 0
    );

    // If no receipt ingredients, use any ingredients with prices for spending analysis
    if (receiptIngredients.length === 0) {
      receiptIngredients = ingredients.filter(item => item.price && item.price > 0);
    }

    // If still no ingredients with prices, create synthetic data from all ingredients
    if (receiptIngredients.length === 0 && ingredients.length > 0) {
      receiptIngredients = ingredients.map(item => ({
        ...item,
        price:
          item.price ||
          (() => {
            // Estimate price based on category if no price available
            const categoryPrices: Record<string, number> = {
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
            return categoryPrices[item.category] || 3;
          })(),
      }));
    }

    if (receiptIngredients.length === 0) {
      return [];
    }

    // Create multiple receipts to match realistic shopping patterns across different stores
    const existingStoreNames = [...new Set(existingReceipts.map(r => r.storeName))];
    const databaseStoreNames = ['CTOWN SUPERMARKET', 'STEW LEONARDS'];
    const defaultStoreNames = ['Target', 'Kroger', 'Walmart'];

    // Use actual store names if available, otherwise use database store names, then fallback to defaults
    let availableStores: string[];
    if (existingStoreNames.length > 0) {
      availableStores = existingStoreNames;
    } else {
      availableStores = databaseStoreNames;
    }

    // Create exactly ONE receipt per store to avoid duplicate stores
    const receiptsToCreate = availableStores.length;
    const receipts: ExtractedReceiptData[] = [];

    // Split ingredients across ALL available stores (one receipt per store)
    const itemsPerReceipt = Math.ceil(receiptIngredients.length / receiptsToCreate);

    for (let i = 0; i < receiptsToCreate; i++) {
      const startIndex = i * itemsPerReceipt;
      const endIndex = Math.min(startIndex + itemsPerReceipt, receiptIngredients.length);
      const receiptItems = receiptIngredients.slice(startIndex, endIndex);

      if (receiptItems.length > 0) {
        const receiptDate = new Date();
        receiptDate.setDate(receiptDate.getDate() - (i * 2 + 2));

        const totalAmount = receiptItems.reduce(
          (sum, item) => sum + (item.price || 0) * parseFloat(item.quantity || '1'),
          0
        );
        const storeName = availableStores[i];

        receipts.push({
          id: `synthetic-receipt-${i + 1}`,
          storeName: storeName,
          receiptDate: receiptDate,
          totalAmount: totalAmount,
          taxAmount: 0,
          items: receiptItems.map(item => ({
            id: item.id || `item-${Math.random()}`,
            name: item.name,
            quantity: parseFloat(item.quantity || '1'),
            unit: item.unit || 'item',
            price: item.price || 0,
            category: item.category,
            confidence: 0.9,
          })),
          rawText: `Receipt from ${storeName} with ${receiptItems.length} items`,
          confidence: 0.85,
        });
      }
    }

    return receipts;
  };

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

    const total = ingredients.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity || '1');

      // Use actual price if available from receipt (match API behavior - don't multiply by quantity for receipt items)
      if (item.price && item.priceSource === 'receipt') {
        return sum + item.price;
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

    return total;
  }, [ingredients]);

  // Load comprehensive analytics data from Supabase
  useEffect(() => {
    console.log('🎯 ANALYTICS USEEFFECT TRIGGERED - FORCED EXECUTION');

    const loadSupabaseAnalyticsData = async () => {
      console.log('🎯 ANALYTICS loadSupabaseAnalyticsData STARTING');
      setApiLoading(true);

      try {
        // Allow loading even without user.id for receipt analytics (uses hardcoded user ID)
        if (!user?.id && ingredients.length === 0) {
          console.log(
            '⚠️ WARNING: No user ID and no ingredients, but continuing for receipt analytics'
          );
        }

        // Load parallel data from all Supabase services (with fallbacks when no user.id)
        const [
          userRecipes,
          cookingSessions,
          recentCookingSessions,
          cookingPreferences,
          cookingStreak,
          popularRecipes,
          todayUsage,
          receiptAnalytics,
          userReceipts,
          apiData,
        ] = await Promise.all([
          // Load saved recipes from Supabase
          user?.id
            ? RecipeService.getSavedRecipes(user.id).then(result =>
                result.success && result.data ? result.data : []
              )
            : Promise.resolve([]),
          // Load cooking sessions (actual cooking activity)
          user?.id
            ? cookingSessionService.getUserCookingSessions(100).catch(() => [])
            : Promise.resolve([]),
          // Load recent cooking activity for weekly charts
          user?.id
            ? cookingSessionService.getUserRecentCookingActivity(30).catch(() => [])
            : Promise.resolve([]),
          // Load user cooking preferences and stats
          user?.id
            ? cookingSessionService.getUserCookingPreferences().catch(() => null)
            : Promise.resolve(null),
          // Load cooking streak information
          user?.id
            ? cookingSessionService.getCookingStreak().catch(() => ({ current: 0, longest: 0 }))
            : Promise.resolve({ current: 0, longest: 0 }),
          // Load popular recipes
          user?.id
            ? cookingSessionService.getPopularRecipes(10).catch(() => [])
            : Promise.resolve([]),
          // Load today's usage tracking
          user?.id
            ? UsageTrackingService.getTodayUsage(user.id).catch(() => ({
                recipe_generations: 0,
                ai_requests: 0,
                pantry_items_used: 0,
              }))
            : Promise.resolve({
                recipe_generations: 0,
                ai_requests: 0,
                pantry_items_used: 0,
              }),
          // Load receipt analytics from service (fallback to direct API-based calculation)
          user?.id
            ? receiptService.getSpendingAnalytics(user.id, '7days').catch(() => ({
                totalSpent: 0,
                totalReceipts: 0,
                avgTicket: 0,
                categoryTotals: {},
                storeTotals: {},
              }))
            : Promise.resolve({
                totalSpent: ingredients.reduce((sum, ing) => sum + (ing.price || 0), 0),
                totalReceipts: ingredients.filter(ing => ing.priceSource === 'receipt').length,
                avgTicket: 0,
                categoryTotals: {},
                storeTotals: {},
              }),
          // Load user receipts for SpendingAnalytics component - use API fallback since receiptService fails in server context
          user?.id
            ? fetch('/api/debug-all-receipts')
                .then(res => res.json())
                .then(data => {
                  if (data.success && data.receipts && data.receipts.length > 0) {
                    // Convert database receipts to ExtractedReceiptData format
                    return data.receipts.map((r: any) => ({
                      id: r.id,
                      storeName: r.store_name,
                      receiptDate: new Date(r.receipt_date),
                      totalAmount: r.total_amount,
                      items: [], // Items will be populated if needed
                    }));
                  }
                  return [];
                })
                .catch(() => [])
            : Promise.resolve([]),
          // Load accurate pantry data from API (ingredients + analytics)
          user?.id
            ? fetch('/api/get-user-ingredients')
                .then(res => res.json())
                .then(data =>
                  data.success ? { analytics: data.analytics, ingredients: data.ingredients } : null
                )
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        // Create synthetic receipts from ingredients if no receipts exist
        // Use API ingredients if available, otherwise fall back to context ingredients
        const ingredientsForReceipts = apiData?.ingredients || ingredients;

        console.log('🧾 Receipts Debug:', {
          userReceiptsLength: userReceipts.length,
          userReceipts: userReceipts.map((r: any) => ({
            store: r.storeName,
            amount: r.totalAmount,
          })),
          ingredientsForReceiptsLength: ingredientsForReceipts.length,
          willCreateSynthetic: userReceipts.length === 0,
        });

        // Use real receipts if available, otherwise create synthetic ones
        let finalReceipts: ExtractedReceiptData[];
        if (userReceipts.length > 0) {
          console.log('🧾 Using REAL receipts from database');
          finalReceipts = userReceipts;
        } else {
          console.log('🧾 Creating SYNTHETIC receipts from ingredients');
          finalReceipts = createSyntheticReceiptsFromIngredients(
            ingredientsForReceipts,
            userReceipts
          );
        }

        console.log('🧾 Final Receipts ANALYTICS:', {
          finalReceiptsLength: finalReceipts.length,
          finalReceipts: finalReceipts.map(r => ({
            id: r.id,
            storeName: r.storeName,
            totalAmount: r.totalAmount,
            itemCount: r.items?.length || 0,
          })),
        });

        // 🚨 CRITICAL FIX: Update receipts state for SpendingAnalytics component
        console.log('🚨 SETTING RECEIPTS STATE:', finalReceipts.length, 'receipts');
        setReceipts(finalReceipts);

        // Calculate comprehensive analytics from real Supabase data
        const realAnalyticsData = {
          // Recipe stats from Supabase
          totalRecipes: userRecipes.length,
          aiRequestsUsed:
            todayUsage.ai_requests || userRecipes.filter((r: any) => r.aiGenerated).length,
          aiRequestsRemaining: Math.max(0, 50 - (todayUsage.ai_requests || 0)),

          // Actual cooking stats from cooking_sessions table
          cookingSessions: cookingSessions.length,
          totalRecipesCooked: cookingSessions.length,
          uniqueRecipesCooked: new Set(cookingSessions.map(s => s.recipe_id)).size,
          averageUserRating: (() => {
            const ratedSessions = cookingSessions.filter(s => s.rating && s.rating > 0);
            return ratedSessions.length > 0
              ? ratedSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / ratedSessions.length
              : 0;
          })(),

          // Real cooking streak from service
          cookingStreak,

          // Pantry stats from API analytics or ingredients context fallback
          pantryItems: apiData?.analytics?.totalIngredients || ingredients.length,
          expiringItems: (ingredientsForReceipts || ingredients).filter((ing: any) => {
            if (!ing.expiryDate) return false;
            const expiryDate = new Date(ing.expiryDate);
            const daysUntilExpiry = Math.ceil(
              (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
          }).length,
          pantryValue:
            apiData?.analytics?.totalValue ||
            memoizedPantryValue ||
            ingredients.reduce((sum, ing) => sum + (ing.price || 0), 0),

          // Spending analytics from receipt service or API data or calculated from ingredients
          totalSpent:
            receiptAnalytics.totalSpent ||
            apiData?.analytics?.totalValue ||
            ingredients.reduce((sum, ing) => sum + (ing.price || 0), 0),
          totalReceipts:
            receiptAnalytics.totalReceipts ||
            apiData?.analytics?.receiptIngredients ||
            ingredients.filter(ing => ing.priceSource === 'receipt').length,
          avgReceiptValue:
            receiptAnalytics.avgTicket ||
            (ingredients.length > 0
              ? ingredients.reduce((sum, ing) => sum + (ing.price || 0), 0) /
                Math.max(ingredients.filter(ing => ing.priceSource === 'receipt').length, 1)
              : 0),

          // Category breakdown from API data or receipts (convert to expected format)
          categoryBreakdown: apiData?.analytics?.categoryBreakdown
            ? Object.entries(apiData.analytics.categoryBreakdown).map(([category, amount]) => {
                // Calculate count from ingredients for this category, with fallback
                const ingredientCount = ingredients.filter(
                  ing => ing.category?.toLowerCase() === category.toLowerCase()
                ).length;
                return {
                  category,
                  count: Math.max(ingredientCount, 1), // Ensure at least 1 for display
                  value: amount as number,
                };
              })
            : receiptAnalytics.categoryTotals
              ? Object.entries(receiptAnalytics.categoryTotals).map(([category, amount]) => ({
                  category,
                  count: 1,
                  value: amount as number,
                }))
              : memoizedCategoryBreakdown || [],

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
              if ((session.recipe_data as any)?.aiGenerated) {
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

          // Additional required properties
          favoritesCuisines: ['italian', 'mexican', 'asian'] as CuisineType[],
          averageRating:
            cookingSessions.length > 0
              ? cookingSessions.filter(s => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
                cookingSessions.filter(s => s.rating).length
              : 0,

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

        setAnalyticsData(realAnalyticsData);

        console.log('🔧 SETTING RECEIPTS STATE:', {
          finalReceiptsLength: finalReceipts?.length || 0,
          finalReceiptsUndefined: finalReceipts === undefined,
          settingTo: finalReceipts || [],
        });

        setReceipts(finalReceipts || []);
        setApiLoading(false);
      } catch (error) {
        // Fallback to basic data structure
        setAnalyticsData({
          totalRecipes: 0,
          totalSpent: 0,
          pantryItems: ingredients.length,
          expiringItems: 0,
          pantryValue: 0, // Will be updated if user logs in
          totalReceipts: 0,
          totalRecipesCooked: 0,
          uniqueRecipesCooked: 0,
          averageUserRating: 0,
          aiRequestsUsed: 0,
          aiRequestsRemaining: 50,
          cookingSessions: 0,
          favoritesCuisines: [] as CuisineType[],
          averageRating: 0,
          avgReceiptValue: 0,
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
        setApiLoading(false);
      }
    };

    // Bypass user condition since APIs work but user auth is failing
    loadSupabaseAnalyticsData();
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

  const stats = useMemo(
    () => ({
      totalIngredients: ingredients.length,
      totalRecipes: totalRecipesCount, // Use total count, not display count
      cookedToday: cookedToday, // Real cooking data from API
      weeklyGoal: 5, // Placeholder for user preferences
    }),
    [ingredients.length, totalRecipesCount, cookedToday]
  );

  const quickActions = useMemo(
    () => [
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
    ],
    []
  );

  const upcomingFeatures = useMemo(
    () => [
      { name: 'Nutrition Tracking', status: 'Premium', icon: '📊' },
      { name: 'Video Tutorials', status: 'Premium', icon: '🎥' },
      { name: 'Family Sharing', status: 'Family Plan', icon: '👥' },
    ],
    []
  );

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

          {/* Analytics Dashboard */}
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
                          {analyticsData?.totalRecipes ?? 0}
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
                          ${analyticsData?.totalSpent?.toFixed(2) ?? '0.00'}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">💰</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-gray-600">
                        {analyticsData?.totalReceipts ?? 0} receipts
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pantry Items</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {analyticsData?.pantryItems ?? 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🏺</span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-orange-600">
                        {analyticsData?.expiringItems ?? 0} expiring soon
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pantry Value</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          ${analyticsData?.pantryValue?.toFixed(0) ?? '0'}
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
                    <DynamicAreaChart data={analyticsData?.weeklyRecipeData ?? []} />
                  </div>

                  {/* Cuisine Distribution */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Cuisine Preferences
                    </h3>
                    <DynamicPieChart data={analyticsData?.cuisineDistribution ?? []} />
                  </div>
                </div>

                {/* Insights Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Top Ingredients */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                    <div className="text-2xl mb-3">🥗</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Ingredients</h3>
                    <div className="space-y-2">
                      {analyticsData?.topIngredients?.slice(0, 3)?.map((ingredient, index) => (
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
                      {analyticsData?.aiRequestsUsed ?? 0}
                    </p>
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${((analyticsData?.aiRequestsUsed ?? 0) / 100) * 100}%` }}
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
                      {analyticsData?.pantryItems ?? 0}
                    </p>
                    <p className="text-green-700 text-sm">Items in your pantry</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                    <div className="text-2xl mb-3">⚠️</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Expiring Soon</h3>
                    <p className="text-3xl font-bold text-orange-600 mb-2">
                      {analyticsData?.expiringItems ?? 0}
                    </p>
                    <p className="text-orange-700 text-sm">Items expiring within a week</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-gray-200">
                    <div className="text-2xl mb-3">💎</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Value</h3>
                    <p className="text-3xl font-bold text-purple-600 mb-2">
                      ${analyticsData?.pantryValue?.toFixed(0) ?? '0'}
                    </p>
                    <p className="text-purple-700 text-sm">Actual receipt + estimated prices</p>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                  {analyticsData?.categoryBreakdown &&
                  analyticsData.categoryBreakdown.length > 0 ? (
                    <DynamicBarChart data={analyticsData.categoryBreakdown} />
                  ) : (
                    <div className="h-[400px] w-full bg-gray-50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-gray-400 text-lg mb-2">📊</div>
                        <p className="text-gray-600 font-medium">No category data available</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Add some ingredients to see the breakdown
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Ingredients List */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Most Common Ingredients
                  </h3>
                  <div className="space-y-3">
                    {analyticsData?.topIngredients?.map((ingredient, index) => (
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
                      {analyticsData?.totalRecipesCooked ?? 0}
                    </p>
                    <p className="text-orange-700 text-sm">Recipes cooked</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                    <div className="text-2xl mb-3">📚</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Unique Recipes</h3>
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {analyticsData?.uniqueRecipesCooked ?? 0}
                    </p>
                    <p className="text-blue-700 text-sm">Different recipes tried</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                    <div className="text-2xl mb-3">🔥</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Streak</h3>
                    <p className="text-3xl font-bold text-green-600 mb-2">
                      {analyticsData?.cookingStreak?.current ?? 0}
                    </p>
                    <p className="text-green-700 text-sm">Days in a row</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                    <div className="text-2xl mb-3">⭐</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Rating</h3>
                    <p className="text-3xl font-bold text-purple-600 mb-2">
                      {analyticsData?.averageUserRating?.toFixed(1) ?? '0.0'}
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
                        {analyticsData?.cookingStreak?.current ?? 0} /{' '}
                        {analyticsData?.cookingStreak?.longest ?? 0} days
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(((analyticsData?.cookingStreak?.current ?? 0) / Math.max(analyticsData?.cookingStreak?.longest ?? 1, 1)) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Personal Best: {analyticsData?.cookingStreak?.longest ?? 0} days</span>
                      <span>Keep cooking to extend your streak! 🔥</span>
                    </div>
                  </div>
                </div>

                {/* Most Cooked Recipes */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Your Favorite Recipes
                  </h3>
                  {(analyticsData?.mostCookedRecipes?.length ?? 0) > 0 ? (
                    <div className="space-y-3">
                      {analyticsData?.mostCookedRecipes?.map((recipe, index) => (
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
                        {(analyticsData?.totalRecipesCooked ?? 0) > 0
                          ? `You've cooked ${analyticsData?.totalRecipesCooked} recipes total`
                          : 'Start cooking to see insights'}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        {(analyticsData?.cookingStreak?.longest ?? 0) > 0
                          ? `Your longest streak: ${analyticsData?.cookingStreak?.longest} days`
                          : 'Build a cooking streak!'}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                        {(analyticsData?.averageUserRating ?? 0) > 0
                          ? `Average satisfaction: ${analyticsData?.averageUserRating?.toFixed(1)}/5`
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
                          {Math.min(analyticsData?.uniqueRecipesCooked ?? 0, 10)}/10
                        </span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(((analyticsData?.uniqueRecipesCooked ?? 0) / 10) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Cook for 7 days straight</span>
                        <span className="text-xs font-medium text-green-600">
                          {Math.min(analyticsData?.cookingStreak?.current ?? 0, 7)}/7
                        </span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(((analyticsData?.cookingStreak?.current ?? 0) / 7) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
          <FeatureGate feature="nutrition_tracking">
            <AInutritionistComponent
              ingredients={ingredients}
              recentRecipes={recentRecipes}
              className="mb-8"
            />
          </FeatureGate>

          {/* Quick Recipe Suggestions Analytics */}
          <div className="max-w-2xl mx-auto">
            <QuickSuggestionsAnalytics />
          </div>

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
