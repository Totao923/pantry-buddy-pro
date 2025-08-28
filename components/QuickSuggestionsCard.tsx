import React, { useState, useEffect } from 'react';
import { ingredientService } from '../lib/services/ingredientService';
import QuickRecipeSuggestions from './QuickRecipeSuggestions';

interface QuickSuggestionsCardProps {
  className?: string;
  onClick?: () => void;
}

export default function QuickSuggestionsCard({
  className = '',
  onClick,
}: QuickSuggestionsCardProps) {
  const [pantryItemCount, setPantryItemCount] = useState<number>(0);
  const [expiringItemCount, setExpiringItemCount] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPantryStats = async () => {
      try {
        const pantryItems = await ingredientService.getAllIngredients();
        setPantryItemCount(pantryItems.length);

        // Calculate expiring items (within 3 days)
        const now = new Date();
        const expiringItems = pantryItems.filter(item => {
          if (!item.expiryDate) return false;
          const expiryDate = new Date(item.expiryDate);
          const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
        });
        setExpiringItemCount(expiringItems.length);
      } catch (error) {
        console.error('Failed to load pantry stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPantryStats();
  }, []);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowSuggestions(true);
    }
  };

  const getCardMessage = () => {
    if (pantryItemCount < 3) {
      return {
        title: 'Build Your Pantry First',
        subtitle: 'Add some ingredients to get personalized recipe suggestions',
        emoji: '📦',
        disabled: true,
      };
    }

    if (expiringItemCount > 0) {
      return {
        title: 'What Should I Cook?',
        subtitle: `Use ${expiringItemCount} items expiring soon + ${pantryItemCount - expiringItemCount} others`,
        emoji: '⏰',
        disabled: false,
      };
    }

    return {
      title: 'What Should I Cook?',
      subtitle: `Get AI suggestions from your ${pantryItemCount} pantry items`,
      emoji: '🤔',
      disabled: false,
    };
  };

  const cardInfo = getCardMessage();

  if (loading) {
    return (
      <div
        className={`bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200 ${className}`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-lg font-semibold text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border-2 border-dashed border-purple-200 hover:border-purple-400 transition-all cursor-pointer group ${
          cardInfo.disabled ? 'opacity-60 cursor-not-allowed' : ''
        } ${className}`}
        onClick={cardInfo.disabled ? undefined : handleClick}
      >
        <div className="text-center">
          <div
            className={`text-4xl mb-3 block transition-transform ${cardInfo.disabled ? '' : 'group-hover:scale-110'}`}
          >
            {cardInfo.emoji}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{cardInfo.title}</h3>
          <p className="text-gray-600 mb-4">{cardInfo.subtitle}</p>

          {!cardInfo.disabled && (
            <div className="space-y-3">
              {/* Feature highlights */}
              <div className="flex items-center justify-center gap-4 text-sm text-purple-700">
                <div className="flex items-center gap-1">
                  <span>⚡</span>
                  <span>2-5 recipes</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🎯</span>
                  <span>Pantry-based</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🤖</span>
                  <span>AI-powered</span>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{pantryItemCount} ingredients</span>
                </div>
                {expiringItemCount > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    <span>{expiringItemCount} expiring</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {cardInfo.disabled && (
            <div className="text-sm text-gray-500">
              💡 Add ingredients to your pantry to unlock this feature
            </div>
          )}
        </div>
      </div>

      {/* Modal for suggestions */}
      {showSuggestions && (
        <QuickRecipeSuggestions
          showAsModal={true}
          onClose={() => setShowSuggestions(false)}
          onRecipeSelected={() => {
            setShowSuggestions(false);
            // Could trigger a success message or redirect
          }}
        />
      )}
    </>
  );
}
