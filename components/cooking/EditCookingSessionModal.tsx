import React, { useState, useRef, useEffect } from 'react';
import { CookingSession, cookingSessionService } from '../../lib/services/cookingSessionService';
import { useAuth } from '../../lib/auth/AuthProvider';

interface EditCookingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: {
    id: string;
    title: string;
  };
  onSuccess?: () => void;
}

export default function EditCookingSessionModal({
  isOpen,
  onClose,
  recipe,
  onSuccess,
}: EditCookingSessionModalProps) {
  const { supabaseClient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [existingSession, setExistingSession] = useState<CookingSession | null>(null);
  const [formData, setFormData] = useState({
    rating: 0,
    cooking_notes: '',
    difficulty_rating: 0,
    cook_time_actual: '',
    would_cook_again: true,
    recipe_followed_exactly: true,
    modifications_made: '',
    photo_url: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing cooking session data when modal opens
  useEffect(() => {
    if (isOpen && recipe.id) {
      loadExistingSession();
    }
  }, [isOpen, recipe.id]);

  const loadExistingSession = async () => {
    setLoadingSession(true);
    try {
      const sessions = await cookingSessionService.getUserRecipeCookingSessions(recipe.id);
      if (sessions.length > 0) {
        // Get the most recent session for this recipe
        const latestSession = sessions[0];
        setExistingSession(latestSession);

        // Populate form with existing data
        setFormData({
          rating: latestSession.rating || 0,
          cooking_notes: latestSession.cooking_notes || '',
          difficulty_rating: latestSession.difficulty_rating || 0,
          cook_time_actual: latestSession.cook_time_actual?.toString() || '',
          would_cook_again: latestSession.would_cook_again ?? true,
          recipe_followed_exactly: latestSession.recipe_followed_exactly ?? true,
          modifications_made: latestSession.modifications_made || '',
          photo_url: latestSession.photo_url || '',
        });

        // Load existing photo if available
        if (latestSession.photo_url) {
          setPreviewImage(latestSession.photo_url);
        }
      }
    } catch (error) {
      console.error('Error loading existing cooking session:', error);
    } finally {
      setLoadingSession(false);
    }
  };

  const resetForm = () => {
    setFormData({
      rating: 0,
      cooking_notes: '',
      difficulty_rating: 0,
      cook_time_actual: '',
      would_cook_again: true,
      recipe_followed_exactly: true,
      modifications_made: '',
      photo_url: '',
    });
    setSelectedFile(null);
    setPreviewImage(null);
    setExistingSession(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = e => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!supabaseClient) {
      console.error('Supabase client not available');
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${recipe.id}-${Date.now()}.${fileExt}`;
      const filePath = `cooking-photos/${fileName}`;

      const { data, error } = await supabaseClient.storage
        .from('recipe-photos')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading photo:', error);
        alert(`Upload error: ${error.message}`);
        return null;
      }

      // Get public URL
      const { data: publicUrl } = supabaseClient.storage
        .from('recipe-photos')
        .getPublicUrl(filePath);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let photoUrl = formData.photo_url;

      // Upload new photo if one was selected
      if (selectedFile) {
        const uploadedPhotoUrl = await uploadPhoto(selectedFile);
        if (uploadedPhotoUrl) {
          photoUrl = uploadedPhotoUrl;
        } else {
          alert('Failed to upload photo. Saving session without photo.');
        }
      }

      const sessionData = {
        recipe_id: recipe.id,
        recipe_title: recipe.title,
        rating: formData.rating || undefined,
        cooking_notes: formData.cooking_notes || undefined,
        difficulty_rating: formData.difficulty_rating || undefined,
        cook_time_actual: formData.cook_time_actual
          ? parseInt(formData.cook_time_actual)
          : undefined,
        would_cook_again: formData.would_cook_again,
        recipe_followed_exactly: formData.recipe_followed_exactly,
        modifications_made: formData.modifications_made || undefined,
        photo_url: photoUrl || undefined,
      };

      if (existingSession) {
        // Update existing session
        await cookingSessionService.updateCookingSession(existingSession.id, sessionData);
      } else {
        // Create new session
        await cookingSessionService.createCookingSession(sessionData);
      }

      onSuccess?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving cooking session:', error);
      alert('Failed to save cooking session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {existingSession ? 'Edit Cooking Session' : 'Add Cooking Session'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          <h3 className="text-lg font-medium text-gray-800 mb-4">{recipe.title}</h3>

          {loadingSession && (
            <div className="text-center py-4">
              <div className="text-gray-500">Loading cooking session...</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className={`text-2xl ${
                      star <= formData.rating ? 'text-yellow-500' : 'text-gray-300'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            {/* Cooking Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cooking Notes</label>
              <textarea
                value={formData.cooking_notes}
                onChange={e => setFormData({ ...formData, cooking_notes: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="How did it go? Any tips or observations..."
              />
            </div>

            {/* Difficulty Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({ ...formData, difficulty_rating: level })}
                    className={`px-3 py-1 rounded text-sm ${
                      level <= formData.difficulty_rating
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Actual Cook Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Cook Time (minutes)
              </label>
              <input
                type="number"
                value={formData.cook_time_actual}
                onChange={e => setFormData({ ...formData, cook_time_actual: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="How long did it actually take?"
              />
            </div>

            {/* Modifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modifications Made
              </label>
              <textarea
                value={formData.modifications_made}
                onChange={e => setFormData({ ...formData, modifications_made: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={2}
                placeholder="What did you change or substitute?"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Photo</label>
              <div className="space-y-2">
                {!previewImage && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                  >
                    📷 Click to add photo of your dish
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {previewImage && (
                  <div className="relative">
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewImage(null);
                        setFormData({ ...formData, photo_url: '' });
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Questions */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.would_cook_again}
                  onChange={e => setFormData({ ...formData, would_cook_again: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Would cook again</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.recipe_followed_exactly}
                  onChange={e =>
                    setFormData({ ...formData, recipe_followed_exactly: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Followed recipe exactly</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
