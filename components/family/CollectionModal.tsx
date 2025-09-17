import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/AuthProvider';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface Collection {
  id?: string;
  name: string;
  description?: string;
  is_collaborative: boolean;
  created_at?: string;
  created_by?: string;
  family_groups?: { name: string };
  user_profiles?: { email: string };
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

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editCollection?: Collection | null;
}

export default function CollectionModal({
  isOpen,
  onClose,
  onSuccess,
  editCollection = null,
}: CollectionModalProps) {
  const [name, setName] = useState(editCollection?.name || '');
  const [description, setDescription] = useState(editCollection?.description || '');
  const [isCollaborative, setIsCollaborative] = useState(editCollection?.is_collaborative ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { session } = useAuth();

  const isEditing = !!editCollection?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing
        ? `/api/family/collections/${editCollection.id}`
        : '/api/family/collections';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          isCollaborative,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const collection = data.collection || {
          id: editCollection?.id,
          name: name.trim(),
          description: description.trim(),
          is_collaborative: isCollaborative,
        };
        onSuccess();

        // Reset form
        setName('');
        setDescription('');
        setIsCollaborative(true);
        onClose();
      } else {
        setError(data.error || `Failed to ${isEditing ? 'update' : 'create'} collection`);
      }
    } catch (error) {
      console.error('Collection error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName(editCollection?.name || '');
    setDescription(editCollection?.description || '');
    setIsCollaborative(editCollection?.is_collaborative ?? true);
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Collection' : 'Create New Collection'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Collection Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Holiday Favorites, Quick Dinners"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Describe what this collection is for..."
          />
          <p className="text-sm text-gray-500 mt-1">Optional description for your collection</p>
        </div>

        <div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="collaborative"
              checked={isCollaborative}
              onChange={e => setIsCollaborative(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="collaborative" className="ml-2 block text-sm text-gray-700">
              Collaborative Collection
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isCollaborative
              ? 'All family members can add and remove recipes'
              : 'Only you can add and remove recipes'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            {isEditing ? 'Update Collection' : 'Create Collection'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
