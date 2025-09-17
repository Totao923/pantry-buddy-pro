import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ChildFriendlyFilterProps {
  onFilterChange: (filters: {
    age: number | undefined;
    excludeAllergens: string[];
    showChildFriendlyOnly: boolean;
  }) => void;
  initialFilters?: {
    age?: number;
    excludeAllergens?: string[];
    showChildFriendlyOnly?: boolean;
  };
}

const commonAllergens = [
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree nuts',
  'peanuts',
  'wheat',
  'soybeans',
  'sesame',
];

const ageGroups = [
  { label: '6+ months', value: 6 },
  { label: '12+ months', value: 12 },
  { label: '18+ months', value: 18 },
  { label: '2+ years', value: 24 },
  { label: '3+ years', value: 36 },
  { label: '5+ years', value: 60 },
];

export default function ChildFriendlyFilter({
  onFilterChange,
  initialFilters = {},
}: ChildFriendlyFilterProps) {
  const [showChildFriendlyOnly, setShowChildFriendlyOnly] = useState(
    initialFilters.showChildFriendlyOnly ?? false
  );
  const [selectedAge, setSelectedAge] = useState<number | undefined>(initialFilters.age);
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>(
    initialFilters.excludeAllergens || []
  );
  const [showFilters, setShowFilters] = useState(false);

  const handleToggleChildFriendly = (enabled: boolean) => {
    setShowChildFriendlyOnly(enabled);
    updateFilters({ showChildFriendlyOnly: enabled });
  };

  const handleAgeChange = (age: number | undefined) => {
    setSelectedAge(age);
    updateFilters({ age });
  };

  const handleAllergenToggle = (allergen: string) => {
    const newExcluded = excludedAllergens.includes(allergen)
      ? excludedAllergens.filter(a => a !== allergen)
      : [...excludedAllergens, allergen];

    setExcludedAllergens(newExcluded);
    updateFilters({ excludeAllergens: newExcluded });
  };

  const updateFilters = (
    updates: Partial<{
      age?: number;
      excludeAllergens?: string[];
      showChildFriendlyOnly: boolean;
    }>
  ) => {
    const newFilters = {
      age: updates.age !== undefined ? updates.age : selectedAge,
      excludeAllergens:
        updates.excludeAllergens !== undefined ? updates.excludeAllergens : excludedAllergens,
      showChildFriendlyOnly:
        updates.showChildFriendlyOnly !== undefined
          ? updates.showChildFriendlyOnly
          : showChildFriendlyOnly,
    };
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setShowChildFriendlyOnly(false);
    setSelectedAge(undefined);
    setExcludedAllergens([]);
    onFilterChange({
      age: undefined,
      excludeAllergens: [],
      showChildFriendlyOnly: false,
    });
  };

  const hasActiveFilters =
    showChildFriendlyOnly || selectedAge !== undefined || excludedAllergens.length > 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👶</span>
          <h3 className="font-semibold text-gray-900">Child-Friendly Filters</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear All
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </div>

      {/* Quick Toggle */}
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="childFriendlyToggle"
          checked={showChildFriendlyOnly}
          onChange={e => handleToggleChildFriendly(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="childFriendlyToggle" className="ml-2 text-sm font-medium text-gray-700">
          Show only child-friendly recipes
        </label>
      </div>

      {showFilters && (
        <div className="space-y-6">
          {/* Age Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Appropriate Age Range
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <button
                onClick={() => handleAgeChange(undefined)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedAge === undefined
                    ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Ages
              </button>
              {ageGroups.map(group => (
                <button
                  key={group.value}
                  onClick={() => handleAgeChange(group.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedAge === group.value
                      ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          {/* Allergen Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Exclude Allergens
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {commonAllergens.map(allergen => {
                const isExcluded = excludedAllergens.includes(allergen);
                return (
                  <button
                    key={allergen}
                    onClick={() => handleAllergenToggle(allergen)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isExcluded
                        ? 'bg-red-100 text-red-800 ring-2 ring-red-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isExcluded ? '✕' : '✓'} {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selected allergens will be excluded from results
            </p>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Active Filters:</h4>
              <div className="flex flex-wrap gap-2">
                {showChildFriendlyOnly && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    Child-friendly only
                  </span>
                )}
                {selectedAge !== undefined && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    Age:{' '}
                    {ageGroups.find(g => g.value === selectedAge)?.label ||
                      `${selectedAge}+ months`}
                  </span>
                )}
                {excludedAllergens.map(allergen => (
                  <span
                    key={allergen}
                    className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs"
                  >
                    No {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
