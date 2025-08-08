import React, { useState } from 'react';
import { Ingredient } from '../types';

interface IngredientInputProps {
  ingredients: Ingredient[];
  onAddIngredient: (ingredient: Ingredient) => void;
  onRemoveIngredient: (id: string) => void;
}

const commonIngredients = [
  'Chicken',
  'Rice',
  'Onion',
  'Garlic',
  'Tomato',
  'Pasta',
  'Cheese',
  'Eggs',
  'Bread',
  'Milk',
  'Butter',
  'Salt',
  'Pepper',
  'Olive Oil',
  'Potatoes',
];

export default function IngredientInput({
  ingredients,
  onAddIngredient,
  onRemoveIngredient,
}: IngredientInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.length > 0) {
      const filtered = commonIngredients.filter(
        ingredient =>
          ingredient.toLowerCase().includes(value.toLowerCase()) &&
          !ingredients.some(ing => ing.name.toLowerCase() === ingredient.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addIngredient = (name: string) => {
    if (name.trim() && !ingredients.some(ing => ing.name.toLowerCase() === name.toLowerCase())) {
      const ingredient: Ingredient = {
        id: Date.now().toString(),
        name: name.trim(),
        category: 'other',
      };
      onAddIngredient(ingredient);
      setInputValue('');
      setSuggestions([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addIngredient(inputValue);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">What's in your pantry?</h2>

      <div className="relative mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add ingredients (e.g., chicken, rice, tomatoes...)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />

        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => addIngredient(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => addIngredient(inputValue)}
        className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors mb-4"
      >
        Add Ingredient
      </button>

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Quick Add:</h3>
        <div className="flex flex-wrap gap-2">
          {commonIngredients
            .filter(
              ing =>
                !ingredients.some(ingredient => ingredient.name.toLowerCase() === ing.toLowerCase())
            )
            .slice(0, 8)
            .map(ingredient => (
              <button
                key={ingredient}
                onClick={() => addIngredient(ingredient)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors text-sm"
              >
                + {ingredient}
              </button>
            ))}
        </div>
      </div>

      {ingredients.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Your Ingredients ({ingredients.length}):
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ingredient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {ingredients.map(ingredient => (
                    <tr key={ingredient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900 capitalize">
                          {ingredient.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {ingredient.category}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => onRemoveIngredient(ingredient.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Remove ingredient"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
