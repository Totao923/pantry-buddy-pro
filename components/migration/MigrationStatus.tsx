import React from 'react';
import { useMigrationStatus } from '../../hooks/useMigration';

export default function MigrationStatus() {
  const { status, refreshStatus } = useMigrationStatus();

  if (status.loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Status</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const totalItems = status.pantryItemsCount + status.recipesCount + status.ratingsCount;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Cloud Storage Status</h3>
        <button
          onClick={refreshStatus}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Refresh status"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {status.hasProfile ? (
        <div className="space-y-4">
          {/* Success Status */}
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-800">Cloud Storage Active</p>
              <p className="text-sm text-green-600">Your data is securely stored and synced</p>
            </div>
          </div>

          {/* Data Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{status.pantryItemsCount}</div>
              <div className="text-sm text-gray-600">Pantry Items</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{status.recipesCount}</div>
              <div className="text-sm text-gray-600">Recipes</div>
            </div>
          </div>

          {status.ratingsCount > 0 && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-green-600">{status.ratingsCount}</div>
              <div className="text-sm text-gray-600">Recipe Ratings</div>
            </div>
          )}

          {/* Storage Usage */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Storage Usage</span>
              <span className="text-sm text-blue-600">{totalItems} / ∞ items</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalItems / 100) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-600 mt-1">Unlimited storage with your account</p>
          </div>

          {/* Last Sync */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Last synced</span>
            <span>Just now</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
          </div>
          <h4 className="font-semibold text-gray-800 mb-2">Local Storage Only</h4>
          <p className="text-sm text-gray-600 mb-4">
            Your data is currently stored locally on this device only.
          </p>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <h5 className="font-medium text-yellow-800 mb-2">Enable Cloud Storage to:</h5>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Sync across all your devices</li>
              <li>• Never lose your data</li>
              <li>• Access recipes anywhere</li>
              <li>• Share with family members</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
