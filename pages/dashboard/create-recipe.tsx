import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import SmartPantry from '../../components/SmartPantry';
import AdvancedCuisineSelector from '../../components/AdvancedCuisineSelector';
import EnhancedRecipeCard from '../../components/EnhancedRecipeCard';
import { useAuth } from '../../lib/auth/AuthProvider';
import { aiService } from '../../lib/ai/aiService';
import { AdvancedRecipeEngine } from '../../lib/advancedRecipeEngine';
import { ingredientService } from '../../lib/services/ingredientService';
import { Ingredient, Recipe, CuisineType } from '../../types';

export default function CreateRecipe() {
  const router = useRouter();
  const { user, subscription } = useAuth();
  const [step, setStep] = useState(1);
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai'); // ai or manual recipe creation
  const [modeSelected, setModeSelected] = useState(subscription?.tier !== 'premium'); // track if user has made their choice
  const [manualRecipe, setManualRecipe] = useState<Partial<Recipe>>({
    title: '',
    description: '',
    ingredients: [],
    instructions: [],
    totalTime: 30,
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    difficulty: 'Easy',
    cuisine: 'american',
    tags: [],
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<CuisineType>('any');
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookingPreferences, setCookingPreferences] = useState({
    spiceLevel: 'medium' as 'mild' | 'medium' | 'hot' | 'extra-hot',
    maxTime: 60,
    difficulty: 'any',
    experienceLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert',
  });

  useEffect(() => {
    // Load existing ingredients from the service
    const loadIngredients = async () => {
      try {
        const userIngredients = await ingredientService.getAllIngredients();
        setIngredients(userIngredients);
      } catch (error) {
        console.error('Error loading ingredients:', error);
      }
    };

    loadIngredients();
  }, []);

  const handleAddIngredient = async (ingredient: Ingredient) => {
    try {
      const newIngredient = await ingredientService.createIngredient({
        name: ingredient.name,
        category: ingredient.category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        expiryDate: ingredient.expiryDate?.toISOString(),
        nutritionalValue: ingredient.nutritionalValue,
        isProtein: ingredient.isProtein,
        isVegetarian: ingredient.isVegetarian,
        isVegan: ingredient.isVegan,
      });
      setIngredients([...ingredients, newIngredient]);
    } catch (error) {
      console.error('Error adding ingredient:', error);
      setError('Failed to add ingredient');
    }
  };

  const handleRemoveIngredient = async (id: string) => {
    try {
      await ingredientService.deleteIngredient(id);
      setIngredients(ingredients.filter(ing => ing.id !== id));
    } catch (error) {
      console.error('Error removing ingredient:', error);
      setError('Failed to remove ingredient');
    }
  };

  const handleUpdateIngredient = async (ingredient: Ingredient) => {
    try {
      const updatedIngredient = await ingredientService.updateIngredient(ingredient.id, {
        name: ingredient.name,
        category: ingredient.category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        expiryDate: ingredient.expiryDate?.toISOString(),
        nutritionalValue: ingredient.nutritionalValue,
        isProtein: ingredient.isProtein,
        isVegetarian: ingredient.isVegetarian,
        isVegan: ingredient.isVegan,
      });
      setIngredients(ingredients.map(ing => (ing.id === ingredient.id ? updatedIngredient : ing)));
    } catch (error) {
      console.error('Error updating ingredient:', error);
      setError('Failed to update ingredient');
    }
  };

  const generateRecipe = async () => {
    if (ingredients.length === 0) {
      setError('Please add at least one ingredient to generate a recipe!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First try AI service
      const aiResponse = await aiService.generateRecipe(
        {
          ingredients: ingredients,
          cuisine: selectedCuisine,
          servings: 4,
          preferences: {
            maxTime: cookingPreferences.maxTime,
            difficulty:
              cookingPreferences.difficulty !== 'any'
                ? (cookingPreferences.difficulty as any)
                : undefined,
            spiceLevel: cookingPreferences.spiceLevel,
            experienceLevel: cookingPreferences.experienceLevel,
            dietary: [],
            allergens: [],
          },
          userHistory: {
            favoriteRecipes: [],
            cookingFrequency: 'weekly',
          },
        },
        user?.id || 'demo-user'
      );

      let recipe: Recipe;

      if (aiResponse.success && aiResponse.recipe) {
        recipe = aiResponse.recipe;
      } else {
        // Fallback to original engine if AI fails
        console.log('AI generation failed, using fallback engine:', aiResponse.error);
        recipe = await AdvancedRecipeEngine.generateAdvancedRecipe(
          ingredients,
          selectedCuisine,
          4,
          {
            maxTime: cookingPreferences.maxTime,
            difficulty:
              cookingPreferences.difficulty !== 'any'
                ? (cookingPreferences.difficulty as any)
                : undefined,
            spiceLevel: cookingPreferences.spiceLevel,
            experienceLevel: cookingPreferences.experienceLevel,
          }
        );
      }

      setGeneratedRecipe(recipe);

      // Save recipe to recent recipes
      const recentRecipes = JSON.parse(localStorage.getItem('recentRecipes') || '[]');
      const updatedRecipes = [recipe, ...recentRecipes.slice(0, 9)]; // Keep last 10
      localStorage.setItem('recentRecipes', JSON.stringify(updatedRecipes));

      setStep(4);
    } catch (error) {
      console.error('Recipe generation failed:', error);
      setError('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = () => {
    if (generatedRecipe) {
      // Save to user recipes
      const userRecipes = JSON.parse(localStorage.getItem('userRecipes') || '[]');
      userRecipes.push(generatedRecipe);
      localStorage.setItem('userRecipes', JSON.stringify(userRecipes));

      // Redirect to recipes page
      router.push('/dashboard/recipes');
    }
  };

  const handleStartCooking = () => {
    if (generatedRecipe) {
      // For now, just show success and redirect
      router.push(`/dashboard/recipe/${generatedRecipe.id}`);
    }
  };

  const canProceedToStep = (targetStep: number) => {
    // For premium users on step 1, they can always proceed to make their choice
    if (subscription?.tier === 'premium' && targetStep === 1) {
      return true;
    }

    if (creationMode === 'manual') {
      switch (targetStep) {
        case 2:
          return manualRecipe.title?.trim() !== '';
        case 3:
          return (manualRecipe.ingredients?.length || 0) > 0;
        case 4:
          return (manualRecipe.instructions?.length || 0) > 0;
        default:
          return true;
      }
    } else {
      switch (targetStep) {
        case 2:
          return ingredients.length > 0;
        case 3:
          return ingredients.length > 0 && selectedCuisine;
        case 4:
          return generatedRecipe !== null;
        default:
          return true;
      }
    }
  };

  const handleSaveManualRecipe = () => {
    if (
      !manualRecipe.title?.trim() ||
      !manualRecipe.ingredients?.length ||
      !manualRecipe.instructions?.length
    ) {
      setError('Please fill in all required fields');
      return;
    }

    const recipeId = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const completeRecipe: Recipe = {
      id: recipeId,
      title: manualRecipe.title.trim(),
      description: manualRecipe.description || '',
      ingredients: manualRecipe.ingredients.map((ing, index) => ({
        ...ing,
        id: ing.id || `ing_${index}`,
      })),
      instructions: manualRecipe.instructions.map((inst, index) => ({
        id: `step_${index}`,
        step: index + 1,
        instruction: inst.instruction,
        duration: inst.duration || 0,
      })),
      totalTime: manualRecipe.totalTime || 30,
      prepTime: manualRecipe.prepTime || 15,
      cookTime: manualRecipe.cookTime || 15,
      servings: manualRecipe.servings || 4,
      difficulty: manualRecipe.difficulty || 'Easy',
      cuisine: manualRecipe.cuisine || 'american',
      tags: manualRecipe.tags || [],
      nutritionInfo: {
        calories: 350,
        protein: 25,
        carbs: 30,
        fat: 15,
        fiber: 5,
      },
      createdAt: new Date(),
    };

    // Save to user recipes
    const userRecipes = JSON.parse(localStorage.getItem('userRecipes') || '[]');
    userRecipes.push(completeRecipe);
    localStorage.setItem('userRecipes', JSON.stringify(userRecipes));

    // Also save to recent recipes
    const recentRecipes = JSON.parse(localStorage.getItem('recentRecipes') || '[]');
    const updatedRecent = [completeRecipe, ...recentRecipes.slice(0, 9)];
    localStorage.setItem('recentRecipes', JSON.stringify(updatedRecent));

    router.push('/dashboard/recipes');
  };

  const renderStepContent = () => {
    // Premium users get to choose creation mode on step 1, non-premium users skip to AI mode
    if (step === 1 && subscription?.tier === 'premium' && !modeSelected) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Creation Mode</h2>
            <p className="text-gray-600">How would you like to create your recipe today?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* AI Recipe Generation */}
            <div
              className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                creationMode === 'ai'
                  ? 'border-pantry-500 bg-pantry-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                setCreationMode('ai');
                setModeSelected(true);
              }}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Recipe Generation</h3>
                <p className="text-gray-600 mb-4">
                  Add your ingredients and let AI create a personalized recipe for you
                </p>
                <div className="text-sm text-pantry-600 font-medium">
                  ✨ Smart • Fast • Personalized
                </div>
              </div>
            </div>

            {/* Manual Recipe Creation */}
            <div
              className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                creationMode === 'manual'
                  ? 'border-pantry-500 bg-pantry-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                setCreationMode('manual');
                setModeSelected(true);
              }}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">👨‍🍳</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Your Own</h3>
                <p className="text-gray-600 mb-4">
                  Write your own recipe from scratch with full creative control
                </p>
                <div className="text-sm text-pantry-600 font-medium">
                  🎨 Creative • Custom • Premium Only
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Manual recipe creation steps
    if (creationMode === 'manual') {
      switch (step) {
        case 1:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Recipe Details</h2>
                <p className="text-gray-600">Start by giving your recipe a name and description</p>
              </div>

              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe Title *
                  </label>
                  <input
                    type="text"
                    value={manualRecipe.title || ''}
                    onChange={e => setManualRecipe(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter recipe name..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={manualRecipe.description || ''}
                    onChange={e =>
                      setManualRecipe(prev => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe your recipe..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Servings</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={manualRecipe.servings || 4}
                      onChange={e =>
                        setManualRecipe(prev => ({
                          ...prev,
                          servings: parseInt(e.target.value) || 4,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prep Time (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={manualRecipe.prepTime || 15}
                      onChange={e =>
                        setManualRecipe(prev => ({
                          ...prev,
                          prepTime: parseInt(e.target.value) || 15,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cook Time (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={manualRecipe.cookTime || 15}
                      onChange={e => {
                        const cookTime = parseInt(e.target.value) || 15;
                        setManualRecipe(prev => ({
                          ...prev,
                          cookTime,
                          totalTime: (prev.prepTime || 15) + cookTime,
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty
                    </label>
                    <select
                      value={manualRecipe.difficulty || 'Easy'}
                      onChange={e =>
                        setManualRecipe(prev => ({ ...prev, difficulty: e.target.value as any }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );

        case 2:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Ingredients</h2>
                <p className="text-gray-600">List all ingredients needed for your recipe</p>
              </div>

              {/* Manual ingredient addition form would go here */
              <div className="max-w-2xl mx-auto">
                <p className="text-gray-500 text-center py-8">
                  Manual ingredient editor coming soon...
                </p>
              </div>
            </div>
          );

        case 3:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Cooking Instructions</h2>
                <p className="text-gray-600">Write step-by-step cooking instructions</p>
              </div>

              {/* Manual instructions editor would go here */
              <div className="max-w-2xl mx-auto">
                <p className="text-gray-500 text-center py-8">
                  Manual instructions editor coming soon...
                </p>
              </div>
            </div>
          );

        case 4:
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Save</h2>
                <p className="text-gray-600">Review your recipe and save it to your collection</p>
              </div>

              <div className="max-w-2xl mx-auto text-center">
                <button
                  onClick={handleSaveManualRecipe}
                  className="px-8 py-4 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium text-lg"
                >
                  Save Recipe
                </button>
              </div>
            </div>
          );
        
        default:
          return null;
      }
    }

    // AI recipe creation steps (existing logic)
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your Ingredients</h2>
              <p className="text-gray-600">
                Tell us what you have in your pantry and we'll create the perfect recipe
              </p>
            </div>
            <SmartPantry
              ingredients={ingredients}
              onAddIngredient={handleAddIngredient}
              onRemoveIngredient={handleRemoveIngredient}
              onUpdateIngredient={handleUpdateIngredient}
              navigationButtons={
                <div className="flex justify-between">
                  <button
                    onClick={() => setStep(Math.max(1, step - 1))}
                    disabled={step === 1}
                    className="px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  {step < 3 && (
                    <button
                      onClick={() => setStep(Math.min(4, step + 1))}
                      disabled={!canProceedToStep(step + 1)}
                      className="px-6 py-3 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  )}
                </div>
              }
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Style</h2>
              <p className="text-gray-600">
                Select your preferred cuisine and customize your cooking preferences
              </p>
            </div>
            <AdvancedCuisineSelector
              selectedCuisine={selectedCuisine}
              onCuisineSelect={setSelectedCuisine}
              onPreferencesChange={setCookingPreferences}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Cook?</h2>
              <p className="text-gray-600 mb-8">
                We'll generate a personalized recipe based on your ingredients and preferences
              </p>

              {/* Recipe Summary */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recipe Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="font-medium text-blue-800">Ingredients</p>
                    <p className="text-blue-600">{ingredients.length} items</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="font-medium text-green-800">Cuisine</p>
                    <p className="text-green-600 capitalize">{selectedCuisine}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="font-medium text-purple-800">Max Time</p>
                    <p className="text-purple-600">{cookingPreferences.maxTime} minutes</p>
                  </div>
                </div>
              </div>

              <button
                onClick={generateRecipe}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-all font-medium text-lg flex items-center gap-3 mx-auto disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Your Recipe...
                  </>
                ) : (
                  <>
                    <span className="text-2xl">✨</span>
                    Generate Recipe
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Perfect Recipe!</h2>
              <p className="text-gray-600">
                Here's a personalized recipe crafted just for your ingredients
              </p>
            </div>
            {generatedRecipe && (
              <EnhancedRecipeCard
                recipe={generatedRecipe}
                onServingChange={() => {}} // Disable serving changes in creation flow
                onSaveRecipe={handleSaveRecipe}
                onStartCooking={handleStartCooking}
                onOpenRatingModal={() => {}} // Disable rating in creation flow
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthGuard>
      <Head>
        <title>Create Recipe - Pantry Buddy Pro</title>
        <meta name="description" content="Generate a personalized recipe from your ingredients" />
      </Head>

      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Recipe</h1>
            <p className="text-gray-600">
              Follow these steps to generate your perfect personalized recipe
            </p>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              {(subscription?.tier === 'premium' && creationMode === 'manual'
                ? [
                    {
                      number: 1,
                      title: 'Details',
                      icon: subscription?.tier === 'premium' && step === 1 ? '⚙️' : '📝',
                    },
                    { number: 2, title: 'Ingredients', icon: '🥗' },
                    { number: 3, title: 'Instructions', icon: '📋' },
                    { number: 4, title: 'Save', icon: '💾' },
                  ]
                : [
                    { number: 1, title: 'Ingredients', icon: '🥗' },
                    { number: 2, title: 'Preferences', icon: '🎯' },
                    { number: 3, title: 'Generate', icon: '✨' },
                    { number: 4, title: 'Recipe', icon: '🍳' },
                  ]
              ).map((stepItem, index) => (
                <React.Fragment key={stepItem.number}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => canProceedToStep(stepItem.number) && setStep(stepItem.number)}
                      disabled={!canProceedToStep(stepItem.number)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                        step === stepItem.number
                          ? 'bg-pantry-600 text-white shadow-lg'
                          : step > stepItem.number
                            ? 'bg-green-500 text-white'
                            : canProceedToStep(stepItem.number)
                              ? 'bg-gray-200 text-gray-600 hover:bg-pantry-100'
                              : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {step > stepItem.number ? '✓' : stepItem.icon}
                    </button>
                    <p
                      className={`mt-2 text-sm font-medium ${
                        step >= stepItem.number ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {stepItem.title}
                    </p>
                  </div>
                  {index < 3 && (
                    <div
                      className={`flex-1 h-1 mx-4 rounded ${
                        step > stepItem.number ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            {renderStepContent()}
          </div>

          {/* Final Step Navigation */}
          {step === 4 && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 text-pantry-600 bg-pantry-50 rounded-xl hover:bg-pantry-100 transition-colors font-medium"
              >
                Create Another
              </button>
              <button
                onClick={() => router.push('/dashboard/recipes')}
                className="px-6 py-3 bg-gradient-to-r from-pantry-600 to-pantry-700 text-white rounded-xl hover:from-pantry-700 hover:to-pantry-800 transition-colors font-medium"
              >
                View All Recipes
              </button>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
