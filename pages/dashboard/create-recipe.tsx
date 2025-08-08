import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AuthGuard from '../../components/auth/AuthGuard';
import SmartPantry from '../../components/SmartPantry';
import AdvancedCuisineSelector from '../../components/AdvancedCuisineSelector';
import EnhancedRecipeCard from '../../components/EnhancedRecipeCard';
import { useAuth } from '../../lib/auth/AuthProvider';
import { RecipeService } from '../../lib/services/recipeService';
import { AdvancedRecipeEngine } from '../../lib/advancedRecipeEngine';
import { ingredientService } from '../../lib/services/ingredientService';
import { Ingredient, Recipe, CuisineType } from '../../types';

export default function CreateRecipe() {
  const router = useRouter();
  const { user, subscription } = useAuth();
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
  const [showModeSelection, setShowModeSelection] = useState(subscription?.tier === 'premium');

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
      let recipe: Recipe;

      // Try API first if user is authenticated, otherwise use direct AI service
      if (user?.id) {
        console.log('🚀 Generating recipe with AI via API (authenticated user)...');
        try {
          const apiResponse = await RecipeService.generateRecipe({
            ingredients: ingredients.map(ing => ({
              ...ing,
              quantity: ing.quantity?.toString() || '1',
            })),
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
            },
            userId: user.id,
          });

          if (apiResponse.success && apiResponse.data) {
            recipe = apiResponse.data;
            console.log('✅ AI Recipe generated via API:', {
              title: recipe.title,
              provider: apiResponse.metadata?.provider,
              model: apiResponse.metadata?.model,
              responseTime: apiResponse.metadata?.responseTime,
            });
          } else {
            throw new Error(apiResponse.error || 'API failed');
          }
        } catch (apiError) {
          console.log('❌ Authenticated API failed, trying public AI endpoint:', apiError);

          // Try public AI endpoint as fallback
          try {
            const publicResponse = await fetch('/api/recipes/generate-public', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ingredients: ingredients.map(ing => ({
                  ...ing,
                  quantity: ing.quantity?.toString() || '1',
                })),
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
                },
              }),
            });

            const publicResult = await publicResponse.json();

            if (publicResult.success && publicResult.recipe) {
              recipe = publicResult.recipe;
              console.log('✅ AI Recipe generated via public API:', {
                title: recipe.title,
                provider: publicResult.metadata?.provider,
                model: publicResult.metadata?.model,
                responseTime: publicResult.metadata?.responseTime,
              });
            } else {
              throw new Error(publicResult.error || 'Public API failed');
            }
          } catch (publicError) {
            console.log('❌ Public API also failed:', publicError);
            throw new Error('All AI methods failed');
          }
        }
      } else {
        // For unauthenticated users, use public AI endpoint
        console.log('🚀 Generating recipe via public AI endpoint (no auth)...');

        const publicResponse = await fetch('/api/recipes/generate-public', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ingredients: ingredients.map(ing => ({
              ...ing,
              quantity: ing.quantity?.toString() || '1',
            })),
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
            },
          }),
        });

        const publicResult = await publicResponse.json();

        if (publicResult.success && publicResult.recipe) {
          recipe = publicResult.recipe;
          console.log('✅ AI Recipe generated via public endpoint:', {
            title: recipe.title,
            provider: publicResult.metadata?.provider,
            model: publicResult.metadata?.model,
            responseTime: publicResult.metadata?.responseTime,
          });
        } else {
          throw new Error(publicResult.error || 'Public AI generation failed');
        }
      }

      // If all AI methods fail, fall back to the advanced recipe engine
      if (!recipe) {
        console.log('❌ All AI methods failed, using fallback engine');
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

  const renderNavigationButtons = () => (
    <div className="flex justify-between mt-6">
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
  );

  const renderStepContent = () => {
    // Premium mode selection
    if (showModeSelection) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Creation Mode</h2>
            <p className="text-gray-600">How would you like to create your recipe today?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div
              className="border-2 rounded-2xl p-6 cursor-pointer transition-all border-gray-200 hover:border-pantry-300"
              onClick={() => setShowModeSelection(false)}
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

            <div
              className="border-2 rounded-2xl p-6 cursor-pointer transition-all border-gray-200 hover:border-pantry-300"
              onClick={() => {
                setShowModeSelection(false);
                alert('Manual recipe creation coming soon in the next update!');
              }}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">👨‍🍳</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Your Own</h3>
                <p className="text-gray-600 mb-4">
                  Write your own recipe from scratch with full creative control
                </p>
                <div className="text-sm text-pantry-600 font-medium">
                  🎨 Creative • Custom • Coming Soon
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

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

            {renderNavigationButtons()}
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

              {renderNavigationButtons()}
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
