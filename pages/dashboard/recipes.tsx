import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { useAuth } from '../../lib/auth/AuthProvider';
import { RecipeService } from '../../lib/services/recipeService';
import { databaseSettingsService } from '../../lib/services/databaseSettingsService';
import { usePullToRefreshContext } from '../../contexts/PullToRefreshProvider';
import { Recipe, CuisineType } from '../../types';

export default function RecipesBrowser() {
  const router = useRouter();
  const { user, supabaseClient } = useAuth();

  // Set authenticated client on RecipeService
  useEffect(() => {
    if (supabaseClient) {
      RecipeService.setSupabaseClient(supabaseClient);
    }
  }, [supabaseClient]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'time' | 'rating'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent' | 'meal-plan'>('all');
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    console.log('Refreshing recipes...');
    setLoading(true);

    try {
      // Reload recipes
      let allRecipes: Recipe[] = [];
      const userId = user?.id || 'anonymous';

      if (user?.id) {
        try {
          const dbAvailable = await databaseSettingsService.isAvailable();
          if (dbAvailable) {
            const savedResult = await RecipeService.getSavedRecipes(user.id);
            if (savedResult.success && savedResult.data) {
              allRecipes = [...allRecipes, ...savedResult.data];
            }
            const recentItems = await databaseSettingsService.getRecentItems('recipe', 20);
            if (recentItems.length > 0) {
              const recentRecipes = recentItems.map(item => item.data);
              allRecipes = [...allRecipes, ...recentRecipes];
            }
          }
        } catch (error) {
          console.log('Database error, using localStorage');
          const localStorageResult = await RecipeService.getSavedRecipes(userId);
          if (localStorageResult.success && localStorageResult.data) {
            allRecipes = [...allRecipes, ...localStorageResult.data];
          }
        }
      } else {
        const localStorageResult = await RecipeService.getSavedRecipes(userId);
        if (localStorageResult.success && localStorageResult.data) {
          allRecipes = [...allRecipes, ...localStorageResult.data];
        }
      }

      const uniqueRecipes = allRecipes.filter(
        (recipe, index, self) => index === self.findIndex(r => r.id === recipe.id)
      );

      const deletedRecipes = JSON.parse(localStorage.getItem('deletedRecipes') || '[]');
      const nonDeletedRecipes = uniqueRecipes.filter(recipe => !deletedRecipes.includes(recipe.id));

      setRecipes(nonDeletedRecipes);
      setFilteredRecipes(nonDeletedRecipes);
    } catch (error) {
      console.error('Error refreshing recipes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const { setRefreshHandler } = usePullToRefreshContext();

  // Set the refresh handler for this page
  useEffect(() => {
    setRefreshHandler(handleRefresh);
  }, [setRefreshHandler]);

  const cuisines: CuisineType[] = [
    'italian',
    'mexican',
    'asian',
    'indian',
    'mediterranean',
    'french',
    'american',
    'thai',
    'japanese',
    'chinese',
    'greek',
    'spanish',
    'middle-eastern',
    'korean',
  ];

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        let allRecipes: Recipe[] = [];

        // Use consistent userId handling
        const userId = user?.id || 'anonymous';
        console.log('Loading recipes for userId:', userId);

        // Try to load from database first
        if (user?.id) {
          try {
            const dbAvailable = await databaseSettingsService.isAvailable();
            console.log('Database availability for recipes:', dbAvailable);

            if (dbAvailable) {
              console.log('Loading recipes from database');

              // Get saved recipes
              const savedResult = await RecipeService.getSavedRecipes(user.id);
              if (savedResult.success && savedResult.data) {
                allRecipes = [...allRecipes, ...savedResult.data];
                console.log(`Loaded ${savedResult.data.length} saved recipes from database`);
              }

              // Get recent recipes from recent items
              const recentItems = await databaseSettingsService.getRecentItems('recipe', 20);
              if (recentItems.length > 0) {
                const recentRecipes = recentItems.map(item => item.data);
                allRecipes = [...allRecipes, ...recentRecipes];
                console.log(`Loaded ${recentItems.length} recent recipes from database`);
              }

              console.log(`Total recipes loaded from database: ${allRecipes.length}`);
            } else {
              throw new Error('Database not available');
            }
          } catch (error) {
            console.log(
              'Database error, falling back to localStorage:',
              error instanceof Error ? error.message : 'Unknown error'
            );
            // Fallback to localStorage using RecipeService
            console.log('Database failed, using RecipeService localStorage fallback');
            const localStorageResult = await RecipeService.getSavedRecipes(userId);
            if (localStorageResult.success && localStorageResult.data) {
              allRecipes = [...allRecipes, ...localStorageResult.data];
              console.log(
                `Loaded ${localStorageResult.data.length} recipes from localStorage via RecipeService`
              );
            } else {
              console.log('No recipes found in localStorage either');
            }
          }
        } else {
          // Not authenticated, use localStorage with RecipeService
          console.log(
            'User not authenticated, using RecipeService localStorage for anonymous user'
          );
          const localStorageResult = await RecipeService.getSavedRecipes(userId);
          if (localStorageResult.success && localStorageResult.data) {
            allRecipes = [...allRecipes, ...localStorageResult.data];
            console.log(`Loaded ${localStorageResult.data.length} recipes for anonymous user`);
          }
        }

        // Remove duplicates based on recipe ID
        const uniqueRecipes = allRecipes.filter(
          (recipe, index, self) => index === self.findIndex(r => r.id === recipe.id)
        );

        // Filter out deleted recipes
        const deletedRecipes = JSON.parse(localStorage.getItem('deletedRecipes') || '[]');
        const nonDeletedRecipes = uniqueRecipes.filter(
          recipe => !deletedRecipes.includes(recipe.id)
        );

        console.log(
          `Filtered out ${uniqueRecipes.length - nonDeletedRecipes.length} deleted recipes`
        );

        setRecipes(nonDeletedRecipes);
        setFilteredRecipes(nonDeletedRecipes);
      } catch (error) {
        console.error('Error loading recipes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecipes();
  }, [user]);

  useEffect(() => {
    // Apply filters based on URL query params
    const { filter: urlFilter } = router.query;
    if (urlFilter && typeof urlFilter === 'string') {
      setFilter(urlFilter as 'all' | 'favorites' | 'recent' | 'meal-plan');
    }
  }, [router.query]);

  useEffect(() => {
    // Filter and sort recipes
    let filtered = [...recipes];

    // First, filter out deleted recipes
    const deletedRecipes = JSON.parse(localStorage.getItem('deletedRecipes') || '[]');
    filtered = filtered.filter(recipe => !deletedRecipes.includes(recipe.id));

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        recipe =>
          recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply cuisine filter
    if (selectedCuisine !== 'all') {
      filtered = filtered.filter(recipe => recipe.cuisine === selectedCuisine);
    }

    // Apply category filter
    if (filter === 'favorites') {
      const favoriteIds = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
      filtered = filtered.filter(recipe => favoriteIds.includes(recipe.id));
    } else if (filter === 'recent') {
      // Show only recipes from the last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(recipe => {
        // Assuming we add a createdAt timestamp to recipes in the future
        return true; // For now, show all as "recent"
      });
    } else if (filter === 'meal-plan') {
      // Show only AI-generated meal plan recipes
      filtered = filtered.filter(recipe => recipe.tags?.includes('meal-plan'));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'time':
          return a.totalTime - b.totalTime;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'recent':
        default:
          return 0; // Keep original order for recent
      }
    });

    setFilteredRecipes(filtered);
  }, [recipes, searchQuery, selectedCuisine, sortBy, filter]);

  const toggleFavorite = (recipeId: string) => {
    const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
    const isFavorite = favorites.includes(recipeId);

    if (isFavorite) {
      const updatedFavorites = favorites.filter((id: string) => id !== recipeId);
      localStorage.setItem('favoriteRecipes', JSON.stringify(updatedFavorites));
    } else {
      favorites.push(recipeId);
      localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
    }

    // Force re-render by updating a state that triggers useEffect
    setFilter(filter);
  };

  const isFavorite = (recipeId: string) => {
    const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
    return favorites.includes(recipeId);
  };

  const deleteRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      return;
    }

    try {
      const userId = user?.id || 'anonymous';

      // Use RecipeService.deleteRecipe method for proper deletion
      const result = await RecipeService.deleteRecipe(recipeId, userId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete recipe');
      }

      // Update local state
      const updatedRecipes = recipes.filter(recipe => recipe.id !== recipeId);
      setRecipes(updatedRecipes);
      setFilteredRecipes(
        updatedRecipes.filter(recipe => {
          // Reapply current filters
          let include = true;

          if (searchQuery) {
            include =
              include &&
              (recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
          }

          if (selectedCuisine !== 'all') {
            include = include && recipe.cuisine === selectedCuisine;
          }

          if (filter === 'favorites') {
            const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
            include = include && favorites.includes(recipe.id);
          }

          return include;
        })
      );

      console.log(`Recipe ${recipeId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    }
  };

  const bulkDeleteRecipes = async (recipeIds: string[]) => {
    if (recipeIds.length === 0) return;

    const count = recipeIds.length;
    if (
      !confirm(
        `Are you sure you want to delete ${count} recipe${count > 1 ? 's' : ''}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const userId = user?.id || 'anonymous';
      let successCount = 0;
      let failureCount = 0;

      // Delete recipes one by one using existing logic
      for (const recipeId of recipeIds) {
        try {
          const result = await RecipeService.deleteRecipe(recipeId, userId);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
          console.error(`Error deleting recipe ${recipeId}:`, error);
        }
      }

      // Update local state by filtering out deleted recipes
      const updatedRecipes = recipes.filter(recipe => !recipeIds.includes(recipe.id));
      setRecipes(updatedRecipes);
      setFilteredRecipes(
        updatedRecipes.filter(recipe => {
          // Reapply current filters
          let include = true;

          if (searchQuery) {
            include =
              include &&
              (recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
          }

          if (selectedCuisine !== 'all') {
            include = include && recipe.cuisine === selectedCuisine;
          }

          if (filter === 'favorites') {
            const favorites = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
            include = include && favorites.includes(recipe.id);
          }

          return include;
        })
      );

      // Exit selection mode
      setSelectedRecipes([]);
      setIsSelectionMode(false);

      // Show result feedback
      if (failureCount === 0) {
        console.log(`Successfully deleted ${successCount} recipe${successCount > 1 ? 's' : ''}`);
      } else {
        alert(
          `Deleted ${successCount} recipe${successCount > 1 ? 's' : ''}, but ${failureCount} failed. Please try again for the failed ones.`
        );
      }

      // Force a small delay to let localStorage updates settle, then reload recipes
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Failed to delete recipes. Please try again.');
    }
  };

  if (loading) {
    return (
      <AuthGuard requireAuth={false}>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your recipes...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireAuth={false}>
      <Head>
        <title>My Recipes - Pantry Buddy Pro</title>
        <meta name="description" content="Browse and manage your recipe collection" />
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Recipes</h1>
              <p className="text-gray-600">
                Manage your recipe collection • {filteredRecipes.length} recipes
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isSelectionMode ? (
                <>
                  <button
                    onClick={() => {
                      setSelectedRecipes([]);
                      setIsSelectionMode(false);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setSelectedRecipes(filteredRecipes.map(r => r.id))}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium"
                  >
                    Select All
                  </button>
                  {selectedRecipes.length > 0 && (
                    <button
                      onClick={() => setSelectedRecipes([])}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium"
                >
                  Select
                </button>
              )}
              <Link href="/dashboard/create-recipe">
                <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all font-medium flex items-center gap-2">
                  <span>✨</span>
                  Create Recipe
                </button>
              </Link>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedCuisine}
                  onChange={e => setSelectedCuisine(e.target.value as CuisineType | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Cuisines</option>
                  {cuisines.map(cuisine => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="recent">Most Recent</option>
                  <option value="name">Name A-Z</option>
                  <option value="time">Cooking Time</option>
                  <option value="rating">Highest Rated</option>
                </select>

                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    ⊞
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    ☰
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All Recipes' },
              { key: 'favorites', label: 'Favorites' },
              { key: 'recent', label: 'Recent' },
              { key: 'meal-plan', label: 'Meal Plans' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bulk Action Bar */}
          {isSelectionMode && selectedRecipes.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <span className="text-red-700 font-medium">
                {selectedRecipes.length} recipe{selectedRecipes.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => bulkDeleteRecipes(selectedRecipes)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium flex items-center gap-2"
              >
                <span>🗑️</span>
                Delete Selected ({selectedRecipes.length})
              </button>
            </div>
          )}

          {/* Recipes Grid/List */}
          {filteredRecipes.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {filteredRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all ${
                    viewMode === 'list' ? 'flex items-center gap-6 p-4' : 'p-6'
                  } ${isSelectionMode && selectedRecipes.includes(recipe.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        {isSelectionMode && (
                          <div className="flex items-center mr-3">
                            <input
                              type="checkbox"
                              checked={selectedRecipes.includes(recipe.id)}
                              onChange={() => {
                                if (selectedRecipes.includes(recipe.id)) {
                                  setSelectedRecipes(
                                    selectedRecipes.filter(id => id !== recipe.id)
                                  );
                                } else {
                                  setSelectedRecipes([...selectedRecipes, recipe.id]);
                                }
                              }}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {recipe.title}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {recipe.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => toggleFavorite(recipe.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isFavorite(recipe.id)
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={
                              isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'
                            }
                          >
                            ♥
                          </button>
                          <button
                            onClick={() => deleteRecipe(recipe.id)}
                            className="p-2 rounded-lg transition-colors text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Delete recipe"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>⏱️ {recipe.totalTime}m</span>
                        <span className="capitalize">{recipe.cuisine}</span>
                        <span>👥 {recipe.servings}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {recipe.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Link href={`/dashboard/recipe/${recipe.id}`}>
                          <button className="text-orange-600 hover:text-orange-700 font-medium text-sm">
                            View Recipe
                          </button>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      {isSelectionMode && (
                        <div className="flex items-center mr-4">
                          <input
                            type="checkbox"
                            checked={selectedRecipes.includes(recipe.id)}
                            onChange={() => {
                              if (selectedRecipes.includes(recipe.id)) {
                                setSelectedRecipes(selectedRecipes.filter(id => id !== recipe.id));
                              } else {
                                setSelectedRecipes([...selectedRecipes, recipe.id]);
                              }
                            }}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {recipe.title}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">{recipe.description}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>⏱️ {recipe.totalTime}m</span>
                              <span className="capitalize">{recipe.cuisine}</span>
                              <span>👥 {recipe.servings}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavorite(recipe.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                isFavorite(recipe.id)
                                  ? 'text-red-500 hover:bg-red-50'
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                              title={
                                isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'
                              }
                            >
                              ♥
                            </button>
                            <button
                              onClick={() => deleteRecipe(recipe.id)}
                              className="p-2 rounded-lg transition-colors text-gray-400 hover:bg-red-50 hover:text-red-500"
                              title="Delete recipe"
                            >
                              🗑️
                            </button>
                            <Link href={`/dashboard/recipe/${recipe.id}`}>
                              <button className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg font-medium text-sm">
                                View Recipe
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="text-6xl mb-4">🍳</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No recipes found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCuisine !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start creating delicious recipes from your ingredients!'}
              </p>
              <Link href="/dashboard/create-recipe">
                <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-medium">
                  Create Your First Recipe
                </button>
              </Link>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
