import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';
import Link from 'next/link';

interface UsageStats {
  limits: {
    max_pantry_items: number;
    daily_recipe_generations: number;
    has_advanced_ai: boolean;
    has_nutrition_tracking: boolean;
    has_meal_planning: boolean;
    has_photo_uploads: boolean;
    has_ad_free_experience: boolean;
    max_family_members: number;
  };
  todayUsage: {
    recipe_generations: number;
    pantry_items_used: number;
    ai_requests: number;
    premium_feature_attempts: number;
  };
  remaining: {
    recipes: number;
    pantryItems: number;
  };
  tier: 'free' | 'premium' | 'family' | 'chef';
}

interface UsageDashboardProps {
  className?: string;
}

export default function UsageDashboard({ className = '' }: UsageDashboardProps) {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      fetchUsageStats();
    }
  }, [session]);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/usage/stats', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
      } else {
        setError('Failed to load usage stats');
      }
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError('Failed to load usage stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !usageStats) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>Unable to load usage statistics</p>
        </div>
      </div>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'text-gray-600 bg-gray-100';
      case 'premium':
        return 'text-blue-600 bg-blue-100';
      case 'family':
        return 'text-purple-600 bg-purple-100';
      case 'chef':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString();
  };

  const calculatePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const recipePercentage = calculatePercentage(
    usageStats.todayUsage.recipe_generations,
    usageStats.limits.daily_recipe_generations
  );

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Usage Overview</h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getTierColor(usageStats.tier)}`}
        >
          {usageStats.tier}
        </span>
      </div>

      <div className="space-y-4">
        {/* Recipe Generation Usage */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Today's Recipes</span>
            <span className="text-sm text-gray-600">
              {usageStats.todayUsage.recipe_generations} /{' '}
              {formatLimit(usageStats.limits.daily_recipe_generations)}
            </span>
          </div>
          {usageStats.limits.daily_recipe_generations !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(recipePercentage)}`}
                style={{ width: `${recipePercentage}%` }}
              ></div>
            </div>
          )}
          {usageStats.remaining.recipes === 0 &&
            usageStats.limits.daily_recipe_generations !== -1 && (
              <p className="text-xs text-red-600 mt-1">Daily limit reached</p>
            )}
        </div>

        {/* Pantry Items Limit */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Pantry Capacity</span>
            <span className="text-sm text-gray-600">
              {formatLimit(usageStats.limits.max_pantry_items)} items max
            </span>
          </div>
        </div>

        {/* Premium Features */}
        {usageStats.tier === 'free' && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Premium Features</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className={usageStats.limits.has_advanced_ai ? '✅' : '❌'}></span>
                <span
                  className={usageStats.limits.has_advanced_ai ? 'text-green-600' : 'text-gray-500'}
                >
                  Advanced AI
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={usageStats.limits.has_nutrition_tracking ? '✅' : '❌'}></span>
                <span
                  className={
                    usageStats.limits.has_nutrition_tracking ? 'text-green-600' : 'text-gray-500'
                  }
                >
                  Nutrition Tracking
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={usageStats.limits.has_meal_planning ? '✅' : '❌'}></span>
                <span
                  className={
                    usageStats.limits.has_meal_planning ? 'text-green-600' : 'text-gray-500'
                  }
                >
                  Meal Planning
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={usageStats.limits.has_photo_uploads ? '✅' : '❌'}></span>
                <span
                  className={
                    usageStats.limits.has_photo_uploads ? 'text-green-600' : 'text-gray-500'
                  }
                >
                  Photo Uploads
                </span>
              </div>
            </div>

            {usageStats.todayUsage.premium_feature_attempts > 0 && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-700">
                  You've tried {usageStats.todayUsage.premium_feature_attempts} premium feature(s)
                  today.
                </p>
              </div>
            )}

            <Link href="/dashboard/subscription">
              <button className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all text-sm font-medium">
                Upgrade to Premium
              </button>
            </Link>
          </div>
        )}

        {/* Premium Member Benefits */}
        {usageStats.tier !== 'free' && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">👑</span>
              <h4 className="text-sm font-medium text-gray-700">Premium Active</h4>
            </div>
            <p className="text-xs text-gray-600">
              Enjoying unlimited features and priority support!
            </p>
            <Link href="/dashboard/subscription">
              <button className="w-full mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                Manage Subscription
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
