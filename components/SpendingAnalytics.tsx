import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { ExtractedReceiptData } from '../lib/services/receiptService';
import { IngredientCategory } from '../types';

interface SpendingAnalyticsProps {
  receipts: ExtractedReceiptData[];
  className?: string;
}

interface SpendingData {
  period: string;
  amount: number;
  receipts: number;
}

interface CategorySpending {
  category: string;
  amount: number;
  items: number;
  color: string;
}

interface StoreSpending {
  store: string;
  amount: number;
  visits: number;
  avgTicket: number;
}

const categoryColors: Record<IngredientCategory, string> = {
  protein: '#ef4444',
  vegetables: '#22c55e',
  fruits: '#ec4899',
  grains: '#eab308',
  dairy: '#3b82f6',
  spices: '#f97316',
  herbs: '#10b981',
  oils: '#84cc16',
  pantry: '#f59e0b',
  other: '#6b7280',
};

export default function SpendingAnalytics({ receipts, className = '' }: SpendingAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | '1year'>('30days');
  const [viewType, setViewType] = useState<'overview' | 'trends' | 'categories' | 'stores'>(
    'overview'
  );

  const filteredReceipts = useMemo(() => {
    const now = new Date();
    const daysBack = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
      '1year': 365,
    }[timeRange];

    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return receipts.filter(receipt => receipt.receiptDate >= cutoffDate);
  }, [receipts, timeRange]);

  const spendingTrends = useMemo(() => {
    const trends: SpendingData[] = [];
    const groupBy = timeRange === '7days' ? 'day' : timeRange === '30days' ? 'day' : 'week';

    if (groupBy === 'day') {
      const dailySpending = new Map<string, { amount: number; receipts: number }>();

      filteredReceipts.forEach(receipt => {
        const key = receipt.receiptDate.toISOString().split('T')[0];
        const existing = dailySpending.get(key) || { amount: 0, receipts: 0 };
        dailySpending.set(key, {
          amount: existing.amount + receipt.totalAmount,
          receipts: existing.receipts + 1,
        });
      });

      Array.from(dailySpending.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, data]) => {
          trends.push({
            period: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            amount: data.amount,
            receipts: data.receipts,
          });
        });
    } else {
      // Weekly grouping for longer periods
      const weeklySpending = new Map<string, { amount: number; receipts: number }>();

      filteredReceipts.forEach(receipt => {
        const weekStart = new Date(receipt.receiptDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const key = weekStart.toISOString().split('T')[0];

        const existing = weeklySpending.get(key) || { amount: 0, receipts: 0 };
        weeklySpending.set(key, {
          amount: existing.amount + receipt.totalAmount,
          receipts: existing.receipts + 1,
        });
      });

      Array.from(weeklySpending.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, data]) => {
          trends.push({
            period: `Week of ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            amount: data.amount,
            receipts: data.receipts,
          });
        });
    }

    return trends;
  }, [filteredReceipts, timeRange]);

  const categorySpending = useMemo(() => {
    const categoryTotals = new Map<IngredientCategory, { amount: number; items: number }>();

    filteredReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const category = item.category || 'other';
        const existing = categoryTotals.get(category) || { amount: 0, items: 0 };
        categoryTotals.set(category, {
          amount: existing.amount + item.price,
          items: existing.items + 1,
        });
      });
    });

    return Array.from(categoryTotals.entries())
      .map(([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount: data.amount,
        items: data.items,
        color: categoryColors[category],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredReceipts]);

  const storeSpending = useMemo(() => {
    const storeData = new Map<string, { amount: number; visits: number }>();

    filteredReceipts.forEach(receipt => {
      const existing = storeData.get(receipt.storeName) || { amount: 0, visits: 0 };
      storeData.set(receipt.storeName, {
        amount: existing.amount + receipt.totalAmount,
        visits: existing.visits + 1,
      });
    });

    return Array.from(storeData.entries())
      .map(([store, data]) => ({
        store,
        amount: data.amount,
        visits: data.visits,
        avgTicket: data.amount / data.visits,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredReceipts]);

  const totalSpent = filteredReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const totalReceipts = filteredReceipts.length;
  const avgTicket = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

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
            <span className="text-2xl">🧾</span>
            <h3 className="text-sm font-medium text-blue-700">Shopping Trips</h3>
          </div>
          <div className="text-3xl font-bold text-blue-800">{totalReceipts}</div>
          <div className="text-sm text-blue-600 mt-1">
            {timeRange === '7days'
              ? 'This week'
              : timeRange === '30days'
                ? 'This month'
                : `Last ${timeRange.replace(/\d+/, '$& ')}`}
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📊</span>
            <h3 className="text-sm font-medium text-purple-700">Avg. Ticket</h3>
          </div>
          <div className="text-3xl font-bold text-purple-800">${avgTicket.toFixed(2)}</div>
          <div className="text-sm text-purple-600 mt-1">Per shopping trip</div>
        </div>
      </div>

      {/* Spending Trend Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={spendingTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={value => `$${value}`} />
            <Tooltip formatter={value => [`$${value}`, 'Amount']} />
            <Area type="monotone" dataKey="amount" stroke="#16a34a" fill="url(#colorGradient)" />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categorySpending.slice(0, 8)} // Top 8 categories
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="amount"
              label={({ category, amount }) => `${category}: $${amount.toFixed(0)}`}
            >
              {categorySpending.slice(0, 8).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={value => [`$${value}`, 'Amount']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={spendingTrends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis yAxisId="amount" orientation="left" tickFormatter={value => `$${value}`} />
            <YAxis yAxisId="receipts" orientation="right" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="amount"
              type="monotone"
              dataKey="amount"
              stroke="#16a34a"
              strokeWidth={3}
              name="Amount Spent ($)"
            />
            <Line
              yAxisId="receipts"
              type="monotone"
              dataKey="receipts"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Number of Receipts"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={categorySpending}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis tickFormatter={value => `$${value}`} />
            <Tooltip formatter={value => [`$${value}`, 'Amount']} />
            <Bar dataKey="amount">
              {categorySpending.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Details</h3>
        <div className="space-y-3">
          {categorySpending.map(category => (
            <div
              key={category.category}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="font-medium text-gray-900">{category.category}</span>
                <span className="text-sm text-gray-500">({category.items} items)</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">${category.amount.toFixed(2)}</div>
                <div className="text-sm text-gray-500">
                  ${(category.amount / category.items).toFixed(2)} avg
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStores = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Store</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={storeSpending} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={value => `$${value}`} />
            <YAxis type="category" dataKey="store" width={120} />
            <Tooltip formatter={value => [`$${value}`, 'Total Spent']} />
            <Bar dataKey="amount" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Analysis</h3>
        <div className="space-y-3">
          {storeSpending.map(store => (
            <div
              key={store.store}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="font-semibold text-gray-900">{store.store}</div>
                <div className="text-sm text-gray-500">{store.visits} visits</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">${store.amount.toFixed(2)}</div>
                <div className="text-sm text-gray-500">
                  ${store.avgTicket.toFixed(2)} avg ticket
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'trends', label: 'Trends', icon: '📈' },
            { key: 'categories', label: 'Categories', icon: '🏷️' },
            { key: 'stores', label: 'Stores', icon: '🏪' },
          ].map(view => (
            <button
              key={view.key}
              onClick={() => setViewType(view.key as any)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                viewType === view.key
                  ? 'bg-white text-pantry-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{view.icon}</span>
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filteredReceipts.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">📈</span>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No spending data</h3>
          <p className="text-gray-500">Scan some receipts to see your spending analytics here!</p>
        </div>
      ) : (
        <>
          {viewType === 'overview' && renderOverview()}
          {viewType === 'trends' && renderTrends()}
          {viewType === 'categories' && renderCategories()}
          {viewType === 'stores' && renderStores()}
        </>
      )}
    </div>
  );
}
