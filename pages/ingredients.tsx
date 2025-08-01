import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useIngredients } from '../lib/hooks/useIngredients';
import { IngredientCategory } from '../types';
import { CreateIngredientRequest } from '../lib/services/ingredientService';

const CATEGORY_OPTIONS: { value: IngredientCategory; label: string; icon: string }[] = [
  { value: 'protein', label: 'Protein', icon: '🥩' },
  { value: 'vegetables', label: 'Vegetables', icon: '🥬' },
  { value: 'fruits', label: 'Fruits', icon: '🍎' },
  { value: 'grains', label: 'Grains', icon: '🌾' },
  { value: 'dairy', label: 'Dairy', icon: '🥛' },
  { value: 'spices', label: 'Spices', icon: '🌶️' },
  { value: 'herbs', label: 'Herbs', icon: '🌿' },
  { value: 'oils', label: 'Oils', icon: '🫒' },
  { value: 'pantry', label: 'Pantry', icon: '🏺' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export default function IngredientsPage() {
  const {
    ingredients,
    loading,
    error,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    clearAllIngredients,
    searchIngredients,
    filterByCategory,
    getExpiringSoon,
    getExpiredIngredients,
    refreshIngredients,
  } = useIngredients();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory | 'all'>('all');
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateIngredientRequest>({
    name: '',
    category: 'other',
    quantity: '',
    unit: '',
    expiryDate: '',
    nutritionalValue: undefined,
    isProtein: false,
    isVegetarian: true,
    isVegan: true,
  });

  // Filter ingredients based on current filters
  const [filteredIngredients, setFilteredIngredients] = useState<typeof ingredients>([]);

  useEffect(() => {
    let result = ingredients;

    // Apply search filter
    if (searchQuery.trim()) {
      result = searchIngredients(searchQuery.trim());
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = filterByCategory(categoryFilter);
    }

    // Apply expiry filter
    if (showExpiringSoon) {
      const expiringSoon = getExpiringSoon(7);
      result = result.filter(ing => expiringSoon.some(exp => exp.id === ing.id));
    }

    setFilteredIngredients(result);
  }, [
    ingredients,
    searchQuery,
    categoryFilter,
    showExpiringSoon,
    searchIngredients,
    filterByCategory,
    getExpiringSoon,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Ingredient name is required');
      return;
    }

    try {
      if (editingId) {
        await updateIngredient(editingId, formData);
        setEditingId(null);
      } else {
        await addIngredient(formData);
      }

      // Reset form
      setFormData({
        name: '',
        category: 'other',
        quantity: '',
        unit: '',
        expiryDate: '',
        nutritionalValue: undefined,
        isProtein: false,
        isVegetarian: true,
        isVegan: true,
      });
      setShowAddForm(false);
    } catch (error) {
      alert(
        `Failed to ${editingId ? 'update' : 'add'} ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleEdit = (ingredient: any) => {
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      quantity: ingredient.quantity || '',
      unit: ingredient.unit || '',
      expiryDate: ingredient.expiryDate
        ? new Date(ingredient.expiryDate).toISOString().split('T')[0]
        : '',
      nutritionalValue: ingredient.nutritionalValue,
      isProtein: ingredient.isProtein || false,
      isVegetarian: ingredient.isVegetarian || true,
      isVegan: ingredient.isVegan || true,
    });
    setEditingId(ingredient.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteIngredient(id);
      } catch (error) {
        alert(
          `Failed to delete ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete ALL ingredients? This cannot be undone.')) {
      try {
        await clearAllIngredients();
      } catch (error) {
        alert(
          `Failed to clear ingredients: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  };

  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    const expiringSoon = getExpiringSoon(7);
    const expired = getExpiredIngredients();
    setExpiringSoonCount(expiringSoon.length);
    setExpiredCount(expired.length);
  }, [ingredients, getExpiringSoon, getExpiredIngredients]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ingredients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Head>
        <title>Ingredient Management - Pantry Buddy</title>
        <meta name="description" content="Manage your pantry ingredients" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            <span className="text-5xl mr-3">🥗</span>
            Ingredient Management
          </h1>
          <p className="text-gray-600 text-lg">Organize and track your pantry ingredients</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button
              onClick={refreshIngredients}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">📦</span>
              <div>
                <p className="text-2xl font-bold text-gray-800">{ingredients.length}</p>
                <p className="text-gray-600">Total Items</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">⏰</span>
              <div>
                <p className="text-2xl font-bold text-orange-600">{expiringSoonCount}</p>
                <p className="text-gray-600">Expiring Soon</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">⚠️</span>
              <div>
                <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
                <p className="text-gray-600">Expired</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">🥬</span>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {ingredients.filter(i => i.isVegan).length}
                </p>
                <p className="text-gray-600">Vegan Items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    category: 'other',
                    quantity: '',
                    unit: '',
                    expiryDate: '',
                    nutritionalValue: undefined,
                    isProtein: false,
                    isVegetarian: true,
                    isVegan: true,
                  });
                }}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all font-semibold shadow-lg"
              >
                {showAddForm && !editingId ? 'Cancel' : '+ Add Ingredient'}
              </button>

              <button
                onClick={refreshIngredients}
                className="px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                🔄 Refresh
              </button>

              {ingredients.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                >
                  🗑️ Clear All
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search ingredients..."
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as IngredientCategory | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
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
                <span className="text-sm text-gray-700">Expiring Soon</span>
              </label>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Edit Ingredient' : 'Add New Ingredient'}
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      category: e.target.value as IngredientCategory,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., g, kg, pieces"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={e => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nutritional Value (per 100g)
                </label>
                <input
                  type="number"
                  value={formData.nutritionalValue || ''}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      nutritionalValue: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Calories"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isProtein}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, isProtein: e.target.checked }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">High Protein</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVegetarian}
                      onChange={e =>
                        setFormData(prev => ({ ...prev, isVegetarian: e.target.checked }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Vegetarian</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVegan}
                      onChange={e => setFormData(prev => ({ ...prev, isVegan: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Vegan</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all font-semibold shadow-lg"
                >
                  {editingId ? 'Update Ingredient' : 'Add Ingredient'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                  }}
                  className="px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ingredients List */}
        {filteredIngredients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIngredients.map(ingredient => {
              const isExpired =
                ingredient.expiryDate && new Date(ingredient.expiryDate).getTime() <= Date.now();
              const isExpiringSoon =
                ingredient.expiryDate &&
                new Date(ingredient.expiryDate).getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000 &&
                new Date(ingredient.expiryDate).getTime() > Date.now();

              return (
                <div
                  key={ingredient.id}
                  className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
                    isExpired
                      ? 'border-red-500'
                      : isExpiringSoon
                        ? 'border-orange-500'
                        : 'border-green-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 capitalize">
                        {ingredient.name}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {CATEGORY_OPTIONS.find(opt => opt.value === ingredient.category)?.icon}{' '}
                        {ingredient.category}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(ingredient)}
                        className="text-blue-500 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(ingredient.id, ingredient.name)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {(ingredient.quantity || ingredient.unit) && (
                    <p className="text-sm text-gray-600 mb-2">
                      Quantity: {ingredient.quantity} {ingredient.unit}
                    </p>
                  )}

                  {ingredient.nutritionalValue && (
                    <p className="text-sm text-gray-600 mb-2">
                      {ingredient.nutritionalValue} cal/100g
                    </p>
                  )}

                  {ingredient.expiryDate && (
                    <p
                      className={`text-sm mb-3 ${
                        isExpired
                          ? 'text-red-600 font-semibold'
                          : isExpiringSoon
                            ? 'text-orange-600 font-semibold'
                            : 'text-gray-600'
                      }`}
                    >
                      {isExpired ? '⚠️ Expired: ' : isExpiringSoon ? '⏰ Expires: ' : 'Expires: '}
                      {new Date(ingredient.expiryDate).toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {ingredient.isProtein && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        Protein
                      </span>
                    )}
                    {ingredient.isVegan && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Vegan
                      </span>
                    )}
                    {ingredient.isVegetarian && !ingredient.isVegan && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Vegetarian
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🥗</span>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {searchQuery || categoryFilter !== 'all' || showExpiringSoon
                ? 'No ingredients match your filters'
                : 'No ingredients found'}
            </h3>
            <p className="text-gray-500">
              {searchQuery || categoryFilter !== 'all' || showExpiringSoon
                ? 'Try adjusting your search or filters'
                : 'Add some ingredients to get started!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
