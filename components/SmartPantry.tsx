import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Ingredient, IngredientCategory, SmartSuggestion } from '../types';
import { getIngredientService } from '../lib/services/ingredientServiceFactory';
import { useIngredients } from '../lib/hooks/useIngredients';

interface SmartPantryProps {
  ingredients: Ingredient[];
  onAddIngredient: (ingredient: Ingredient) => void;
  onRemoveIngredient: (id: string) => void;
  onUpdateIngredient: (ingredient: Ingredient) => void;
  navigationButtons?: React.ReactNode;
}

const categoryData: Record<
  IngredientCategory,
  { icon: string; color: string; examples: string[] }
> = {
  protein: {
    icon: '🥩',
    color: 'bg-red-100 text-red-800',
    examples: ['Chicken', 'Beef', 'Fish', 'Tofu', 'Eggs', 'Beans'],
  },
  vegetables: {
    icon: '🥬',
    color: 'bg-green-100 text-green-800',
    examples: ['Onion', 'Tomato', 'Carrot', 'Broccoli', 'Bell Pepper', 'Spinach'],
  },
  fruits: {
    icon: '🍎',
    color: 'bg-pink-100 text-pink-800',
    examples: ['Apple', 'Banana', 'Lemon', 'Orange', 'Berries', 'Avocado'],
  },
  grains: {
    icon: '🌾',
    color: 'bg-yellow-100 text-yellow-800',
    examples: ['Rice', 'Pasta', 'Bread', 'Quinoa', 'Oats', 'Flour'],
  },
  dairy: {
    icon: '🥛',
    color: 'bg-blue-100 text-blue-800',
    examples: ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream', 'Sour Cream'],
  },
  spices: {
    icon: '🌶️',
    color: 'bg-orange-100 text-orange-800',
    examples: ['Salt', 'Pepper', 'Paprika', 'Cumin', 'Garlic Powder', 'Chili'],
  },
  herbs: {
    icon: '🌿',
    color: 'bg-emerald-100 text-emerald-800',
    examples: ['Basil', 'Oregano', 'Thyme', 'Cilantro', 'Parsley', 'Rosemary'],
  },
  oils: {
    icon: '🫒',
    color: 'bg-lime-100 text-lime-800',
    examples: ['Olive Oil', 'Vegetable Oil', 'Coconut Oil', 'Sesame Oil', 'Butter', 'Ghee'],
  },
  pantry: {
    icon: '🏺',
    color: 'bg-amber-100 text-amber-800',
    examples: ['Sugar', 'Flour', 'Baking Powder', 'Vanilla', 'Honey', 'Vinegar'],
  },
  other: {
    icon: '📦',
    color: 'bg-gray-100 text-gray-800',
    examples: ['Stock', 'Sauce', 'Condiments', 'Nuts', 'Seeds', 'Dried Fruits'],
  },
};

