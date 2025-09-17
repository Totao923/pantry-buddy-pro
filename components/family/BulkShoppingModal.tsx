import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface MealPlan {
  id: string;
  name: string;
  description?: string;
  shopping_list?: Array<{
    name: string;
    quantity: string;
    category?: string;
  }>;
  start_date: string;
  end_date: string;
  user_id: string;
}

interface BulkShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkShoppingModal({ isOpen, onClose, onSuccess }: BulkShoppingModalProps) {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedMealPlanIds, setSelectedMealPlanIds] = useState<string[]>([]);
  const [listName, setListName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState('');
  const { session } = useAuth();

  useEffect(() => {
    if (isOpen && session?.access_token) {
      loadMealPlans();
      generateDefaultName();
    }
  }, [isOpen, session]);

  const loadMealPlans = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      const response = await fetch(`/api/meal-plans?user_id=${userId}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Transform the API response to match our expected interface
        const transformedMealPlans: MealPlan[] = data.mealPlans.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description || '',
          shopping_list: plan.shoppingList || [],
          start_date: plan.startDate,
          end_date: plan.endDate,
          user_id: plan.userId,
        }));

        setMealPlans(transformedMealPlans);
      } else {
        console.error('Failed to fetch meal plans:', response.status);
        setError('Failed to load meal plans');
      }
    } catch (error) {
      console.error('Failed to load meal plans:', error);
      setError('Failed to load meal plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const generateDefaultName = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    setListName(`Family Shopping List - ${dateStr}`);
  };

  const handleMealPlanToggle = (mealPlanId: string) => {
    setSelectedMealPlanIds(prev =>
      prev.includes(mealPlanId) ? prev.filter(id => id !== mealPlanId) : [...prev, mealPlanId]
    );
  };

  const getAggregatedItems = () => {
    const selectedPlans = mealPlans.filter(plan => selectedMealPlanIds.includes(plan.id));
    const allItems: Array<{ name: string; quantity: string; category?: string }> = [];

    selectedPlans.forEach(plan => {
      if (plan.shopping_list) {
        allItems.push(...plan.shopping_list);
      }
    });

    // Group by item name and category
    const itemMap = new Map();
    allItems.forEach(item => {
      const key = `${item.name.toLowerCase()}_${item.category || 'other'}`;
      if (itemMap.has(key)) {
        const existing = itemMap.get(key);
        existing.quantity = `${existing.quantity} + ${item.quantity}`;
      } else {
        itemMap.set(key, { ...item });
      }
    });

    return Array.from(itemMap.values());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!listName.trim()) {
      setError('Shopping list name is required');
      return;
    }

    if (selectedMealPlanIds.length === 0) {
      setError('Please select at least one meal plan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const aggregatedItems = getAggregatedItems();

      const response = await fetch('/api/family/shopping-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: listName.trim(),
          mealPlanIds: selectedMealPlanIds,
          items: aggregatedItems,
        }),
      });

      if (response.ok) {
        onSuccess();
        handleClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create shopping list');
      }
    } catch (error) {
      console.error('Failed to create bulk shopping list:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setListName('');
    setSelectedMealPlanIds([]);
    setError('');
    onClose();
  };

  const aggregatedItems = getAggregatedItems();
  const itemsByCategory = aggregatedItems.reduce(
    (
      acc: { [key: string]: Array<{ name: string; quantity: string; category?: string }> },
      item
    ) => {
      const category = item.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {}
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Bulk Shopping List" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* List Name */}
        <div>
          <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-2">
            Shopping List Name *
          </label>
          <input
            type="text"
            id="listName"
            value={listName}
            onChange={e => setListName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter shopping list name"
            required
          />
        </div>

        {/* Meal Plan Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Meal Plans to Combine *
          </label>

          {loadingPlans ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
              ))}
            </div>
          ) : mealPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📅</div>
              <p>No meal plans available</p>
              <p className="text-sm">Create some meal plans first to generate shopping lists</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {mealPlans.map(plan => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedMealPlanIds.includes(plan.id)
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleMealPlanToggle(plan.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedMealPlanIds.includes(plan.id)}
                          onChange={() => handleMealPlanToggle(plan.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{plan.name}</h4>
                          {plan.description && (
                            <p className="text-sm text-gray-600">{plan.description}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {plan.shopping_list?.length || 0} items
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview of Combined Items */}
        {selectedMealPlanIds.length > 0 && aggregatedItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Preview: {aggregatedItems.length} Combined Items
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <h5 className="text-sm font-medium text-gray-800 mb-1 capitalize">
                    {category} ({items.length})
                  </h5>
                  <div className="text-sm text-gray-600 space-y-1">
                    {items.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-gray-500">{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={selectedMealPlanIds.length === 0}
          >
            Create Shopping List ({aggregatedItems.length} items)
          </Button>
        </div>
      </form>
    </Modal>
  );
}
