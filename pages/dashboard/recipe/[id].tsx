import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AuthGuard from '../../../components/auth/AuthGuard';
import EnhancedRecipeCard from '../../../components/EnhancedRecipeCard';
import RecipeRatingSystem from '../../../components/RecipeRatingSystem';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { Recipe, RecipeRating, RecipeReview } from '../../../types';
import { databaseRecipeService } from '../../../lib/services/databaseRecipeService';
import { databaseRatingsService } from '../../../lib/services/databaseRatingsService';
import { databaseSettingsService } from '../../../lib/services/databaseSettingsService';

export default function RecipeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, supabaseClient } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState<RecipeRating | null>(null);
  const [review, setReview] = useState<RecipeReview | null>(null);

  // Set authenticated client and load recipe when ID is available (client optional for passed data)
  useEffect(() => {
    if (id && typeof id === 'string') {
      // Set authenticated client if available
      if (supabaseClient) {
        databaseRecipeService.setSupabaseClient(supabaseClient);
        databaseRatingsService.setSupabaseClient(supabaseClient);
      }
      // Load the recipe (will use passed data if available, otherwise try database)
      loadRecipe(id);
    }
  }, [id, supabaseClient, router.query.recipeData]);

  const loadRecipe = async (recipeId: string) => {
    try {
      let foundRecipe: Recipe | null = null;

      // Check if recipe data was passed through router query first
      if (router.query.recipeData && typeof router.query.recipeData === 'string') {
        try {
          console.log('Loading recipe from passed data');
          foundRecipe = JSON.parse(router.query.recipeData);
        } catch (parseError) {
          console.warn('Failed to parse passed recipe data:', parseError);
        }
      }

      // Try to load from database if no passed data or parsing failed
      if (!foundRecipe && (await databaseRecipeService.isAvailable())) {
        console.log('Loading recipe from Supabase database');
        const result = await databaseRecipeService.getRecipeById(recipeId);
        if (result.success && result.data) {
          foundRecipe = result.data;
        }
      }

      // Fallback to localStorage if database not available or recipe not found
      if (!foundRecipe) {
        console.log('Loading recipe from localStorage fallback');
        const sources = ['userRecipes', 'recentRecipes'];

        for (const source of sources) {
          const recipes = JSON.parse(localStorage.getItem(source) || '[]');
          foundRecipe = recipes.find((r: Recipe) => r.id === recipeId);
          if (foundRecipe) break;
        }
      }

      if (foundRecipe) {
        setRecipe(foundRecipe);

        // Load rating and review from database first, fallback to localStorage
        if (await databaseRatingsService.isAvailable()) {
          console.log('Loading ratings from Supabase database');
          try {
            const dbRating = await databaseRatingsService.getRecipeRating(recipeId);
            const dbReview = await databaseRatingsService.getRecipeReview(recipeId);

            if (dbRating) setRating(dbRating);
            if (dbReview) setReview(dbReview);
          } catch (error) {
            console.warn('Database rating load failed, using localStorage fallback:', error);
            // Fallback to localStorage
            const ratings = JSON.parse(localStorage.getItem('recipeRatings') || '{}');
            const reviews = JSON.parse(localStorage.getItem('recipeReviews') || '{}');

            if (ratings[recipeId]) setRating(ratings[recipeId]);
            if (reviews[recipeId]) setReview(reviews[recipeId]);
          }
        } else {
          // Not authenticated or database unavailable, use localStorage
          const ratings = JSON.parse(localStorage.getItem('recipeRatings') || '{}');
          const reviews = JSON.parse(localStorage.getItem('recipeReviews') || '{}');

          if (ratings[recipeId]) setRating(ratings[recipeId]);
          if (reviews[recipeId]) setReview(reviews[recipeId]);
        }
      } else {
        // Recipe not found, redirect to recipes page
        router.push('/dashboard/recipes');
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      router.push('/dashboard/recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleServingChange = (newServings: number) => {
    if (recipe) {
      const scaleFactor = newServings / recipe.servings;

      const updatedRecipe: Recipe = {
        ...recipe,
        servings: newServings,
        ingredients: recipe.ingredients.map(ingredient => ({
          ...ingredient,
          amount: Math.round(ingredient.amount * scaleFactor * 100) / 100,
        })),
        nutritionInfo: recipe.nutritionInfo
          ? {
              ...recipe.nutritionInfo,
              calories: Math.round(recipe.nutritionInfo.calories * scaleFactor),
              protein: Math.round(recipe.nutritionInfo.protein * scaleFactor),
              carbs: Math.round(recipe.nutritionInfo.carbs * scaleFactor),
              fat: Math.round(recipe.nutritionInfo.fat * scaleFactor),
              fiber: Math.round(recipe.nutritionInfo.fiber * scaleFactor),
              sugar: Math.round(recipe.nutritionInfo.sugar * scaleFactor),
              sodium: Math.round(recipe.nutritionInfo.sodium * scaleFactor),
              cholesterol: Math.round(recipe.nutritionInfo.cholesterol * scaleFactor),
            }
          : undefined,
      };

      setRecipe(updatedRecipe);
    }
  };

  const handleSaveRecipe = async () => {
    if (recipe) {
      try {
        // Try to save to database first
        if (await databaseRecipeService.isAvailable()) {
          console.log('Saving recipe to Supabase database');
          const saveResult = await databaseRecipeService.saveRecipe(recipe, user?.id || '');

          if (saveResult.success) {
            // Add to recent items
            await databaseSettingsService.addRecentItem('recipe', recipe.id, recipe);
            console.log('Recipe saved to database successfully');
            return;
          }
        }

        // Fallback to localStorage
        console.log('Saving recipe to localStorage fallback');
        const userRecipes = JSON.parse(localStorage.getItem('userRecipes') || '[]');
        const isAlreadySaved = userRecipes.some((r: Recipe) => r.id === recipe.id);

        if (!isAlreadySaved) {
          userRecipes.push(recipe);
          localStorage.setItem('userRecipes', JSON.stringify(userRecipes));
        }

        // Add to favorites
        const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
        if (!favorites.includes(recipe.id)) {
          favorites.push(recipe.id);
          localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
        }
      } catch (error) {
        console.error('Error saving recipe:', error);
        // Still fallback to localStorage on error
        const userRecipes = JSON.parse(localStorage.getItem('userRecipes') || '[]');
        const isAlreadySaved = userRecipes.some((r: Recipe) => r.id === recipe.id);

        if (!isAlreadySaved) {
          userRecipes.push(recipe);
          localStorage.setItem('userRecipes', JSON.stringify(userRecipes));
        }

        const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
        if (!favorites.includes(recipe.id)) {
          favorites.push(recipe.id);
          localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
        }
      }
    }
  };

  const handleStartCooking = async () => {
    if (!recipe) return;

    try {
      console.log('Starting cooking session for:', recipe.title);

      // First, check if we have enough ingredients in pantry
      const { getIngredientService } = await import(
        '../../../lib/services/ingredientServiceFactory'
      );
      const pantryService = await getIngredientService();

      // Prompt user about servings and confirm ingredient deduction
      const servingsInput = prompt(
        `How many servings are you cooking? (Recipe makes ${recipe.servings} servings)`,
        recipe.servings.toString()
      );
      if (!servingsInput) return; // User cancelled

      const servingsCooked = parseInt(servingsInput) || recipe.servings;

      const confirmDeduction = confirm(
        `This will deduct ingredients from your pantry inventory for ${servingsCooked} serving(s). Make sure your pantry quantities are accurate before proceeding. Continue?`
      );
      if (!confirmDeduction) return; // User cancelled

      // Deduct ingredients from pantry
      const deductionResult = await pantryService.deductIngredientsForRecipe(
        recipe.ingredients,
        servingsCooked
      );

      if (deductionResult.insufficientItems.length > 0) {
        const insufficientList = deductionResult.insufficientItems
          .map(
            item => `${item.ingredient}: need ${item.required} ${item.unit}, have ${item.available}`
          )
          .join('\n');

        alert(
          `⚠️ Insufficient ingredients in pantry:\n\n${insufficientList}\n\nPlease update your pantry quantities or add missing ingredients before cooking.`
        );
        return;
      }

      // If successful, show deduction summary
      if (deductionResult.deductions.length > 0) {
        const deductionSummary = deductionResult.deductions
          .map(d => `${d.ingredient}: used ${d.deducted} ${d.unit}, ${d.remaining} remaining`)
          .join('\n');

        alert(
          `🍳 Cooking started! Ingredients deducted from pantry:\n\n${deductionSummary}\n\nEnjoy cooking ${recipe.title}!`
        );
      }

      // Track cooking session
      console.log('Cooking session started successfully');
    } catch (error) {
      console.error('Error starting cooking session:', error);
      alert('Failed to start cooking session. Please try again.');
    }
  };

  const handleSubmitRating = async (newRating: RecipeRating, newReview?: RecipeReview) => {
    if (recipe) {
      // Try to save to database first
      if (await databaseRatingsService.isAvailable()) {
        console.log('Saving rating to Supabase database');
        try {
          const success = await databaseRatingsService.saveRecipeRatingAndReview(
            recipe.id,
            newRating,
            newReview
          );

          if (success) {
            setRating(newRating);
            if (newReview) setReview(newReview);
            setShowRatingModal(false);
            return;
          }
        } catch (error) {
          console.warn('Database rating save failed, falling back to localStorage:', error);
        }
      }

      // Fallback to localStorage
      console.log('Saving rating to localStorage fallback');
      const ratings = JSON.parse(localStorage.getItem('recipeRatings') || '{}');
      ratings[recipe.id] = newRating;
      localStorage.setItem('recipeRatings', JSON.stringify(ratings));
      setRating(newRating);

      // Save review if provided
      if (newReview) {
        const reviews = JSON.parse(localStorage.getItem('recipeReviews') || '{}');
        reviews[recipe.id] = newReview;
        localStorage.setItem('recipeReviews', JSON.stringify(reviews));
        setReview(newReview);
      }

      setShowRatingModal(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard requireAuth={false}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading recipe...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (!recipe) {
    return (
      <AuthGuard requireAuth={false}>
        <DashboardLayout>
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Recipe Not Found</h2>
            <p className="text-gray-600 mb-6">
              The recipe you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/dashboard/recipes">
              <button className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium">
                Back to Recipes
              </button>
            </Link>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={false}>
      <Head>
        <title>{recipe.title} - Pantry Buddy Pro</title>
        <meta name="description" content={recipe.description} />
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-orange-600">
              Dashboard
            </Link>
            <span>→</span>
            <Link href="/dashboard/recipes" className="hover:text-orange-600">
              Recipes
            </Link>
            <span>→</span>
            <span className="text-gray-900 font-medium">{recipe.title}</span>
          </nav>

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
              <p className="text-gray-600">{recipe.description}</p>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard/recipes">
                <button className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                  ← Back to Recipes
                </button>
              </Link>
            </div>
          </div>

          {/* Recipe Card */}
          <EnhancedRecipeCard
            recipe={recipe}
            onServingChange={handleServingChange}
            onSaveRecipe={handleSaveRecipe}
            onStartCooking={handleStartCooking}
            onOpenRatingModal={() => setShowRatingModal(true)}
          />

          {/* Rating and Review Section */}
          {(rating || review) && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Rating & Review</h3>

              {rating && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span
                          key={star}
                          className={`text-lg ${
                            star <= rating.overallRating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      Rated on {new Date(rating.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Taste:</span>
                      <span className="ml-1 font-medium">{rating.tasteRating}/5</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Difficulty:</span>
                      <span className="ml-1 font-medium">{rating.difficultyAccuracy}/5</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Overall:</span>
                      <span className="ml-1 font-medium">{rating.overallRating}/5</span>
                    </div>
                  </div>
                </div>
              )}

              {review && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Your Review</h4>
                  <p className="text-gray-700">{review.reviewText}</p>
                  {review.modifications && review.modifications.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-800 mb-1">
                        Modifications Made:
                      </h5>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {review.modifications.map((mod, index) => (
                          <li key={index}>{mod}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowRatingModal(true)}
                className="mt-4 text-orange-600 hover:text-orange-700 font-medium text-sm"
              >
                Update Rating & Review
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/create-recipe">
              <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-medium">
                🎲 Create Similar Recipe
              </button>
            </Link>
            <button
              onClick={() => setShowRatingModal(true)}
              className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
            >
              ⭐ Rate This Recipe
            </button>
          </div>
        </div>

        {/* Rating Modal */}
        {showRatingModal && recipe && (
          <RecipeRatingSystem
            recipe={recipe}
            userSubscription="free" // Placeholder
            existingRating={rating || undefined}
            existingReview={review || undefined}
            onSubmitRating={handleSubmitRating}
            onClose={() => setShowRatingModal(false)}
          />
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
