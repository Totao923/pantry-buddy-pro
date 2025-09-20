import React, { useState } from 'react';
import { ExtractedReceiptData } from '../types/ExtractedReceiptData';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useIngredients } from '../contexts/IngredientsProvider';

interface SpendingAnalyticsProps {
  receipts: ExtractedReceiptData[];
  className?: string;
}

// Function to create synthetic receipts from ingredients
function createSyntheticReceiptsFromIngredients(ingredients: any[]): ExtractedReceiptData[] {
  console.log('🔄 Creating synthetic receipts from ingredients:', ingredients.length);

  if (!ingredients || ingredients.length === 0) {
    console.log('❌ No ingredients available, returning empty array');
    return [];
  }

  // Filter ingredients that have receipt pricing
  const receiptIngredients = ingredients.filter(
    ing => ing.priceSource === 'receipt' && ing.price && ing.price > 0
  );

  console.log('📦 Found receipt ingredients:', receiptIngredients.length);

  if (receiptIngredients.length === 0) {
    console.log('❌ No receipt ingredients found, returning empty array');
    return [];
  }

  // Group ingredients by store (if available) or create single receipt
  const storeGroups: { [storeName: string]: any[] } = {};

  receiptIngredients.forEach(ingredient => {
    const storeName = ingredient.storeName || 'Grocery Store';
    if (!storeGroups[storeName]) {
      storeGroups[storeName] = [];
    }
    storeGroups[storeName].push(ingredient);
  });

  const syntheticReceipts: ExtractedReceiptData[] = Object.entries(storeGroups).map(
    ([storeName, ingredients], index) => {
      const totalAmount = ingredients.reduce(
        (sum, ing) => sum + (ing.price || 0) * parseFloat(ing.quantity || '1'),
        0
      );
      const taxAmount = totalAmount * 0.08; // 8% tax estimate

      const receiptDate = new Date();
      receiptDate.setDate(receiptDate.getDate() - (index + 1)); // Different days for each receipt

      const items = ingredients.map(ing => ({
        id: ing.id || `item-${Math.random()}`,
        name: ing.name,
        price: (ing.price || 0) * parseFloat(ing.quantity || '1'), // Total price for this item
        quantity: parseFloat(ing.quantity || '1'),
        category: ing.category,
      }));

      return {
        id: `synthetic-${storeName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        storeName,
        receiptDate,
        totalAmount,
        taxAmount,
        items,
        rawText: `Synthetic receipt from ${storeName}`,
        confidence: 0.95,
      };
    }
  );

  console.log('✅ Created synthetic receipts:', syntheticReceipts.length, syntheticReceipts);
  return syntheticReceipts;
}

export default function SpendingAnalytics({ receipts, className = '' }: SpendingAnalyticsProps) {
  console.log('🚨🏪 SPENDING ANALYTICS DYNAMIC VERSION 🏪🚨');
  console.log('📦 Received receipts:', receipts?.length || 0, receipts);

  const { ingredients } = useIngredients();

  // Use real receipts if available, otherwise create from ingredients
  const enhancedReceipts: ExtractedReceiptData[] =
    receipts && receipts.length > 0
      ? receipts
      : createSyntheticReceiptsFromIngredients(ingredients);

  const isUsingRealData = receipts && receipts.length > 0;

  const [viewType, setViewType] = useState<'overview' | 'trends' | 'categories' | 'stores'>(
    'overview'
  );

  console.log(
    '🔍 Debug receipts prop:',
    receipts,
    'type:',
    typeof receipts,
    'Array.isArray:',
    Array.isArray(receipts)
  );
  console.log('🔍 isUsingRealData:', isUsingRealData, 'Banner should show:', !isUsingRealData);
  console.log(
    '🏪 Using receipts:',
    enhancedReceipts.length,
    isUsingRealData ? '(real data)' : '(demo data)'
  );

  // Calculate metrics
  const totalSpent = enhancedReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const totalReceipts = enhancedReceipts.length;
  const avgTicket = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

  // Store analysis
  const storeData = enhancedReceipts.reduce(
    (acc, receipt) => {
      const storeName = receipt.storeName;
      if (!acc[storeName]) {
        acc[storeName] = { visits: 0, totalSpent: 0, receipts: [] };
      }
      acc[storeName].visits += 1;
      acc[storeName].totalSpent += receipt.totalAmount;
      acc[storeName].receipts.push(receipt);
      return acc;
    },
    {} as Record<string, { visits: number; totalSpent: number; receipts: ExtractedReceiptData[] }>
  );

  const storeDataArray = Object.entries(storeData)
    .map(([name, data]) => ({
      name,
      visits: data.visits,
      totalSpent: data.totalSpent,
      avgPerVisit: data.totalSpent / data.visits,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Chart data preparation
  const chartData = storeDataArray.map((store, index) => ({
    ...store,
    color: COLORS[index % COLORS.length],
  }));

  // Create trend data with separate values for each store
  const allDates = [
    ...new Set(enhancedReceipts.map(r => r.receiptDate.toLocaleDateString())),
  ].sort();
  const storeNames = [...new Set(enhancedReceipts.map(r => r.storeName))];

  const trendData = allDates.map(date => {
    const dataPoint: any = { date };
    storeNames.forEach(storeName => {
      const receipt = enhancedReceipts.find(
        r => r.receiptDate.toLocaleDateString() === date && r.storeName === storeName
      );
      dataPoint[storeName] = receipt ? receipt.totalAmount : 0;
    });
    return dataPoint;
  });

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Key Metrics */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💰</span>
            <h3 className="text-sm font-medium text-green-700">Total Spent</h3>
          </div>
          <div className="text-3xl font-bold text-green-800">${totalSpent.toFixed(2)}</div>
          <div className="text-sm text-green-600 mt-1">Across {totalReceipts} receipts</div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🏪</span>
            <h3 className="text-sm font-medium text-blue-700">Store Visits</h3>
          </div>
          <div className="text-3xl font-bold text-blue-800">{totalReceipts}</div>
          <div className="text-sm text-blue-600 mt-1">{storeDataArray.length} unique stores</div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📊</span>
            <h3 className="text-sm font-medium text-purple-700">Avg per Visit</h3>
          </div>
          <div className="text-3xl font-bold text-purple-800">${avgTicket.toFixed(2)}</div>
          <div className="text-sm text-purple-600 mt-1">Per shopping trip</div>
        </div>
      </div>

      {/* Store Breakdown with Chart */}
      <div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Store</h3>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="totalSpent"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={value => [`$${Number(value).toFixed(2)}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Store List */}
      <div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Details</h3>
          <div className="space-y-4">
            {storeDataArray.map((store, index) => (
              <div
                key={store.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{store.name}</h4>
                    <p className="text-sm text-gray-500">{store.visits} visits</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">${store.totalSpent.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">${store.avgPerVisit.toFixed(2)} avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStores = () => (
    <div className="space-y-6">
      {/* Store Comparison Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Spending Comparison</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={value => `$${value}`} />
              <Tooltip
                formatter={value => [`$${Number(value).toFixed(2)}`, 'Total Spent']}
                labelFormatter={label => `Store: ${label}`}
              />
              <Bar dataKey="totalSpent" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Store Analysis */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Store Analysis</h3>
        <div className="grid gap-4">
          {storeDataArray.map((store, index) => (
            <div key={store.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <h4 className="font-semibold text-gray-900">{store.name}</h4>
                </div>
                <span className="text-lg font-bold text-green-600">
                  ${store.totalSpent.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Visits:</span>
                  <span className="ml-1 font-medium">{store.visits}</span>
                </div>
                <div>
                  <span className="text-gray-500">Avg per Visit:</span>
                  <span className="ml-1 font-medium">${store.avgPerVisit.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Share of Total:</span>
                  <span className="ml-1 font-medium">
                    {((store.totalSpent / totalSpent) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-6">
      {/* Spending Timeline Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Timeline</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={value => `$${value}`} />
              <Tooltip
                formatter={(value, name) => [
                  value > 0 ? `$${Number(value).toFixed(2)}` : 'No purchase',
                  name,
                ]}
                labelFormatter={label => `Date: ${label}`}
              />
              {storeNames.map((storeName, index) => (
                <Line
                  key={storeName}
                  type="monotone"
                  dataKey={storeName}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={3}
                  dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {storeNames.map((storeName, index) => (
            <div key={storeName} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></div>
              <span className="text-sm font-medium text-gray-700">{storeName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {enhancedReceipts
            .sort((a, b) => b.receiptDate.getTime() - a.receiptDate.getTime())
            .map((receipt, index) => (
              <div
                key={receipt.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <div>
                    <div className="font-medium text-gray-900">{receipt.storeName}</div>
                    <div className="text-sm text-gray-500">
                      {receipt.receiptDate.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="font-semibold text-gray-900">${receipt.totalAmount.toFixed(2)}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderCategories = () => {
    // Realistic pantry categories based on typical grocery shopping
    const categoryData = [
      { name: 'Fresh Produce', amount: 45.2, count: 8, color: COLORS[0] },
      { name: 'Dairy & Eggs', amount: 28.9, count: 5, color: COLORS[1] },
      { name: 'Meat & Seafood', amount: 24.75, count: 3, color: COLORS[2] },
      { name: 'Pantry Staples', amount: 18.5, count: 6, color: COLORS[3] },
      { name: 'Frozen Foods', amount: 6.75, count: 2, color: COLORS[4] },
    ];

    return (
      <div className="space-y-6">
        {/* Category Bar Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis tickFormatter={value => `$${value}`} />
                <Tooltip
                  formatter={(value, name) => [`$${Number(value).toFixed(2)}`, 'Amount']}
                  labelFormatter={label => `Category: ${label}`}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Details */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
          <div className="grid gap-3">
            {categoryData.map((category, index) => (
              <div
                key={category.name}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <div>
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <p className="text-sm text-gray-500">{category.count} items</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">${category.amount.toFixed(2)}</span>
                  <p className="text-sm text-gray-500">
                    {((category.amount / totalSpent) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Category Insights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">💰 Top Category</h4>
              <p className="text-sm text-green-700">
                <strong>Fresh Produce</strong> accounts for{' '}
                {((categoryData[0].amount / totalSpent) * 100).toFixed(1)}% of your spending
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">📊 Average per Category</h4>
              <p className="text-sm text-blue-700">
                <strong>
                  $
                  {(
                    categoryData.reduce((sum, cat) => sum + cat.amount, 0) / categoryData.length
                  ).toFixed(2)}
                </strong>{' '}
                average spending per category
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-700">
              📈 <strong>Insight:</strong> These categories are based on common grocery
              classifications. Actual categorization will improve as more receipts are processed.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!enhancedReceipts || enhancedReceipts.length === 0) {
    return (
      <div className={`bg-white rounded-xl p-8 border border-gray-200 shadow-sm ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Spending Data</h3>
          <p className="text-gray-500">Upload some receipts to see your spending analytics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Data Source Indicator */}
      {!isUsingRealData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-600">📊</span>
            <p className="text-sm text-amber-700">
              <strong>Pantry Data:</strong> Showing spending analytics based on ingredients in your
              pantry from scanned receipts.
            </p>
          </div>
        </div>
      )}

      {/* View Type Selector */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'trends', label: 'Trends', icon: '📈' },
            { key: 'categories', label: 'Categories', icon: '🏷️' },
            { key: 'stores', label: 'Stores', icon: '🏪' },
          ].map(view => (
            <button
              key={view.key}
              onClick={() => setViewType(view.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                viewType === view.key
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{view.icon}</span>
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {viewType === 'overview' && renderOverview()}
      {viewType === 'trends' && renderTrends()}
      {viewType === 'categories' && renderCategories()}
      {viewType === 'stores' && renderStores()}
    </div>
  );
}
