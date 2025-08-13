import React, { useState, useEffect } from 'react';
import { Recipe } from '../../types';
import { CookingSession, cookingSessionService } from '../../lib/services/cookingSessionService';
import CookingFeedbackModal from './CookingFeedbackModal';

interface CookingTrackerProps {
  recipe: Recipe;
  className?: string;
  showDetailedButton?: boolean;
  onCookingMarked?: (session: CookingSession) => void;
}

export default function CookingTracker({
  recipe,
  className = '',
  showDetailedButton = false,
  onCookingMarked,
}: CookingTrackerProps) {
  const [hasCooked, setHasCooked] = useState(false);
  const [timesCooked, setTimesCooked] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [recentSession, setRecentSession] = useState<CookingSession | null>(null);

  useEffect(() => {
    checkCookingStatus();
  }, [recipe.id]);

  const checkCookingStatus = async () => {
    try {
      const response = await fetch(`/api/cooking-sessions/recipe/${recipe.id}`);
      if (response.ok) {
        const data = await response.json();
        setHasCooked(data.data.hasCooked);
        setTimesCooked(data.data.timesCooked);
        if (data.data.sessions.length > 0) {
          setRecentSession(data.data.sessions[0]); // Most recent session
        }
      }
    } catch (error) {
      console.error('Error checking cooking status:', error);
    }
  };

  const handleQuickMarkCooked = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cooking-sessions/mark-cooked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: recipe.id,
          recipe_title: recipe.title,
          recipe_data: recipe,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setHasCooked(true);
        setTimesCooked(prev => prev + 1);
        setRecentSession(result.data);
        
        if (onCookingMarked) {
          onCookingMarked(result.data);
        }

        // Show success message or toast notification
        // You can integrate with your existing notification system
        console.log('Recipe marked as cooked!');
      } else {
        throw new Error('Failed to mark recipe as cooked');
      }
    } catch (error) {
      console.error('Error marking recipe as cooked:', error);
      // Handle error - show error message to user
    } finally {
      setLoading(false);
    }
  };

  const handleDetailedFeedback = () => {
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmitted = (session: CookingSession) => {
    setHasCooked(true);
    setTimesCooked(prev => prev + 1);
    setRecentSession(session);
    setShowFeedbackModal(false);
    
    if (onCookingMarked) {
      onCookingMarked(session);
    }
  };

  return (
    <div className={`cooking-tracker ${className}`}>
      <div className="flex items-center gap-2">
        {/* Quick Mark as Cooked Button */}
        <button
          onClick={handleQuickMarkCooked}
          disabled={loading}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2
            ${hasCooked 
              ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' 
              : 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700'
            }
            ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Marking...</span>
            </>
          ) : hasCooked ? (
            <>
              <span>✅</span>
              <span>Cooked {timesCooked > 1 ? `${timesCooked} times` : 'it!'}</span>
            </>
          ) : (
            <>
              <span>🍳</span>
              <span>Mark as Cooked</span>
            </>
          )}
        </button>

        {/* Detailed Feedback Button */}
        {showDetailedButton && (
          <button
            onClick={handleDetailedFeedback}
            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <span>📝</span>
            <span>Add Review</span>
          </button>
        )}

        {/* Cooking Status Indicator */}
        {hasCooked && recentSession && (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span>•</span>
            <span>Last cooked {new Date(recentSession.cooked_at).toLocaleDateString()}</span>
            {recentSession.rating && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <span>⭐</span>
                  <span>{recentSession.rating}/5</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Detailed Feedback Modal */}
      {showFeedbackModal && (
        <CookingFeedbackModal
          recipe={recipe}
          onSubmit={handleFeedbackSubmitted}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
}