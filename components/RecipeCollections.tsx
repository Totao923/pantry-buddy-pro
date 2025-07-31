import React, { useState, useEffect } from 'react';
import { RecipeCollection, Recipe, CollectionCategory } from '../types';

interface RecipeCollectionsProps {
  collections: RecipeCollection[];
  recipes: Recipe[];
  onCreateCollection: (
    collection: Omit<RecipeCollection, 'id' | 'createdAt' | 'updatedAt'>
  ) => void;
  onUpdateCollection: (id: string, updates: Partial<RecipeCollection>) => void;
  onDeleteCollection: (id: string) => void;
  onAddRecipeToCollection: (collectionId: string, recipeId: string) => void;
  onRemoveRecipeFromCollection: (collectionId: string, recipeId: string) => void;
  userId: string;
}

const COLLECTION_CATEGORIES: {
  value: CollectionCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  { value: 'favorites', label: 'Favorites', icon: '❤️', description: 'Your most loved recipes' },
  {
    value: 'weekly-meals',
    label: 'Weekly Meals',
    icon: '📅',
    description: 'Regular weekly rotation',
  },
  {
    value: 'quick-dinners',
    label: 'Quick Dinners',
    icon: '⚡',
    description: 'Fast weeknight meals',
  },
  { value: 'desserts', label: 'Desserts', icon: '🍰', description: 'Sweet treats and desserts' },
  { value: 'healthy', label: 'Healthy', icon: '🥗', description: 'Nutritious and wholesome' },
  { value: 'party', label: 'Party', icon: '🎉', description: 'Entertaining and gatherings' },
  { value: 'breakfast', label: 'Breakfast', icon: '🍳', description: 'Morning meals' },
  { value: 'lunch', label: 'Lunch', icon: '🥪', description: 'Midday meals' },
  { value: 'dinner', label: 'Dinner', icon: '🍽️', description: 'Evening meals' },
  { value: 'snacks', label: 'Snacks', icon: '🍿', description: 'Quick bites and snacks' },
  { value: 'seasonal', label: 'Seasonal', icon: '🍂', description: 'Seasonal specialties' },
  { value: 'custom', label: 'Custom', icon: '📝', description: 'Your custom collection' },
];

