import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';
import { quickSuggestionsService } from '../lib/services/quickSuggestionsService';

interface SuggestionAnalytics {
  userId: string;
  suggestionsGenerated: number;
  suggestionsUsed: number;
  mostPopularCuisines: string[];
  averageMatchPercentage: number;
  lastUsed: Date;
}

interface QuickSuggestionsAnalyticsProps {
  className?: string;
}

export default function QuickSuggestionsAnalytics({
  className = '',
}: QuickSuggestionsAnalyticsProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<SuggestionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadAnalytics();
    }
  }, [user?.id]);

  const loadAnalytics = () => {
    setLoading(true);
    try {
      const userAnalytics = quickSuggestionsService.getUserAnalytics(user?.id || '');
      setAnalytics(userAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRate = () => {
    if (!user?.id) return 0;
    return quickSuggestionsService.getSuccessRate(user.id);
  };

  if (loading || !analytics) {
    return (
      <div className={`bg-white rounded-2xl p-6 border border-gray-200 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const successRate = getSuccessRate();
  const successRateColor =
    successRate >= 70 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-gray-600';

  return (
    <div className={`bg-white rounded-2xl p-6 border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quick Suggestions Stats</h3>
        <span className="text-2xl">📊</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-pantry-600">{analytics.suggestionsGenerated}</div>
          <div className="text-xs text-gray-500">Suggestions Generated</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{analytics.suggestionsUsed}</div>
          <div className="text-xs text-gray-500">Recipes Cooked/Saved</div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Success Rate */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Success Rate:</span>
          <span className={`text-sm font-medium ${successRateColor}`}>{successRate}%</span>
        </div>

        {/* Average Match */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Avg. Pantry Match:</span>
          <span className="text-sm font-medium text-pantry-600">
            {analytics.averageMatchPercentage}%
          </span>
        </div>

        {/* Popular Cuisines */}
        {analytics.mostPopularCuisines.length > 0 && (
          <div>
            <div className="text-sm text-gray-600 mb-1">Popular Cuisines:</div>
            <div className="flex flex-wrap gap-1">
              {analytics.mostPopularCuisines.slice(0, 3).map(cuisine => (
                <span
                  key={cuisine}
                  className="px-2 py-1 bg-pantry-50 text-pantry-700 text-xs rounded-full"
                >
                  {cuisine}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Last Used */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Last Used:</span>
          <span className="text-xs text-gray-500">
            {new Date(analytics.lastUsed).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Success Rate Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Recipe Success Rate</span>
          <span className="text-xs text-gray-500">{successRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              successRate >= 70
                ? 'bg-green-500'
                : successRate >= 50
                  ? 'bg-yellow-500'
                  : 'bg-gray-400'
            }`}
            style={{ width: `${Math.min(successRate, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Tips based on success rate */}
      {successRate < 50 && analytics.suggestionsGenerated > 3 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium mb-1">💡 Tip:</div>
          <div className="text-xs text-blue-600">
            Try adjusting your filters or adding more ingredients to your pantry for better matches!
          </div>
        </div>
      )}
    </div>
  );
}
