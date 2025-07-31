import React, { useState } from 'react';
import { RecipeRating, RecipeReview, Recipe, SubscriptionTier } from '../types';

interface RecipeRatingSystemProps {
  recipe: Recipe;
  userSubscription: SubscriptionTier;
  existingRating?: RecipeRating;
  existingReview?: RecipeReview;
  onSubmitRating: (rating: RecipeRating, review?: RecipeReview) => void;
  onClose: () => void;
}

export default function RecipeRatingSystem({
  recipe,
  userSubscription,
  existingRating,
  existingReview,
  onSubmitRating,
  onClose,
}: RecipeRatingSystemProps) {
  const [overallRating, setOverallRating] = useState(existingRating?.overallRating || 0);
  const [difficultyAccuracy, setDifficultyAccuracy] = useState(
    existingRating?.difficultyAccuracy || 0
  );
  const [tasteRating, setTasteRating] = useState(existingRating?.tasteRating || 0);
  const [wouldCookAgain, setWouldCookAgain] = useState(existingRating?.wouldCookAgain || false);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText || '');
  const [modifications, setModifications] = useState<string[]>(existingReview?.modifications || []);
  const [cookingTips, setCookingTips] = useState<string[]>(existingReview?.cookingTips || []);
  const [newModification, setNewModification] = useState('');
  const [newTip, setNewTip] = useState('');

  const canLeaveDetailedReview = userSubscription !== 'free';
  const maxReviewLength = userSubscription === 'free' ? 200 : 1000;

  const handleStarClick = (rating: number, type: 'overall' | 'difficulty' | 'taste') => {
    switch (type) {
      case 'overall':
        setOverallRating(rating);
        break;
      case 'difficulty':
        setDifficultyAccuracy(rating);
        break;
      case 'taste':
        setTasteRating(rating);
        break;
    }
  };

  const addModification = () => {
    if (newModification.trim() && modifications.length < (userSubscription === 'free' ? 2 : 10)) {
      setModifications([...modifications, newModification.trim()]);
      setNewModification('');
    }
  };

  const removeModification = (index: number) => {
    setModifications(modifications.filter((_, i) => i !== index));
  };

  const addTip = () => {
    if (newTip.trim() && cookingTips.length < (userSubscription === 'free' ? 2 : 10)) {
      setCookingTips([...cookingTips, newTip.trim()]);
      setNewTip('');
    }
  };

  const removeTip = (index: number) => {
    setCookingTips(cookingTips.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (overallRating === 0) return;

    const rating: RecipeRating = {
      id: existingRating?.id || Date.now().toString(),
      recipeId: recipe.id,
      userId: 'user-1', // This would come from auth context
      overallRating,
      difficultyAccuracy: canLeaveDetailedReview ? difficultyAccuracy : overallRating,
      tasteRating: canLeaveDetailedReview ? tasteRating : overallRating,
      wouldCookAgain,
      createdAt: existingRating?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    let review: RecipeReview | undefined;
    if (reviewText.trim() || modifications.length > 0 || cookingTips.length > 0) {
      review = {
        id: existingReview?.id || Date.now().toString() + '-review',
        recipeId: recipe.id,
        userId: 'user-1',
        rating,
        reviewText: reviewText.trim() || undefined,
        modifications: modifications.length > 0 ? modifications : undefined,
        cookingTips: cookingTips.length > 0 ? cookingTips : undefined,
        helpfulVotes: existingReview?.helpfulVotes || 0,
        createdAt: existingReview?.createdAt || new Date(),
        updatedAt: new Date(),
      };
    }

    onSubmitRating(rating, review);
  };

  const StarRating = ({
    value,
    onChange,
    label,
    disabled = false,
  }: {
    value: number;
    onChange: (rating: number) => void;
    label: string;
    disabled?: boolean;
  }) => (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 min-w-24">{label}:</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            className={`text-2xl transition-all hover:scale-110 ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            } ${star <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-500 ml-2">{value > 0 ? `${value}/5` : 'Not rated'}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⭐</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Rate This Recipe</h2>
              <p className="text-gray-600">{recipe.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>

        {/* Subscription notice for free users */}
        {!canLeaveDetailedReview && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <p className="text-sm text-blue-800">
                <strong>Free Plan:</strong> Basic rating features. Upgrade to Premium for detailed
                reviews, cooking tips, and unlimited modifications.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Overall Rating - Required */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <StarRating
              value={overallRating}
              onChange={rating => handleStarClick(rating, 'overall')}
              label="Overall Rating"
            />
          </div>

          {/* Detailed Ratings - Premium Feature */}
          {canLeaveDetailedReview && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Detailed Ratings</h3>

              <StarRating
                value={difficultyAccuracy}
                onChange={rating => handleStarClick(rating, 'difficulty')}
                label="Difficulty Match"
              />

              <StarRating
                value={tasteRating}
                onChange={rating => handleStarClick(rating, 'taste')}
                label="Taste & Flavor"
              />
            </div>
          )}

          {/* Would Cook Again */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Would you cook this again?</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wouldCookAgain}
                onChange={e => setWouldCookAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Yes, I'd make this again!</span>
            </label>
          </div>

          {/* Written Review */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review {!canLeaveDetailedReview && `(${maxReviewLength} character limit)`}
            </label>
            <textarea
              value={reviewText}
              onChange={e => {
                if (e.target.value.length <= maxReviewLength) {
                  setReviewText(e.target.value);
                }
              }}
              placeholder="Share your thoughts about this recipe..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">Optional • Be helpful and constructive</span>
              <span className="text-xs text-gray-500">
                {reviewText.length}/{maxReviewLength}
              </span>
            </div>
          </div>

          {/* Recipe Modifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipe Modifications
              {!canLeaveDetailedReview && ` (${modifications.length}/2)`}
            </label>

            <div className="space-y-2 mb-3">
              {modifications.map((mod, index) => (
                <div key={index} className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
                  <span className="text-sm text-blue-800 flex-1">{mod}</span>
                  <button
                    onClick={() => removeModification(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {modifications.length < (userSubscription === 'free' ? 2 : 10) && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModification}
                  onChange={e => setNewModification(e.target.value)}
                  placeholder="e.g., Added extra garlic"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={e => e.key === 'Enter' && addModification()}
                />
                <button
                  onClick={addModification}
                  disabled={!newModification.trim()}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Cooking Tips */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cooking Tips
              {!canLeaveDetailedReview && ` (${cookingTips.length}/2)`}
            </label>

            <div className="space-y-2 mb-3">
              {cookingTips.map((tip, index) => (
                <div key={index} className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
                  <span className="text-sm text-green-800 flex-1">{tip}</span>
                  <button
                    onClick={() => removeTip(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {cookingTips.length < (userSubscription === 'free' ? 2 : 10) && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTip}
                  onChange={e => setNewTip(e.target.value)}
                  placeholder="e.g., Let the pan get really hot first"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={e => e.key === 'Enter' && addTip()}
                />
                <button
                  onClick={addTip}
                  disabled={!newTip.trim()}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={overallRating === 0}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existingRating ? 'Update Rating' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
