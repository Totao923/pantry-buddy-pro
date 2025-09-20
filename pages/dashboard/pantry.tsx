import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import SmartPantry from '../../components/SmartPantry';
import QuickSuggestionsCard from '../../components/QuickSuggestionsCard';
import ReceiptScanner from '../../components/ReceiptScanner';
import BarcodeScanner from '../../components/BarcodeScanner';
import ReceiptReview, { ConfirmedReceiptItem } from '../../components/ReceiptReview';
import SpendingAnalytics from '../../components/SpendingAnalytics';
import { getIngredientService } from '../../lib/services/ingredientServiceFactory';
import type { CreateIngredientRequest } from '../../lib/services/ingredientService';
import { useIngredients } from '../../contexts/IngredientsProvider';
import { receiptService, ExtractedReceiptData } from '../../lib/services/receiptService';
import { barcodeService, ProductInfo } from '../../lib/services/barcodeService';
import { useAuth } from '../../lib/auth/AuthProvider';
import { v4 as uuidv4 } from 'uuid';
import { Ingredient, IngredientCategory } from '../../types';

export default function PantryManagement() {
  console.log('🏠 PANTRY COMPONENT: Initializing...');
  const { user, supabaseClient, session } = useAuth();
  const { ingredients, loading: contextLoading, refetch } = useIngredients();
  const [loading, setLoading] = useState(false);
  const [deletingReceipts, setDeletingReceipts] = useState(false);

  console.log('🏠 PANTRY COMPONENT: Initial state - ingredients count:', ingredients.length);
  const [activeTab, setActiveTab] = useState<'pantry' | 'receipts' | 'analytics'>('pantry');
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showReceiptReview, setShowReceiptReview] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<ExtractedReceiptData | null>(null);
  const [receipts, setReceipts] = useState<ExtractedReceiptData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    expiringSoon: 0,
    categories: {} as Record<IngredientCategory, number>,
  });

  const calculateStats = useCallback(() => {
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
  }, [ingredients]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  useEffect(() => {
    loadReceipts();
  }, [user]);

  const loadReceipts = async () => {
    if (!user) return;

    try {
      const userReceipts = await receiptService.getUserReceipts(user.id, supabaseClient);
      setReceipts(userReceipts);
    } catch (error) {
      console.error('Failed to load receipts:', error);
    }
  };

  const handleAddIngredient = async (ingredient: Ingredient) => {
    try {
      console.log('🔍 PANTRY DEBUG: Starting handleAddIngredient for:', ingredient.name);
      console.log('🔍 PANTRY DEBUG: Current ingredients count BEFORE:', ingredients.length);

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
        price: ingredient.price,
      });

      console.log('✅ PANTRY DEBUG: Ingredient service created:', newIngredient);

      // Refresh the global context so all components get updated data
      console.log('🔄 PANTRY DEBUG: Calling refetch to refresh global context...');
      await refetch();

      console.log('🔍 PANTRY DEBUG: Current ingredients count AFTER refetch:', ingredients.length);
      console.log('✅ PANTRY DEBUG: Process completed for:', ingredient.name);
    } catch (error) {
      console.error('❌ PANTRY DEBUG: Error in handleAddIngredient:', error);
    }
  };

  const handleRemoveIngredient = async (id: string) => {
    try {
      console.log('🗑️ Deleting ingredient using service factory:', id);
      const ingredientService = await getIngredientService();
      await ingredientService.deleteIngredient(id);
      // Refresh the global context so all components get updated data
      await refetch();
      console.log('✅ Ingredient removed, context refreshed');
    } catch (error) {
      console.error('❌ Error removing ingredient:', error);
    }
  };

  const handleUpdateIngredient = async (ingredient: Ingredient) => {
    try {
      console.log('✏️ Updating ingredient using service factory:', ingredient.name);
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
      // Refresh the global context so all components get updated data
      await refetch();
      console.log('✅ Ingredient updated and context refreshed:', ingredient.name);
    } catch (error) {
      console.error('Error updating ingredient:', error);
    }
  };

  const handleMarkAsUsed = async (
    ingredientId: string,
    quantityUsed: number,
    reason: 'cooking' | 'expired' | 'waste' | 'other',
    cost?: number
  ) => {
    try {
      console.log('📊 Marking ingredient as used:', { ingredientId, quantityUsed, reason, cost });

      const ingredient = ingredients.find(ing => ing.id === ingredientId);
      if (!ingredient) {
        console.error('❌ Ingredient not found for usage tracking');
        return;
      }

      // Create usage record
      const usageRecord = {
        id: uuidv4(),
        date: new Date(),
        quantityUsed,
        reason,
        cost,
      };

      // Update ingredient with usage tracking
      const currentQuantity = parseFloat(ingredient.quantity?.toString() || '0');
      const newQuantity = Math.max(0, currentQuantity - quantityUsed);

      const updatedIngredient: Ingredient = {
        ...ingredient,
        quantity: newQuantity > 0 ? newQuantity.toString() : undefined,
        usageHistory: [...(ingredient.usageHistory || []), usageRecord],
        totalUsed: (ingredient.totalUsed || 0) + quantityUsed,
        lastUsedDate: new Date(),
        ...(cost && ingredient.costPerUnit ? {} : cost ? { costPerUnit: cost / quantityUsed } : {}),
      };

      // Update using the ingredient service
      const ingredientService = await getIngredientService();
      await ingredientService.updateIngredient(ingredientId, {
        name: updatedIngredient.name,
        category: updatedIngredient.category,
        quantity: updatedIngredient.quantity,
        unit: updatedIngredient.unit,
        expiryDate: updatedIngredient.expiryDate?.toISOString(),
        nutritionalValue: updatedIngredient.nutritionalValue,
        isProtein: updatedIngredient.isProtein,
        isVegetarian: updatedIngredient.isVegetarian,
        isVegan: updatedIngredient.isVegan,
        usageHistory: updatedIngredient.usageHistory,
        totalUsed: updatedIngredient.totalUsed,
        lastUsedDate: updatedIngredient.lastUsedDate?.toISOString(),
        costPerUnit: updatedIngredient.costPerUnit,
      });

      // Refresh the context
      await refetch();
      console.log('✅ Usage tracked, context refreshed');
    } catch (error) {
      console.error('❌ Error tracking ingredient usage:', error);
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        'Are you sure you want to clear all ingredients? This action cannot be undone.'
      )
    ) {
      try {
        console.log('🗑️ Clearing all ingredients using service factory...');
        const ingredientService = await getIngredientService();
        await ingredientService.clearAllIngredients();
        // Refresh the global context so all components get updated data
        await refetch();
        console.log('✅ All ingredients cleared, context refreshed');
      } catch (error) {
        console.error('❌ Error clearing ingredients:', error);
        alert('Failed to clear ingredients. Please try again.');
      }
    }
  };

  const handleReceiptConfirmed = async (confirmedItems: ConfirmedReceiptItem[]) => {
    console.log(
      '📋 RECEIPT DEBUG: handleReceiptConfirmed called with',
      confirmedItems.length,
      'items'
    );
    setLoading(true);

    try {
      // Calculate correct total from confirmed items (price × quantity)
      const calculatedTotal = confirmedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const calculatedTax = calculatedTotal * 0.08; // 8% tax estimate

      // Update receipt data with calculated totals
      if (currentReceipt && user) {
        const updatedReceipt = {
          ...currentReceipt,
          totalAmount: calculatedTotal,
          taxAmount: calculatedTax,
          items: confirmedItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price * item.quantity, // Total price for this item
            quantity: item.quantity,
            unit: item.unit || 'piece',
            category: item.category,
            confidence: item.confidence || 0.95,
          })),
        };

        // Save updated receipt data to database
        await receiptService.saveReceiptData(updatedReceipt, user.id, supabaseClient);
        console.log('💾 Saved receipt with calculated total:', calculatedTotal);
      }

      // Now properly add each confirmed item using the same flow as manual addition
      for (const item of confirmedItems) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + item.expirationDays);

        const ingredient: Ingredient = {
          id: '',
          name: item.name,
          category: item.category!,
          quantity: item.quantity?.toString(),
          unit: item.unit,
          expiryDate: expirationDate,
          price: item.price, // Keep individual item price for per-unit cost
          isVegetarian:
            item.category !== 'protein' ||
            ['tofu', 'beans', 'eggs'].some(v => item.name.toLowerCase().includes(v)),
          isVegan:
            !['dairy', 'protein'].includes(item.category!) ||
            ['tofu', 'beans'].some(v => item.name.toLowerCase().includes(v)),
          isProtein: item.category === 'protein',
        };

        console.log('📦 RECEIPT DEBUG: Adding receipt item via handleAddIngredient:', item.name);
        await handleAddIngredient(ingredient);
      }

      // Reload receipts and show success
      await loadReceipts();
      alert(`Successfully added ${confirmedItems.length} items to your pantry!`);
      setShowReceiptReview(false);
      setCurrentReceipt(null);
      console.log('✅ RECEIPT DEBUG: All receipt items processed');
    } catch (error) {
      console.error('❌ RECEIPT DEBUG: Failed to confirm receipt:', error);
      setError('Failed to save receipt data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categoryStats = Object.entries(stats.categories)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  if (contextLoading || loading) {
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
            {activeTab === 'pantry' && (
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
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                {[
                  { key: 'pantry', label: 'Pantry', icon: '🥗' },
                  { key: 'receipts', label: 'Receipt History', icon: '📂' },
                  { key: 'analytics', label: 'Spending Analytics', icon: '📊' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-pantry-500 text-pantry-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'pantry' && (
                <div className="space-y-8">
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
                          <p className="text-3xl font-bold text-green-600">
                            {categoryStats.length}
                          </p>
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
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Category Breakdown
                      </h2>
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
                          {stats.expiringSoon} ingredient{stats.expiringSoon > 1 ? 's' : ''}{' '}
                          expiring soon!
                        </h3>
                      </div>
                      <p className="text-orange-700 mb-4">
                        These ingredients are expiring within the next 3 days. Consider using them
                        in your next recipe.
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
                      onMarkAsUsed={handleMarkAsUsed}
                    />
                  </div>

                  {/* Empty State */}
                  {ingredients.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                      <div className="text-6xl mb-4">🥗</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Your pantry is empty
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Start adding ingredients to build your virtual pantry and generate amazing
                        recipes!
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
              )}
              {activeTab === 'receipts' && (
                <div className="space-y-6">
                  {receipts.length > 0 ? (
                    <div className="space-y-4">
                      {/* Delete All Button */}
                      <div className="flex justify-end">
                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                'Are you sure you want to delete all receipts? This cannot be undone.'
                              )
                            ) {
                              try {
                                setDeletingReceipts(true);
                                setReceipts([]); // Clear UI immediately for better UX
                                localStorage.removeItem('userReceipts'); // Clear localStorage receipts

                                console.log('🔑 Frontend auth debug:', {
                                  hasSession: !!session,
                                  hasAccessToken: !!session?.access_token,
                                  tokenLength: session?.access_token?.length || 0,
                                  hasUser: !!user,
                                  userId: user?.id,
                                });

                                const response = await fetch('/api/delete-all-receipts', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${session?.access_token}`,
                                  },
                                });
                                if (response.ok) {
                                  await loadReceipts(); // Refresh the list
                                  alert('All receipts deleted successfully!');
                                } else {
                                  alert('Failed to delete receipts');
                                  await loadReceipts(); // Reload on error
                                }
                              } catch (error) {
                                console.error('Error deleting receipts:', error);
                                alert('Failed to delete receipts');
                                await loadReceipts(); // Reload on error
                              } finally {
                                setDeletingReceipts(false);
                              }
                            }
                          }}
                          disabled={deletingReceipts || receipts.length === 0}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingReceipts ? 'Deleting...' : 'Delete All Receipts'}
                        </button>
                      </div>
                      {receipts.map(receipt => (
                        <div
                          key={receipt.id}
                          className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <span className="text-3xl">🧾</span>
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {receipt.storeName}
                                </h3>
                                <div className="text-sm text-gray-500">
                                  {receipt.receiptDate.toLocaleDateString()} •{' '}
                                  {receipt.items.length} items
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                ${receipt.totalAmount.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Tax: ${receipt.taxAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Items Preview */}
                          <div className="bg-gray-50 rounded-xl p-4">
                            <h4 className="font-medium text-gray-900 mb-3">
                              Items ({receipt.items.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {receipt.items.slice(0, 6).map(item => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-2 bg-white rounded-lg text-sm"
                                >
                                  <span className="text-gray-700 truncate">{item.name}</span>
                                  <span className="font-medium text-gray-900">
                                    ${item.price.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                              {receipt.items.length > 6 && (
                                <div className="p-2 text-center text-gray-500 text-sm">
                                  +{receipt.items.length - 6} more items
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Confidence Indicator */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Processing confidence:</span>
                              <div
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  receipt.confidence > 0.8
                                    ? 'bg-green-100 text-green-800'
                                    : receipt.confidence > 0.6
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {Math.round(receipt.confidence * 100)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <span className="text-6xl mb-4 block">📂</span>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">
                        No Receipt History
                      </h3>
                      <p className="text-gray-500">
                        Start scanning receipts to see them appear here
                      </p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'analytics' && <SpendingAnalytics receipts={receipts} />}
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
