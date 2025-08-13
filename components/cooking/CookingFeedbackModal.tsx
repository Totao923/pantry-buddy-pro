import React, { useState } from 'react';
import { Recipe } from '../../types';
import { CookingSession } from '../../lib/services/cookingSessionService';
import { Modal } from '../ui/Modal';

interface CookingFeedbackModalProps {
  recipe: Recipe;
  onSubmit: (session: CookingSession) => void;
  onClose: () => void;
  existingSession?: CookingSession;
}

export default function CookingFeedbackModal({
  recipe,
  onSubmit,
  onClose,
  existingSession,
}: CookingFeedbackModalProps) {
  const [rating, setRating] = useState(existingSession?.rating || 0);
  const [difficultyRating, setDifficultyRating] = useState(existingSession?.difficulty_rating || 0);
  const [cookingNotes, setCookingNotes] = useState(existingSession?.cooking_notes || '');
  const [cookTimeActual, setCookTimeActual] = useState(existingSession?.cook_time_actual || recipe.totalTime || 0);
  const [wouldCookAgain, setWouldCookAgain] = useState(existingSession?.would_cook_again ?? true);
  const [recipeFollowedExactly, setRecipeFollowedExactly] = useState(existingSession?.recipe_followed_exactly ?? true);
  const [modificationsMade, setModificationsMade] = useState(existingSession?.modifications_made || '');
  const [cookingMethod, setCookingMethod] = useState(existingSession?.cooking_method || '');
  const [servingsMade, setServingsMade] = useState(existingSession?.servings_made || recipe.servings || 4);
  const [loading, setLoading] = useState(false);

  const cookingMethods = [
    { value: '', label: 'Not specified' },
    { value: 'stove', label: 'Stovetop' },
    { value: 'oven', label: 'Oven' },
    { value: 'microwave', label: 'Microwave' },
    { value: 'grill', label: 'Grill' },
    { value: 'slow_cooker', label: 'Slow Cooker' },
    { value: 'air_fryer', label: 'Air Fryer' },
    { value: 'instant_pot', label: 'Instant Pot' },
    { value: 'bbq', label: 'BBQ' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sessionData = {
        recipe_id: recipe.id,
        recipe_title: recipe.title,
        recipe_data: recipe,
        rating: rating > 0 ? rating : undefined,
        difficulty_rating: difficultyRating > 0 ? difficultyRating : undefined,
        cooking_notes: cookingNotes.trim() || undefined,
        cook_time_actual: cookTimeActual > 0 ? cookTimeActual : undefined,
        would_cook_again: wouldCookAgain,
        recipe_followed_exactly: recipeFollowedExactly,
        modifications_made: modificationsMade.trim() || undefined,
        cooking_method: cookingMethod || undefined,
        servings_made: servingsMade > 0 ? servingsMade : undefined,
      };

      const url = existingSession 
        ? `/api/cooking-sessions/${existingSession.id}`
        : '/api/cooking-sessions';
      
      const method = existingSession ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const result = await response.json();
        onSubmit(result.data);
      } else {
        throw new Error('Failed to save cooking feedback');
      }
    } catch (error) {
      console.error('Error saving cooking feedback:', error);
      // Handle error - show error message to user
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (rating: number) => void; label: string }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-2xl transition-colors ${
              star <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
            }`}
          >
            ⭐
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {value > 0 ? `${value}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  );

  return (
    <Modal isOpen onClose={onClose} title="How was your cooking experience?">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipe Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900">{recipe.title}</h3>
          <p className="text-sm text-gray-600">
            Estimated time: {recipe.totalTime}m • Serves: {recipe.servings}
          </p>
        </div>

        {/* Overall Rating */}
        <StarRating
          value={rating}
          onChange={setRating}
          label="Overall Rating"
        />

        {/* Difficulty Rating */}
        <StarRating
          value={difficultyRating}
          onChange={setDifficultyRating}
          label="How difficult was this recipe?"
        />

        {/* Success Indicators */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="wouldCookAgain"
              checked={wouldCookAgain}
              onChange={(e) => setWouldCookAgain(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
            />
            <label htmlFor="wouldCookAgain" className="text-sm text-gray-700">
              I would cook this recipe again
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recipeFollowedExactly"
              checked={recipeFollowedExactly}
              onChange={(e) => setRecipeFollowedExactly(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
            />
            <label htmlFor="recipeFollowedExactly" className="text-sm text-gray-700">
              I followed the recipe exactly as written
            </label>
          </div>
        </div>

        {/* Cooking Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual cooking time (minutes)
            </label>
            <input
              type="number"
              value={cookTimeActual}
              onChange={(e) => setCookTimeActual(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Servings made
            </label>
            <input
              type="number"
              value={servingsMade}
              onChange={(e) => setServingsMade(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Cooking Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary cooking method
          </label>
          <select
            value={cookingMethod}
            onChange={(e) => setCookingMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            {cookingMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        {/* Modifications */}
        {!recipeFollowedExactly && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What modifications did you make?
            </label>
            <textarea
              value={modificationsMade}
              onChange={(e) => setModificationsMade(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Describe any changes you made to the recipe..."
            />
          </div>
        )}

        {/* Cooking Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cooking notes (optional)
          </label>
          <textarea
            value={cookingNotes}
            onChange={(e) => setCookingNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Any tips, observations, or notes about cooking this recipe..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {existingSession ? 'Update Review' : 'Save Review'}
          </button>
        </div>
      </form>
    </Modal>
  );
}