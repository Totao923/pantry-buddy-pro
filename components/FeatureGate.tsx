import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';
import Link from 'next/link';

interface FeatureGateProps {
  feature:
    | 'advanced_ai'
    | 'nutrition_tracking'
    | 'meal_planning'
    | 'photo_uploads'
    | 'family_management'
    | 'family_collections'
    | 'bulk_shopping'
    | 'family_nutrition';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

const featureDescriptions = {
  advanced_ai: {
    title: 'Advanced AI Recipes',
    description:
      'Get more sophisticated and creative recipe suggestions with advanced AI capabilities.',
    icon: '🤖',
  },
  nutrition_tracking: {
    title: 'Nutrition Analysis',
    description: 'Track detailed nutritional information and health metrics for all your recipes.',
    icon: '📊',
  },
  meal_planning: {
    title: 'Smart Meal Planning',
    description:
      'Plan your weekly meals with intelligent suggestions and automated shopping lists.',
    icon: '📅',
  },
  photo_uploads: {
    title: 'Photo Uploads',
    description: 'Upload and share photos of your cooking creations and ingredient preparations.',
    icon: '📸',
  },
  family_management: {
    title: 'Family Management',
    description: 'Share recipes, meal plans, and nutrition tracking with up to 6 family members.',
    icon: '👨‍👩‍👧‍👦',
  },
  family_collections: {
    title: 'Family Recipe Collections',
    description: 'Create and share organized recipe collections with your family members.',
    icon: '📚',
  },
  bulk_shopping: {
    title: 'Bulk Shopping Lists',
    description: 'Generate combined shopping lists from multiple meal plans and family recipes.',
    icon: '🛒',
  },
  family_nutrition: {
    title: 'Family Nutrition Tracking',
    description:
      'Monitor nutrition and health metrics across all family members with detailed analytics.',
    icon: '📊',
  },
};

export default function FeatureGate({
  feature,
  children,
  fallback,
  className = '',
}: FeatureGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      checkFeatureAccess();
    } else {
      setHasAccess(false);
      setLoading(false);
    }
  }, [session, feature]);

  const checkFeatureAccess = async () => {
    try {
      const response = await fetch(`/api/usage/feature-check?feature=${feature}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasAccess(data.hasAccess);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt
  const featureInfo = featureDescriptions[feature];

  return (
    <div
      className={`bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center ${className}`}
    >
      <div className="text-4xl mb-3">{featureInfo.icon}</div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{featureInfo.title}</h3>
      <p className="text-gray-600 text-sm mb-4">{featureInfo.description}</p>

      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">👑</span>
          <span className="font-semibold text-gray-800">Premium Feature</span>
        </div>
        <p className="text-xs text-gray-600">
          This feature requires a premium subscription to access.
        </p>
      </div>

      <div className="space-y-2">
        <Link href="/dashboard/subscription">
          <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium text-sm">
            Upgrade to Premium
          </button>
        </Link>
        <Link href="/dashboard/subscription#features">
          <button className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm">
            View All Features
          </button>
        </Link>
      </div>
    </div>
  );
}

// Hook to check feature access
export function useFeatureAccess(feature: string) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      checkAccess();
    } else {
      setHasAccess(false);
      setLoading(false);
    }
  }, [session, feature]);

  const checkAccess = async () => {
    try {
      const response = await fetch(`/api/usage/feature-check?feature=${feature}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasAccess(data.hasAccess);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking feature access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, loading, refetch: checkAccess };
}
