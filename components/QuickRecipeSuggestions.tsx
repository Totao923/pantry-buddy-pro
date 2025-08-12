import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  quickSuggestionsService,
  QuickRecipeSuggestion,
  SuggestionRequest,
} from '../lib/services/quickSuggestionsService';
import { RecipeService } from '../lib/services/recipeService';

interface QuickRecipeSuggestionsProps {
  onClose?: () => void;
  onRecipeSelected?: (recipe: QuickRecipeSuggestion) => void;
  maxSuggestions?: number;
  showAsModal?: boolean;
}

interface RecipeCardProps {
  recipe: QuickRecipeSuggestion;
  onCookThis: () => void;
  onSaveRecipe: () => void;
  isLoading?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onCookThis, onSaveRecipe, isLoading = false }) => {
  const matchPercentage = Math.round(
    (recipe.matchingIngredients.length / recipe.ingredients.length) * 100
  );

  const difficultyColor =
    recipe.difficulty === 'Easy' ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100';

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{recipe.name}</h3>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">🍽️ {recipe.cuisine}</span>
            <span className="flex items-center gap-1">⏱️ {recipe.cookTime}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColor}`}>
              {recipe.difficulty}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-pantry-600">{matchPercentage}%</div>
          <div className="text-xs text-gray-500">pantry match</div>
        </div>
      </div>

      {/* Ingredient Matching */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">Ingredients:</span>
          <div className="flex items-center gap-1">
            <span className="text-green-600">✓ {recipe.matchingIngredients.length} available</span>
            {recipe.missingIngredients.length > 0 && (
              <span className="text-orange-600">• {recipe.missingIngredients.length} needed</span>
            )}
          </div>
        </div>

        {/* Available Ingredients */}
        {recipe.matchingIngredients.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-green-700 mb-1">✓ From your pantry:</div>
            <div className="flex flex-wrap gap-1">
              {recipe.matchingIngredients.map((ingredient, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200"
                >
                  {ingredient}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Ingredients */}
        {recipe.missingIngredients.length > 0 && (
          <div>
            <div className="text-xs text-orange-700 mb-1">🛒 Need to buy:</div>
            <div className="flex flex-wrap gap-1">
              {recipe.missingIngredients.slice(0, 3).map((ingredient, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200"
                >
                  {ingredient}
                </span>
              ))}
              {recipe.missingIngredients.length > 3 && (
                <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200">
                  +{recipe.missingIngredients.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Instructions Preview */}
      <div className="mb-4">
        <div className="text-sm text-gray-600">
          {recipe.instructions.slice(0, 2).map((instruction, index) => (
            <div key={index} className="flex items-start gap-2 mb-1">
              <span className="text-pantry-500 font-medium">{index + 1}.</span>
              <span>
                {instruction.length > 60 ? instruction.substring(0, 60) + '...' : instruction}
              </span>
            </div>
          ))}
          {recipe.instructions.length > 2 && (
            <div className="text-xs text-gray-500 mt-1">
              +{recipe.instructions.length - 2} more steps
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCookThis}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white px-4 py-3 rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Preparing Recipe...
            </>
          ) : (
            <>
              <span>👨‍🍳</span>
              Start Cooking
            </>
          )}
        </button>
        <button
          onClick={onSaveRecipe}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <span>💾</span>
          Save
        </button>
      </div>
    </div>
  );
};

export default function QuickRecipeSuggestions({
  onClose,
  onRecipeSelected,
  maxSuggestions = 4,
  showAsModal = false,
}: QuickRecipeSuggestionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<QuickRecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookingRecipeId, setCookingRecipeId] = useState<string | null>(null);
  const [options, setOptions] = useState<SuggestionRequest>({
    maxSuggestions,
    maxCookTime: 45,
    difficultyLevel: 'Both',
    prioritizeExpiring: true,
    dietaryPreferences: [],
  });
  const [showFilters, setShowFilters] = useState(false);

  const generateSuggestions = async (customOptions?: Partial<SuggestionRequest>) => {
    setLoading(true);
    setError(null);

    try {
      const requestOptions = { ...options, ...customOptions, userId: user?.id };
      const newSuggestions = await quickSuggestionsService.getQuickSuggestions(requestOptions);

      if (newSuggestions.length === 0) {
        setError('No recipes found with your current pantry items. Try adding more ingredients!');
      } else {
        setSuggestions(newSuggestions);
      }
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to generate suggestions. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCookThis = async (recipe: QuickRecipeSuggestion) => {
    try {
      setCookingRecipeId(recipe.id);

      // Track suggestion usage for analytics
      if (user?.id) {
        quickSuggestionsService.trackSuggestionUsed(user.id, recipe);
      }

      // Convert suggestion to recipe format and save
      const recipeData = {
        id: recipe.id,
        title: recipe.name,
        description: `AI-generated recipe using your pantry ingredients`,
        cuisine: recipe.cuisine.toLowerCase() as any,
        servings: recipe.servings,
        prepTime: 10,
        cookTime: parseInt(recipe.cookTime) || 30,
        totalTime: (parseInt(recipe.cookTime) || 30) + 10,
        difficulty: recipe.difficulty.toLowerCase() as any,
        ingredients: recipe.ingredients.map((ing, index) => ({
          name: ing.name,
          amount: parseFloat(ing.amount.split(' ')[0]) || 1,
          unit: ing.amount.split(' ').slice(1).join(' ') || 'serving',
          optional: false,
        })),
        instructions: recipe.instructions.map((instruction, index) => ({
          step: index + 1,
          instruction,
        })),
        tags: ['quick-suggestion', 'ai-generated'],
        dietaryInfo: {
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          isDairyFree: false,
          isKeto: false,
          isPaleo: false,
          allergens: [],
        },
      };

      await RecipeService.saveRecipe(recipeData, user?.id || 'anonymous');

      if (onRecipeSelected) {
        onRecipeSelected(recipe);
      }

      // Show success feedback and navigate to recipe detail page
      setCookingRecipeId(null);

      // Navigate to the recipe detail page to show cooking instructions
      router.push(`/dashboard/recipe/${recipe.id}`);

      if (showAsModal && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setCookingRecipeId(null);
      alert('Failed to save recipe. Please try again.');
    }
  };

  const handleSaveRecipe = async (recipe: QuickRecipeSuggestion) => {
    try {
      // Track suggestion usage for analytics
      if (user?.id) {
        quickSuggestionsService.trackSuggestionUsed(user.id, recipe);
      }

      // Convert suggestion to recipe format and save
      const recipeData = {
        id: recipe.id,
        title: recipe.name,
        description: `AI-generated recipe using your pantry ingredients`,
        cuisine: recipe.cuisine.toLowerCase() as any,
        servings: recipe.servings,
        prepTime: 10,
        cookTime: parseInt(recipe.cookTime) || 30,
        totalTime: (parseInt(recipe.cookTime) || 30) + 10,
        difficulty: recipe.difficulty.toLowerCase() as any,
        ingredients: recipe.ingredients.map((ing, index) => ({
          name: ing.name,
          amount: parseFloat(ing.amount.split(' ')[0]) || 1,
          unit: ing.amount.split(' ').slice(1).join(' ') || 'serving',
          optional: false,
        })),
        instructions: recipe.instructions.map((instruction, index) => ({
          step: index + 1,
          instruction,
        })),
        tags: ['quick-suggestion', 'ai-generated', 'saved'],
        dietaryInfo: {
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          isDairyFree: false,
          isKeto: false,
          isPaleo: false,
          allergens: [],
        },
      };

      await RecipeService.saveRecipe(recipeData, user?.id || 'anonymous');
      alert('Recipe saved to your collection!');
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe. Please try again.');
    }
  };

  const LoadingState = () => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-pantry-100 rounded-full mb-4">
        <div className="w-8 h-8 border-3 border-pantry-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Cooking up some ideas...</h3>
      <p className="text-gray-600 mb-2">Analyzing your pantry inventory</p>
      <div className="flex items-center justify-center gap-1 text-sm text-pantry-600">
        <span className="animate-bounce">🧄</span>
        <span className="animate-bounce delay-100">🥕</span>
        <span className="animate-bounce delay-200">🍅</span>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <span className="text-6xl mb-4 block">🤔</span>
      <h3 className="text-xl font-semibold text-gray-600 mb-2">Ready for some inspiration?</h3>
      <p className="text-gray-500 mb-6">
        Get personalized recipe suggestions based on what's in your pantry!
      </p>
      <button
        onClick={() => generateSuggestions()}
        disabled={loading}
        className="px-8 py-4 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-colors font-semibold flex items-center justify-center gap-2 mx-auto"
      >
        <span>✨</span>
        What Should I Cook?
      </button>
    </div>
  );

  const ErrorState = () => (
    <div className="text-center py-12">
      <span className="text-6xl mb-4 block">😅</span>
      <h3 className="text-xl font-semibold text-gray-600 mb-2">Oops!</h3>
      <p className="text-gray-500 mb-6">{error}</p>
      <button
        onClick={() => generateSuggestions()}
        disabled={loading}
        className="px-6 py-3 bg-pantry-600 text-white rounded-xl hover:bg-pantry-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  const SuggestionsGrid = () => (
    <div className="space-y-6">
      {/* Header with options */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recipe Suggestions</h2>
          <p className="text-gray-600">Based on your pantry inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            🔧 Filters
          </button>
          <button
            onClick={() => generateSuggestions()}
            disabled={loading}
            className="px-4 py-2 text-pantry-600 border border-pantry-600 rounded-lg hover:bg-pantry-50 transition-colors text-sm font-medium"
          >
            🔄 Refresh Ideas
          </button>
          {showAsModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cook Time Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Cook Time</label>
              <select
                value={options.maxCookTime}
                onChange={e => setOptions({ ...options, maxCookTime: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pantry-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <select
                value={options.difficultyLevel}
                onChange={e => setOptions({ ...options, difficultyLevel: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-pantry-500"
              >
                <option value="Both">Any Difficulty</option>
                <option value="Easy">Easy Only</option>
                <option value="Medium">Medium Only</option>
              </select>
            </div>

            {/* Dietary Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Preferences
              </label>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo'].map(diet => (
                  <label key={diet} className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={options.dietaryPreferences?.includes(diet) || false}
                      onChange={e => {
                        const current = options.dietaryPreferences || [];
                        if (e.target.checked) {
                          setOptions({ ...options, dietaryPreferences: [...current, diet] });
                        } else {
                          setOptions({
                            ...options,
                            dietaryPreferences: current.filter(d => d !== diet),
                          });
                        }
                      }}
                      className="mr-2 rounded text-pantry-600 focus:ring-pantry-500"
                    />
                    {diet}
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={options.prioritizeExpiring || false}
                  onChange={e => setOptions({ ...options, prioritizeExpiring: e.target.checked })}
                  className="mr-2 rounded text-pantry-600 focus:ring-pantry-500"
                />
                Prioritize expiring items
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setOptions({
                  maxSuggestions,
                  maxCookTime: 45,
                  difficultyLevel: 'Both',
                  prioritizeExpiring: true,
                  dietaryPreferences: [],
                });
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Reset Filters
            </button>
            <button
              onClick={() => {
                generateSuggestions();
                setShowFilters(false);
              }}
              className="px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors text-sm font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {suggestions.map((recipe, index) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onCookThis={() => handleCookThis(recipe)}
            onSaveRecipe={() => handleSaveRecipe(recipe)}
            isLoading={cookingRecipeId === recipe.id}
          />
        ))}
      </div>

      {/* Get More Suggestions */}
      <div className="text-center">
        <button
          onClick={() => generateSuggestions()}
          disabled={loading}
          className="px-6 py-3 text-pantry-600 border border-pantry-300 rounded-xl hover:bg-pantry-50 transition-colors font-medium"
        >
          ✨ Get More Ideas
        </button>
      </div>
    </div>
  );

  // Modal wrapper
  if (showAsModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState />
            ) : suggestions.length === 0 ? (
              <EmptyState />
            ) : (
              <SuggestionsGrid />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Regular component
  return (
    <div className="space-y-6">
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState />
      ) : suggestions.length === 0 ? (
        <EmptyState />
      ) : (
        <SuggestionsGrid />
      )}
    </div>
  );
}
