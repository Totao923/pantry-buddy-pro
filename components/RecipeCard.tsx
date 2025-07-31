import React, { useState } from 'react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onServingChange?: (servings: number) => void;
}

export default function RecipeCard({ recipe, onServingChange }: RecipeCardProps) {
  const [currentServings, setCurrentServings] = useState(recipe.servings);

  const handleServingChange = (newServings: number) => {
    if (newServings >= 1 && newServings <= 12) {
      setCurrentServings(newServings);
      onServingChange?.(newServings);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="recipe-card max-w-2xl mx-auto">
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
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                {recipe.difficulty}
              </span>
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
                <li key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
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
                  <span className="text-gray-700 leading-relaxed">{instruction}</span>
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
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Prep: {recipe.prepTime}min • Cook: {recipe.cookTime}min
            </div>
            <button className="bg-accent-500 text-white px-6 py-2 rounded-lg hover:bg-accent-600 transition-colors">
              Save Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}