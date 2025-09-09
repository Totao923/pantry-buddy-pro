import React, { useState } from 'react';
import { Ingredient } from '../../types';

interface IngredientSummaryProps {
  ingredients: Ingredient[];
  onRemoveIngredient: (id: string) => void;
  onContinue?: () => void;
  continueButtonText?: string;
  className?: string;
}

export const IngredientSummary: React.FC<IngredientSummaryProps> = ({
  ingredients,
  onRemoveIngredient,
  onContinue,
  continueButtonText = 'Continue to Recipe →',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (ingredients.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Backdrop for expanded state */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sticky Summary Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:shadow-none md:border-t-0 ${className}`}
      >
        {/* Collapsed Summary Bar - Mobile Only */}
        <div
          className={`p-4 cursor-pointer md:hidden ${isExpanded ? 'hidden' : 'block'}`}
          onClick={toggleExpanded}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <p className="font-medium text-gray-900">
                  {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-gray-500">Tap to view and edit</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {ingredients.slice(0, 3).map((ingredient, index) => {
                  const categoryEmoji = getCategoryEmoji(ingredient.category);
                  return (
                    <div
                      key={ingredient.id}
                      className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm border-2 border-white"
                      title={ingredient.name}
                    >
                      {categoryEmoji}
                    </div>
                  );
                })}
                {ingredients.length > 3 && (
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white">
                    +{ingredients.length - 3}
                  </div>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Expanded Ingredient List */}
        <div
          className={`${
            isExpanded ? 'block' : 'hidden'
          } md:block bg-white border-t border-gray-100 md:border-t-0`}
        >
          <div className="p-4">
            {/* Header for expanded view */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h3 className="text-lg font-semibold text-gray-900">Selected Ingredients</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Collapse ingredient list"
              >
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Recipe Ingredients ({ingredients.length})
              </h3>
            </div>

            {/* Ingredient Chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {ingredients.map(ingredient => (
                <IngredientChip
                  key={ingredient.id}
                  ingredient={ingredient}
                  onRemove={() => onRemoveIngredient(ingredient.id)}
                />
              ))}
            </div>

            {/* Continue Button */}
            {onContinue && (
              <button
                onClick={onContinue}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>{continueButtonText}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spacer for fixed positioning on mobile */}
      <div className="h-20 md:hidden" />
    </>
  );
};

interface IngredientChipProps {
  ingredient: Ingredient;
  onRemove: () => void;
}

const IngredientChip: React.FC<IngredientChipProps> = ({ ingredient, onRemove }) => {
  const categoryEmoji = getCategoryEmoji(ingredient.category);
  const categoryColor = getCategoryColor(ingredient.category);

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border ${categoryColor}`}
    >
      <span>{categoryEmoji}</span>
      <span className="max-w-24 truncate" title={ingredient.name}>
        {ingredient.name}
      </span>
      {ingredient.quantity && ingredient.unit && (
        <span className="text-xs opacity-75">
          {ingredient.quantity} {ingredient.unit}
        </span>
      )}
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-1 transition-colors flex-shrink-0"
        aria-label={`Remove ${ingredient.name}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

// Helper functions for category styling
const getCategoryEmoji = (category: string): string => {
  const categoryEmojis: Record<string, string> = {
    protein: '🥩',
    vegetables: '🥬',
    fruits: '🍎',
    grains: '🌾',
    dairy: '🥛',
    spices: '🌶️',
    herbs: '🌿',
    oils: '🫒',
    pantry: '🥫',
    other: '🍽️',
  };
  return categoryEmojis[category] || '🍽️';
};

const getCategoryColor = (category: string): string => {
  const categoryColors: Record<string, string> = {
    protein: 'bg-red-50 text-red-700 border-red-200',
    vegetables: 'bg-green-50 text-green-700 border-green-200',
    fruits: 'bg-pink-50 text-pink-700 border-pink-200',
    grains: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dairy: 'bg-blue-50 text-blue-700 border-blue-200',
    spices: 'bg-orange-50 text-orange-700 border-orange-200',
    herbs: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    oils: 'bg-amber-50 text-amber-700 border-amber-200',
    pantry: 'bg-gray-50 text-gray-700 border-gray-200',
    other: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return categoryColors[category] || 'bg-gray-50 text-gray-700 border-gray-200';
};
