import React, { useState, useEffect } from 'react';
import { PantryItem, PantryInventory, IngredientCategory, SubscriptionTier } from '../types';

interface PantryInventoryManagerProps {
  pantryInventory: PantryInventory;
  userSubscription: SubscriptionTier;
  onUpdateInventory: (inventory: PantryInventory) => void;
  onUpgradePrompt?: () => void;
}

const SUBSCRIPTION_LIMITS = {
  free: 50,
  premium: 500,
  family: 1000,
  chef: -1, // unlimited
};

const CATEGORIES: { key: IngredientCategory; label: string; icon: string }[] = [
  { key: 'protein', label: 'Proteins', icon: '🥩' },
  { key: 'vegetables', label: 'Vegetables', icon: '🥕' },
  { key: 'fruits', label: 'Fruits', icon: '🍎' },
  { key: 'grains', label: 'Grains', icon: '🌾' },
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
  { key: 'spices', label: 'Spices', icon: '🌶️' },
  { key: 'herbs', label: 'Herbs', icon: '🌿' },
  { key: 'oils', label: 'Oils', icon: '🛢️' },
  { key: 'pantry', label: 'Pantry', icon: '🏺' },
  { key: 'other', label: 'Other', icon: '📦' },
];

const LOCATIONS = [
  { key: 'fridge', label: 'Refrigerator', icon: '❄️' },
  { key: 'pantry', label: 'Pantry', icon: '🏺' },
  { key: 'freezer', label: 'Freezer', icon: '🧊' },
];

