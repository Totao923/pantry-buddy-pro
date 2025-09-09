import React, { useState } from 'react';
import { CuisineType } from '../../types';

interface CuisineSummaryProps {
  selectedCuisine: CuisineType;
  onContinue?: () => void;
  onGoBack?: () => void;
  canProceed?: boolean;
  continueButtonText?: string;
  className?: string;
}

const cuisines = {
  any: { name: 'Surprise Me', icon: '🎲', color: 'from-purple-500 to-pink-500' },
  italian: { name: 'Italian', icon: '🍝', color: 'from-green-500 to-red-500' },
  asian: { name: 'Pan-Asian', icon: '🥢', color: 'from-red-500 to-yellow-500' },
  mexican: { name: 'Mexican', icon: '🌮', color: 'from-yellow-500 to-red-500' },
  indian: { name: 'Indian', icon: '🍛', color: 'from-orange-500 to-red-500' },
  american: { name: 'American', icon: '🍔', color: 'from-blue-500 to-red-500' },
  mediterranean: { name: 'Mediterranean', icon: '🫒', color: 'from-blue-500 to-green-500' },
  chinese: { name: 'Chinese', icon: '🥟', color: 'from-red-600 to-yellow-500' },
  french: { name: 'French', icon: '🥐', color: 'from-blue-500 to-white' },
  thai: { name: 'Thai', icon: '🍜', color: 'from-green-500 to-red-500' },
};

export const CuisineSummary: React.FC<CuisineSummaryProps> = ({
  selectedCuisine,
  onContinue,
  onGoBack,
  canProceed = true,
  continueButtonText = 'Continue →',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedCuisineData = cuisines[selectedCuisine as keyof typeof cuisines];

  if (!selectedCuisineData) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Backdrop for expanded state */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sticky Summary Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:relative md:transform-none md:shadow-none md:border-t-0 ${className}`}
      >
        {/* Collapsed Summary Bar - Mobile Only */}
        <div
          className={`p-4 cursor-pointer md:hidden ${isExpanded ? 'hidden' : 'block'}`}
          onClick={toggleExpanded}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-r ${selectedCuisineData.color} flex items-center justify-center text-xl shadow-sm`}
              >
                {selectedCuisineData.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedCuisineData.name} Cuisine</p>
                <p className="text-sm text-gray-500">Tap to continue or modify</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Expanded View with Navigation */}
        <div
          className={`${
            isExpanded ? 'block' : 'hidden'
          } md:block bg-white border-t border-gray-100 md:border-t-0`}
        >
          <div className="p-4">
            {/* Header for expanded view */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h3 className="text-lg font-semibold text-gray-900">Cuisine Selection</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Collapse cuisine summary"
              >
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:block mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Selected Cuisine</h3>
            </div>

            {/* Selected Cuisine Display */}
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-r ${selectedCuisineData.color} flex items-center justify-center text-2xl shadow-sm`}
                >
                  {selectedCuisineData.icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-lg">{selectedCuisineData.name}</p>
                  <p className="text-sm text-gray-600">Ready to generate your recipe</p>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {onGoBack && (
                <button
                  onClick={onGoBack}
                  className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  ← Back
                </button>
              )}
              {onContinue && (
                <button
                  onClick={onContinue}
                  disabled={!canProceed}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {continueButtonText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed positioning on mobile */}
      <div className="h-20 md:hidden" />
    </>
  );
};
