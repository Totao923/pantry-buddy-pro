import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import { useAuth } from '../../lib/auth/AuthProvider';
import { IngredientCategory } from '../../types';
import FamilyShoppingList from '../../components/family/FamilyShoppingList';
import BulkShoppingModal from '../../components/family/BulkShoppingModal';
import FeatureGate from '../../components/FeatureGate';

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  estimatedPrice?: number;
  purchased: boolean;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  addedDate: Date;
}

interface ShoppingList {
  id: string;
  name: string;
  userId: string;
  items: ShoppingListItem[];
  createdDate: Date;
  lastModified: Date;
  isActive: boolean;
  totalEstimatedCost: number;
  completedItems: number;
}

export default function ShoppingLists() {
  const { user } = useAuth();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [familyListsKey, setFamilyListsKey] = useState(0);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    unit: 'pcs',
    category: 'other' as IngredientCategory,
    estimatedPrice: 0,
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const categories: { id: IngredientCategory; name: string; icon: string }[] = [
    { id: 'protein', name: 'Protein', icon: '🥩' },
    { id: 'vegetables', name: 'Vegetables', icon: '🥕' },
    { id: 'fruits', name: 'Fruits', icon: '🍎' },
    { id: 'grains', name: 'Grains', icon: '🌾' },
    { id: 'dairy', name: 'Dairy', icon: '🥛' },
    { id: 'spices', name: 'Spices', icon: '🧂' },
    { id: 'herbs', name: 'Herbs', icon: '🌿' },
    { id: 'oils', name: 'Oils', icon: '🫒' },
    { id: 'pantry', name: 'Pantry', icon: '🥫' },
    { id: 'other', name: 'Other', icon: '📦' },
  ];

  const units = ['pcs', 'lbs', 'oz', 'cups', 'tbsp', 'tsp', 'ml', 'l', 'kg', 'g'];

  // Security: Input sanitization
  const sanitizeInput = (input: string, maxLength: number = 100): string => {
    return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
  };

  const sanitizeNumber = (num: number, min: number = 0, max: number = 10000): number => {
    return Math.max(min, Math.min(max, num || 0));
  };

  // Security: Validate shopping list data structure
  const validateShoppingListItem = (item: any): boolean => {
    return (
      item &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.quantity === 'number' &&
      typeof item.unit === 'string' &&
      typeof item.category === 'string' &&
      typeof item.purchased === 'boolean' &&
      ['low', 'medium', 'high'].includes(item.priority)
    );
  };

  const validateShoppingList = (list: any): boolean => {
    return (
      list &&
      typeof list.id === 'string' &&
      typeof list.name === 'string' &&
      typeof list.userId === 'string' &&
      Array.isArray(list.items) &&
      list.items.every(validateShoppingListItem) &&
      typeof list.isActive === 'boolean'
    );
  };

  useEffect(() => {
    loadShoppingLists();
  }, [user]);

  const loadShoppingLists = () => {
    try {
      const savedLists = localStorage.getItem('shoppingLists');
      if (savedLists) {
        const parsedData = JSON.parse(savedLists);

        // Security: Validate parsed data structure
        if (Array.isArray(parsedData) && parsedData.every(validateShoppingList)) {
          const lists = parsedData.map((list: any) => ({
            ...list,
            createdDate: new Date(list.createdDate),
            lastModified: new Date(list.lastModified),
            items: list.items.map((item: any) => ({
              ...item,
              addedDate: new Date(item.addedDate),
            })),
          }));
          setShoppingLists(lists);
          if (lists.length > 0 && !selectedList) {
            setSelectedList(lists.find((list: ShoppingList) => list.isActive) || lists[0]);
          }
        } else {
          console.warn('Invalid shopping list data structure, clearing localStorage');
          localStorage.removeItem('shoppingLists');
          setShoppingLists([]);
        }
      }
    } catch (error) {
      console.error('Error loading shopping lists:', error);
      // Security: Clear potentially corrupted data
      localStorage.removeItem('shoppingLists');
      setShoppingLists([]);
    } finally {
      setLoading(false);
    }
  };

  const saveShoppingLists = (lists: ShoppingList[]) => {
    localStorage.setItem('shoppingLists', JSON.stringify(lists));
    setShoppingLists(lists);
  };

  const createNewList = () => {
    const sanitizedName = sanitizeInput(newListName, 50);
    if (!sanitizedName || !user) return;

    const newList: ShoppingList = {
      id: uuidv4(), // Security: Use UUID instead of Date.now()
      name: sanitizedName,
      userId: user.id,
      items: [],
      createdDate: new Date(),
      lastModified: new Date(),
      isActive: true,
      totalEstimatedCost: 0,
      completedItems: 0,
    };

    const updatedLists = [...shoppingLists, newList];
    saveShoppingLists(updatedLists);
    setSelectedList(newList);
    setNewListName('');
    setShowCreateModal(false);
  };

  const addItemToList = () => {
    const sanitizedName = sanitizeInput(newItem.name, 50);
    const sanitizedNotes = sanitizeInput(newItem.notes || '', 200);
    if (!sanitizedName || !selectedList) return;

    const item: ShoppingListItem = {
      id: uuidv4(), // Security: Use UUID instead of Date.now()
      name: sanitizedName,
      quantity: sanitizeNumber(newItem.quantity, 1, 1000),
      unit: newItem.unit,
      category: newItem.category,
      estimatedPrice: sanitizeNumber(newItem.estimatedPrice || 0, 0, 9999.99),
      purchased: false,
      notes: sanitizedNotes,
      priority: newItem.priority,
      addedDate: new Date(),
    };

    const updatedList = {
      ...selectedList,
      items: [...selectedList.items, item],
      lastModified: new Date(),
      totalEstimatedCost: selectedList.totalEstimatedCost + (item.estimatedPrice || 0),
    };

    const updatedLists = shoppingLists.map(list =>
      list.id === selectedList.id ? updatedList : list
    );

    saveShoppingLists(updatedLists);
    setSelectedList(updatedList);
    setNewItem({
      name: '',
      quantity: 1,
      unit: 'pcs',
      category: 'other',
      estimatedPrice: 0,
      notes: '',
      priority: 'medium',
    });
    setShowAddItemModal(false);
  };

  const toggleItemPurchased = (itemId: string) => {
    if (!selectedList) return;

    const updatedItems = selectedList.items.map(item =>
      item.id === itemId ? { ...item, purchased: !item.purchased } : item
    );

    const completedItems = updatedItems.filter(item => item.purchased).length;

    const updatedList = {
      ...selectedList,
      items: updatedItems,
      completedItems,
      lastModified: new Date(),
    };

    const updatedLists = shoppingLists.map(list =>
      list.id === selectedList.id ? updatedList : list
    );

    saveShoppingLists(updatedLists);
    setSelectedList(updatedList);
  };

  const deleteItem = (itemId: string) => {
    if (!selectedList) return;

    const itemToDelete = selectedList.items.find(item => item.id === itemId);
    const updatedItems = selectedList.items.filter(item => item.id !== itemId);

    const updatedList = {
      ...selectedList,
      items: updatedItems,
      totalEstimatedCost: selectedList.totalEstimatedCost - (itemToDelete?.estimatedPrice || 0),
      completedItems: updatedItems.filter(item => item.purchased).length,
      lastModified: new Date(),
    };

    const updatedLists = shoppingLists.map(list =>
      list.id === selectedList.id ? updatedList : list
    );

    saveShoppingLists(updatedLists);
    setSelectedList(updatedList);
  };

  const deleteList = (listId: string) => {
    const updatedLists = shoppingLists.filter(list => list.id !== listId);
    saveShoppingLists(updatedLists);

    if (selectedList?.id === listId) {
      setSelectedList(updatedLists.length > 0 ? updatedLists[0] : null);
    }
  };

  const getItemsByCategory = () => {
    if (!selectedList) return {};

    return selectedList.items.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<IngredientCategory, ShoppingListItem[]>
    );
  };

  // Family shopping list handlers
  const handleCreateFamilyList = () => {
    setShowCreateModal(true);
  };

  const handleEditFamilyList = (list: any) => {
    // For now, just show the create modal for editing
    // In a full implementation, you'd pre-populate the form with the list data
    setShowCreateModal(true);
  };

  const handleCreateBulkList = () => {
    setShowBulkModal(true);
  };

  const handleBulkListSuccess = () => {
    setShowBulkModal(false);
    // Refresh family lists
    setFamilyListsKey(prev => prev + 1);
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-pantry-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading shopping lists...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Head>
        <title>Shopping Lists - Pantry Buddy Pro</title>
        <meta name="description" content="Manage your shopping lists and grocery items" />
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shopping Lists</h1>
              <p className="text-gray-600 mt-1">Organize your grocery shopping</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium"
              >
                + Create List
              </button>
            </div>
          </div>

          {/* Family Shopping Lists */}
          <FeatureGate feature="family_management">
            <FamilyShoppingList
              key={familyListsKey}
              onCreateList={handleCreateFamilyList}
              onEditList={handleEditFamilyList}
              onCreateBulkList={handleCreateBulkList}
            />
          </FeatureGate>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lists Sidebar */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Lists</h3>
                {shoppingLists.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🛒</div>
                    <p className="text-gray-600 text-sm">No shopping lists yet</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-3 text-pantry-600 hover:text-pantry-700 font-medium text-sm"
                    >
                      Create your first list
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shoppingLists.map(list => (
                      <div
                        key={list.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedList?.id === list.id
                            ? 'border-pantry-500 bg-pantry-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedList(list)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{list.name}</h4>
                            <p className="text-sm text-gray-500">
                              {list.items.length} items • {list.completedItems} completed
                            </p>
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              deleteList(list.id);
                            }}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            🗑️
                          </button>
                        </div>
                        {list.totalEstimatedCost > 0 && (
                          <div className="mt-2 text-sm text-green-600 font-medium">
                            Est. ${list.totalEstimatedCost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8">
              {selectedList ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                  {/* List Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedList.name}</h2>
                        <p className="text-gray-600 text-sm">
                          {selectedList.items.length} items •{selectedList.completedItems}/
                          {selectedList.items.length} completed
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAddItemModal(true)}
                        className="px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors font-medium"
                      >
                        + Add Item
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-900">
                          {selectedList.items.length > 0
                            ? Math.round(
                                (selectedList.completedItems / selectedList.items.length) * 100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width:
                              selectedList.items.length > 0
                                ? `${(selectedList.completedItems / selectedList.items.length) * 100}%`
                                : '0%',
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-6">
                    {Object.keys(getItemsByCategory()).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📝</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Your list is empty
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Add items to start building your shopping list
                        </p>
                        <button
                          onClick={() => setShowAddItemModal(true)}
                          className="px-6 py-3 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium"
                        >
                          Add First Item
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(getItemsByCategory()).map(([category, items]) => {
                          const categoryInfo = categories.find(cat => cat.id === category);
                          const categoryItems = items as ShoppingListItem[];
                          return (
                            <div key={category}>
                              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
                                <span className="text-2xl">{categoryInfo?.icon}</span>
                                {categoryInfo?.name} ({categoryItems.length})
                              </h3>
                              <div className="space-y-2">
                                {categoryItems.map(item => (
                                  <div
                                    key={item.id}
                                    className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                                      item.purchased
                                        ? 'bg-gray-50 border-gray-200 opacity-75'
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={item.purchased}
                                      onChange={() => toggleItemPurchased(item.id)}
                                      className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500 h-5 w-5"
                                    />

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`font-medium ${item.purchased ? 'line-through text-gray-500' : 'text-gray-900'}`}
                                        >
                                          {item.name}
                                        </span>
                                        <span
                                          className={`text-sm px-2 py-1 rounded-full ${getPriorityColor(item.priority)}`}
                                        >
                                          {item.priority}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {item.quantity} {item.unit}
                                        {item.estimatedPrice && item.estimatedPrice > 0 && (
                                          <span> • ${item.estimatedPrice.toFixed(2)}</span>
                                        )}
                                        {item.notes && <span> • {item.notes}</span>}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => deleteItem(item.id)}
                                      className="text-gray-400 hover:text-red-600 p-1"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">🛒</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No list selected</h3>
                  <p className="text-gray-600">Create or select a shopping list to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create List Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Shopping List</h3>
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="Enter list name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent mb-4"
                onKeyPress={e => e.key === 'Enter' && createNewList()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewList}
                  disabled={!newListName.trim()}
                  className="flex-1 px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddItemModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Item</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter item name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={e =>
                        setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={newItem.unit}
                      onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={e =>
                      setNewItem(prev => ({
                        ...prev,
                        category: e.target.value as IngredientCategory,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newItem.priority}
                    onChange={e =>
                      setNewItem(prev => ({
                        ...prev,
                        priority: e.target.value as 'low' | 'medium' | 'high',
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.estimatedPrice}
                    onChange={e =>
                      setNewItem(prev => ({
                        ...prev,
                        estimatedPrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={newItem.notes}
                    onChange={e => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddItemModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addItemToList}
                  disabled={!newItem.name.trim()}
                  className="flex-1 px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Shopping Modal */}
        <FeatureGate feature="bulk_shopping">
          <BulkShoppingModal
            isOpen={showBulkModal}
            onClose={() => setShowBulkModal(false)}
            onSuccess={handleBulkListSuccess}
          />
        </FeatureGate>
      </DashboardLayout>
    </AuthGuard>
  );
}
