import React from 'react';
import { Cuisine } from '../types';

interface CuisineSelectorProps {
  selectedCuisine: string;
  onCuisineSelect: (cuisine: string) => void;
}

const cuisines: Cuisine[] = [
  { id: 'any', name: 'Any Cuisine', description: 'Let AI surprise you', icon: '🌍' },
  { id: 'italian', name: 'Italian', description: 'Pasta, pizza, risotto', icon: '🍝' },
  { id: 'asian', name: 'Asian', description: 'Stir-fries, curries, noodles', icon: '🥢' },
  { id: 'mexican', name: 'Mexican', description: 'Tacos, burritos, salsas', icon: '🌮' },
  { id: 'indian', name: 'Indian', description: 'Spicy curries, rice dishes', icon: '🍛' },
  { id: 'american', name: 'American', description: 'Comfort food classics', icon: '🍔' },
  { id: 'mediterranean', name: 'Mediterranean', description: 'Fresh, healthy flavors', icon: '🫒' },
  { id: 'chinese', name: 'Chinese', description: 'Wok dishes, dumplings', icon: '🥟' },
  { id: 'french', name: 'French', description: 'Elegant, refined cuisine', icon: '🥖' },
  { id: 'thai', name: 'Thai', description: 'Sweet, sour, spicy balance', icon: '🌶️' },
  { id: 'japanese', name: 'Japanese', description: 'Fresh, minimal ingredients', icon: '🍣' },
  { id: 'middle-eastern', name: 'Middle Eastern', description: 'Aromatic spices, grains', icon: '🧆' }
];

export default function CuisineSelector({ selectedCuisine, onCuisineSelect }: CuisineSelectorProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Choose Your Cuisine</h2>
      <p className="text-gray-600 mb-6">What flavors are you in the mood for?</p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cuisines.map((cuisine) => (
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