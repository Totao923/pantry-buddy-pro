import React from 'react';
import { Cuisine } from '../types';

interface CuisineSelectorProps {
  selectedCuisine: string;
  onCuisineSelect: (cuisine: string) => void;
}

const cuisines: Cuisine[] = [
  {
    id: 'any',
    name: 'Any Cuisine',
    description: 'Let AI surprise you',
    icon: '🌍',
    color: '#6B7280',
    popularIngredients: ['salt', 'pepper', 'oil', 'garlic', 'onion'],
  },
  {
    id: 'italian',
    name: 'Italian',
    description: 'Pasta, pizza, risotto',
    icon: '🍝',
    color: '#10B981',
    popularIngredients: ['pasta', 'tomatoes', 'basil', 'mozzarella', 'olive oil'],
  },
  {
    id: 'asian',
    name: 'Asian',
    description: 'Stir-fries, curries, noodles',
    icon: '🥢',
    color: '#F59E0B',
    popularIngredients: ['soy sauce', 'ginger', 'garlic', 'rice', 'sesame oil'],
  },
  {
    id: 'mexican',
    name: 'Mexican',
    description: 'Tacos, burritos, salsas',
    icon: '🌮',
    color: '#EF4444',
    popularIngredients: ['chili peppers', 'cumin', 'lime', 'cilantro', 'beans'],
  },
  {
    id: 'indian',
    name: 'Indian',
    description: 'Spicy curries, rice dishes',
    icon: '🍛',
    color: '#F97316',
    popularIngredients: ['turmeric', 'cumin', 'coriander', 'garam masala', 'yogurt'],
  },
  {
    id: 'american',
    name: 'American',
    description: 'Comfort food classics',
    icon: '🍔',
    color: '#3B82F6',
    popularIngredients: ['ground beef', 'cheese', 'potatoes', 'bacon', 'butter'],
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean',
    description: 'Fresh, healthy flavors',
    icon: '🫒',
    color: '#059669',
    popularIngredients: ['olive oil', 'lemon', 'herbs', 'feta cheese', 'olives'],
  },
  {
    id: 'chinese',
    name: 'Chinese',
    description: 'Wok dishes, dumplings',
    icon: '🥟',
    color: '#DC2626',
    popularIngredients: ['soy sauce', 'ginger', 'scallions', 'rice wine', 'star anise'],
  },
  {
    id: 'french',
    name: 'French',
    description: 'Elegant, refined cuisine',
    icon: '🥖',
    color: '#7C3AED',
    popularIngredients: ['butter', 'wine', 'herbs', 'cream', 'shallots'],
  },
  {
    id: 'thai',
    name: 'Thai',
    description: 'Sweet, sour, spicy balance',
    icon: '🌶️',
    color: '#EC4899',
    popularIngredients: ['fish sauce', 'lime', 'chili', 'coconut milk', 'lemongrass'],
  },
  {
    id: 'japanese',
    name: 'Japanese',
    description: 'Fresh, minimal ingredients',
    icon: '🍣',
    color: '#8B5CF6',
    popularIngredients: ['soy sauce', 'miso', 'rice', 'seaweed', 'wasabi'],
  },
  {
    id: 'middle-eastern',
    name: 'Middle Eastern',
    description: 'Aromatic spices, grains',
    icon: '🧆',
    color: '#D97706',
    popularIngredients: ['sumac', "za'atar", 'tahini', 'chickpeas', 'lamb'],
  },
];

export default function CuisineSelector({
  selectedCuisine,
  onCuisineSelect,
}: CuisineSelectorProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Choose Your Cuisine</h2>
      <p className="text-gray-600 mb-6">What flavors are you in the mood for?</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cuisines.map(cuisine => (
          <button
            key={cuisine.id}
            onClick={() => onCuisineSelect(cuisine.id)}
            className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
              selectedCuisine === cuisine.id
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-2">{cuisine.icon}</div>
            <h3 className="font-semibold text-gray-800 mb-1">{cuisine.name}</h3>
            <p className="text-sm text-gray-600">{cuisine.description}</p>
          </button>
        ))}
      </div>

      {selectedCuisine && (
        <div className="mt-6 p-4 bg-accent-50 rounded-lg border border-accent-200">
          <p className="text-accent-700 font-medium">
            Selected: {cuisines.find(c => c.id === selectedCuisine)?.name}
          </p>
        </div>
      )}
    </div>
  );
}