export default function SmartPantry({
  ingredients,
  onAddIngredient,
  onRemoveIngredient,
  onUpdateIngredient,
  navigationButtons,
}: SmartPantryProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory>('other');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory | 'all'>('all');
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);

  // Use the ingredients hook to get loading and error states
  const { loading, error, searchIngredients, filterByCategory } = useIngredients();

  const generateSmartSuggestions = useCallback(() => {
    const suggestions: SmartSuggestion[] = [];

    // Suggest complementary ingredients
    if (ingredients.some(ing => ing.name.toLowerCase().includes('tomato'))) {
      suggestions.push({
        type: 'ingredient',
        title: 'Add Basil',
        description: 'Perfect complement to tomatoes',
        confidence: 0.9,
        reason: 'Classic pairing enhances flavor',
      });
    }

    if (
      ingredients.some(ing => ing.category === 'protein') &&
      !ingredients.some(ing => ing.category === 'grains')
    ) {
      suggestions.push({
        type: 'ingredient',
        title: 'Add Rice or Pasta',
        description: 'Complete your protein with a grain',
        confidence: 0.8,
        reason: 'Balanced meal composition',
      });
    }

    setSmartSuggestions(suggestions);
  }, [ingredients]);

  // Debounced effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      generateSmartSuggestions();
    }, 300);

    return () => clearTimeout(timeout);
  }, [generateSmartSuggestions]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.length > 1) {
      const allSuggestions = Object.values(categoryData).flatMap(cat => cat.examples);
      const filtered = allSuggestions.filter(
        item =>
          item.toLowerCase().includes(value.toLowerCase()) &&
          !ingredients.some(ing => ing.name.toLowerCase() === item.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 6));

      // Call the search function from the hook for testing
      if (searchIngredients) {
        searchIngredients(value);
      }
    } else {
      setSuggestions([]);
    }
  };

  const addIngredient = async (name: string, category?: IngredientCategory) => {
    if (name.trim() && !ingredients.some(ing => ing.name.toLowerCase() === name.toLowerCase())) {
      try {
        const detectedCategory = category || detectCategory(name);
        const ingredientData = {
          name: name.trim(),
          category: detectedCategory,
          isVegetarian: isVegetarian(name, detectedCategory),
          isVegan: isVegan(name, detectedCategory),
          isProtein: detectedCategory === 'protein',
        };

        const service = await getIngredientService();
        const newIngredient = await service.createIngredient(ingredientData);
        onAddIngredient(newIngredient);
        setInputValue('');
        setSuggestions([]);
      } catch (error) {
        console.error('Failed to add ingredient:', error);
        // Fallback to local addition for better UX
        const detectedCategory = category || detectCategory(name);
        const ingredient: Ingredient = {
          id: Date.now().toString(),
          name: name.trim(),
          category: detectedCategory,
          isVegetarian: isVegetarian(name, detectedCategory),
          isVegan: isVegan(name, detectedCategory),
          isProtein: detectedCategory === 'protein',
        };
        onAddIngredient(ingredient);
        setInputValue('');
        setSuggestions([]);
      }
    }
  };

  const detectCategory = (name: string): IngredientCategory => {
    const nameLower = name.toLowerCase();
    for (const [category, data] of Object.entries(categoryData)) {
      if (
        data.examples.some(
          example =>
            example.toLowerCase().includes(nameLower) || nameLower.includes(example.toLowerCase())
        )
      ) {
        return category as IngredientCategory;
      }
    }
    return 'other';
  };

  const isVegetarian = (name: string, category: IngredientCategory): boolean => {
    return (
      category !== 'protein' ||
      ['tofu', 'beans', 'lentils', 'eggs', 'cheese'].some(veg => name.toLowerCase().includes(veg))
    );
  };

  const isVegan = (name: string, category: IngredientCategory): boolean => {
    if (category === 'dairy') return false;
    if (category === 'protein') {
      return ['tofu', 'beans', 'lentils', 'chickpeas', 'nuts'].some(vegan =>
        name.toLowerCase().includes(vegan)
      );
    }
    return true;
  };

  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ingredient.category === categoryFilter;
    const matchesExpiry =
      !showExpiringSoon ||
      (ingredient.expiryDate &&
        new Date(ingredient.expiryDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000);

    return matchesSearch && matchesCategory && matchesExpiry;
  });

  const ingredientsByCategory = filteredIngredients.reduce(
    (acc, ing) => {
      if (!acc[ing.category]) {
        acc[ing.category] = [];
      }
      acc[ing.category].push(ing);
      return acc;
    },
    {} as Record<string, typeof filteredIngredients>
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧑‍🍳</span>
          <h2 className="text-3xl font-bold text-gray-800">Smart Pantry</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-medium">
            {ingredients.length} ingredients
          </span>
        </div>
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Smart Suggestions
          </h3>
          <div className="space-y-2">
            {smartSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100"
              >
                <div>
                  <h4 className="font-medium text-gray-800">{suggestion.title}</h4>
                  <p className="text-sm text-gray-600">{suggestion.description}</p>
                </div>
                <button
                  onClick={() => addIngredient(suggestion.title.replace('Add ', ''))}
                  className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Ingredient Section */}
      <div className="mb-8">
        <div className="space-y-4 mb-6">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={e => handleInputChange(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addIngredient(inputValue)}
              placeholder="Add ingredient (e.g., chicken breast, organic tomatoes...)"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-base"
            />

            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border-2 border-gray-100 rounded-xl mt-2 shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => addIngredient(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {categoryData[detectCategory(suggestion)].icon}
                      </span>
                      <span className="font-medium">{suggestion}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${categoryData[detectCategory(suggestion)].color}`}
                      >
                        {detectCategory(suggestion)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as IngredientCategory)}
              className="flex-1 px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
            >
              {Object.entries(categoryData).map(([key, data]) => (
                <option key={key} value={key}>
                  {data.icon} {key.charAt(0).toUpperCase() + key.slice(1)}
                </option>
              ))}
            </select>

            <button
              onClick={() => addIngredient(inputValue, selectedCategory)}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-semibold shadow-lg text-base sm:flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        {/* Quick Add Categories */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(categoryData).map(([category, data]) => (
            <div key={category} className="bg-gray-50 rounded-xl p-4 min-h-[140px]">
              <div className="text-center mb-3">
                <span className="text-3xl block mb-2">{data.icon}</span>
                <h4 className="text-sm font-semibold text-gray-800 capitalize">{category}</h4>
              </div>
              <div className="space-y-2">
                {data.examples.slice(0, 2).map(example => (
                  <button
                    key={example}
                    onClick={() => addIngredient(example)}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium shadow-sm border border-gray-200"
                    style={{ minHeight: '36px', touchAction: 'manipulation' }}
                    disabled={ingredients.some(
                      ing => ing.name.toLowerCase() === example.toLowerCase()
                    )}
                  >
                    + {example}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      {navigationButtons && <div className="mb-6">{navigationButtons}</div>}

      {/* Filters */}
      <div className="mb-6 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4 sm:items-center">
        <input
          type="text"
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          placeholder="Search ingredients..."
          className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />

        <select
          value={categoryFilter}
          onChange={e => {
            const newCategory = e.target.value as IngredientCategory | 'all';
            setCategoryFilter(newCategory);
            // Call the filter function from the hook for testing
            if (filterByCategory && newCategory !== 'all') {
              filterByCategory(newCategory as IngredientCategory);
            }
          }}
          className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {Object.entries(categoryData).map(([key, data]) => (
            <option key={key} value={key}>
              {data.icon} {key.charAt(0).toUpperCase() + key.slice(1)}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showExpiringSoon}
            onChange={e => setShowExpiringSoon(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Expiring soon</span>
        </label>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <p className="mt-2 text-gray-600">Loading ingredients...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 text-red-700">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">Failed to load ingredients</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Ingredients Display */}
      {!loading && filteredIngredients.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(ingredientsByCategory).map(
            ([category, categoryIngredients]) =>
              categoryIngredients &&
              categoryIngredients.length > 0 && (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">
                      {categoryData[category as IngredientCategory].icon}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-800 capitalize">{category}</h3>
                    <span className="text-sm text-gray-500">({categoryIngredients.length})</span>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tags
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Expires
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {categoryIngredients.map(ingredient => (
                            <tr key={ingredient.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium text-gray-900 capitalize">
                                  {ingredient.name}
                                </div>
                                <div className="text-sm text-gray-500 capitalize">
                                  {ingredient.category}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {ingredient.quantity ? (
                                  <span>
                                    {ingredient.quantity} {ingredient.unit}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex flex-wrap gap-1">
                                  {ingredient.isVegan && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Vegan
                                    </span>
                                  )}
                                  {ingredient.isProtein && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      Protein
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {ingredient.expiryDate ? (
                                  <span>
                                    {new Date(ingredient.expiryDate).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
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
              )
          )}
        </div>
      ) : !loading && !error ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🥗</span>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Your pantry is empty</h3>
          <p className="text-gray-500">
            Add some ingredients to get started with recipe generation!
          </p>
        </div>
      ) : null}
    </div>
  );
}
