import React, { useState, useEffect } from 'react';
import { UserCookingPreferences } from '../../lib/services/cookingSessionService';

interface CookingStatsProps {
  className?: string;
  compact?: boolean;
}

interface CookingStatsData {
  preferences: UserCookingPreferences | null;
  streak: { current: number; longest: number };
  recentActivity: any[];
}

export default function CookingStats({ className = '', compact = false }: CookingStatsProps) {
  const [stats, setStats] = useState<CookingStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCookingStats();
  }, []);

  const loadCookingStats = async () => {
    try {
      const response = await fetch('/api/cooking-sessions/stats?type=user');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading cooking stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`cooking-stats ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !stats.preferences) {
    return (
      <div className={`cooking-stats ${className}`}>
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-600">Start cooking to see your statistics!</p>
        </div>
      </div>
    );
  }

  const { preferences, streak } = stats;

  const statsData = [
    {
      label: 'Recipes Cooked',
      value: preferences.total_recipes_cooked,
      icon: '🍳',
      color: 'bg-orange-100 text-orange-700',
    },
    {
      label: 'Current Streak',
      value: `${streak.current} days`,
      icon: '🔥',
      color: 'bg-red-100 text-red-700',
    },
    {
      label: 'Longest Streak',
      value: `${streak.longest} days`,
      icon: '🏆',
      color: 'bg-yellow-100 text-yellow-700',
    },
    {
      label: 'Avg Rating Given',
      value: preferences.average_rating_given ? `${preferences.average_rating_given.toFixed(1)}⭐` : 'N/A',
      icon: '⭐',
      color: 'bg-blue-100 text-blue-700',
    },
  ];

  if (compact) {
    return (
      <div className={`cooking-stats ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>🍳 {preferences.total_recipes_cooked} cooked</span>
            <span>🔥 {streak.current} day streak</span>
            {preferences.average_rating_given && (
              <span>⭐ {preferences.average_rating_given.toFixed(1)} avg</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`cooking-stats ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 text-center"
          >
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${stat.color}`}>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Additional insights */}
      {preferences.favorite_cuisines && preferences.favorite_cuisines.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Your Cooking Patterns</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Favorite Cuisines:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {preferences.favorite_cuisines.slice(0, 3).map((cuisine) => (
                  <span
                    key={cuisine}
                    className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            </div>
            
            {preferences.most_active_cooking_day && (
              <div>
                <span className="font-medium">Most Active Day:</span>
                <span className="ml-1">{preferences.most_active_cooking_day}</span>
              </div>
            )}
          </div>
          
          {preferences.last_cooked_at && (
            <div className="mt-2 text-xs text-gray-500">
              Last cooked: {new Date(preferences.last_cooked_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}