export default function RecipeCollections({
  collections,
  recipes,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onAddRecipeToCollection,
  onRemoveRecipeFromCollection,
  userId,
}: RecipeCollectionsProps) {
  const [activeTab, setActiveTab] = useState<'browse' | 'manage'>('browse');
  const [selectedCollection, setSelectedCollection] = useState<RecipeCollection | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<RecipeCollection | null>(null);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    category: 'custom' as CollectionCategory,
    isPublic: false,
    tags: [] as string[],
  });

  // Get recipes for a collection
  const getCollectionRecipes = (collection: RecipeCollection): Recipe[] => {
    return recipes.filter(recipe => collection.recipeIds.includes(recipe.id));
  };

  // Handle creating a new collection
  const handleCreateCollection = () => {
    if (!newCollection.name.trim()) return;

    onCreateCollection({
      ...newCollection,
      userId,
      recipeIds: [],
      coverImage: undefined,
      collaborators: [],
      totalRatings: 0,
      averageRating: 0,
    });

    setNewCollection({
      name: '',
      description: '',
      category: 'custom',
      isPublic: false,
      tags: [],
    });
    setShowCreateModal(false);
  };

  // Handle editing collection
  const handleUpdateCollection = () => {
    if (!editingCollection) return;

    onUpdateCollection(editingCollection.id, {
      name: newCollection.name,
      description: newCollection.description,
      category: newCollection.category,
      isPublic: newCollection.isPublic,
      tags: newCollection.tags,
    });

    setEditingCollection(null);
    setNewCollection({
      name: '',
      description: '',
      category: 'custom',
      isPublic: false,
      tags: [],
    });
  };

  // Start editing a collection
  const startEditing = (collection: RecipeCollection) => {
    setEditingCollection(collection);
    setNewCollection({
      name: collection.name,
      description: collection.description || '',
      category: collection.category,
      isPublic: collection.isPublic,
      tags: [...collection.tags],
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Recipe Collections</h1>
          <p className="text-gray-600">Organize your favorite recipes into collections</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold shadow-lg"
        >
          + Create Collection
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'browse'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Browse Collections
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'manage'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Manage Collections
        </button>
      </div>

      {/* Browse Collections Tab */}
      {activeTab === 'browse' && (
        <div>
          {selectedCollection ? (
            // Collection Detail View
            <div>
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">
                      {COLLECTION_CATEGORIES.find(cat => cat.value === selectedCollection.category)
                        ?.icon || '📝'}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedCollection.name}</h2>
                    {!selectedCollection.isPublic && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Private
                      </span>
                    )}
                  </div>
                  {selectedCollection.description && (
                    <p className="text-gray-600 mb-2">{selectedCollection.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{getCollectionRecipes(selectedCollection).length} recipes</span>
                    <span>Created {selectedCollection.createdAt.toLocaleDateString()}</span>
                    {selectedCollection.averageRating && (
                      <span className="flex items-center gap-1">
                        ⭐ {selectedCollection.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Collection Recipes Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getCollectionRecipes(selectedCollection).map(recipe => (
                  <div
                    key={recipe.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
                  >
                    <div className="h-48 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                      {recipe.image ? (
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl">🍽️</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">{recipe.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>⏱️ {recipe.totalTime}m</span>
                        <span className="capitalize">{recipe.cuisine}</span>
                        {recipe.rating && <span>⭐ {recipe.rating}</span>}
                      </div>
                      <button
                        onClick={() =>
                          onRemoveRecipeFromCollection(selectedCollection.id, recipe.id)
                        }
                        className="mt-3 w-full px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        Remove from Collection
                      </button>
                    </div>
                  </div>
                ))}

                {getCollectionRecipes(selectedCollection).length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <span className="text-6xl mb-4 block">📝</span>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No recipes yet</h3>
                    <p className="text-gray-500">Start adding recipes to this collection!</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Collections Grid
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map(collection => (
                <div
                  key={collection.id}
                  onClick={() => setSelectedCollection(collection)}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer"
                >
                  <div className="h-32 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center relative">
                    <span className="text-4xl">
                      {COLLECTION_CATEGORIES.find(cat => cat.value === collection.category)?.icon ||
                        '📝'}
                    </span>
                    {!collection.isPublic && (
                      <span className="absolute top-2 right-2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">
                        🔒
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{collection.name}</h3>
                    {collection.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {collection.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{collection.recipeIds.length} recipes</span>
                      {collection.averageRating && (
                        <span className="flex items-center gap-1">
                          ⭐ {collection.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {collection.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {collection.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {collection.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{collection.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {collections.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <span className="text-6xl mb-4 block">📚</span>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No collections yet</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first collection to organize your recipes!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold"
                  >
                    Create First Collection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manage Collections Tab */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          {collections.map(collection => (
            <div key={collection.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">
                    {COLLECTION_CATEGORIES.find(cat => cat.value === collection.category)?.icon ||
                      '📝'}
                  </span>
                  <div>
                    <h3 className="font-bold text-lg">{collection.name}</h3>
                    <p className="text-gray-600 text-sm">{collection.recipeIds.length} recipes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditing(collection)}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteCollection(collection.id)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {collection.description && (
                <p className="text-gray-600 mt-2">{collection.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                <span>
                  Category:{' '}
                  {COLLECTION_CATEGORIES.find(cat => cat.value === collection.category)?.label}
                </span>
                <span>{collection.isPublic ? 'Public' : 'Private'}</span>
                <span>Created: {collection.createdAt.toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Collection Modal */}
      {(showCreateModal || editingCollection) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingCollection ? 'Edit Collection' : 'Create New Collection'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCollection(null);
                    setNewCollection({
                      name: '',
                      description: '',
                      category: 'custom',
                      isPublic: false,
                      tags: [],
                    });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Collection Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    value={newCollection.name}
                    onChange={e => setNewCollection({ ...newCollection, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="My Favorite Recipes"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newCollection.description}
                    onChange={e =>
                      setNewCollection({ ...newCollection, description: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none"
                    placeholder="Describe what makes this collection special..."
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COLLECTION_CATEGORIES.map(category => (
                      <button
                        key={category.value}
                        onClick={() =>
                          setNewCollection({ ...newCollection, category: category.value })
                        }
                        className={`p-3 rounded-xl border-2 transition-all text-left ${
                          newCollection.category === category.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{category.icon}</span>
                          <span className="font-medium text-sm">{category.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{category.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy */}
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={newCollection.isPublic}
                      onChange={e =>
                        setNewCollection({ ...newCollection, isPublic: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-700">Make this collection public</span>
                      <p className="text-sm text-gray-500">
                        Others can discover and view this collection
                      </p>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingCollection(null);
                      setNewCollection({
                        name: '',
                        description: '',
                        category: 'custom',
                        isPublic: false,
                        tags: [],
                      });
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingCollection ? handleUpdateCollection : handleCreateCollection}
                    disabled={!newCollection.name.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingCollection ? 'Update Collection' : 'Create Collection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
