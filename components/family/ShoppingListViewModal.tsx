import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ShoppingListItem {
  name: string;
  quantity: string;
  category?: string;
  isChecked?: boolean;
}

interface ShoppingList {
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

interface ShoppingListViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shoppingList: ShoppingList | null;
}

export default function ShoppingListViewModal({
  isOpen,
  onClose,
  onSuccess,
  shoppingList,
}: ShoppingListViewModalProps) {
  const [listName, setListName] = useState('');
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    if (shoppingList && isOpen) {
      setListName(shoppingList.name);
      setItems(Array.isArray(shoppingList.items) ? [...shoppingList.items] : []);
      setIsEditing(false);
    }
  }, [shoppingList, isOpen]);

  const handleToggleItem = (index: number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      isChecked: !newItems[index].isChecked,
    };
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: '1', category: 'other', isChecked: false }]);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof ShoppingListItem,
    value: string | boolean
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!shoppingList || !listName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/family/shopping-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          listId: shoppingList.id,
          name: listName.trim(),
          items: items.filter(item => item.name.trim()),
        }),
      });

      if (response.ok) {
        onSuccess();
        setIsEditing(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update shopping list');
      }
    } catch (error) {
      console.error('Update error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setIsEditing(false);
    onClose();
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

  const completionPercentage =
    items.length > 0
      ? Math.round((items.filter(item => item.isChecked).length / items.length) * 100)
      : 0;

  if (!shoppingList) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Shopping List' : shoppingList.name}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-gray-600">Created by {shoppingList.user_profiles.email}</p>
              <p className="text-xs text-gray-500">
                {new Date(shoppingList.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium text-gray-900">{completionPercentage}% complete</p>
              <p className="text-sm text-gray-600">
                {items.filter(i => i.isChecked).length} of {items.length} items
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>

          {shoppingList.meal_plan_ids.length > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              📋 Generated from {shoppingList.meal_plan_ids.length} meal plan
              {shoppingList.meal_plan_ids.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* List Name - Editable */}
        {isEditing && (
          <div>
            <label htmlFor="listName" className="block text-sm font-medium text-gray-700 mb-2">
              Shopping List Name
            </label>
            <input
              type="text"
              id="listName"
              value={listName}
              onChange={e => setListName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter list name"
            />
          </div>
        )}

        {/* Items List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Items</h3>
            {isEditing && (
              <Button size="sm" onClick={handleAddItem}>
                Add Item
              </Button>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={item.isChecked || false}
                  onChange={() => handleToggleItem(index)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />

                <span className="text-lg">{getCategoryIcon(item.category || 'other')}</span>

                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={item.quantity}
                      onChange={e => handleUpdateItem(index, 'quantity', e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Qty"
                    />
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleUpdateItem(index, 'name', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Item name"
                    />
                    <select
                      value={item.category || 'other'}
                      onChange={e => handleUpdateItem(index, 'category', e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="protein">Protein</option>
                      <option value="vegetables">Vegetables</option>
                      <option value="fruits">Fruits</option>
                      <option value="grains">Grains</option>
                      <option value="dairy">Dairy</option>
                      <option value="spices">Spices</option>
                      <option value="herbs">Herbs</option>
                      <option value="oils">Oils</option>
                      <option value="pantry">Pantry</option>
                      <option value="other">Other</option>
                    </select>
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      🗑️
                    </button>
                  </>
                ) : (
                  <div className="flex-1">
                    <span
                      className={`${item.isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}
                    >
                      {item.quantity} {item.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2 capitalize">({item.category})</span>
                  </div>
                )}
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No items in this shopping list</p>
                {isEditing && (
                  <Button onClick={handleAddItem} size="sm" className="mt-2">
                    Add First Item
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
            {isEditing ? 'Cancel' : 'Close'}
          </Button>

          {isEditing ? (
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleSave}
              loading={loading}
            >
              Save Changes
            </Button>
          ) : (
            <Button type="button" variant="primary" fullWidth onClick={() => setIsEditing(true)}>
              Edit List
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
