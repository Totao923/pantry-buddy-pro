import React, { useState, useEffect } from 'react';
import { CookingSession } from '../../lib/services/cookingSessionService';
import CookingFeedbackModal from './CookingFeedbackModal';
import { Recipe } from '../../types';

interface CookingHistoryProps {
  className?: string;
  limit?: number;
  showTitle?: boolean;
}

export default function CookingHistory({ 
  className = '', 
  limit = 10,
  showTitle = true 
}: CookingHistoryProps) {
  const [sessions, setSessions] = useState<CookingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CookingSession | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    loadCookingHistory();
  }, [limit]);

  const loadCookingHistory = async () => {
    try {
      const response = await fetch(`/api/cooking-sessions?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.data);
      }
    } catch (error) {
      console.error('Error loading cooking history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = (session: CookingSession) => {
    setSelectedSession(session);
    setShowFeedbackModal(true);
  };

  const handleReviewUpdated = (updatedSession: CookingSession) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === updatedSession.id ? updatedSession : session
      )
    );
    setShowFeedbackModal(false);
    setSelectedSession(null);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (loading) {
    return (
      <div className={`cooking-history ${className}`}>
        {showTitle && <h2 className="text-xl font-semibold text-gray-900 mb-4">Cooking History</h2>}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-24 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={`cooking-history ${className}`}>
        {showTitle && <h2 className="text-xl font-semibold text-gray-900 mb-4">Cooking History</h2>}
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🍳</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No cooking history yet</h3>
          <p className="text-gray-600">
            Start cooking recipes and mark them as cooked to see your history here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`cooking-history ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Cooking History</h2>
          <span className="text-sm text-gray-600">{sessions.length} recipes cooked</span>
        </div>
      )}
      
      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{session.recipe_title}</h3>
                  {session.rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-sm text-gray-600">{session.rating}/5</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span>🕒 {formatTimeAgo(session.cooked_at)}</span>
                  {session.cook_time_actual && (
                    <span>⏱️ {session.cook_time_actual}m</span>
                  )}
                  {session.cooking_method && (
                    <span>🍳 {session.cooking_method.replace('_', ' ')}</span>
                  )}
                  {session.servings_made && (
                    <span>👥 {session.servings_made} servings</span>
                  )}
                </div>

                {session.cooking_notes && (
                  <p className="text-sm text-gray-700 mb-2 italic">
                    "{session.cooking_notes}"
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {session.would_cook_again && (
                    <span className="flex items-center gap-1">
                      <span className="text-green-500">✅</span>
                      Would cook again
                    </span>
                  )}
                  {session.recipe_followed_exactly === false && (
                    <span className="flex items-center gap-1">
                      <span className="text-orange-500">🔄</span>
                      Modified recipe
                    </span>
                  )}
                  {session.difficulty_rating && (
                    <span>Difficulty: {session.difficulty_rating}/5</span>
                  )}
                </div>

                {session.modifications_made && (
                  <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-800">
                    <strong>Modifications:</strong> {session.modifications_made}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleEditReview(session)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Edit Review
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Review Modal */}
      {selectedSession && showFeedbackModal && (
        <CookingFeedbackModal
          recipe={selectedSession.recipe_data as Recipe || {
            id: selectedSession.recipe_id,
            title: selectedSession.recipe_title,
            description: '',
            ingredients: [],
            instructions: [],
            totalTime: selectedSession.cook_time_actual || 30,
            servings: selectedSession.servings_made || 4,
            difficulty: 'medium',
            cuisine: 'other',
            tags: [],
            rating: selectedSession.rating,
          }}
          existingSession={selectedSession}
          onSubmit={handleReviewUpdated}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
}