import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

// Global flag to prevent multiple simultaneous analysis requests
let globalAnalysisInProgress = false;
let globalAnalysisCount = 0;
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { Ingredient, NutritionInfo, Recipe } from '../types';
import { useAuth } from '../lib/auth/AuthProvider';
import { HEALTH_GOALS } from '../lib/health-goals';
import { useHealthGoal } from '../lib/contexts/HealthGoalContext';
import { ShoppingListService } from '../lib/services/shoppingListService';

interface NutritionAnalysis {
  overallScore: number;
  macronutrientBalance: {
    protein: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
    carbs: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
    fats: { current: number; recommended: number; status: 'low' | 'good' | 'high' };
  };
  micronutrientGaps: string[];
  recommendations: NutritionRecommendation[];
}

interface NutritionRecommendation {
  type: 'ingredient' | 'recipe' | 'substitution' | 'supplement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface AInutritionistProps {
  ingredients: Ingredient[];
  recentRecipes?: Recipe[];
  className?: string;
}

export const AInutritionist: React.FC<AInutritionistProps> = ({
  ingredients,
  recentRecipes = [],
  className = '',
}) => {
  const { user, profile, subscription, session } = useAuth();
  const { selectedGoal, setSelectedGoal } = useHealthGoal();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [pendingShoppingItem, setPendingShoppingItem] = useState<string | null>(null);
  const [shoppingItemForm, setShoppingItemForm] = useState({
    name: '',
    quantity: 1,
    unit: 'pcs',
    category: 'other' as 'protein' | 'vegetables' | 'fruits' | 'grains' | 'dairy' | 'other',
  });
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnalysisParamsRef = useRef<string>('');
  const isAnalysisInProgressRef = useRef<boolean>(false);
  const componentMountedRef = useRef<boolean>(true);

  const analyzeNutrition = useCallback(async () => {
    if (!componentMountedRef.current) {
      console.log('🔒 AI Nutritionist: Component unmounted, skipping analysis');
      return;
    }

    if (!session?.access_token) {
      console.log('🔒 AI Nutritionist: No session token available, skipping analysis');
      return;
    }

    // Global check to prevent any analysis when one is running
    if (globalAnalysisInProgress) {
      console.log('🔒 AI Nutritionist: Global analysis in progress, skipping');
      return;
    }

    const analysisKey = `${ingredients.length}-${recentRecipes.length}-${selectedGoal.id}-${session?.access_token ? 'auth' : 'no-auth'}`;
    const cacheKey = `nutrition-analysis-${analysisKey}`;

    // Check cache first
    const cachedAnalysis = localStorage.getItem(cacheKey);
    const cacheTimestamp = localStorage.getItem(`${cacheKey}-timestamp`);
    const now = Date.now();
    const cacheAge = cacheTimestamp ? now - parseInt(cacheTimestamp) : Infinity;

    // Use cache if less than 10 minutes old (increased from 5)
    if (cachedAnalysis && cacheAge < 10 * 60 * 1000) {
      console.log(
        '📦 AI Nutritionist: Using cached analysis, age:',
        Math.round(cacheAge / 1000),
        's'
      );
      try {
        setAnalysis(JSON.parse(cachedAnalysis));
        return;
      } catch (error) {
        console.log('❌ Failed to parse cached analysis, will fetch new');
      }
    }

    // Set global flag to prevent other instances
    globalAnalysisInProgress = true;
    globalAnalysisCount++;
    setLoading(true);

    console.log(
      '🚀 AI Nutritionist: Starting analysis',
      globalAnalysisCount,
      'for key:',
      analysisKey
    );

    try {
      const requestData = {
        ingredients,
        recentRecipes,
        healthGoal: selectedGoal,
        userProfile: { ...profile, subscription },
      };

      console.log('🤖 AI Nutritionist: Sending data to API:', {
        ingredientsCount: ingredients.length,
        recentRecipesCount: recentRecipes.length,
        healthGoal: selectedGoal.name,
        subscription: subscription?.tier,
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        user: user ? { id: user.id, email: user.email } : null,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication header if session is available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/nutrition/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI Nutritionist: Received analysis result:', result);

        // Cache the result
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
          localStorage.setItem(`${cacheKey}-timestamp`, now.toString());
          console.log('📦 AI Nutritionist: Cached analysis result');
        } catch (error) {
          console.log('⚠️ Failed to cache analysis result:', error);
        }

        if (componentMountedRef.current) {
          setAnalysis(result);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ AI Nutritionist: API error:', errorData);
      }
    } catch (error) {
      console.error('❌ AI Nutritionist: Request error:', error);
    } finally {
      globalAnalysisInProgress = false;
      if (componentMountedRef.current) {
        setLoading(false);
      }
      console.log('✅ AI Nutritionist: Analysis completed, global flag cleared');
    }
  }, [ingredients.length, recentRecipes.length, selectedGoal.id, session?.access_token]);

  // Cleanup on unmount
  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  const generateWeeklyReport = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication header if session is available
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/nutrition/weekly-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user?.id,
          healthGoal: selectedGoal,
        }),
      });

      if (response.ok) {
        const report = await response.json();
        setWeeklyReport(report);
      }
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  };

  const handleRecommendationAction = (recommendation: NutritionRecommendation) => {
    console.log(
      '🎯 Handling recommendation action:',
      recommendation.action,
      'for:',
      recommendation.title
    );

    switch (recommendation.action) {
      case 'Add to Shopping List':
        // Extract ingredient name from recommendation title
        const ingredientName = extractIngredientFromRecommendation(recommendation);
        setPendingShoppingItem(ingredientName);

        // Pre-populate the form with extracted ingredient info
        setShoppingItemForm({
          name: ingredientName,
          quantity: 1,
          unit: getDefaultUnit(ingredientName),
          category: getDefaultCategory(ingredientName),
        });

        setShowShoppingListModal(true);
        break;

      case 'Find High-Fiber Recipes':
      case 'Find Protein Recipes':
      case 'Find Healthy Recipes':
        // Navigate to recipes with search filter
        const searchQuery = getRecipeSearchQuery(recommendation);
        router.push(`/dashboard/recipes?search=${encodeURIComponent(searchQuery)}`);
        break;

      case 'Generate New Recipe':
      case 'Create Recipe':
      case 'Generate Recipe':
      case 'Generate Quick Recipe':
      case 'Generate Protein Recipe':
      case 'Generate High-Fiber Recipe':
        // Navigate to create recipe page with AI suggestions and suggested ingredients
        const suggestedIngredients = getSuggestedIngredientsFromRecommendation(recommendation);
        router.push({
          pathname: '/dashboard/create-recipe',
          query: {
            mode: 'ai-suggested',
            suggestedIngredients: JSON.stringify(suggestedIngredients),
            recommendationTitle: recommendation.title,
          },
        });
        break;

      default:
        console.log('Unknown action:', recommendation.action);
    }
  };

  const extractIngredientFromRecommendation = (rec: NutritionRecommendation): string => {
    // Try to extract specific ingredient names from the recommendation
    const fullText = `${rec.title} ${rec.description}`.toLowerCase();

    console.log('🔍 Extracting ingredient from recommendation:', {
      title: rec.title,
      description: rec.description,
      fullText: fullText,
    });

    // Common ingredient patterns - check for specific ingredient mentions first
    const ingredientPatterns = [
      // Proteins - more specific patterns first
      { pattern: /(chicken breast)/i, ingredient: 'chicken breast' },
      { pattern: /(chicken)/i, ingredient: 'chicken breast' },
      { pattern: /(salmon)/i, ingredient: 'salmon' },
      { pattern: /(fish|tuna)/i, ingredient: 'salmon' },
      { pattern: /(eggs|egg)/i, ingredient: 'eggs' },
      { pattern: /(tofu)/i, ingredient: 'tofu' },
      { pattern: /(black beans)/i, ingredient: 'black beans' },
      { pattern: /(beans|lentils|chickpeas)/i, ingredient: 'black beans' },
      { pattern: /(greek yogurt)/i, ingredient: 'Greek yogurt' },
      { pattern: /(yogurt)/i, ingredient: 'Greek yogurt' },

      // Vegetables - more specific patterns first
      { pattern: /(spinach)/i, ingredient: 'spinach' },
      { pattern: /(leafy greens)/i, ingredient: 'spinach' },
      { pattern: /(broccoli)/i, ingredient: 'broccoli' },
      { pattern: /(sweet potato)/i, ingredient: 'sweet potato' },
      { pattern: /(potatoes)/i, ingredient: 'sweet potato' },
      { pattern: /(bell pepper)/i, ingredient: 'bell peppers' },
      { pattern: /(peppers)/i, ingredient: 'bell peppers' },
      { pattern: /(tomatoes)/i, ingredient: 'tomatoes' },
      { pattern: /(tomato)/i, ingredient: 'tomatoes' },
      { pattern: /(carrots)/i, ingredient: 'carrots' },
      { pattern: /(carrot)/i, ingredient: 'carrots' },
      { pattern: /(onions)/i, ingredient: 'onions' },
      { pattern: /(onion)/i, ingredient: 'onions' },

      // Fruits - more specific patterns first
      { pattern: /(oranges)/i, ingredient: 'oranges' },
      { pattern: /(orange|citrus)/i, ingredient: 'oranges' },
      { pattern: /(bananas)/i, ingredient: 'bananas' },
      { pattern: /(banana)/i, ingredient: 'bananas' },
      { pattern: /(mixed berries)/i, ingredient: 'mixed berries' },
      { pattern: /(berries|blueberries|strawberries)/i, ingredient: 'mixed berries' },
      { pattern: /(apples)/i, ingredient: 'apples' },
      { pattern: /(apple)/i, ingredient: 'apples' },

      // Grains & Starches
      { pattern: /(quinoa)/i, ingredient: 'quinoa' },
      { pattern: /(brown rice|rice)/i, ingredient: 'brown rice' },
      { pattern: /(oats|oatmeal)/i, ingredient: 'rolled oats' },
      { pattern: /(whole grain|whole wheat)/i, ingredient: 'whole grain bread' },

      // Dairy & Alternatives
      { pattern: /(milk|dairy)/i, ingredient: 'milk' },
      { pattern: /(cheese)/i, ingredient: 'cheese' },
      { pattern: /(almond milk|plant milk)/i, ingredient: 'almond milk' },

      // Nuts & Seeds
      { pattern: /(almonds|nuts)/i, ingredient: 'almonds' },
      { pattern: /(walnuts)/i, ingredient: 'walnuts' },
      { pattern: /(chia seeds|seeds)/i, ingredient: 'chia seeds' },

      // Oils & Condiments
      { pattern: /(olive oil|oil)/i, ingredient: 'olive oil' },
      { pattern: /(avocado)/i, ingredient: 'avocado' },
    ];

    // Find the first matching ingredient pattern
    for (const { pattern, ingredient } of ingredientPatterns) {
      if (pattern.test(fullText)) {
        console.log(`🎯 Extracted ingredient "${ingredient}" from "${rec.title}"`);
        return ingredient;
      }
    }

    // Try to extract ingredient name directly from "Add [ingredient]" pattern
    const addPattern = /add\s+([a-zA-Z\s]+?)(?:\s|$|,|\.|!)/i;
    const addMatch = rec.title.match(addPattern);
    if (addMatch && addMatch[1]) {
      const extracted = addMatch[1].trim();
      console.log(`🎯 Extracted ingredient "${extracted}" from "Add" pattern in "${rec.title}"`);
      return extracted;
    }

    // Try to extract from "Restock" pattern
    const restockPattern = /restock\s+([a-zA-Z\s,]+?)(?:\s|$|:)/i;
    const restockMatch = rec.title.match(restockPattern);
    if (restockMatch && restockMatch[1]) {
      const extracted = restockMatch[1].split(',')[0].trim(); // Take first item if comma-separated
      console.log(
        `🎯 Extracted ingredient "${extracted}" from "Restock" pattern in "${rec.title}"`
      );
      return extracted;
    }

    // If all else fails, provide a reasonable default based on recommendation type
    if (rec.type === 'ingredient') {
      if (fullText.includes('protein')) return 'chicken breast'; // Specific protein instead of generic
      if (fullText.includes('fiber')) return 'black beans'; // Specific fiber source instead of generic
      if (fullText.includes('vitamin')) return 'spinach'; // Specific vitamin source instead of generic
      if (fullText.includes('calcium')) return 'Greek yogurt'; // Specific calcium source instead of generic
    }

    console.warn(
      `⚠️ Could not extract specific ingredient from "${rec.title}" - using chicken breast as fallback`
    );
    return 'chicken breast'; // Specific fallback instead of generic
  };

  const getDefaultUnit = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase();

    // Liquids
    if (name.includes('milk') || name.includes('oil') || name.includes('juice')) {
      return 'L';
    }

    // Weight-based items
    if (name.includes('meat') || name.includes('fish') || name.includes('cheese')) {
      return 'lbs';
    }

    // Produce
    if (name.includes('apple') || name.includes('orange') || name.includes('banana')) {
      return 'pcs';
    }

    return 'pcs'; // Default
  };

  const getDefaultCategory = (
    ingredientName: string
  ): 'protein' | 'vegetables' | 'fruits' | 'grains' | 'dairy' | 'other' => {
    const name = ingredientName.toLowerCase();

    // Proteins
    if (
      name.includes('chicken') ||
      name.includes('fish') ||
      name.includes('salmon') ||
      name.includes('eggs') ||
      name.includes('tofu') ||
      name.includes('beans')
    ) {
      return 'protein';
    }

    // Vegetables
    if (
      name.includes('spinach') ||
      name.includes('broccoli') ||
      name.includes('peppers') ||
      name.includes('tomatoes') ||
      name.includes('carrots') ||
      name.includes('onions')
    ) {
      return 'vegetables';
    }

    // Fruits
    if (
      name.includes('orange') ||
      name.includes('banana') ||
      name.includes('apple') ||
      name.includes('berries') ||
      name.includes('avocado')
    ) {
      return 'fruits';
    }

    // Grains
    if (
      name.includes('rice') ||
      name.includes('quinoa') ||
      name.includes('oats') ||
      name.includes('bread') ||
      name.includes('grain')
    ) {
      return 'grains';
    }

    // Dairy
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
      return 'dairy';
    }

    return 'other';
  };

  const getRecipeSearchQuery = (rec: NutritionRecommendation): string => {
    const title = rec.title.toLowerCase();

    if (title.includes('fiber')) return 'high fiber';
    if (title.includes('protein')) return 'high protein';
    if (title.includes('vegetable')) return 'vegetables';

    return 'healthy';
  };

  const getSuggestedIngredientsFromRecommendation = (
    rec: NutritionRecommendation
  ): Ingredient[] => {
    // Extract suggested ingredients based on the recommendation type
    const suggestedIngredients: Ingredient[] = [];

    // Get the main ingredient from the recommendation
    const mainIngredient = extractIngredientFromRecommendation(rec);

    // Create a base ingredient object with larger quantity to make it prominent
    const baseIngredient: Ingredient = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: mainIngredient,
      category: getDefaultCategory(mainIngredient),
      quantity: getMainIngredientQuantity(mainIngredient), // Larger quantity for main ingredient
      unit: getDefaultUnit(mainIngredient),
      isProtein: getDefaultCategory(mainIngredient) === 'protein',
      isVegetarian: !['chicken', 'fish', 'salmon', 'beef', 'pork'].some(meat =>
        mainIngredient.toLowerCase().includes(meat)
      ),
      isVegan: ![
        'chicken',
        'fish',
        'salmon',
        'beef',
        'pork',
        'milk',
        'cheese',
        'yogurt',
        'eggs',
      ].some(item => mainIngredient.toLowerCase().includes(item)),
      isGlutenFree: !['bread', 'wheat', 'flour', 'pasta'].some(gluten =>
        mainIngredient.toLowerCase().includes(gluten)
      ),
      isDairyFree: !['milk', 'cheese', 'yogurt', 'butter'].some(dairy =>
        mainIngredient.toLowerCase().includes(dairy)
      ),
      purchaseDate: new Date(),
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      storageLocation: 'pantry',
      notes: `Main ingredient suggested by AI Nutritionist: ${rec.title}`,
      isRunningLow: false,
      isExpiring: false,
    };

    suggestedIngredients.push(baseIngredient);

    // Add ONLY 2-3 complementary ingredients to keep focus on main ingredient
    const title = rec.title.toLowerCase();

    if (title.includes('protein')) {
      // Add minimal complementary ingredients for protein recipes
      const complementaryIngredients = [
        { name: 'onions', category: 'vegetables' as const, quantity: 1, unit: 'medium' },
        { name: 'garlic', category: 'vegetables' as const, quantity: 2, unit: 'cloves' },
      ];

      complementaryIngredients.forEach(comp => {
        suggestedIngredients.push({
          ...baseIngredient,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: comp.name,
          category: comp.category,
          quantity: comp.quantity,
          unit: comp.unit,
          notes: `Complementary ingredient for ${mainIngredient}`,
        });
      });
    } else if (title.includes('fiber')) {
      // Add minimal complementary ingredients for high-fiber recipes
      const complementaryIngredients = [
        { name: 'brown rice', category: 'grains' as const, quantity: 1, unit: 'cup' },
        { name: 'sweet potato', category: 'vegetables' as const, quantity: 1, unit: 'medium' },
      ];

      complementaryIngredients.forEach(comp => {
        suggestedIngredients.push({
          ...baseIngredient,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: comp.name,
          category: comp.category,
          quantity: comp.quantity,
          unit: comp.unit,
          notes: `Complementary ingredient for ${mainIngredient}`,
        });
      });
    } else {
      // Add minimal basic ingredients for general recipes
      const basicIngredients = [
        { name: 'onions', category: 'vegetables' as const, quantity: 1, unit: 'medium' },
        { name: 'garlic', category: 'vegetables' as const, quantity: 2, unit: 'cloves' },
      ];

      basicIngredients.forEach(basic => {
        suggestedIngredients.push({
          ...baseIngredient,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: basic.name,
          category: basic.category,
          quantity: basic.quantity,
          unit: basic.unit,
          notes: `Complementary ingredient for ${mainIngredient}`,
        });
      });
    }

    return suggestedIngredients;
  };

  const getMainIngredientQuantity = (ingredientName: string): number => {
    const name = ingredientName.toLowerCase();

    // Give larger quantities for main ingredients to make them prominent
    if (name.includes('chicken') || name.includes('fish') || name.includes('salmon')) {
      return 2; // 2 pieces/servings
    }
    if (name.includes('eggs')) {
      return 4; // 4 eggs
    }
    if (name.includes('tofu') || name.includes('beans')) {
      return 1.5; // 1.5 cups
    }
    if (name.includes('spinach') || name.includes('broccoli')) {
      return 2; // 2 cups
    }
    if (name.includes('rice') || name.includes('quinoa')) {
      return 2; // 2 cups
    }
    if (name.includes('milk') || name.includes('yogurt')) {
      return 2; // 2 cups
    }

    return 2; // Default to 2 for prominence
  };

  const addToShoppingList = async () => {
    if (!shoppingItemForm.name) return;

    try {
      const newItem = {
        name: shoppingItemForm.name,
        quantity: shoppingItemForm.quantity,
        unit: shoppingItemForm.unit,
        category: shoppingItemForm.category,
        priority: 'medium' as const,
        estimatedPrice: 3.99,
        notes: 'Added from AI nutritionist recommendation',
      };

      ShoppingListService.addItemToActiveList(newItem);

      // Show success message
      alert(`✅ Added "${pendingShoppingItem}" to your shopping list!`);

      // Close modal
      setShowShoppingListModal(false);
      setPendingShoppingItem(null);
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      alert('❌ Failed to add item to shopping list. Please try again.');
    }
  };

  const getNutritionScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMacroStatusColor = (status: string) => {
    if (status === 'good') return 'text-green-600';
    if (status === 'low' || status === 'high') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'border-l-red-500';
    if (priority === 'medium') return 'border-l-yellow-500';
    return 'border-l-green-500';
  };

  console.log('🔍 AI Nutritionist: Auth status check:', {
    hasUser: !!user,
    hasSubscription: !!subscription,
    subscriptionTier: subscription?.tier,
    ingredientsCount: ingredients.length,
  });

  // Temporary: Allow testing of nutrition features in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasPremiumAccess = subscription?.tier === 'premium' || isDevelopment;

  if (!user || !subscription || (!hasPremiumAccess && subscription.tier === 'free')) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-4">🤖 AI Nutritionist</h3>
          <p className="text-gray-600 mb-4">
            Get personalized nutrition analysis and health recommendations
          </p>

          {/* Show basic pantry stats even for free users */}
          {ingredients.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Your Pantry Overview</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>📦 {ingredients.length} ingredients in your pantry</div>
                <div>🥩 {ingredients.filter(ing => ing.isProtein).length} protein sources</div>
                <div>🥬 {ingredients.filter(ing => ing.isVegetarian).length} vegetarian items</div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-700">
              Premium feature: Upgrade to access AI-powered nutrition insights, meal planning, and
              personalized recommendations
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => (window.location.href = '/dashboard/subscription')}
          >
            Upgrade to Premium
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">🤖 AI Nutritionist</h2>
          <Button onClick={generateWeeklyReport} variant="secondary" className="text-sm">
            📊 Weekly Report
          </Button>
        </div>

        {/* Health Goal Selector */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Health Goal</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HEALTH_GOALS.map(goal => (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedGoal.id === goal.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="font-medium text-sm">{goal.name}</div>
                <div className="text-xs text-gray-600 mt-1">{goal.description}</div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-6">
          <LoadingSkeleton height="h-24" />
          <LoadingSkeleton height="h-24" />
          <LoadingSkeleton height="h-24" />
        </div>
      ) : analysis ? (
        <>
          {/* Overall Nutrition Score */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Overall Nutrition Score</h3>
                <p className="text-sm text-gray-600">Based on your pantry and recent meals</p>
              </div>
              <div
                className={`text-4xl font-bold ${getNutritionScoreColor(analysis.overallScore)}`}
              >
                {analysis.overallScore}/100
              </div>
            </div>
          </Card>

          {/* Macronutrient Balance */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Macronutrient Balance</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(analysis.macronutrientBalance).map(([macro, data]) => (
                <div key={macro} className="text-center">
                  <div className={`text-2xl font-bold ${getMacroStatusColor(data.status)}`}>
                    {data.current}g
                  </div>
                  <div className="text-sm text-gray-600 capitalize">{macro}</div>
                  <div className="text-xs text-gray-500">Target: {data.recommended}g</div>
                  <div className={`text-xs font-medium ${getMacroStatusColor(data.status)}`}>
                    {data.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Micronutrient Gaps */}
          {analysis.micronutrientGaps.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Potential Nutrient Gaps</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.micronutrientGaps.map((nutrient, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                  >
                    {nutrient}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* AI Recommendations */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">AI Recommendations</h3>
            <div className="space-y-4">
              {analysis.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 border-l-4 bg-gray-50 rounded-r-lg ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      {rec.action && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleRecommendationAction(rec)}
                        >
                          {rec.action}
                        </Button>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        rec.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : rec.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {rec.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-6">
          <div className="text-center text-gray-500">
            <p>Add ingredients to your pantry to get personalized nutrition analysis</p>
            <Button onClick={analyzeNutrition} variant="primary" className="mt-4">
              Analyze Nutrition
            </Button>
          </div>
        </Card>
      )}

      {/* Weekly Report Modal/Section */}
      {weeklyReport && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Weekly Nutrition Report</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{weeklyReport.avgCalories}</div>
                <div className="text-sm text-gray-600">Avg Daily Calories</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{weeklyReport.mealsLogged}</div>
                <div className="text-sm text-gray-600">Meals Logged</div>
              </div>
            </div>
            <div className="text-sm text-gray-600">{weeklyReport.insights}</div>
          </div>
        </Card>
      )}

      {/* Shopping List Modal */}
      <Modal
        isOpen={showShoppingListModal}
        onClose={() => {
          setShowShoppingListModal(false);
          setPendingShoppingItem(null);
        }}
        title="Add to Shopping List"
        size="sm"
        footer={
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowShoppingListModal(false);
                setPendingShoppingItem(null);
              }}
              fullWidth
              className="sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={addToShoppingList}
              fullWidth
              className="sm:w-auto order-1 sm:order-2"
            >
              Add to List
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <span className="text-2xl">🛒</span>
            <div>
              <h4 className="font-medium text-blue-900">Add Recommended Ingredient</h4>
              <p className="text-sm text-blue-700">
                Customize the details before adding to your shopping list
              </p>
            </div>
          </div>

          {/* Editable form fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingredient Name
              </label>
              <input
                type="text"
                value={shoppingItemForm.name}
                onChange={e => setShoppingItemForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter ingredient name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={shoppingItemForm.quantity}
                  onChange={e =>
                    setShoppingItemForm(prev => ({
                      ...prev,
                      quantity: parseFloat(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  value={shoppingItemForm.unit}
                  onChange={e => setShoppingItemForm(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pcs">pieces</option>
                  <option value="lbs">pounds</option>
                  <option value="kg">kilograms</option>
                  <option value="L">liters</option>
                  <option value="cup">cups</option>
                  <option value="tbsp">tablespoons</option>
                  <option value="tsp">teaspoons</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={shoppingItemForm.category}
                onChange={e =>
                  setShoppingItemForm(prev => ({ ...prev, category: e.target.value as any }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="protein">🥩 Protein</option>
                <option value="vegetables">🥬 Vegetables</option>
                <option value="fruits">🍎 Fruits</option>
                <option value="grains">🌾 Grains</option>
                <option value="dairy">🥛 Dairy</option>
                <option value="other">📦 Other</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            <p>✅ Will be added to your active shopping list</p>
            <p>✅ Added from AI nutritionist recommendation</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
