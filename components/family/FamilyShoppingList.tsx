import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ShoppingListItem {
  name: string;
  quantity: string;
  category?: string;
  isChecked?: boolean;
}

interface FamilyShoppingList {
  id: string;
  name: string;
  family_id: string;
  created_by: string;
  meal_plan_ids: string[];
  items: ShoppingListItem[];
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  family_groups: { name: string };
  user_profiles: { email: string };
}

interface FamilyShoppingListsData {
  shoppingLists: FamilyShoppingList[];
}

interface FamilyShoppingListProps {
  onCreateList?: () => void;
  onEditList?: (list: FamilyShoppingList) => void;
  onCreateBulkList?: () => void;
  onClearAll?: () => void;
}

export default function FamilyShoppingList({
  onCreateList,
  onEditList,
  onCreateBulkList,
  onClearAll,
}: FamilyShoppingListProps) {
  const [shoppingLists, setShoppingLists] = useState<FamilyShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      loadShoppingLists();
    }
  }, [session]);

  const loadShoppingLists = async () => {
    try {
      const response = await fetch('/api/family/shopping-lists', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data: FamilyShoppingListsData = await response.json();
        setShoppingLists(data.shoppingLists);
      }
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCheck = async (listId: string, itemIndex: number) => {
    const list = shoppingLists.find(l => l.id === listId);
    if (!list) return;

    const updatedItems = [...(Array.isArray(list.items) ? list.items : [])];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      isChecked: !updatedItems[itemIndex].isChecked,
    };

    try {
      const response = await fetch('/api/family/shopping-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          listId,
          items: updatedItems,
        }),
      });

      if (response.ok) {
        // Update local state
        setShoppingLists(prev =>
          prev.map(l => (l.id === listId ? { ...l, items: updatedItems } : l))
        );
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const markListComplete = async (listId: string) => {
    try {
      const response = await fetch('/api/family/shopping-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          listId,
          isCompleted: true,
        }),
      });

      if (response.ok) {
        // Update local state
        setShoppingLists(prev =>
          prev.map(l => (l.id === listId ? { ...l, is_completed: true } : l))
        );
      }
    } catch (error) {
      console.error('Failed to complete list:', error);
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this shopping list?')) {
      return;
    }

    try {
      const response = await fetch(`/api/family/shopping-lists?listId=${listId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        setShoppingLists(prev => prev.filter(l => l.id !== listId));
      }
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const getItemsByCategory = (items: ShoppingListItem[]) => {
    const categories: { [key: string]: ShoppingListItem[] } = {};
    if (!Array.isArray(items)) return categories;

    items.forEach(item => {
      const category = item.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });
    return categories;
  };

  const getCompletionPercentage = (items: ShoppingListItem[]) => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    const checkedItems = items.filter(item => item.isChecked).length;
    return Math.round((checkedItems / items.length) * 100);
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      protein: '🥩',
      vegetables: '🥕',
      fruits: '🍎',
      grains: '🌾',
      dairy: '🥛',
      spices: '🧂',
      herbs: '🌿',
      oils: '🫒',
      pantry: '🥫',
      other: '🛒',
    };
    return icons[category] || '🛒';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (shoppingLists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Family Shopping Lists Yet</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Create your first family shopping list or generate one from meal plans.
        </p>
        <div className="flex gap-3 justify-center">
          {onCreateList && <Button onClick={onCreateList}>Create Shopping List</Button>}
          {onCreateBulkList && (
            <Button variant="secondary" onClick={onCreateBulkList}>
              📋 Create from Meal Plans
            </Button>
          )}
        </div>
      </div>
    );
  }

  const activeLists = shoppingLists.filter(list => !list.is_completed);
  const completedLists = shoppingLists.filter(list => list.is_completed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Family Shopping Lists</h2>
        <div className="flex gap-2">
          {shoppingLists.length > 0 && onClearAll && (
            <Button variant="secondary" size="sm" onClick={onClearAll}>
              Clear All
            </Button>
          )}
          {onCreateBulkList && (
            <Button variant="secondary" size="sm" onClick={onCreateBulkList}>
              📋 From Meal Plans
            </Button>
          )}
          {onCreateList && (
            <Button onClick={onCreateList} size="sm">
              New List
            </Button>
          )}
        </div>
      </div>

      {/* Active Lists */}
      {activeLists.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Active Lists</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeLists.map(list => {
              // Ensure items is always an array
              const items = Array.isArray(list.items) ? list.items : [];
              const completionPercentage = getCompletionPercentage(items);
              const categorizedItems = getItemsByCategory(items);

              return (
                <Card key={list.id} hover className="p-6">
                  <div className="flex flex-col h-full">
                    {/* List Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{list.name}</h4>
                        <p className="text-sm text-gray-500">
                          Created by {list.user_profiles.email}
                        </p>
                        {list.meal_plan_ids.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            📋 From {list.meal_plan_ids.length} meal plan
                            {list.meal_plan_ids.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEditList?.(list)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteList(list.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{completionPercentage}% complete</span>
                        <span>
                          {items.filter(i => i.isChecked).length} of {items.length} items
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Items by Category */}
                    <div className="flex-1 space-y-3 mb-4">
                      {Object.entries(categorizedItems)
                        .slice(0, 3)
                        .map(([category, items]) => (
                          <div key={category} className="border-l-2 border-gray-200 pl-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{getCategoryIcon(category)}</span>
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {category} ({items.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {items.slice(0, 3).map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={item.isChecked || false}
                                    onChange={() => toggleItemCheck(list.id, items.indexOf(item))}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                  />
                                  <span
                                    className={`text-sm ${
                                      item.isChecked
                                        ? 'line-through text-gray-500'
                                        : 'text-gray-700'
                                    }`}
                                  >
                                    {item.quantity} {item.name}
                                  </span>
                                </div>
                              ))}
                              {items.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{items.length - 3} more items
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      {Object.keys(categorizedItems).length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{Object.keys(categorizedItems).length - 3} more categories
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditList?.(list)}
                        fullWidth
                      >
                        View Details
                      </Button>
                      {completionPercentage === 100 && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => markListComplete(list.id)}
                          fullWidth
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Lists */}
      {completedLists.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">Completed Lists</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {completedLists.slice(0, 6).map(list => (
              <Card key={list.id} className="p-4 bg-gray-50 border-dashed">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-700 line-through">{list.name}</h5>
                    <p className="text-xs text-gray-500">
                      Completed {new Date(list.updated_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Array.isArray(list.items) ? list.items.length : 0} items
                    </p>
                  </div>
                  <div className="text-green-600 text-xl">✅</div>
                </div>
              </Card>
            ))}
          </div>
          {completedLists.length > 6 && (
            <p className="text-sm text-gray-500 mt-2">
              +{completedLists.length - 6} more completed lists
            </p>
          )}
        </div>
      )}
    </div>
  );
}
