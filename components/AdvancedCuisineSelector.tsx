import React, { useState } from 'react';
import { CuisineType, Cuisine } from '../types';

interface AdvancedCuisineSelectorProps {
  selectedCuisine: CuisineType;
  onCuisineSelect: (cuisine: CuisineType) => void;
  onPreferencesChange?: (preferences: {
    spiceLevel: 'mild' | 'medium' | 'hot' | 'extra-hot';
    maxTime: number;
    difficulty: string;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }) => void;
}

const cuisines: Cuisine[] = [
  { 
    id: 'any', 
    name: 'Surprise Me', 
    description: 'AI will choose the perfect cuisine', 
    icon: '🎲', 
    color: 'from-purple-500 to-pink-500',
    popularIngredients: ['any ingredient works']
  },
  { 
    id: 'italian', 
    name: 'Italian', 
    description: 'Pasta, risotto, and Mediterranean flavors', 
    icon: '🍝', 
    color: 'from-green-500 to-red-500',
    popularIngredients: ['tomato', 'basil', 'mozzarella', 'olive oil', 'garlic']
  },
  { 
    id: 'asian', 
    name: 'Pan-Asian', 
    description: 'Stir-fries, curries, and bold flavors', 
    icon: '🥢', 
    color: 'from-red-500 to-yellow-500',
    popularIngredients: ['soy sauce', 'ginger', 'garlic', 'rice', 'vegetables']
  },
  { 
    id: 'mexican', 
    name: 'Mexican', 
    description: 'Tacos, enchiladas, and vibrant spices', 
    icon: '🌮', 
    color: 'from-yellow-500 to-red-500',
    popularIngredients: ['peppers', 'beans', 'corn', 'lime', 'cilantro']
  },
  { 
    id: 'indian', 
    name: 'Indian', 
    description: 'Rich curries and aromatic spices', 
    icon: '🍛', 
    color: 'from-orange-500 to-red-500',
    popularIngredients: ['curry', 'rice', 'lentils', 'yogurt', 'spices']
  },
  { 
    id: 'mediterranean', 
    name: 'Mediterranean', 
    description: 'Fresh, healthy, olive oil-rich dishes', 
    icon: '🫒', 
    color: 'from-blue-500 to-green-500',
    popularIngredients: ['olive oil', 'tomatoes', 'herbs', 'feta', 'olives']
  },
  { 
    id: 'american', 
    name: 'American', 
    description: 'Comfort food and BBQ classics', 
    icon: '🍔', 
    color: 'from-blue-600 to-red-600',
    popularIngredients: ['beef', 'potatoes', 'cheese', 'bacon', 'corn']
  },
  { 
    id: 'thai', 
    name: 'Thai', 
    description: 'Sweet, sour, salty, spicy balance', 
    icon: '🌶️', 
    color: 'from-green-500 to-red-500',
    popularIngredients: ['coconut milk', 'lime', 'chili', 'basil', 'fish sauce']
  },
  { 
    id: 'japanese', 
    name: 'Japanese', 
    description: 'Clean flavors and minimal ingredients', 
    icon: '🍣', 
    color: 'from-red-500 to-pink-500',
    popularIngredients: ['rice', 'soy sauce', 'miso', 'seaweed', 'fish']
  },
  { 
    id: 'french', 
    name: 'French', 
    description: 'Elegant techniques and rich sauces', 
    icon: '🥖', 
    color: 'from-blue-600 to-white',
    popularIngredients: ['butter', 'cream', 'wine', 'herbs', 'cheese']
  },
  { 
    id: 'korean', 
    name: 'Korean', 
    description: 'Fermented flavors and BBQ', 
    icon: '🥘', 
    color: 'from-red-600 to-yellow-500',
    popularIngredients: ['kimchi', 'gochujang', 'sesame oil', 'garlic', 'rice']
  },
  { 
    id: 'middle-eastern', 
    name: 'Middle Eastern', 
    description: 'Aromatic spices and grains', 
    icon: '🧆', 
    color: 'from-amber-500 to-red-500',
    popularIngredients: ['chickpeas', 'tahini', 'spices', 'yogurt', 'grains']
  },
  { 
    id: 'greek', 
    name: 'Greek', 
    description: 'Fresh herbs and feta cheese', 
    icon: '🇬🇷', 
    color: 'from-blue-500 to-white',
    popularIngredients: ['feta', 'olives', 'lemon', 'oregano', 'olive oil']
  },
  { 
    id: 'spanish', 
    name: 'Spanish', 
    description: 'Paella, tapas, and bold flavors', 
    icon: '🥘', 
    color: 'from-yellow-500 to-red-600',
    popularIngredients: ['saffron', 'paprika', 'tomatoes', 'rice', 'seafood']
  },
  { 
    id: 'fusion', 
    name: 'Fusion', 
    description: 'Creative combinations from multiple cuisines', 
    icon: '🌈', 
    color: 'from-purple-500 to-blue-500',
    popularIngredients: ['creative combinations', 'global ingredients']
  }
];

