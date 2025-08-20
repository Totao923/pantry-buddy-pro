import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import RecipeBookManager from '../../components/RecipeBookManager';
import { useAuth } from '../../lib/auth/AuthProvider';
import { RecipeService } from '../../lib/services/recipeService';
import { Recipe } from '../../types';

export default function RecipeBooksPage() {
  const router = useRouter();
  const { user, subscription, supabaseClient } = useAuth();

  // Set authenticated client on RecipeService
  useEffect(() => {
    if (supabaseClient) {
      RecipeService.setSupabaseClient(supabaseClient);
    }
  }, [supabaseClient]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const isPremium = subscription?.tier === 'premium';

  useEffect(() => {
    if (supabaseClient) {
      loadSavedRecipes();
    }
  }, [supabaseClient, user]);

  const loadSavedRecipes = async () => {
    setLoading(true);
    try {
      // Use RecipeService to properly load from database or localStorage fallback
      const userId = user?.id || 'anonymous';
      console.log('Recipe Books: Loading saved recipes for user:', userId);

      const result = await RecipeService.getSavedRecipes(userId);
      if (result.success && result.data) {
        console.log(`Recipe Books: Loaded ${result.data.length} recipes`);
        setSavedRecipes(result.data);
      } else {
        console.error('Recipe Books: Failed to load recipes:', result.error);
        setSavedRecipes([]);
      }
    } catch (error) {
      console.error('Recipe Books: Failed to load saved recipes:', error);
      setSavedRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <AuthGuard>
        <Head>
          <title>Recipe Books - Pantry Buddy Pro</title>
          <meta name="description" content="Create and manage your recipe book collections" />
        </Head>

        <DashboardLayout>
          <div className="max-w-4xl mx-auto">
            {/* Premium Upgrade Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-2xl font-bold text-amber-900 mb-2">Recipe Books</h1>
              <p className="text-amber-800 mb-6">
                Create beautiful recipe collections and export them as professional PDFs
              </p>

              <div className="bg-white rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-gray-900 mb-3">Premium Features:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Unlimited recipe books
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Professional PDF templates
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Custom sections and organization
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Personal notes and ratings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Print-ready layouts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    Family sharing
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/dashboard/subscription')}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-colors font-medium"
                >
                  💎 Upgrade to Premium
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors font-medium"
                >
                  Back to Dashboard
                </button>
              </div>

              <div className="mt-4 text-xs text-amber-700">
                Free tier includes 1 recipe book with basic template
              </div>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Head>
        <title>Recipe Books - Pantry Buddy Pro</title>
        <meta name="description" content="Create and manage your recipe book collections" />
      </Head>

      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pantry-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading your recipes...</p>
            </div>
          ) : (
            <RecipeBookManager savedRecipes={savedRecipes} />
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
