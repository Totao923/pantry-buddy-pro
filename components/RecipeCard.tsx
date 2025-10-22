import React, { useState } from 'react';
import { Recipe } from '../types';
import CookingTracker from './cooking/CookingTracker';
import { SwipeableCard, SWIPE_ACTIONS } from './ui/SwipeableCard';
import { SwipeDirection } from '../hooks/useSwipeGesture';
import { useHaptic } from '../hooks/useHaptic';

interface RecipeCardProps {
  recipe: Recipe;
  onServingChange?: (servings: number) => void;
  onFavorite?: (recipe: Recipe) => void;
  onShare?: (recipe: Recipe) => void;
  onAddToCollection?: (recipe: Recipe, collectionId: string) => void;
  onSaveToMyRecipes?: (recipe: Recipe) => void;
  showCollectionOption?: boolean;
  showChildFriendlyIndicator?: boolean;
  isSavedToMyRecipes?: boolean;
}

export default function RecipeCard({
  recipe,
  onServingChange,
  onFavorite,
  onShare,
  onAddToCollection,
  onSaveToMyRecipes,
  showCollectionOption = false,
  showChildFriendlyIndicator = false,
  isSavedToMyRecipes = false,
}: RecipeCardProps) {
  const [currentServings, setCurrentServings] = useState(recipe.servings);
  const haptic = useHaptic();

  const handleServingChange = (newServings: number) => {
    if (newServings >= 1 && newServings <= 12) {
      setCurrentServings(newServings);
      onServingChange?.(newServings);
      haptic.light();
    }
  };

  const handleFavorite = () => {
    haptic.success();
    onFavorite?.(recipe);
  };

  const handleShare = () => {
    haptic.medium();
    onShare?.(recipe);
  };

  const handleAddToCollection = (collectionId: string) => {
    haptic.success();
    onAddToCollection?.(recipe, collectionId);
  };

  const swipeActions = [
    {
      ...SWIPE_ACTIONS.favorite,
      action: handleFavorite,
    },
    {
      ...SWIPE_ACTIONS.share,
      action: handleShare,
    },
    ...(showCollectionOption
      ? [
          {
            direction: 'right' as SwipeDirection,
            label: 'Add to Collection',
            icon: '📚',
            color: 'bg-purple-500',
            action: () => {
              // This will be handled by a dropdown in the UI instead
              haptic.light();
            },
          },
        ]
      : []),
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600 bg-green-100';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'Hard':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <SwipeableCard actions={swipeActions} className="recipe-card max-w-2xl mx-auto">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{recipe.title}</h2>
            <p className="text-gray-600 mb-3">{recipe.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                🍽️ {recipe.cuisine.charAt(0).toUpperCase() + recipe.cuisine.slice(1)}
              </span>
              <span className="flex items-center gap-1">
                ⏱️ {recipe.prepTime + recipe.cookTime} min
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}
              >
                {recipe.difficulty}
              </span>
              {showChildFriendlyIndicator && recipe.isChildFriendly && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1">
                  👶 Kid-Friendly
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Servings:</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleServingChange(currentServings - 1)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                disabled={currentServings <= 1}
              >
                -
              </button>
              <span className="w-12 text-center font-medium">{currentServings}</span>
              <button
                onClick={() => handleServingChange(currentServings + 1)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                disabled={currentServings >= 12}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Ingredients:</h3>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-gray-100"
                >
                  <span className="text-gray-700 capitalize">{ingredient.name}</span>
                  <span className="text-gray-600 font-medium">
                    {ingredient.amount} {ingredient.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Instructions:</h3>
            <ol className="space-y-3">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 leading-relaxed">{instruction.instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Prep: {recipe.prepTime}min • Cook: {recipe.cookTime}min
              </div>
              <div className="flex gap-2">
                {showCollectionOption && (
                  <button
                    onClick={() => {
                      // This would open a collection selection modal/dropdown
                      console.log('Add to collection clicked');
                    }}
                    className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors text-sm"
                  >
                    📚 Add to Collection
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons: Cooking Tracker and Save to My Recipes */}
            <div className="flex justify-center items-center gap-3">
              <CookingTracker recipe={recipe} showDetailedButton={true} />

              {onSaveToMyRecipes && (
                <button
                  onClick={() => {
                    haptic.success();
                    onSaveToMyRecipes(recipe);
                  }}
                  disabled={isSavedToMyRecipes}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    isSavedToMyRecipes
                      ? 'bg-green-100 text-green-700 border border-green-200 cursor-not-allowed'
                      : 'bg-pantry-600 text-white hover:bg-pantry-700'
                  }`}
                >
                  {isSavedToMyRecipes ? (
                    <>
                      <span>✅</span>
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save to My Recipes</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </SwipeableCard>
  );
}
