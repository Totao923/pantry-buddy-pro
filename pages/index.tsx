import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SmartPantry from '../components/SmartPantry';
import AdvancedCuisineSelector from '../components/AdvancedCuisineSelector';
import EnhancedRecipeCard from '../components/EnhancedRecipeCard';
import PremiumDashboard from '../components/PremiumDashboard';
import PantryInventoryManager from '../components/PantryInventoryManager';
import RecipeRatingSystem from '../components/RecipeRatingSystem';
import MigrationBanner from '../components/migration/MigrationBanner';
import AuthGuard, { UserMenu } from '../components/auth/AuthGuard';
import { AdvancedRecipeEngine } from '../lib/advancedRecipeEngine';
import { aiService } from '../lib/ai/aiService';
import { useAuth } from '../lib/auth/AuthProvider';
import { isAuthEnabled } from '../lib/config/environment';
import { Ingredient, Recipe, CuisineType, SubscriptionTier, User, AppState, PantryInventory, IngredientCategory, RecipeRating, RecipeReview } from '../types';

export default function Home() {
  const authEnabled = isAuthEnabled();
  const auth = authEnabled ? useAuth() : { user: null, loading: false };
  const [appState, setAppState] = useState<AppState>({
    ingredients: [],
    selectedCuisine: 'any',
    generatedRecipes: [],
    currentRecipe: undefined,
    user: {
      id: '1',
      email: 'user@example.com',
      name: 'Chef User',
      preferences: {
        dietaryRestrictions: [],
        favoritesCuisines: ['italian', 'asian'],
        allergies: [],
        spiceLevel: 'medium',
        cookingTime: 'medium',
        servingSize: 4,
        budgetRange: 'medium'
      },
      subscription: 'free',
      savedRecipes: [],
      mealPlans: [],
      pantry: [],
      cookingHistory: [],
      achievements: []
    },
    isLoading: false,
    error: undefined
  });

  const [showDashboard, setShowDashboard] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [recipeRatings, setRecipeRatings] = useState<Record<string, RecipeRating>>({});
  const [recipeReviews, setRecipeReviews] = useState<Record<string, RecipeReview>>({});
  const [aiStatus, setAiStatus] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading');
  const [cookingPreferences, setCookingPreferences] = useState({
    spiceLevel: 'medium' as 'mild' | 'medium' | 'hot' | 'extra-hot',
    maxTime: 60,
    difficulty: 'any',
    experienceLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert'
  });

  const [pantryInventory, setPantryInventory] = useState<PantryInventory>({
    id: 'user-pantry-1',
    userId: '1',
    items: [],
    totalItems: 0,
    categoryCounts: {
      protein: 0,
      vegetables: 0,
      fruits: 0,
      grains: 0,
      dairy: 0,
      spices: 0,
      herbs: 0,
      oils: 0,
      pantry: 0,
      other: 0
    },
    expiringItems: [],
    lowStockItems: [],
    lastUpdated: new Date()
  });

  useEffect(() => {
    // Load user data from localStorage or API
    const savedState = localStorage.getItem('pantryBuddyState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setAppState(prev => ({ ...prev, ...parsed }));
    }
    
    const savedInventory = localStorage.getItem('pantryInventory');
    if (savedInventory) {
      const parsed = JSON.parse(savedInventory);
      // Convert date strings back to Date objects
      const inventory = {
        ...parsed,
        lastUpdated: new Date(parsed.lastUpdated),
        items: parsed.items.map((item: any) => ({
          ...item,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : undefined,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          lastUsedDate: item.lastUsedDate ? new Date(item.lastUsedDate) : undefined
        }))
      };
      setPantryInventory(inventory);
    }

    // Load ratings and reviews
    const savedRatings = localStorage.getItem('recipeRatings');
    if (savedRatings) {
      const ratings = JSON.parse(savedRatings);
      // Convert date strings back to Date objects
      const parsedRatings = Object.fromEntries(
        Object.entries(ratings).map(([key, rating]: [string, any]) => [
          key,
          {
            ...rating,
            createdAt: new Date(rating.createdAt),
            updatedAt: new Date(rating.updatedAt)
          }
        ])
      );
      setRecipeRatings(parsedRatings);
    }

    const savedReviews = localStorage.getItem('recipeReviews');
    if (savedReviews) {
      const reviews = JSON.parse(savedReviews);
      // Convert date strings back to Date objects
      const parsedReviews = Object.fromEntries(
        Object.entries(reviews).map(([key, review]: [string, any]) => [
          key,
          {
            ...review,
            createdAt: new Date(review.createdAt),
            updatedAt: new Date(review.updatedAt),
            rating: {
              ...review.rating,
              createdAt: new Date(review.rating.createdAt),
              updatedAt: new Date(review.rating.updatedAt)
            }
          }
        ])
      );
      setRecipeReviews(parsedReviews);
    }

    // Initialize AI service and check status
    aiService.initialize().then(() => {
      aiService.getUsageStats(appState.user.id).then((stats) => {
        setAiStatus(stats.aiEnabled ? 'enabled' : 'disabled');
      });
    }).catch(() => {
      setAiStatus('error');
    });
  }, []);

  const saveAppState = (newState: AppState) => {
    setAppState(newState);
    localStorage.setItem('pantryBuddyState', JSON.stringify({
      ingredients: newState.ingredients,
      selectedCuisine: newState.selectedCuisine,
      user: newState.user
    }));
  };

  const handleAddIngredient = (ingredient: Ingredient) => {
    const newState = {
      ...appState,
      ingredients: [...appState.ingredients, ingredient]
    };
    saveAppState(newState);
  };

  const handleRemoveIngredient = (id: string) => {
    const newState = {
      ...appState,
      ingredients: appState.ingredients.filter(ing => ing.id !== id)
    };
    saveAppState(newState);
  };

  const handleUpdateIngredient = (ingredient: Ingredient) => {
    const newState = {
      ...appState,
      ingredients: appState.ingredients.map(ing => 
        ing.id === ingredient.id ? ingredient : ing
      )
    };
    saveAppState(newState);
  };

  const handleCuisineSelect = (cuisine: CuisineType) => {
    const newState = {
      ...appState,
      selectedCuisine: cuisine
    };
    saveAppState(newState);
  };

  const generateAdvancedRecipe = async () => {
    if (appState.ingredients.length === 0) {
      setAppState(prev => ({
        ...prev,
        error: 'Please add at least one ingredient to generate a recipe!'
      }));
      return;
    }

    setAppState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      // First try AI service
      const aiResponse = await aiService.generateRecipe({
        ingredients: appState.ingredients,
        cuisine: appState.selectedCuisine,
        servings: appState.user.preferences.servingSize,
        preferences: {
          maxTime: cookingPreferences.maxTime,
          difficulty: cookingPreferences.difficulty !== 'any' ? cookingPreferences.difficulty as any : undefined,
          spiceLevel: cookingPreferences.spiceLevel,
          experienceLevel: cookingPreferences.experienceLevel,
          dietary: appState.user.preferences.dietaryRestrictions,
          allergens: appState.user.preferences.allergies
        },
        userHistory: {
          favoriteRecipes: appState.user.savedRecipes,
          cookingFrequency: appState.user.preferences.cookingTime === 'quick' ? 'daily' : 
                           appState.user.preferences.cookingTime === 'medium' ? 'weekly' : 'occasional'
        }
      }, appState.user.id);

      let recipe: Recipe;

      if (aiResponse.success && aiResponse.recipe) {
        recipe = aiResponse.recipe;
        
        // Show AI success message briefly
        if (aiResponse.metadata?.provider !== 'fallback') {
          console.log(`Recipe generated using AI (${aiResponse.metadata?.provider})`);
        }
      } else {
        // Fallback to original engine if AI fails
        console.log('AI generation failed, using fallback engine:', aiResponse.error);
        recipe = await AdvancedRecipeEngine.generateAdvancedRecipe(
          appState.ingredients,
          appState.selectedCuisine,
          appState.user.preferences.servingSize,
          {
            maxTime: cookingPreferences.maxTime,
            difficulty: cookingPreferences.difficulty !== 'any' ? cookingPreferences.difficulty as any : undefined,
            spiceLevel: cookingPreferences.spiceLevel,
            experienceLevel: cookingPreferences.experienceLevel
          }
        );
      }

      setAppState(prev => ({
        ...prev,
        currentRecipe: recipe,
        generatedRecipes: [recipe, ...prev.generatedRecipes.slice(0, 9)], // Keep last 10
        isLoading: false
      }));
    } catch (error) {
      console.error('Recipe generation failed:', error);
      setAppState(prev => ({
        ...prev,
        error: 'Failed to generate recipe. Please try again.',
        isLoading: false
      }));
    }
  };

  const handleServingChange = async (newServings: number) => {
    if (appState.currentRecipe) {
      // For serving changes, we'll use a simpler scaling approach
      // rather than regenerating the entire recipe
      const scaleFactor = newServings / appState.currentRecipe.servings;
      
      const updatedRecipe: Recipe = {
        ...appState.currentRecipe,
        servings: newServings,
        ingredients: appState.currentRecipe.ingredients.map(ingredient => ({
          ...ingredient,
          amount: Math.round(ingredient.amount * scaleFactor * 100) / 100 // Round to 2 decimal places
        })),
        nutritionInfo: appState.currentRecipe.nutritionInfo ? {
          ...appState.currentRecipe.nutritionInfo,
          calories: Math.round(appState.currentRecipe.nutritionInfo.calories * scaleFactor),
          protein: Math.round(appState.currentRecipe.nutritionInfo.protein * scaleFactor),
          carbs: Math.round(appState.currentRecipe.nutritionInfo.carbs * scaleFactor),
          fat: Math.round(appState.currentRecipe.nutritionInfo.fat * scaleFactor),
          fiber: Math.round(appState.currentRecipe.nutritionInfo.fiber * scaleFactor),
          sugar: Math.round(appState.currentRecipe.nutritionInfo.sugar * scaleFactor),
          sodium: Math.round(appState.currentRecipe.nutritionInfo.sodium * scaleFactor),
          cholesterol: Math.round(appState.currentRecipe.nutritionInfo.cholesterol * scaleFactor)
        } : undefined
      };

      setAppState(prev => ({
        ...prev,
        currentRecipe: updatedRecipe
      }));
    }
  };

  const handleSaveRecipe = (recipe: Recipe) => {
    const newState = {
      ...appState,
      user: {
        ...appState.user,
        savedRecipes: [...appState.user.savedRecipes, recipe.id]
      }
    };
    saveAppState(newState);
  };

  const handleStartCooking = (recipe: Recipe) => {
    // Track cooking session
    console.log('Starting cooking session for:', recipe.title);
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    const newState = {
      ...appState,
      user: {
        ...appState.user,
        subscription: tier
      }
    };
    saveAppState(newState);
  };

  const handleUpdateInventory = (inventory: PantryInventory) => {
    setPantryInventory(inventory);
    localStorage.setItem('pantryInventory', JSON.stringify(inventory));
    
    // Update expiring and low stock items
    const updatedInventory = {
      ...inventory,
      expiringItems: inventory.items.filter(item => {
        if (!item.expiryDate) return false;
        const daysUntilExpiry = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
      }),
      lowStockItems: inventory.items.filter(item => item.isRunningLow)
    };
    
    if (updatedInventory.expiringItems.length !== inventory.expiringItems.length || 
        updatedInventory.lowStockItems.length !== inventory.lowStockItems.length) {
      setPantryInventory(updatedInventory);
      localStorage.setItem('pantryInventory', JSON.stringify(updatedInventory));
    }
  };

  const handleSubmitRating = (rating: RecipeRating, review?: RecipeReview) => {
    setRecipeRatings(prev => ({
      ...prev,
      [rating.recipeId]: rating
    }));
    
    if (review) {
      setRecipeReviews(prev => ({
        ...prev,
        [review.recipeId]: review
      }));
    }

    // Save to localStorage
    localStorage.setItem('recipeRatings', JSON.stringify({
      ...recipeRatings,
      [rating.recipeId]: rating
    }));
    
    if (review) {
      localStorage.setItem('recipeReviews', JSON.stringify({
        ...recipeReviews,
        [review.recipeId]: review
      }));
    }

    setShowRatingModal(false);
  };

  const getStepNumber = () => {
    if (appState.ingredients.length === 0) return 1;
    if (!appState.selectedCuisine || appState.selectedCuisine === 'any') return 2;
    return 3;
  };

  return (
    <>
      <Head>
        <title>Pantry Buddy - Advanced AI Recipe Generator</title>
        <meta name="description" content="Transform your pantry ingredients into restaurant-quality recipes with advanced AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Advanced Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">🧑‍🍳</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Pantry Buddy Pro
                  </h1>
                  <p className="text-sm text-gray-600">AI-Powered Culinary Assistant</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>{appState.ingredients.length} ingredients</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>{appState.generatedRecipes.length} recipes</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className={`w-2 h-2 rounded-full ${
                      aiStatus === 'enabled' ? 'bg-green-500' :
                      aiStatus === 'disabled' ? 'bg-yellow-500' :
                      aiStatus === 'error' ? 'bg-red-500' :
                      'bg-gray-400 animate-pulse'
                    }`}></span>
                    <span>AI {aiStatus === 'loading' ? 'initializing' : aiStatus}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowInventory(!showInventory)}
                  className="px-4 py-2 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <span className="text-lg">🏺</span>
                  <span className="hidden md:inline">Inventory</span>
                  {pantryInventory.totalItems > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-5 text-center">
                      {pantryInventory.totalItems}
                    </span>
                  )}
                </button>
                
                <button 
                  onClick={() => setShowDashboard(!showDashboard)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    appState.user.subscription === 'free'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                      : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                  }`}
                >
                  <span className="text-lg">
                    {appState.user.subscription === 'free' ? '⭐' : '👑'}
                  </span>
                  {appState.user.subscription === 'free' ? 'Upgrade' : 'Premium'}
                </button>
                
                {authEnabled ? (
                  <UserMenu />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Migration Banner */}
        {authEnabled && <MigrationBanner />}

        {/* Dashboard Modal */}
        {showDashboard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen py-8">
              <div className="relative">
                <button 
                  onClick={() => setShowDashboard(false)}
                  className="absolute top-4 right-8 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
                >
                  ✕
                </button>
                <PremiumDashboard 
                  userSubscription={appState.user.subscription}
                  onUpgrade={handleUpgrade}
                  mealPlans={appState.user.mealPlans}
                  achievements={appState.user.achievements}
                  cookingHistory={appState.user.cookingHistory}
                />
              </div>
            </div>
          </div>
        )}

        {/* Pantry Inventory Modal */}
        {showInventory && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen py-8 px-4">
              <div className="relative max-w-6xl mx-auto">
                <button 
                  onClick={() => setShowInventory(false)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
                >
                  ✕
                </button>
                <PantryInventoryManager
                  pantryInventory={pantryInventory}
                  userSubscription={appState.user.subscription}
                  onUpdateInventory={handleUpdateInventory}
                  onUpgradePrompt={() => {
                    setShowInventory(false);
                    setShowDashboard(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recipe Rating Modal */}
        {showRatingModal && appState.currentRecipe && (
          <RecipeRatingSystem
            recipe={appState.currentRecipe}
            userSubscription={appState.user.subscription}
            existingRating={recipeRatings[appState.currentRecipe.id]}
            existingReview={recipeReviews[appState.currentRecipe.id]}
            onSubmitRating={handleSubmitRating}
            onClose={() => setShowRatingModal(false)}
          />
        )}

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Enhanced Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Advanced AI Recipe Engine
            </div>
            
            <h2 className="text-5xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Transform Your Kitchen Into a<br />
              <span className="text-6xl">Culinary Studio</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed">
              Our advanced AI analyzes your ingredients, dietary preferences, and cooking style to create 
              restaurant-quality recipes that are perfectly tailored to you. From simple weeknight dinners 
              to impressive dinner party dishes.
            </p>
            
            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-16">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  50K+
                </div>
                <div className="text-gray-600 font-medium">Recipes Generated</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  15+
                </div>
                <div className="text-gray-600 font-medium">Global Cuisines</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  99.2%
                </div>
                <div className="text-gray-600 font-medium">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  4.9★
                </div>
                <div className="text-gray-600 font-medium">User Rating</div>
              </div>
            </div>

            {/* Error Display */}
            {appState.error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 max-w-2xl mx-auto">
                {appState.error}
              </div>
            )}
          </div>

          {/* Progressive App Interface */}
          <div className="space-y-12">
            {/* Step 1: Smart Pantry */}
            <div className={`transition-all duration-500 ${getStepNumber() >= 1 ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all ${
                  getStepNumber() >= 1 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Smart Pantry Management</h3>
                  <p className="text-gray-600">Add and organize your ingredients with AI-powered suggestions</p>
                </div>
              </div>
              <SmartPantry
                ingredients={appState.ingredients}
                onAddIngredient={handleAddIngredient}
                onRemoveIngredient={handleRemoveIngredient}
                onUpdateIngredient={handleUpdateIngredient}
              />
            </div>

            {/* Step 2: Advanced Cuisine Selection */}
            {appState.ingredients.length > 0 && (
              <div className={`transition-all duration-500 ${getStepNumber() >= 2 ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-all ${
                    getStepNumber() >= 2 
                      ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Culinary Preferences</h3>
                    <p className="text-gray-600">Select cuisine style and customize your cooking preferences</p>
                  </div>
                </div>
                <AdvancedCuisineSelector
                  selectedCuisine={appState.selectedCuisine}
                  onCuisineSelect={handleCuisineSelect}
                  onPreferencesChange={setCookingPreferences}
                />
              </div>
            )}

            {/* Step 3: Recipe Generation */}
            {appState.ingredients.length > 0 && appState.selectedCuisine && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg">
                    3
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-gray-800">AI Recipe Generation</h3>
                    <p className="text-gray-600">Create your perfect recipe with advanced AI</p>
                  </div>
                </div>
                
                <button
                  onClick={generateAdvancedRecipe}
                  disabled={appState.isLoading}
                  className="group relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-12 py-6 rounded-2xl font-bold text-xl hover:shadow-2xl transition-all disabled:opacity-50 shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative flex items-center gap-3">
                    {appState.isLoading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {aiStatus === 'enabled' ? 'AI Crafting Your Recipe...' : 'Crafting Your Perfect Recipe...'}
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">{aiStatus === 'enabled' ? '🤖' : '⚡'}</span>
                        {aiStatus === 'enabled' ? 'Generate AI Recipe' : 'Generate Smart Recipe'}
                      </>
                    )}
                  </span>
                </button>
              </div>
            )}

            {/* Enhanced Recipe Display */}
            {appState.currentRecipe && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg">
                    ✨
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">Your Gourmet Creation</h3>
                    <p className="text-gray-600">AI-crafted recipe tailored to your ingredients and preferences</p>
                  </div>
                </div>
                
                <EnhancedRecipeCard 
                  recipe={appState.currentRecipe} 
                  onServingChange={handleServingChange}
                  onSaveRecipe={handleSaveRecipe}
                  onStartCooking={handleStartCooking}
                  onOpenRatingModal={() => setShowRatingModal(true)}
                />
                
                {/* Recipe Actions */}
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={generateAdvancedRecipe}
                    className="px-8 py-3 bg-white text-blue-600 rounded-xl border-2 border-blue-600 hover:bg-blue-50 transition-colors font-semibold shadow-lg"
                  >
                    🎲 Generate Another Recipe
                  </button>
                  <button 
                    onClick={() => handleSaveRecipe(appState.currentRecipe!)}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all font-semibold shadow-lg"
                  >
                    💾 Save Recipe
                  </button>
                </div>
              </div>
            )}

            {/* Recent Recipes */}
            {appState.generatedRecipes.length > 1 && (
              <div className="mt-16">
                <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">Recent Creations</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appState.generatedRecipes.slice(1, 4).map((recipe, index) => (
                    <div key={recipe.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all cursor-pointer">
                      <h4 className="text-lg font-bold text-gray-800 mb-2">{recipe.title}</h4>
                      <p className="text-gray-600 text-sm mb-4">{recipe.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>⏱️ {recipe.totalTime}m</span>
                          <span>•</span>
                          <span className="capitalize">{recipe.cuisine}</span>
                        </div>
                        <button 
                          onClick={() => setAppState(prev => ({ ...prev, currentRecipe: recipe }))}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Recipe
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Enhanced Footer */}
        <footer className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 mt-24">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-2xl">🧑‍🍳</span>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Pantry Buddy Pro
                </span>
              </div>
              <p className="text-gray-600 mb-4">
                Transforming home cooking with advanced AI technology
              </p>
              <p className="text-sm text-gray-500">
                &copy; 2024 Pantry Buddy Pro. Crafted with ❤️ for culinary enthusiasts worldwide.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}