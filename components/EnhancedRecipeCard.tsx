import React, { useState } from 'react';
import { Recipe, DifficultyLevel } from '../types';
import CookingTracker from './cooking/CookingTracker';
import { favoritesService } from '../lib/services/favoritesService';

interface EnhancedRecipeCardProps {
  recipe: Recipe;
  onServingChange?: (servings: number) => void;
  onSaveRecipe?: (recipe: Recipe) => void;
  onStartCooking?: (recipe: Recipe) => void;
  onRateRecipe?: (rating: number) => void;
  onOpenRatingModal?: () => void;
  showFavoriteButton?: boolean;
  onAddToCollection?: (recipe: Recipe, collectionId: string) => void;
  showCollectionOption?: boolean;
  showChildFriendlyIndicator?: boolean;
}

export default function EnhancedRecipeCard({
  recipe,
  onServingChange,
  onSaveRecipe,
  onStartCooking,
  onRateRecipe,
  onOpenRatingModal,
  showFavoriteButton = true,
  onAddToCollection,
  showCollectionOption = false,
  showChildFriendlyIndicator = false,
}: EnhancedRecipeCardProps) {
  const [currentServings, setCurrentServings] = useState(recipe.servings);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'nutrition' | 'tips'>(
    'ingredients'
  );
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showNutrition, setShowNutrition] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [showVariations, setShowVariations] = useState(false);

  // Favorite functionality with Supabase + localStorage fallback
  const toggleFavorite = async (recipeId: string) => {
    try {
      // Try Supabase first
      const isAuthenticated = await favoritesService.isAuthenticated();

      if (isAuthenticated) {
        await favoritesService.toggleFavorite(recipeId);
      } else {
        // Fallback to localStorage for unauthenticated users
        const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
        const isFav = favorites.includes(recipeId);

        if (isFav) {
          const updatedFavorites = favorites.filter((id: string) => id !== recipeId);
          localStorage.setItem('favoriteRecipes', JSON.stringify(updatedFavorites));
        } else {
          favorites.push(recipeId);
          localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
        }
      }

      // Force re-render
      setUserRating(prev => prev); // Trigger re-render
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Fallback to localStorage on error
      const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
      const isFav = favorites.includes(recipeId);

      if (isFav) {
        const updatedFavorites = favorites.filter((id: string) => id !== recipeId);
        localStorage.setItem('favoriteRecipes', JSON.stringify(updatedFavorites));
      } else {
        favorites.push(recipeId);
        localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
      }
      setUserRating(prev => prev);
    }
  };

  const isFavorite = (recipeId: string) => {
    // Note: This is synchronous for immediate UI updates
    // For authenticated users, favorites will sync in background
    const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
    return favorites.includes(recipeId);
  };

  const handleServingChange = (newServings: number) => {
    if (newServings >= 1 && newServings <= 20) {
      setCurrentServings(newServings);
      onServingChange?.(newServings);
    }
  };

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps(prev =>
      prev.includes(stepNumber) ? prev.filter(step => step !== stepNumber) : [...prev, stepNumber]
    );
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    const colors = {
      Beginner: 'bg-green-100 text-green-800 border-green-200',
      Easy: 'bg-blue-100 text-blue-800 border-blue-200',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Hard: 'bg-orange-100 text-orange-800 border-orange-200',
      Expert: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[difficulty] || colors['Medium'];
  };

  const getDifficultyIcon = (difficulty: DifficultyLevel) => {
    const icons = {
      Beginner: '🌱',
      Easy: '⭐',
      Medium: '⭐⭐',
      Hard: '⭐⭐⭐',
      Expert: '👨‍🍳',
    };
    return icons[difficulty] || icons['Medium'];
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return [...Array(5)].map((_, index) => (
      <button
        key={index}
        className={`text-xl ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        } ${interactive ? 'hover:text-yellow-400 cursor-pointer' : 'cursor-default'}`}
        onClick={
          interactive
            ? () => {
                setUserRating(index + 1);
                onRateRecipe?.(index + 1);
              }
            : undefined
        }
        disabled={!interactive}
      >
        ⭐
      </button>
    ));
  };

  const scaledIngredients = recipe.ingredients.map(ingredient => ({
    ...ingredient,
    amount: (ingredient.amount * currentServings) / recipe.servings,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-full max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 md:p-8">
        <div className="absolute top-4 right-4 flex gap-2">
          {showFavoriteButton && (
            <button
              onClick={() => toggleFavorite(recipe.id)}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite(recipe.id)
                  ? 'text-red-500 bg-white/20 hover:bg-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/20'
              }`}
              title={isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              ♥
            </button>
          )}
          <button
            onClick={() => onSaveRecipe?.(recipe)}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
          {showCollectionOption && (
            <button
              onClick={() => {
                // This would open a collection selection modal/dropdown
                console.log('Add to collection clicked');
              }}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              title="Add to Family Collection"
            >
              📚
            </button>
          )}
          <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
          </button>
        </div>

        <div className="pr-16 md:pr-20">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{recipe.title}</h1>
          <p className="text-blue-100 text-base md:text-lg mb-4">{recipe.description}</p>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4">
            <div
              className={`px-3 py-1 rounded-full border font-medium ${getDifficultyColor(recipe.difficulty)}`}
            >
              <span className="mr-1">{getDifficultyIcon(recipe.difficulty)}</span>
              {recipe.difficulty}
            </div>
            <div className="flex items-center gap-1 text-blue-100">
              <span className="text-lg">🍽️</span>
              <span className="font-medium capitalize">{recipe.cuisine}</span>
            </div>
            <div className="flex items-center gap-1 text-blue-100">
              <span className="text-lg">⏱️</span>
              <span className="font-medium">{formatTime(recipe.totalTime)}</span>
            </div>
            {showChildFriendlyIndicator && recipe.isChildFriendly && (
              <div className="px-3 py-1 bg-white/20 rounded-full border border-white/30 font-medium">
                <span className="text-lg mr-1">👶</span>
                Kid-Friendly
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {renderStars(recipe.rating || 0)}
              <span className="text-blue-100 text-sm">({recipe.reviews || 0} reviews)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Servings Control */}
      <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-800">Servings:</h3>
            <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2">
              <button
                onClick={() => handleServingChange(currentServings - 1)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 touch-manipulation"
                disabled={currentServings <= 1}
              >
                -
              </button>
              <span className="w-16 text-center font-bold text-lg">{currentServings}</span>
              <button
                onClick={() => handleServingChange(currentServings + 1)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 touch-manipulation"
                disabled={currentServings >= 20}
              >
                +
              </button>
            </div>
          </div>

          {/* Cooking Tracker replaces Start Cooking button */}
          <CookingTracker recipe={recipe} showDetailedButton={true} />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'ingredients', label: 'Ingredients', icon: '🧄' },
            { id: 'instructions', label: 'Instructions', icon: '📋' },
            { id: 'nutrition', label: 'Nutrition', icon: '📊' },
            { id: 'tips', label: 'Tips & Tricks', icon: '💡' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeTab === 'ingredients' && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Ingredients</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {scaledIngredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-lg">🥄</span>
                    </div>
                    <span className="font-medium text-gray-800 capitalize">{ingredient.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-600">
                      {ingredient.amount % 1 === 0
                        ? ingredient.amount
                        : ingredient.amount.toFixed(1)}{' '}
                      {ingredient.unit}
                    </span>
                    {ingredient.optional && <div className="text-xs text-gray-500">Optional</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Step-by-Step Instructions</h3>
              <div className="text-sm text-gray-600">
                {completedSteps.length}/{recipe.instructions.length} completed
              </div>
            </div>
            <div className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <div
                  key={index}
                  className={`flex gap-4 p-6 rounded-xl border-2 transition-all ${
                    completedSteps.includes(instruction.step)
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => toggleStep(instruction.step)}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      completedSteps.includes(instruction.step)
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {completedSteps.includes(instruction.step) ? '✓' : instruction.step}
                  </button>
                  <div className="flex-1">
                    <p
                      className={`text-gray-800 leading-relaxed ${
                        completedSteps.includes(instruction.step)
                          ? 'line-through text-gray-500'
                          : ''
                      }`}
                    >
                      {instruction.instruction}
                    </p>
                    {instruction.duration && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-lg">⏲️</span>
                        <span>{instruction.duration} minutes</span>
                        {instruction.temperature && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-lg">🌡️</span>
                            <span>{instruction.temperature}°F</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && recipe.nutritionInfo && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              Nutritional Information (per serving)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(recipe.nutritionInfo).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200"
                >
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {typeof value === 'number' ? Math.round(value) : value}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {key === 'calories' ? 'Calories' : key}
                    {key !== 'calories' && <span className="text-xs ml-1">g</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Dietary Information</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(recipe.dietaryInfo).map(([key, value]) => {
                  if (typeof value === 'boolean' && value) {
                    return (
                      <span
                        key={key}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                      >
                        {key
                          .replace('is', '')
                          .replace(/([A-Z])/g, ' $1')
                          .trim()}
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tips' && (
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-6">Chef's Tips & Techniques</h3>

            {/* Child-Friendly Information */}
            {showChildFriendlyIndicator && recipe.isChildFriendly && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">
                  👶 Child-Friendly Recipe
                </h4>
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600 text-lg">👶</span>
                    <span className="font-medium text-blue-800">Safe for kids</span>
                    {recipe.ageAppropriateFrom && (
                      <span className="text-sm text-blue-600">
                        (Ages {Math.floor(recipe.ageAppropriateFrom / 12)}+ years)
                      </span>
                    )}
                  </div>
                  {recipe.childFriendlyNotes && (
                    <p className="text-blue-700 text-sm mb-3">{recipe.childFriendlyNotes}</p>
                  )}
                  {recipe.allergenInfo && recipe.allergenInfo.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-blue-800">
                        Contains allergens:{' '}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recipe.allergenInfo.map((allergen, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {recipe.tips && recipe.tips.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">💡 Pro Tips</h4>
                <div className="space-y-3">
                  {recipe.tips.map((tip, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200"
                    >
                      <span className="text-yellow-600 text-lg flex-shrink-0">💡</span>
                      <p className="text-gray-800">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recipe.variations && recipe.variations.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-700 mb-4">🔄 Recipe Variations</h4>
                <div className="space-y-4">
                  {recipe.variations.map((variation, index) => (
                    <div
                      key={index}
                      className="p-4 bg-purple-50 rounded-xl border border-purple-200"
                    >
                      <h5 className="font-semibold text-purple-800 mb-2">{variation.name}</h5>
                      <p className="text-gray-700 mb-3">{variation.description}</p>
                      <ul className="space-y-1">
                        {variation.modifications.map((mod, modIndex) => (
                          <li
                            key={modIndex}
                            className="text-sm text-gray-600 flex items-start gap-2"
                          >
                            <span className="text-purple-500 mt-1">•</span>
                            {mod}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rate Recipe */}
            <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl border border-orange-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Rate This Recipe</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">{renderStars(userRating, true)}</div>
                  <span className="text-gray-600">
                    {userRating > 0 ? `${userRating}/5 stars` : 'Click to rate'}
                  </span>
                </div>
                <button
                  onClick={onOpenRatingModal}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all text-sm font-medium"
                >
                  {userRating > 0 ? 'Update Review' : 'Write Review'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
