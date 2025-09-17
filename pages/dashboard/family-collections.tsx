import React, { useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import FeatureGate from '../../components/FeatureGate';
import FamilyCollections from '../../components/family/FamilyCollections';
import CollectionModal from '../../components/family/CollectionModal';
import { useAuth } from '../../lib/auth/AuthProvider';

interface Collection {
  id?: string;
  name: string;
  description?: string;
  is_collaborative: boolean;
  created_at?: string;
  created_by?: string;
  family_groups: { name: string };
  user_profiles: { email: string };
  family_collection_recipes?: Array<{
    recipe_id: string;
    added_at: string;
    recipes: {
      id: string;
      name: string;
      description?: string;
      image_url?: string;
    };
  }>;
}

export default function FamilyCollectionsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [collectionsKey, setCollectionsKey] = useState(0); // For forcing refresh
  const { session } = useAuth();

  const handleCreateCollection = () => {
    setEditingCollection(null);
    setShowCreateModal(true);
  };

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setShowCreateModal(true);
  };

  const handleCollectionSuccess = () => {
    // Refresh the collections list
    setCollectionsKey(prev => prev + 1);
    setShowCreateModal(false);
    setEditingCollection(null);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingCollection(null);
  };

  const handleDeleteCollection = async (collection: Collection) => {
    if (!collection.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${collection.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/family/collections?collectionId=${collection.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        // Refresh the collections list
        setCollectionsKey(prev => prev + 1);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete collection');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL collections? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/family/collections/clear', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        // Refresh the collections list
        setCollectionsKey(prev => prev + 1);
        const data = await response.json();
        alert(data.message || 'Collections cleared successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to clear collections');
      }
    } catch (error) {
      console.error('Clear all error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <AuthGuard requireAuth>
      <Head>
        <title>Family Collections - Pantry Buddy Pro</title>
        <meta name="description" content="Manage your family recipe collections" />
      </Head>

      <DashboardLayout>
        <FeatureGate feature="family_collections">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Family Recipe Collections</h1>
              <p className="text-gray-600">
                Organize and share recipe collections with your family members.
              </p>
            </div>

            <FamilyCollections
              key={collectionsKey}
              onCreateCollection={handleCreateCollection}
              onViewCollection={handleEditCollection}
              onDeleteCollection={handleDeleteCollection}
              onClearAll={handleClearAll}
            />

            <CollectionModal
              isOpen={showCreateModal}
              onClose={handleCloseModal}
              onSuccess={handleCollectionSuccess}
              editCollection={editingCollection}
            />
          </div>
        </FeatureGate>
      </DashboardLayout>
    </AuthGuard>
  );
}
