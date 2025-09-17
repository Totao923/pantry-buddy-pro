import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface Recipe {
  id: string;
  name: string;
  description: string;
  image_url?: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  is_collaborative: boolean;
  created_at: string;
  created_by: string;
  family_groups: { name: string };
  user_profiles: { email: string };
  family_collection_recipes?: Array<{
    recipe_id: string;
    added_at: string;
    recipes: Recipe;
  }>;
}

interface FamilyCollectionsData {
  collections: Collection[];
}

interface FamilyCollectionsProps {
  onCreateCollection?: () => void;
  onViewCollection?: (collection: Collection) => void;
  onDeleteCollection?: (collection: Collection) => void;
  onClearAll?: () => void;
}

export default function FamilyCollections({
  onCreateCollection,
  onViewCollection,
  onDeleteCollection,
  onClearAll,
}: FamilyCollectionsProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      loadCollections();
    }
  }, [session]);

  const loadCollections = async () => {
    try {
      const response = await fetch('/api/family/collections', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data: FamilyCollectionsData = await response.json();
        setCollections(data.collections);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Family Collections Yet</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Create your first family recipe collection to organize and share recipes with your family.
        </p>
        {onCreateCollection && (
          <Button onClick={onCreateCollection}>Create First Collection</Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Family Recipe Collections</h2>
        <div className="flex gap-2">
          {collections.length > 0 && onClearAll && (
            <Button onClick={onClearAll} size="sm" variant="secondary">
              Clear All
            </Button>
          )}
          {onCreateCollection && (
            <Button onClick={onCreateCollection} size="sm">
              New Collection
            </Button>
          )}
        </div>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map(collection => (
          <Card key={collection.id} hover className="p-6">
            <div className="flex flex-col h-full">
              {/* Collection Header */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-1">{collection.name}</h3>
                {collection.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{collection.description}</p>
                )}
              </div>

              {/* Collection Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span>{collection.family_collection_recipes?.length || 0} recipes</span>
                <span>•</span>
                <span>{collection.is_collaborative ? 'Collaborative' : 'Private'}</span>
              </div>

              {/* Recipe Preview */}
              {collection.family_collection_recipes &&
                collection.family_collection_recipes.length > 0 && (
                  <div className="mb-4 flex-1">
                    <div className="text-xs text-gray-500 mb-2">Recent recipes:</div>
                    <div className="space-y-1">
                      {collection.family_collection_recipes.slice(0, 3).map(item => (
                        <div key={item.recipe_id} className="text-sm text-gray-700 truncate">
                          • {item.recipes.name}
                        </div>
                      ))}
                      {collection.family_collection_recipes.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{collection.family_collection_recipes.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Collection Footer */}
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Created by {collection.user_profiles.email}
                  </div>
                  <div className="flex gap-2">
                    {onDeleteCollection && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteCollection(collection)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    )}
                    {onViewCollection && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewCollection(collection)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
