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

export default function RecipeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState<RecipeRating | null>(null);
  const [review, setReview] = useState<RecipeReview | null>(null);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadRecipe(id);
    }
  }, [id]);

  const loadRecipe = async (recipeId: string) => {
    try {
      // Load from localStorage (placeholder for future database integration)
      const sources = ['userRecipes', 'recentRecipes'];
      let foundRecipe: Recipe | null = null;

      for (const source of sources) {
        const recipes = JSON.parse(localStorage.getItem(source) || '[]');
        foundRecipe = recipes.find((r: Recipe) => r.id === recipeId);
        if (foundRecipe) break;
      }

      if (foundRecipe) {
        setRecipe(foundRecipe);

        // Load rating and review
        const ratings = JSON.parse(localStorage.getItem('recipeRatings') || '{}');
        const reviews = JSON.parse(localStorage.getItem('recipeReviews') || '{}');

        if (ratings[recipeId]) {
          setRating(ratings[recipeId]);
        }
        if (reviews[recipeId]) {
          setReview(reviews[recipeId]);
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

  const handleSaveRecipe = () => {
    if (recipe) {
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
    }
  };

  const handleStartCooking = () => {
    if (recipe) {
      // Track cooking session (placeholder for future implementation)
      console.log('Starting cooking session for:', recipe.title);

      // For now, just show success message
      alert(`🍳 Happy cooking! Enjoy making ${recipe.title}!`);
    }
  };

  const handleSubmitRating = (newRating: RecipeRating, newReview?: RecipeReview) => {
    if (recipe) {
      // Save rating
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
