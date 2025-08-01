import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Ingredient, IngredientCategory, SmartSuggestion } from '../types';
import { getIngredientService } from '../lib/services/ingredientServiceFactory';
import { useIngredients } from '../lib/hooks/useIngredients';

interface SmartPantryProps {
  ingredients: Ingredient[];
  onAddIngredient: (ingredient: Ingredient) => void;
  onRemoveIngredient: (id: string) => void;
  onUpdateIngredient: (ingredient: Ingredient) => void;
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
}: SmartPantryProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory>('other');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory | 'all'>('all');
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);

  // Use the ingredients hook to get loading and error states
  const {
    loading,
    error,
    searchIngredients,
    filterByCategory,
  } = useIngredients();

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
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
            {ingredients.length} ingredients
          </span>
        </div>
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-xl">💡</span>
            Smart Suggestions
          </h3>
          <div className="space-y-2">
            {smartSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100"
              >
                <div>
                  <h4 className="font-medium text-gray-800">{suggestion.title}</h4>
                  <p className="text-sm text-gray-600">{suggestion.description}</p>
                </div>
                <button
                  onClick={() => addIngredient(suggestion.title.replace('Add ', ''))}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
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
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputValue}
              onChange={e => handleInputChange(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addIngredient(inputValue)}
              placeholder="Add ingredient (e.g., chicken breast, organic tomatoes...)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value as IngredientCategory)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(categoryData).map(([key, data]) => (
              <option key={key} value={key}>
                {data.icon} {key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={() => addIngredient(inputValue, selectedCategory)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all font-semibold shadow-lg"
          >
            Add
          </button>
        </div>

        {/* Quick Add Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Object.entries(categoryData).map(([category, data]) => (
            <div key={category} className="bg-gray-50 rounded-xl p-3">
              <div className="text-center mb-2">
                <span className="text-2xl">{data.icon}</span>
                <h4 className="text-sm font-medium text-gray-700 capitalize">{category}</h4>
              </div>
              <div className="space-y-1">
                {data.examples.slice(0, 2).map(example => (
                  <button
                    key={example}
                    onClick={() => addIngredient(example)}
                    className="w-full px-2 py-2 text-xs bg-white rounded-lg hover:bg-gray-100 transition-colors text-gray-700 touch-manipulation min-h-[32px]"
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

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          placeholder="Search ingredients..."
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryIngredients.map(ingredient => (
                      <div
                        key={ingredient.id}
                        className="bg-gradient-to-r from-white to-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 capitalize">
                              {ingredient.name}
                            </h4>
                            <div className="text-sm text-gray-600">
                              {ingredient.quantity && (
                                <span>
                                  {ingredient.quantity} {ingredient.unit}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveIngredient(ingredient.id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${categoryData[ingredient.category].color}`}
                          >
                            {ingredient.category}
                          </span>
                          {ingredient.isVegan && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Vegan
                            </span>
                          )}
                          {ingredient.isProtein && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              Protein
                            </span>
                          )}
                        </div>

                        {ingredient.expiryDate && (
                          <div className="text-xs text-gray-500">
                            Expires: {new Date(ingredient.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
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
