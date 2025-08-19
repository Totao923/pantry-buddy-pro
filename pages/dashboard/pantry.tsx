import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import SmartPantry from '../../components/SmartPantry';
import QuickSuggestionsCard from '../../components/QuickSuggestionsCard';
import ReceiptScanner from '../../components/ReceiptScanner';
import BarcodeScanner from '../../components/BarcodeScanner';
import ReceiptReview, { ConfirmedReceiptItem } from '../../components/ReceiptReview';
import { getIngredientService } from '../../lib/services/ingredientServiceFactory';
import { receiptService, ExtractedReceiptData } from '../../lib/services/receiptService';
import { barcodeService, ProductInfo } from '../../lib/services/barcodeService';
import { useAuth } from '../../lib/auth/AuthProvider';
import { v4 as uuidv4 } from 'uuid';
import { Ingredient, IngredientCategory } from '../../types';

export default function PantryManagement() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ExtractedReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      const ingredientService = await getIngredientService();
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
      const ingredientService = await getIngredientService();
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
      const ingredientService = await getIngredientService();
      await ingredientService.deleteIngredient(id);
      setIngredients(ingredients.filter(ing => ing.id !== id));
    } catch (error) {
      console.error('Error removing ingredient:', error);
    }
  };

  const handleUpdateIngredient = async (ingredient: Ingredient) => {
    try {
      const ingredientService = await getIngredientService();
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
        const ingredientService = await getIngredientService();
        await ingredientService.clearAllIngredients();
        setIngredients([]);
      } catch (error) {
        console.error('Error clearing ingredients:', error);
      }
    }
  };

  const handleReceiptConfirmed = async (confirmedItems: ConfirmedReceiptItem[]) => {
    if (!currentReceipt || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Save receipt data
      await receiptService.saveReceiptData(currentReceipt, user.id);

      // Add confirmed items to pantry
      for (const item of confirmedItems) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + item.expirationDays);

        const pantryItem = {
          id: uuidv4(),
          name: item.name,
          category: item.category!,
          currentQuantity: item.quantity,
          originalQuantity: item.quantity,
          unit: item.unit,
          location: item.storageLocation,
          price: item.price,
          brand: item.brand,
          purchaseDate: currentReceipt.receiptDate,
          expiryDate: expirationDate.toISOString(),
          isRunningLow: false,
          usageFrequency: 0,
          autoReorderLevel: Math.max(1, Math.floor(item.quantity * 0.2)),
          isVegetarian:
            item.category !== 'protein' ||
            ['tofu', 'beans', 'eggs'].some(v => item.name.toLowerCase().includes(v)),
          isVegan:
            !['dairy', 'protein'].includes(item.category!) ||
            ['tofu', 'beans'].some(v => item.name.toLowerCase().includes(v)),
          isProtein: item.category === 'protein',
        };

        try {
          const ingredientService = await getIngredientService();
          await ingredientService.createIngredient(pantryItem);
        } catch (error) {
          console.error('Failed to add item to pantry:', error);
        }
      }

      // Reload ingredients to show new items in pantry
      await loadIngredients();

      // Show success and close review
      alert(`Successfully added ${confirmedItems.length} items to your pantry!`);
      setShowReceiptReview(false);
      setCurrentReceipt(null);
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
      setError('Failed to save receipt data. Please try again.');
    } finally {
      setLoading(false);
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
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pantry Management</h1>
              <p className="text-gray-600">
                Organize your ingredients and track what's in your kitchen
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowReceiptScanner(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2"
              >
                <span>📄</span>
                Scan Receipt
              </button>
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-medium flex items-center gap-2"
              >
                <span>📱</span>
                Scan Barcode
              </button>
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

          {/* Recipe Suggestions based on pantry */}
          {ingredients.length >= 3 && <QuickSuggestionsCard />}

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
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowReceiptScanner(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <span>📄</span>
                  Scan Receipt
                </button>
                <button
                  onClick={() => setShowBarcodeScanner(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <span>📱</span>
                  Scan Barcode
                </button>
              </div>
            </div>
          )}

          {/* Tips Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Pantry Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="flex gap-2">
                <span>📄</span>
                <span>Scan receipts to quickly add multiple ingredients at once</span>
              </div>
              <div className="flex gap-2">
                <span>📱</span>
                <span>Use barcode scanning for instant product identification</span>
              </div>
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

        {/* Receipt Scanner Modal */}
        {showReceiptScanner && (
          <ReceiptScanner
            onClose={() => setShowReceiptScanner(false)}
            loading={loading}
            onReceiptScanned={async (imageData, file) => {
              setLoading(true);
              setError(null);

              try {
                console.log('Processing receipt:', file.name);
                const extractedData = await receiptService.processReceiptImage(file);
                setCurrentReceipt(extractedData);
                setShowReceiptScanner(false);
                setShowReceiptReview(true);
              } catch (error) {
                console.error('Receipt processing failed:', error);
                setError(error instanceof Error ? error.message : 'Failed to process receipt');
                setShowReceiptScanner(false);
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        {/* Barcode Scanner Modal */}
        {showBarcodeScanner && (
          <BarcodeScanner
            onClose={() => setShowBarcodeScanner(false)}
            onProductFound={async (product: ProductInfo) => {
              try {
                // Save scanned product to history
                await barcodeService.saveScannedProduct(product, user?.id);

                // Create ingredient from scanned product
                const ingredient: Ingredient = {
                  id: '',
                  name: product.name,
                  category: product.category,
                  quantity: '1',
                  unit: product.unit || 'item',
                  expiryDate: undefined,
                  nutritionalValue: product.nutritionInfo?.calories,
                  isProtein: product.category === 'protein',
                  isVegetarian: product.isVegetarian,
                  isVegan: product.isVegan,
                };

                await handleAddIngredient(ingredient);
                alert(`Added ${product.name} to your pantry!`);
                setShowBarcodeScanner(false);
              } catch (error) {
                console.error('Failed to add scanned product:', error);
                alert('Failed to add product to pantry. Please try again.');
              }
            }}
          />
        )}

        {/* Receipt Review Modal */}
        {showReceiptReview && currentReceipt && (
          <ReceiptReview
            receiptData={currentReceipt}
            onConfirm={handleReceiptConfirmed}
            onClose={() => {
              setShowReceiptReview(false);
              setCurrentReceipt(null);
              setError(null);
            }}
            loading={loading}
          />
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
