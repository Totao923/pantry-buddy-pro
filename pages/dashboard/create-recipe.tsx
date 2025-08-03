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
  const { user } = useAuth();
  const [step, setStep] = useState(1);
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
  };

  const renderStepContent = () => {
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
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium text-lg flex items-center gap-3 mx-auto disabled:opacity-50"
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
              {[
                { number: 1, title: 'Ingredients', icon: '🥗' },
                { number: 2, title: 'Preferences', icon: '🎯' },
                { number: 3, title: 'Generate', icon: '✨' },
                { number: 4, title: 'Recipe', icon: '🍳' },
              ].map((stepItem, index) => (
                <React.Fragment key={stepItem.number}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => canProceedToStep(stepItem.number) && setStep(stepItem.number)}
                      disabled={!canProceedToStep(stepItem.number)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                        step === stepItem.number
                          ? 'bg-blue-500 text-white shadow-lg'
                          : step > stepItem.number
                            ? 'bg-green-500 text-white'
                            : canProceedToStep(stepItem.number)
                              ? 'bg-gray-200 text-gray-600 hover:bg-blue-100'
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

          {/* Navigation */}
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
                className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            )}

            {step === 4 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors font-medium"
                >
                  Create Another
                </button>
                <button
                  onClick={() => router.push('/dashboard/recipes')}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                >
                  View All Recipes
                </button>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
