import React, { useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import FeatureGate from '../../components/FeatureGate';
import FamilyShoppingList from '../../components/family/FamilyShoppingList';
import BulkShoppingModal from '../../components/family/BulkShoppingModal';
import ShoppingListViewModal from '../../components/family/ShoppingListViewModal';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../lib/auth/AuthProvider';

export default function FamilyShoppingPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [familyListsKey, setFamilyListsKey] = useState(0);
  const [newListName, setNewListName] = useState('');
  const { session } = useAuth();

  const handleCreateList = () => {
    setShowCreateModal(true);
  };

  const handleEditList = (list: any) => {
    setSelectedList(list);
    setShowViewModal(true);
  };

  const handleCreateBulkList = () => {
    setShowBulkModal(true);
  };

  const handleListSuccess = () => {
    setShowCreateModal(false);
    setShowBulkModal(false);
    setNewListName('');
    // Refresh family lists
    setFamilyListsKey(prev => prev + 1);
  };

  const handleCreateSimpleList = async () => {
    if (!newListName.trim()) return;

    try {
      const response = await fetch('/api/family/shopping-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: newListName.trim(),
          items: [],
        }),
      });

      if (response.ok) {
        handleListSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create shopping list');
      }
    } catch (error) {
      console.error('Failed to create shopping list:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL shopping lists? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/family/shopping-lists/clear', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        // Refresh the shopping lists
        setFamilyListsKey(prev => prev + 1);
        const data = await response.json();
        alert(data.message || 'Shopping lists cleared successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to clear shopping lists');
      }
    } catch (error) {
      console.error('Clear all error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <AuthGuard requireAuth>
      <Head>
        <title>Family Shopping Lists - Pantry Buddy Pro</title>
        <meta
          name="description"
          content="Manage family shopping lists and bulk meal plan shopping"
        />
      </Head>

      <DashboardLayout>
        <FeatureGate feature="family_management">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Family Shopping Lists</h1>
              <p className="text-gray-600">
                Create shared shopping lists for your family and generate bulk lists from meal
                plans.
              </p>
            </div>

            <FamilyShoppingList
              key={familyListsKey}
              onCreateList={handleCreateList}
              onEditList={handleEditList}
              onCreateBulkList={handleCreateBulkList}
              onClearAll={handleClearAll}
            />

            {/* Simple Create Modal */}
            <Modal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              title="Create Family Shopping List"
              size="md"
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="listName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Shopping List Name *
                  </label>
                  <input
                    type="text"
                    id="listName"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Weekly Groceries, Party Supplies"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Pro Tip</h4>
                  <p className="text-sm text-blue-700">
                    For meal plan-based shopping lists, use the "From Meal Plans" button to
                    automatically aggregate ingredients from multiple meal plans.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    onClick={handleCreateSimpleList}
                    disabled={!newListName.trim()}
                  >
                    Create List
                  </Button>
                </div>
              </div>
            </Modal>

            {/* Bulk Shopping Modal */}
            <FeatureGate feature="bulk_shopping">
              <BulkShoppingModal
                isOpen={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                onSuccess={handleListSuccess}
              />
            </FeatureGate>

            {/* Shopping List View Modal */}
            <ShoppingListViewModal
              isOpen={showViewModal}
              onClose={() => setShowViewModal(false)}
              onSuccess={handleListSuccess}
              shoppingList={selectedList}
            />
          </div>
        </FeatureGate>
      </DashboardLayout>
    </AuthGuard>
  );
}
