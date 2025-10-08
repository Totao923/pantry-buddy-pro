import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import ReceiptScanner from '../../components/ReceiptScanner';
import ReceiptReview, { ConfirmedReceiptItem } from '../../components/ReceiptReview';
import BarcodeScanner from '../../components/BarcodeScanner';
import { ConfirmedBarcodeItem } from '../../components/BarcodeItemConfirm';
import SpendingAnalytics from '../../components/SpendingAnalytics';
import { useAuth } from '../../lib/auth/AuthProvider';
import { receiptService, ExtractedReceiptData } from '../../lib/services/receiptService';
import { barcodeService, ProductInfo } from '../../lib/services/barcodeService';
import { ingredientService } from '../../lib/services/ingredientService';
import { v4 as uuidv4 } from 'uuid';

export default function Receipts() {
  const router = useRouter();
  const { user, subscription, supabaseClient } = useAuth();
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'analytics'>('scan');
  const [showScanner, setShowScanner] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentReceipt, setCurrentReceipt] = useState<ExtractedReceiptData | null>(null);
  const [receipts, setReceipts] = useState<ExtractedReceiptData[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleReceiptScanned = async (imageData: string, file: File) => {
    setLoading(true);
    setError(null);

    try {
      const extractedData = await receiptService.processReceiptImage(file);
      setCurrentReceipt(extractedData);
      setShowScanner(false);
      setShowReview(true);
    } catch (error) {
      console.error('Receipt processing failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to process receipt');
      setShowScanner(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptConfirmed = async (confirmedItems: ConfirmedReceiptItem[]) => {
    console.log('🎯🎯🎯 NEW VERSION - handleReceiptConfirmed called!');
    console.log('🎯 Items received:', confirmedItems?.length || 0);

    if (!currentReceipt || !user) {
      console.error('❌ Missing currentReceipt or user', {
        currentReceipt: !!currentReceipt,
        user: !!user,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Save receipt data
      await receiptService.saveReceiptData(currentReceipt, user.id, supabaseClient);

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
          console.log('🥕 Creating ingredient:', item.name);
          await ingredientService.createIngredient(pantryItem);
          console.log('✅ Successfully created ingredient:', item.name);
        } catch (error) {
          console.error('❌ Failed to add item to pantry:', item.name, error);
        }
      }

      // Reload receipts and show success
      await loadReceipts();
      setSuccessMessage(`Successfully added ${confirmedItems.length} items to your pantry!`);
      setShowReview(false);
      setCurrentReceipt(null);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
      setError('Failed to save receipt data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductScanned = async (confirmedData: ConfirmedBarcodeItem) => {
    try {
      const { product, price, quantity, purchaseDate } = confirmedData;

      // Save scanned product to history
      await barcodeService.saveScannedProduct(product, user?.id);

      // Create pantry item from scanned product with confirmed data
      const expirationDate = new Date(purchaseDate);
      expirationDate.setDate(expirationDate.getDate() + 30); // Default 30 days

      const pantryItem = {
        id: uuidv4(),
        name: product.name,
        category: product.category,
        currentQuantity: quantity,
        originalQuantity: quantity,
        unit: product.unit || 'each',
        brand: product.brand,
        barcode: product.barcode,
        price: price,
        purchaseDate: purchaseDate,
        expiryDate: expirationDate.toISOString(),
        isRunningLow: false,
        usageFrequency: 0,
        autoReorderLevel: 1,
        isVegetarian: product.isVegetarian,
        isVegan: product.isVegan,
        isProtein: product.category === 'protein',
      };

      await ingredientService.createIngredient(pantryItem);

      // Create single-item receipt for spending analytics
      const singleItemReceipt: ExtractedReceiptData = {
        id: uuidv4(),
        storeName: 'Single Item Scanned',
        receiptDate: purchaseDate,
        totalAmount: price * quantity,
        taxAmount: 0,
        items: [
          {
            id: uuidv4(),
            name: product.name,
            price: price,
            quantity: quantity,
            unit: product.unit || 'item',
            category: product.category,
            confidence: product.confidence,
          },
        ],
        rawText: `Single Item: ${product.name} - $${price.toFixed(2)}`,
        confidence: product.confidence,
      };

      // Save to receipt service
      if (user) {
        await receiptService.saveReceiptData(singleItemReceipt, user.id, supabaseClient);
        await loadReceipts(); // Refresh receipts list
      }

      setSuccessMessage(`Added ${product.name} to your pantry!`);
      setShowBarcodeScanner(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to add scanned product:', error);
      setError('Failed to add product to pantry. Please try again.');
    }
  };

  const renderScanTab = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setShowScanner(true)}
          className="flex flex-col items-center p-8 bg-gradient-to-br from-pantry-50 to-pantry-100 rounded-2xl border-2 border-pantry-200 hover:border-pantry-300 transition-all group"
        >
          <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</span>
          <h3 className="text-xl font-bold text-pantry-800 mb-2">Scan Receipt</h3>
          <p className="text-pantry-600 text-center">
            Take a photo or upload an image of your grocery receipt to automatically add items to
            your pantry
          </p>
          <div className="mt-4 px-4 py-2 bg-pantry-200 text-pantry-800 rounded-lg text-sm font-medium">
            Premium Feature
          </div>
        </button>

        <button
          onClick={() => setShowBarcodeScanner(true)}
          className="flex flex-col items-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 hover:border-blue-300 transition-all group"
        >
          <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">📷</span>
          <h3 className="text-xl font-bold text-blue-800 mb-2">Scan Barcode</h3>
          <p className="text-blue-600 text-center">
            Scan product barcodes to quickly add individual items with detailed information
          </p>
          <div className="mt-4 px-4 py-2 bg-blue-200 text-blue-800 rounded-lg text-sm font-medium">
            Available for All Users
          </div>
        </button>
      </div>

      {/* Recent Activity */}
      {receipts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Receipts</h3>
          <div className="space-y-3">
            {receipts.slice(0, 5).map(receipt => (
              <div
                key={receipt.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">🧾</span>
                  <div>
                    <div className="font-medium text-gray-900">{receipt.storeName}</div>
                    <div className="text-sm text-gray-500">
                      {receipt.receiptDate.toLocaleDateString()} • {receipt.items.length} items
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    ${receipt.totalAmount.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {receipt.confidence > 0.8 ? '✅ High confidence' : '⚠️ Review needed'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Getting Started */}
      {receipts.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📱</span>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Start Scanning Receipts</h3>
          <p className="text-gray-500 mb-6">
            Automatically track your grocery spending and add items to your pantry
          </p>
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 max-w-2xl mx-auto">
            <h4 className="font-semibold text-blue-800 mb-3">How it works:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-700 text-sm">
              <div className="text-center">
                <div className="text-2xl mb-2">📸</div>
                <div className="font-medium">1. Scan or Upload</div>
                <div>Take a photo of your receipt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-medium">2. Review Items</div>
                <div>Confirm and categorize items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="font-medium">3. Add to Pantry</div>
                <div>Items appear in your pantry</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      {receipts.length > 0 ? (
        <div className="space-y-4">
          {receipts.map(receipt => (
            <div
              key={receipt.id}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🧾</span>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{receipt.storeName}</h3>
                    <div className="text-sm text-gray-500">
                      {receipt.receiptDate.toLocaleDateString()} • {receipt.items.length} items
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    ${receipt.totalAmount.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Tax: ${receipt.taxAmount.toFixed(2)}</div>
                </div>
              </div>

              {/* Items Preview */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-3">Items ({receipt.items.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {receipt.items.slice(0, 6).map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg text-sm"
                    >
                      <span className="text-gray-700 truncate">{item.name}</span>
                      <span className="font-medium text-gray-900">${item.price.toFixed(2)}</span>
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
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Receipt History</h3>
          <p className="text-gray-500">Start scanning receipts to see them appear here</p>
        </div>
      )}
    </div>
  );

  const renderAnalyticsTab = () => <SpendingAnalytics receipts={receipts} />;

  return (
    <AuthGuard>
      <Head>
        <title>Receipt Scanner - Pantry Buddy Pro</title>
        <meta name="description" content="Scan receipts and track your grocery spending" />
      </Head>

      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Receipt Scanner & Analytics</h1>
            <p className="text-gray-600">
              Scan receipts to automatically track spending and add items to your pantry
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span className="font-medium">{successMessage}</span>
              </div>
            </div>
          )}

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

          {/* Tabs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                {[
                  { key: 'scan', label: 'Scan Receipts', icon: '📄' },
                  { key: 'history', label: 'Receipt History', icon: '📂' },
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
              {activeTab === 'scan' && renderScanTab()}
              {activeTab === 'history' && renderHistoryTab()}
              {activeTab === 'analytics' && renderAnalyticsTab()}
            </div>
          </div>
        </div>

        {/* Modals */}
        {showScanner && (
          <ReceiptScanner
            onReceiptScanned={handleReceiptScanned}
            onClose={() => setShowScanner(false)}
            loading={loading}
          />
        )}

        {showBarcodeScanner && (
          <BarcodeScanner
            onProductFound={handleProductScanned}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )}

        {showReview && currentReceipt && (
          <ReceiptReview
            receiptData={currentReceipt}
            onConfirm={async confirmedItems => {
              alert('INLINE FUNCTION CALLED!'); // This should definitely show
              console.log(
                '🔥🔥🔥 INLINE FUNCTION - Adding items to pantry:',
                confirmedItems.length
              );

              if (!currentReceipt || !user) {
                console.error('❌ Missing currentReceipt or user');
                setError('Missing required data');
                return;
              }

              setLoading(true);
              setError(null);

              try {
                // Save receipt data
                console.log('💾 Saving receipt data...');
                await receiptService.saveReceiptData(currentReceipt, user.id, supabaseClient);

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
                    console.log('🥕 Creating ingredient:', item.name);
                    await ingredientService.createIngredient(pantryItem);
                    console.log('✅ Successfully created ingredient:', item.name);
                  } catch (error) {
                    console.error('❌ Failed to add item to pantry:', item.name, error);
                  }
                }

                // Reload receipts and show success
                await loadReceipts();
                setSuccessMessage(
                  `Successfully added ${confirmedItems.length} items to your pantry!`
                );
                setShowReview(false);
                setCurrentReceipt(null);

                // Clear success message after 5 seconds
                setTimeout(() => setSuccessMessage(null), 5000);

                console.log('🎉 ALL DONE - Items added successfully!');
              } catch (error) {
                console.error('❌ Failed to save receipt data:', error);
                setError('Failed to save receipt data. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            onClose={() => {
              setShowReview(false);
              setCurrentReceipt(null);
            }}
            loading={loading}
          />
        )}
      </DashboardLayout>
    </AuthGuard>
  );
}
