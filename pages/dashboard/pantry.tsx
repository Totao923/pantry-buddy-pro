import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import SmartPantry from '../../components/SmartPantry';
import { ingredientService } from '../../lib/services/ingredientService';
import { Ingredient, IngredientCategory } from '../../types';

export default function PantryManagement() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    expiringSoon: 0,
    categories: {} as Record<IngredientCategory, number>,
  });

  useEffect(() => {
    loadIngredients();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [ingredients]);

  const loadIngredients = async () => {
    try {
      const userIngredients = await ingredientService.getAllIngredients();
      setIngredients(userIngredients);
    } catch (error) {
      console.error('Error loading ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const total = ingredients.length;
    const expiringSoon = ingredients.filter(ingredient => {
      if (!ingredient.expiryDate) return false;
      const daysUntilExpiry = Math.ceil(
        (new Date(ingredient.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
    }).length;

    const categories: Record<IngredientCategory, number> = {
      protein: 0,
      vegetables: 0,
      fruits: 0,
      grains: 0,
      dairy: 0,
      spices: 0,
      herbs: 0,
      oils: 0,
      pantry: 0,
      other: 0,
    };

    ingredients.forEach(ingredient => {
      categories[ingredient.category]++;
    });

    setStats({ total, expiringSoon, categories });
  };

  const handleAddIngredient = async (ingredient: Ingredient) => {
    try {
      const newIngredient = await ingredientService.createIngredient({
        name: ingredient.name,
        category: ingredient.category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        expiryDate: ingredient.expiryDate?.toISOString(),
        nutritionalValue: ingredient.nutritionalValue,
        isProtein: ingredient.isProtein,
        isVegetarian: ingredient.isVegetarian,
        isVegan: ingredient.isVegan,
      });
      setIngredients([...ingredients, newIngredient]);
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  };

  const handleRemoveIngredient = async (id: string) => {
    try {
      await ingredientService.deleteIngredient(id);
      setIngredients(ingredients.filter(ing => ing.id !== id));
    } catch (error) {
      console.error('Error removing ingredient:', error);
    }
  };

  const handleUpdateIngredient = async (ingredient: Ingredient) => {
    try {
      const updatedIngredient = await ingredientService.updateIngredient(ingredient.id, {
        name: ingredient.name,
        category: ingredient.category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        expiryDate: ingredient.expiryDate?.toISOString(),
        nutritionalValue: ingredient.nutritionalValue,
        isProtein: ingredient.isProtein,
        isVegetarian: ingredient.isVegetarian,
        isVegan: ingredient.isVegan,
      });
      setIngredients(ingredients.map(ing => (ing.id === ingredient.id ? updatedIngredient : ing)));
    } catch (error) {
      console.error('Error updating ingredient:', error);
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear all ingredients? This action cannot be undone.'
      )
    ) {
      try {
        await ingredientService.clearAllIngredients();
        setIngredients([]);
      } catch (error) {
        console.error('Error clearing ingredients:', error);
      }
    }
  };

  const categoryStats = Object.entries(stats.categories)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your pantry...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Head>
        <title>Pantry Management - Pantry Buddy Pro</title>
        <meta name="description" content="Manage your virtual pantry and ingredients" />
      </Head>

      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pantry Management</h1>
              <p className="text-gray-600">
                Organize your ingredients and track what's in your kitchen
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                disabled={ingredients.length === 0}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Ingredients</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🥗</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.expiringSoon}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⏰</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categories</p>
                  <p className="text-3xl font-bold text-green-600">{categoryStats.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📂</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {categoryStats.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Breakdown</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {categoryStats.map(([category, count]) => (
                  <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{category}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring Soon Alert */}
          {stats.expiringSoon > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-lg font-semibold text-orange-800">
                  {stats.expiringSoon} ingredient{stats.expiringSoon > 1 ? 's' : ''} expiring soon!
                </h3>
              </div>
              <p className="text-orange-700 mb-4">
                These ingredients are expiring within the next 3 days. Consider using them in your
                next recipe.
              </p>
              <div className="flex flex-wrap gap-2">
                {ingredients
                  .filter(ingredient => {
                    if (!ingredient.expiryDate) return false;
                    const daysUntilExpiry = Math.ceil(
                      (new Date(ingredient.expiryDate).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
                  })
                  .map(ingredient => (
                    <span
                      key={ingredient.id}
                      className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-sm font-medium"
                    >
                      {ingredient.name}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Smart Pantry Component */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <SmartPantry
              ingredients={ingredients}
              onAddIngredient={handleAddIngredient}
              onRemoveIngredient={handleRemoveIngredient}
              onUpdateIngredient={handleUpdateIngredient}
            />
          </div>

          {/* Empty State */}
          {ingredients.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="text-6xl mb-4">🥗</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your pantry is empty</h3>
              <p className="text-gray-600 mb-6">
                Start adding ingredients to build your virtual pantry and generate amazing recipes!
              </p>
            </div>
          )}

          {/* Tips Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Pantry Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="flex gap-2">
                <span>📅</span>
                <span>Add expiry dates to track freshness and reduce waste</span>
              </div>
              <div className="flex gap-2">
                <span>📊</span>
                <span>Specify quantities to better plan your meals</span>
              </div>
              <div className="flex gap-2">
                <span>🏷️</span>
                <span>Use categories to organize and find ingredients quickly</span>
              </div>
              <div className="flex gap-2">
                <span>🔄</span>
                <span>Keep your pantry updated for the best recipe suggestions</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