export default function AdvancedCuisineSelector({ 
  selectedCuisine, 
  onCuisineSelect, 
  onPreferencesChange 
}: AdvancedCuisineSelectorProps) {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    spiceLevel: 'medium' as 'mild' | 'medium' | 'hot' | 'extra-hot',
    maxTime: 60,
    difficulty: 'any',
    experienceLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCuisines = cuisines.filter(cuisine =>
    cuisine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cuisine.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePreferenceChange = (key: string, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    onPreferencesChange?.(newPrefs);
  };

  const getSpiceLevelColor = (level: string) => {
    switch (level) {
      case 'mild': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hot': return 'bg-orange-100 text-orange-800';
      case 'extra-hot': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌍</span>
          <h2 className="text-3xl font-bold text-gray-800">Choose Your Culinary Adventure</h2>
        </div>
        <button
          onClick={() => setShowPreferences(!showPreferences)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <span className="text-lg">⚙️</span>
          Preferences
        </button>
      </div>

      <p className="text-gray-600 mb-6 text-lg">
        Select a cuisine style and let our AI create the perfect recipe for your ingredients
      </p>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search cuisines..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Preferences Panel */}
      {showPreferences && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Cooking Preferences</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Experience Level - NEW */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Cooking Experience</label>
              <select
                value={preferences.experienceLevel}
                onChange={(e) => handlePreferenceChange('experienceLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">🌱 Beginner (Simple recipes)</option>
                <option value="intermediate">⭐ Intermediate (Balanced)</option>
                <option value="advanced">⭐⭐ Advanced (Complex)</option>
                <option value="expert">👨‍🍳 Expert (Professional)</option>
              </select>
            </div>

            {/* Spice Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spice Level</label>
              <div className="grid grid-cols-2 gap-2">
                {['mild', 'medium', 'hot', 'extra-hot'].map((level) => (
                  <button
                    key={level}
                    onClick={() => handlePreferenceChange('spiceLevel', level)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      preferences.spiceLevel === level 
                        ? getSpiceLevelColor(level) + ' ring-2 ring-blue-500' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Cooking Time: {preferences.maxTime} min
              </label>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={preferences.maxTime}
                onChange={(e) => handlePreferenceChange('maxTime', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>15min</span>
                <span>2hrs</span>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Difficulty</label>
              <select
                value={preferences.difficulty}
                onChange={(e) => handlePreferenceChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="any">Any Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Cuisine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCuisines.map((cuisine) => (
          <button
            key={cuisine.id}
            onClick={() => onCuisineSelect(cuisine.id)}
            className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
              selectedCuisine === cuisine.id
                ? 'border-blue-500 shadow-2xl scale-105'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${cuisine.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
            
            <div className="relative p-6">
              <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform">
                {cuisine.icon}
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {cuisine.name}
              </h3>
              
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                {cuisine.description}
              </p>
              
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Popular ingredients:</p>
                <div className="flex flex-wrap gap-1">
                  {cuisine.popularIngredients.slice(0, 3).map((ingredient, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {ingredient}
                    </span>
                  ))}
                  {cuisine.popularIngredients.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                      +{cuisine.popularIngredients.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedCuisine === cuisine.id && (
              <div className="absolute top-3 right-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
      
      {selectedCuisine && (
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {cuisines.find(c => c.id === selectedCuisine)?.icon}
            </span>
            <div>
              <p className="font-semibold text-gray-800">
                Selected: {cuisines.find(c => c.id === selectedCuisine)?.name}
              </p>
              <p className="text-sm text-gray-600">
                {cuisines.find(c => c.id === selectedCuisine)?.description}
              </p>
            </div>
          </div>
          
          {preferences.spiceLevel !== 'medium' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">Spice Level:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSpiceLevelColor(preferences.spiceLevel)}`}>
                {preferences.spiceLevel.charAt(0).toUpperCase() + preferences.spiceLevel.slice(1).replace('-', ' ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}