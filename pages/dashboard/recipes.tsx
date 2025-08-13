import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { useAuth } from '../../lib/auth/AuthProvider';
import { RecipeService } from '../../lib/services/recipeService';
import { databaseSettingsService } from '../../lib/services/databaseSettingsService';
import { Recipe, CuisineType } from '../../types';

export default function RecipesBrowser() {
  const router = useRouter();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'time' | 'rating'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent'>('all');

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
            console.log('Database error, falling back to localStorage:', error instanceof Error ? error.message : 'Unknown error');
            // Fallback to localStorage
            const savedRecipes = localStorage.getItem('userRecipes');
            const recentRecipes = localStorage.getItem('recentRecipes');

            if (savedRecipes) {
              const parsed = JSON.parse(savedRecipes);
              allRecipes = [...allRecipes, ...parsed];
              console.log(`Loaded ${parsed.length} recipes from userRecipes localStorage`);
            }
            if (recentRecipes) {
              const parsed = JSON.parse(recentRecipes);
              allRecipes = [...allRecipes, ...parsed];
              console.log(`Loaded ${parsed.length} recipes from recentRecipes localStorage`);
            }

            if (allRecipes.length === 0) {
              console.log('No recipes found in localStorage either');
            }
          }
        } else {
          // Not authenticated, use localStorage
          const savedRecipes = localStorage.getItem('userRecipes');
          const recentRecipes = localStorage.getItem('recentRecipes');

          if (savedRecipes) {
            allRecipes = [...allRecipes, ...JSON.parse(savedRecipes)];
          }
          if (recentRecipes) {
            allRecipes = [...allRecipes, ...JSON.parse(recentRecipes)];
          }
        }

        // Remove duplicates based on recipe ID
        const uniqueRecipes = allRecipes.filter(
          (recipe, index, self) => index === self.findIndex(r => r.id === recipe.id)
        );

        setRecipes(uniqueRecipes);
        setFilteredRecipes(uniqueRecipes);
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
      setFilter(urlFilter as 'all' | 'favorites' | 'recent');
    }
  }, [router.query]);

  useEffect(() => {
    // Filter and sort recipes
    let filtered = [...recipes];

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
                  }`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {recipe.title}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                            {recipe.description}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFavorite(recipe.id)}
                          className={`ml-2 p-2 rounded-lg transition-colors ${
                            isFavorite(recipe.id)
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          ♥
                        </button>
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
                            >
                              ♥
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