export default function PantryInventoryManager({
  pantryInventory,
  userSubscription,
  onUpdateInventory,
  onUpgradePrompt,
}: PantryInventoryManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'quantity' | 'category'>('name');
  const [showAddItem, setShowAddItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newItem, setNewItem] = useState<Partial<PantryItem>>({
    name: '',
    category: 'other',
    currentQuantity: 1,
    originalQuantity: 1,
    unit: 'piece',
    location: 'pantry',
    isRunningLow: false,
    usageFrequency: 0,
  });

  const maxItems = SUBSCRIPTION_LIMITS[userSubscription];
  const canAddItems = maxItems === -1 || pantryInventory.totalItems < maxItems;
  const itemsLeft = maxItems === -1 ? 'unlimited' : maxItems - pantryInventory.totalItems;

  const filteredItems = pantryInventory.items
    .filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'expiry':
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        case 'quantity':
          return a.currentQuantity - b.currentQuantity;
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

  const expiringItems = pantryInventory.items.filter(item => {
    if (!item.expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  });

  const lowStockItems = pantryInventory.items.filter(item => item.isRunningLow);

  const handleAddItem = () => {
    if (!canAddItems) {
      onUpgradePrompt?.();
      return;
    }

    if (!newItem.name || !newItem.category) return;

    const item: PantryItem = {
      id: Date.now().toString(),
      name: newItem.name!,
      category: newItem.category!,
      currentQuantity: newItem.currentQuantity || 1,
      originalQuantity: newItem.originalQuantity || 1,
      unit: newItem.unit || 'piece',
      location: newItem.location,
      isRunningLow: (newItem.currentQuantity || 1) <= (newItem.autoReorderLevel || 0),
      usageFrequency: 0,
      expiryDate: newItem.expiryDate,
      purchaseDate: newItem.purchaseDate || new Date(),
      price: newItem.price,
      brand: newItem.brand,
      barcode: newItem.barcode,
      autoReorderLevel: newItem.autoReorderLevel,
      isProtein: newItem.category === 'protein',
      isVegetarian: !['protein'].includes(newItem.category!),
      isVegan: !['protein', 'dairy'].includes(newItem.category!),
    };

    const updatedInventory: PantryInventory = {
      ...pantryInventory,
      items: [...pantryInventory.items, item],
      totalItems: pantryInventory.totalItems + 1,
      categoryCounts: {
        ...pantryInventory.categoryCounts,
        [item.category]: (pantryInventory.categoryCounts[item.category] || 0) + 1,
      },
      lastUpdated: new Date(),
    };

    onUpdateInventory(updatedInventory);
    setNewItem({
      name: '',
      category: 'other',
      currentQuantity: 1,
      originalQuantity: 1,
      unit: 'piece',
      location: 'pantry',
      isRunningLow: false,
      usageFrequency: 0,
    });
    setShowAddItem(false);
  };

  const handleRemoveItem = (itemId: string) => {
    const item = pantryInventory.items.find(i => i.id === itemId);
    if (!item) return;

    const updatedInventory: PantryInventory = {
      ...pantryInventory,
      items: pantryInventory.items.filter(i => i.id !== itemId),
      totalItems: pantryInventory.totalItems - 1,
      categoryCounts: {
        ...pantryInventory.categoryCounts,
        [item.category]: Math.max(0, (pantryInventory.categoryCounts[item.category] || 1) - 1),
      },
      lastUpdated: new Date(),
    };

    onUpdateInventory(updatedInventory);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    const updatedItems = pantryInventory.items.map(item =>
      item.id === itemId
        ? {
            ...item,
            currentQuantity: Math.max(0, newQuantity),
            isRunningLow: newQuantity <= (item.autoReorderLevel || 0),
            lastUsedDate: newQuantity < item.currentQuantity ? new Date() : item.lastUsedDate,
          }
        : item
    );

    const updatedInventory: PantryInventory = {
      ...pantryInventory,
      items: updatedItems,
      lastUpdated: new Date(),
    };

    onUpdateInventory(updatedInventory);
  };

  const getExpiryColor = (expiryDate?: Date) => {
    if (!expiryDate) return 'text-gray-500';
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 0) return 'text-red-600';
    if (daysUntilExpiry <= 3) return 'text-orange-600';
    if (daysUntilExpiry <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏺</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Pantry Inventory</h2>
            <p className="text-sm text-gray-600">
              {pantryInventory.totalItems} of {maxItems === -1 ? '∞' : maxItems} items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Subscription Status */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            {expiringItems.length > 0 && (
              <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                <span>⚠️</span>
                <span>{expiringItems.length} expiring soon</span>
              </div>
            )}
            {lowStockItems.length > 0 && (
              <div className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full">
                <span>📉</span>
                <span>{lowStockItems.length} low stock</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowAddItem(true)}
            disabled={!canAddItems}
            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
              canAddItems
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="text-lg">➕</span>
            Add Item
          </button>
        </div>
      </div>

      {/* Subscription Limit Warning */}
      {!canAddItems && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-orange-800">Pantry Limit Reached</p>
              <p className="text-sm text-orange-700">
                You've reached your {maxItems} item limit for the {userSubscription} plan.
                <button onClick={onUpgradePrompt} className="ml-1 underline hover:text-orange-900">
                  Upgrade to add more items
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="expiry">Sort by Expiry</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({pantryInventory.totalItems})
          </button>
          {CATEGORIES.map(category => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                selectedCategory === category.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-xs">{category.icon}</span>
              {category.label} ({pantryInventory.categoryCounts[category.key] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {CATEGORIES.find(c => c.key === item.category)?.icon || '📦'}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {/* Quantity */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.currentQuantity - 1)}
                    className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs hover:bg-gray-300"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium min-w-12 text-center">
                    {item.currentQuantity} {item.unit}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.currentQuantity + 1)}
                    className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs hover:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Location */}
              {item.location && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Location:</span>
                  <span className="text-sm flex items-center gap-1">
                    {LOCATIONS.find(l => l.key === item.location)?.icon}
                    <span className="capitalize">{item.location}</span>
                  </span>
                </div>
              )}

              {/* Expiry Date */}
              {item.expiryDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Expires:</span>
                  <span className={`text-sm font-medium ${getExpiryColor(item.expiryDate)}`}>
                    {new Date(item.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Status Indicators */}
              <div className="flex items-center gap-2 pt-2">
                {item.isRunningLow && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    Low Stock
                  </span>
                )}
                {item.expiryDate && (
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      getExpiryColor(item.expiryDate).includes('red')
                        ? 'bg-red-100 text-red-700'
                        : getExpiryColor(item.expiryDate).includes('orange')
                          ? 'bg-orange-100 text-orange-700'
                          : getExpiryColor(item.expiryDate).includes('yellow')
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {(() => {
                      const days = Math.ceil(
                        (new Date(item.expiryDate!).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      if (days < 0) return 'Expired';
                      if (days === 0) return 'Expires today';
                      if (days === 1) return 'Expires tomorrow';
                      return `${days} days left`;
                    })()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <span className="text-6xl mb-4 block">🏺</span>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No items found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedCategory !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start building your pantry inventory by adding items'}
          </p>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-90vh overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Add New Item</h3>
              <button
                onClick={() => setShowAddItem(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={newItem.name || ''}
                  onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Tomatoes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={e =>
                    setNewItem({ ...newItem, category: e.target.value as IngredientCategory })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(category => (
                    <option key={category.key} value={category.key}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newItem.currentQuantity || ''}
                    onChange={e =>
                      setNewItem({
                        ...newItem,
                        currentQuantity: parseFloat(e.target.value) || 0,
                        originalQuantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={newItem.unit}
                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="piece">Piece</option>
                    <option value="kg">Kilogram</option>
                    <option value="g">Gram</option>
                    <option value="lb">Pound</option>
                    <option value="oz">Ounce</option>
                    <option value="l">Liter</option>
                    <option value="ml">Milliliter</option>
                    <option value="cup">Cup</option>
                    <option value="can">Can</option>
                    <option value="bottle">Bottle</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={newItem.location}
                  onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {LOCATIONS.map(location => (
                    <option key={location.key} value={location.key}>
                      {location.icon} {location.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={
                    newItem.expiryDate
                      ? new Date(newItem.expiryDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={e =>
                    setNewItem({
                      ...newItem,
                      expiryDate: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {userSubscription !== 'free' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.price || ''}
                      onChange={e =>
                        setNewItem({ ...newItem, price: parseFloat(e.target.value) || undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand (Optional)
                    </label>
                    <input
                      type="text"
                      value={newItem.brand || ''}
                      onChange={e => setNewItem({ ...newItem, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddItem(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItem.name}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
