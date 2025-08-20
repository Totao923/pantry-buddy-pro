import { v4 as uuidv4 } from 'uuid';
import { Ingredient, IngredientCategory } from '../../types';
import { getIngredientService } from './ingredientServiceFactory';
import { aiService } from '../ai/aiService';

export interface QuickRecipeSuggestion {
  id: string;
  name: string;
  cuisine: string;
  cookTime: string;
  difficulty: 'Easy' | 'Medium';
  servings: number;
  ingredients: Array<{
    name: string;
    amount: string;
    available: boolean; // Whether user has this in pantry
  }>;
  instructions: string[];
  matchingIngredients: string[]; // Pantry ingredients used
  missingIngredients: string[]; // Ingredients user needs to buy
  priority: number; // Higher = better match with pantry
  confidence: number;
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
  };
}

export interface SuggestionRequest {
  userId?: string;
  maxSuggestions?: number;
  maxCookTime?: number; // minutes
  difficultyLevel?: 'Easy' | 'Medium' | 'Both';
  prioritizeExpiring?: boolean;
  dietaryPreferences?: string[];
  forceRefresh?: boolean;
}

interface PrioritizedIngredient extends Ingredient {
  priority: number;
  daysUntilExpiry?: number;
  isExpiring: boolean;
  isAbundant: boolean;
}

interface SuggestionAnalytics {
  userId: string;
  suggestionsGenerated: number;
  suggestionsUsed: number;
  mostPopularCuisines: string[];
  averageMatchPercentage: number;
  lastUsed: Date;
}

class QuickSuggestionsService {
  private cache = new Map<string, { suggestions: QuickRecipeSuggestion[]; timestamp: number }>();
  private analytics = new Map<string, SuggestionAnalytics>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MIN_PANTRY_MATCHES = 3; // Minimum pantry ingredients per suggestion
  private readonly MAX_MISSING_INGREDIENTS = 2; // Maximum missing ingredients allowed

  async getQuickSuggestions(request: SuggestionRequest = {}): Promise<QuickRecipeSuggestion[]> {
    const {
      userId = 'anonymous',
      maxSuggestions = 4,
      maxCookTime = 45,
      difficultyLevel = 'Both',
      prioritizeExpiring = true,
      dietaryPreferences = [],
      forceRefresh = false,
    } = request;

    try {
      // Generate cache key for both caching and storing results
      const cacheKey = this.generateCacheKey(userId, request);

      // Check cache first (skip if forceRefresh is true)
      if (!forceRefresh) {
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          console.log('🚀 Returning cached quick suggestions');
          return cached.suggestions;
        }
      } else {
        console.log('🔄 Force refresh requested, bypassing cache');
      }

      // Get current pantry inventory
      console.log('📦 Loading pantry inventory...');
      const ingredientService = await getIngredientService();
      const pantryItems = await ingredientService.getAllIngredients();

      if (pantryItems.length < 3) {
        throw new Error('Need at least 3 pantry items to generate suggestions');
      }

      // Analyze and prioritize pantry items
      const prioritizedItems = this.analyzePantryItems(pantryItems, prioritizeExpiring);

      // Generate AI suggestions with fallback handling
      console.log('🤖 Generating AI recipe suggestions...');
      let suggestions;
      try {
        suggestions = await this.generateAISuggestions(
          prioritizedItems,
          maxSuggestions,
          maxCookTime,
          difficultyLevel,
          dietaryPreferences
        );
      } catch (aiError) {
        console.warn('AI suggestions failed, using fallback recipes:', aiError);
        suggestions = this.createFallbackRecipesFromIngredients(
          prioritizedItems.slice(0, 8),
          maxSuggestions
        );
      }

      // Process and score suggestions
      const processedSuggestions = this.processSuggestions(suggestions, prioritizedItems);

      // Cache the results
      this.cache.set(cacheKey, {
        suggestions: processedSuggestions,
        timestamp: Date.now(),
      });

      // Track analytics
      this.trackSuggestionGeneration(userId, processedSuggestions);

      console.log(`✅ Generated ${processedSuggestions.length} quick suggestions`);
      return processedSuggestions;
    } catch (error) {
      console.error('Error generating quick suggestions:', error);

      // Return fallback suggestions if available
      const fallbackSuggestions = await this.getFallbackSuggestions(request);
      return Array.isArray(fallbackSuggestions) ? fallbackSuggestions : [];
    }
  }

  private analyzePantryItems(
    pantryItems: Ingredient[],
    prioritizeExpiring: boolean
  ): PrioritizedIngredient[] {
    if (!pantryItems || !Array.isArray(pantryItems)) {
      console.warn('Invalid pantry items provided to analyzePantryItems');
      return [];
    }

    const now = new Date();

    return pantryItems
      .filter(item => item && typeof item === 'object') // Filter out invalid items
      .map(item => {
        const daysUntilExpiry = item.expiryDate
          ? Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 3;
        const quantity = parseFloat(item.quantity || '1');
        const isAbundant = quantity > 2; // Consider abundant if more than 2 units

        // Calculate priority score
        let priority = 50; // Base priority

        // Expiring items get highest priority
        if (isExpiring && prioritizeExpiring) {
          priority += 40;
        } else if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
          priority += 20; // Soon to expire
        }

        // Abundant items get medium priority
        if (isAbundant) {
          priority += 15;
        }

        // Protein sources get priority
        if (item.category === 'protein') {
          priority += 25;
        }

        // Fresh ingredients (recently added) get priority
        if (item.purchaseDate) {
          const daysSincePurchase = Math.ceil(
            (now.getTime() - new Date(item.purchaseDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSincePurchase <= 2) {
            priority += 10;
          }
        }

        // Underused items (low usage frequency) get priority
        if (item.usageFrequency !== undefined && item.usageFrequency < 2) {
          priority += 10;
        }

        return {
          ...item,
          priority,
          daysUntilExpiry,
          isExpiring,
          isAbundant,
        } as PrioritizedIngredient;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  private async generateAISuggestions(
    prioritizedItems: PrioritizedIngredient[],
    maxSuggestions: number,
    maxCookTime: number,
    difficultyLevel: string,
    dietaryPreferences: string[]
  ): Promise<any[]> {
    const expiringItems = prioritizedItems.filter(item => item.isExpiring).map(item => item.name);
    const abundantItems = prioritizedItems.filter(item => item.isAbundant).map(item => item.name);
    const allItems = prioritizedItems.map(
      item => `${item.name} (${item.quantity || '1'} ${item.unit || 'unit'})`
    );

    // Create dietary restrictions string with better formatting
    const dietaryRestrictions =
      dietaryPreferences.length > 0
        ? `DIETARY REQUIREMENTS: ${dietaryPreferences
            .map(pref => {
              switch (pref.toLowerCase()) {
                case 'vegetarian':
                  return 'No meat or fish';
                case 'vegan':
                  return 'No animal products (dairy, eggs, honey, etc.)';
                case 'gluten-free':
                  return 'No wheat, barley, rye, or gluten-containing ingredients';
                case 'dairy-free':
                  return 'No milk, cheese, butter, or dairy products';
                case 'keto':
                  return 'Low-carb (under 20g carbs), high-fat';
                case 'paleo':
                  return 'No grains, legumes, dairy, or processed foods';
                default:
                  return pref;
              }
            })
            .join(', ')}`
        : '';

    const prompt = `Generate ${maxSuggestions} quick recipe suggestions using available pantry ingredients.

PANTRY INVENTORY:
Priority ingredients (expiring soon): ${expiringItems.join(', ') || 'None'}
Abundant ingredients: ${abundantItems.join(', ') || 'None'}
All available: ${allItems.join(', ')}

REQUIREMENTS:
- Use AT LEAST ${this.MIN_PANTRY_MATCHES} available pantry ingredients per recipe
- Allow maximum ${this.MAX_MISSING_INGREDIENTS} common missing ingredients (like salt, oil, etc.)
- Cook time: Maximum ${maxCookTime} minutes
- Difficulty: ${difficultyLevel === 'Both' ? 'Easy or Medium only' : difficultyLevel + ' only'}
- Prioritize expiring ingredients: ${expiringItems.join(', ')}
- Include variety: Different cuisines and cooking methods
- ${dietaryRestrictions}

FORMAT (JSON array):
[{
  "name": "Recipe Name",
  "cuisine": "Cuisine Type",
  "cookTime": "X minutes",
  "difficulty": "Easy|Medium",
  "servings": 4,
  "ingredients": [{"name": "ingredient", "amount": "1 cup", "pantryItem": true}],
  "instructions": ["Step 1", "Step 2"],
  "nutritionInfo": {
    "calories": 350,
    "protein": 20,
    "carbs": 30,
    "fat": 15,
    "fiber": 5,
    "sugar": 8,
    "sodium": 450,
    "cholesterol": 25
  },
  "confidence": 0.9
}]

Focus on practical, delicious recipes that maximize use of available ingredients.
IMPORTANT: Include accurate nutritional estimates per serving in the nutritionInfo field.`;

    try {
      // Use generateContent with enhanced parsing for multiple recipe suggestions
      console.log('🤖 Generating multiple recipe suggestions with AI...');

      const response = await aiService.generateContent(prompt);

      // Parse AI response with improved error handling
      let recipes;
      try {
        recipes = this.parseAIResponse(response);

        // Ensure we have valid recipes
        if (!Array.isArray(recipes) || recipes.length === 0) {
          throw new Error('No valid recipes in AI response');
        }

        console.log(`✅ Successfully parsed ${recipes.length} recipe suggestions from AI`);
      } catch (parseError) {
        console.warn('Failed to parse AI response, creating fallback recipes:', parseError);
        console.log(
          'AI Response preview:',
          typeof response === 'string'
            ? response.substring(0, 200)
            : JSON.stringify(response).substring(0, 200)
        );
        recipes = this.createFallbackRecipesFromIngredients(
          prioritizedItems.slice(0, 8),
          maxSuggestions
        );
      }

      return recipes;
    } catch (error) {
      console.error('AI generation failed:', error);
      throw error;
    }
  }

  private parseAIResponse(response: any): any[] {
    try {
      let recipesData;

      if (typeof response === 'string') {
        // Try multiple parsing strategies for string responses
        // Strategy 1: Look for JSON array with improved cleaning
        const jsonArrayMatch = response.match(/\[[\s\S]*?\]/);
        if (jsonArrayMatch) {
          try {
            // Clean up common JSON issues before parsing
            let cleanJson = jsonArrayMatch[0]
              .replace(/,(\s*[\]}])/g, '$1') // Remove trailing commas
              .replace(/'/g, '"') // Replace single quotes with double quotes
              .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote unquoted keys

            recipesData = JSON.parse(cleanJson);
            console.log('✅ Successfully parsed JSON array');
          } catch (e) {
            console.warn('Failed to parse matched JSON array:', e);
            console.warn('Original array text:', jsonArrayMatch[0].substring(0, 200));
          }
        }

        // Strategy 2: Look for multiple JSON objects with better cleaning
        if (!recipesData) {
          const jsonObjectMatches = response.match(/\{[\s\S]*?\}(?=\s*[,\]\}]|$)/g);
          if (jsonObjectMatches && jsonObjectMatches.length > 0) {
            try {
              recipesData = jsonObjectMatches.map(match => {
                // Clean up each object
                let cleanMatch = match
                  .replace(/,(\s*})/g, '$1') // Remove trailing commas
                  .replace(/'/g, '"') // Replace single quotes
                  .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Quote keys
                return JSON.parse(cleanMatch);
              });
              console.log('✅ Successfully parsed JSON objects');
            } catch (e) {
              console.warn('Failed to parse JSON objects:', e);
              console.warn('Sample object:', jsonObjectMatches[0]?.substring(0, 200));
            }
          }
        }

        // Strategy 3: Clean and try parsing entire response
        if (!recipesData) {
          try {
            // Remove any text before the first [ and after the last ]
            const cleanedResponse = response.replace(/^.*?(\[[\s\S]*\]).*?$/s, '$1');
            recipesData = JSON.parse(cleanedResponse);
          } catch (e) {
            console.warn('Failed to parse cleaned response:', e);
          }
        }

        if (!recipesData) {
          throw new Error('Could not extract valid JSON from string response');
        }
      } else if (Array.isArray(response)) {
        recipesData = response;
      } else if (response && response.recipes && Array.isArray(response.recipes)) {
        recipesData = response.recipes;
      } else if (response && typeof response === 'object') {
        // Single recipe object - wrap in array
        recipesData = [response];
      } else {
        throw new Error('Unsupported response format');
      }

      // Validate the recipes
      if (!Array.isArray(recipesData) || recipesData.length === 0) {
        throw new Error('No recipes found in response');
      }

      // Filter out invalid recipes
      const validRecipes = recipesData.filter(
        recipe =>
          recipe &&
          typeof recipe === 'object' &&
          recipe.name &&
          (recipe.ingredients || recipe.instructions)
      );

      if (validRecipes.length === 0) {
        throw new Error('No valid recipes found');
      }

      console.log(`📋 Parsed ${validRecipes.length} valid recipes from AI response`);
      return validRecipes;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw error;
    }
  }

  private processSuggestions(
    aiSuggestions: any[],
    prioritizedItems: PrioritizedIngredient[]
  ): QuickRecipeSuggestion[] {
    const pantryItemNames = prioritizedItems.map(item => item.name.toLowerCase());

    return aiSuggestions
      .map(suggestion => {
        const ingredients = suggestion.ingredients || [];

        // Calculate ingredient matching
        const matchingIngredients: string[] = [];
        const missingIngredients: string[] = [];

        const processedIngredients = ingredients.map((ing: any) => {
          const ingredientName = ing.name || ing;
          const isAvailable = pantryItemNames.some(
            pantryItem =>
              pantryItem.includes(ingredientName.toLowerCase()) ||
              ingredientName.toLowerCase().includes(pantryItem)
          );

          if (isAvailable) {
            matchingIngredients.push(ingredientName);
          } else {
            // Check if it's a common staple or basic ingredient (always assume available)
            const commonStaples = [
              'salt',
              'pepper',
              'oil',
              'water',
              'flour',
              'butter',
              'garlic',
              'onion',
            ];
            if (!commonStaples.some(staple => ingredientName.toLowerCase().includes(staple))) {
              missingIngredients.push(ingredientName);
            }
          }

          return {
            name: ingredientName,
            amount: ing.amount || '1 serving',
            available: isAvailable,
          };
        });

        // Calculate priority score based on pantry matches
        let priority = matchingIngredients.length * 10; // Base score from matches

        // Bonus for using expiring ingredients
        const expiringUsed = prioritizedItems
          .filter(item => item.isExpiring)
          .filter(item =>
            matchingIngredients.some(match => match.toLowerCase().includes(item.name.toLowerCase()))
          ).length;
        priority += expiringUsed * 20;

        // Penalty for too many missing ingredients
        if (missingIngredients.length > this.MAX_MISSING_INGREDIENTS) {
          priority -= (missingIngredients.length - this.MAX_MISSING_INGREDIENTS) * 15;
        }

        return {
          id: uuidv4(),
          name: suggestion.name || 'Suggested Recipe',
          cuisine: suggestion.cuisine || 'International',
          cookTime: suggestion.cookTime || '30 minutes',
          difficulty: (suggestion.difficulty === 'Medium' ? 'Medium' : 'Easy') as 'Easy' | 'Medium',
          servings: suggestion.servings || 4,
          ingredients: processedIngredients,
          instructions: Array.isArray(suggestion.instructions)
            ? suggestion.instructions
            : ['Prepare ingredients', 'Follow cooking method', 'Enjoy!'],
          matchingIngredients,
          missingIngredients,
          priority,
          confidence: suggestion.confidence || 0.8,
          nutritionInfo: suggestion.nutritionInfo || undefined,
        };
      })
      .filter(suggestion => suggestion.matchingIngredients.length >= this.MIN_PANTRY_MATCHES)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4); // Return top 4 suggestions
  }

  private createFallbackRecipesFromIngredients(
    ingredients: PrioritizedIngredient[],
    maxRecipes: number
  ): any[] {
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      console.warn('No ingredients provided to createFallbackRecipesFromIngredients');
      return [];
    }

    const mainIngredients = ingredients.slice(0, Math.min(6, ingredients.length));
    const protein = mainIngredients.find(ing => ing && ing.category === 'protein');
    const vegetables = mainIngredients.filter(ing => ing && ing.category === 'vegetables');
    const grains = mainIngredients.find(ing => ing && ing.category === 'grains');

    // Create diverse recipe templates based on available ingredients
    const recipeTemplates = [
      {
        name: `${mainIngredients[0]?.name || 'Pantry'} Stir Fry`,
        cuisine: 'Asian',
        cookTime: '15 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: mainIngredients.slice(0, 4).map(ing => ({
          name: ing.name,
          amount: `${Math.ceil(parseFloat(ing.quantity || '1') / 4)} ${ing.unit || 'portion'}`,
        })),
        instructions: [
          'Heat 2 tbsp oil in a large pan or wok',
          `Add ${mainIngredients[0]?.name || 'main ingredients'} and cook for 3-5 minutes`,
          'Add remaining ingredients and stir fry for 5-7 minutes',
          'Season with salt, pepper, and available spices',
          'Serve hot over rice or noodles if available',
        ],
        confidence: 0.8,
        matchingIngredients: mainIngredients.slice(0, 4).map(ing => ing.name),
        missingIngredients: [],
        priority: 80,
        nutritionInfo: {
          calories: 280,
          protein: 15,
          carbs: 25,
          fat: 12,
          fiber: 4,
          sugar: 8,
          sodium: 450,
          cholesterol: 0,
        },
      },
      {
        name: `${protein?.name || mainIngredients[1]?.name || 'Pantry'} Bowl`,
        cuisine: 'International',
        cookTime: '20 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: mainIngredients.slice(0, 5).map(ing => ({
          name: ing.name,
          amount: ing.quantity || '1 serving',
        })),
        instructions: [
          `Prepare ${protein?.name || 'main protein'} by cooking until done`,
          'Steam or sauté any vegetables until tender',
          `Cook ${grains?.name || 'rice'} according to package directions if available`,
          'Arrange all components in bowls',
          'Season and add any available sauces or dressings',
        ],
        confidence: 0.7,
        matchingIngredients: mainIngredients.slice(0, 5).map(ing => ing.name),
        missingIngredients: [],
        priority: 75,
        nutritionInfo: {
          calories: 420,
          protein: 22,
          carbs: 35,
          fat: 18,
          fiber: 6,
          sugar: 5,
          sodium: 320,
          cholesterol: 45,
        },
      },
      {
        name: `Quick ${vegetables[0]?.name || 'Vegetable'} Soup`,
        cuisine: 'International',
        cookTime: '25 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: [
          ...vegetables.slice(0, 3).map(ing => ({ name: ing.name, amount: '1 cup chopped' })),
          { name: 'Water or Broth', amount: '4 cups' },
          { name: 'Salt', amount: 'to taste' },
        ],
        instructions: [
          'Chop all vegetables into bite-sized pieces',
          'Heat 1 tbsp oil in a large pot',
          'Sauté vegetables for 5 minutes',
          'Add water or broth and bring to boil',
          'Simmer for 15-20 minutes until vegetables are tender',
          'Season with salt and available herbs',
        ],
        confidence: 0.7,
        matchingIngredients: vegetables.slice(0, 3).map(ing => ing.name),
        missingIngredients: ['Water or Broth'],
        priority: 70,
        nutritionInfo: {
          calories: 150,
          protein: 5,
          carbs: 18,
          fat: 4,
          fiber: 8,
          sugar: 12,
          sodium: 680,
          cholesterol: 0,
        },
      },
      {
        name: `Simple ${mainIngredients[2]?.name || 'Pantry'} Pasta`,
        cuisine: 'Italian',
        cookTime: '18 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: [
          {
            name: 'Pasta',
            amount: '8 oz',
          },
          ...mainIngredients.slice(0, 3).map(ing => ({
            name: ing.name,
            amount: '1/2 cup',
          })),
          { name: 'Olive Oil', amount: '3 tbsp' },
        ],
        instructions: [
          'Cook pasta according to package directions',
          'Heat olive oil in a large pan',
          `Add ${mainIngredients[0]?.name || 'vegetables'} and cook for 5 minutes`,
          'Drain pasta and add to the pan',
          'Toss everything together and season well',
          'Serve with grated cheese if available',
        ],
        confidence: 0.75,
        matchingIngredients: mainIngredients.slice(0, 3).map(ing => ing.name),
        missingIngredients: grains?.name.toLowerCase().includes('pasta') ? [] : ['Pasta'],
        priority: 75,
        nutritionInfo: {
          calories: 380,
          protein: 12,
          carbs: 58,
          fat: 14,
          fiber: 3,
          sugar: 4,
          sodium: 420,
          cholesterol: 0,
        },
      },
    ];

    return recipeTemplates.slice(0, maxRecipes);
  }

  private async getFallbackSuggestions(
    request: SuggestionRequest
  ): Promise<QuickRecipeSuggestion[]> {
    console.log('🆘 Generating fallback suggestions...');

    try {
      // Try to get user's pantry for better fallback suggestions
      const ingredientService = await getIngredientService();
      const pantryItems = await ingredientService.getAllIngredients();
      if (pantryItems && Array.isArray(pantryItems) && pantryItems.length >= 3) {
        // Convert to PrioritizedIngredient format
        const prioritizedItems = this.analyzePantryItems(pantryItems, true);
        if (prioritizedItems && prioritizedItems.length > 0) {
          const fallbackRecipes = this.createFallbackRecipesFromIngredients(
            prioritizedItems.slice(0, 8),
            request.maxSuggestions || 4
          );
          // Process them through the same pipeline as AI suggestions
          return this.processSuggestions(fallbackRecipes, prioritizedItems);
        }
      }
    } catch (error) {
      console.error('Could not load pantry for fallback:', error);
    }

    // Return multiple basic fallback suggestions when AI fails
    const fallbackSuggestions: QuickRecipeSuggestion[] = [
      {
        id: uuidv4(),
        name: 'Simple Pasta with Garlic Oil',
        cuisine: 'Italian',
        cookTime: '20 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: [
          { name: 'Pasta', amount: '8 oz', available: true },
          { name: 'Olive Oil', amount: '3 tbsp', available: true },
          { name: 'Garlic', amount: '3 cloves', available: true },
          { name: 'Salt', amount: 'to taste', available: true },
        ],
        instructions: [
          'Boil pasta according to package directions',
          'Heat olive oil in a large pan',
          'Add minced garlic and cook until fragrant',
          'Toss drained pasta with garlic oil',
          'Season with salt and pepper',
        ],
        matchingIngredients: ['Pasta', 'Olive Oil', 'Garlic'],
        missingIngredients: [],
        priority: 75,
        confidence: 0.8,
      },
      {
        id: uuidv4(),
        name: 'Quick Vegetable Stir Fry',
        cuisine: 'Asian',
        cookTime: '15 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: [
          { name: 'Mixed Vegetables', amount: '2 cups', available: true },
          { name: 'Oil', amount: '2 tbsp', available: true },
          { name: 'Soy Sauce', amount: '2 tbsp', available: false },
          { name: 'Garlic', amount: '2 cloves', available: true },
        ],
        instructions: [
          'Heat oil in a wok or large pan',
          'Add garlic and cook for 30 seconds',
          'Add vegetables and stir fry for 5-7 minutes',
          'Add soy sauce and toss to combine',
          'Serve immediately over rice',
        ],
        matchingIngredients: ['Mixed Vegetables', 'Oil', 'Garlic'],
        missingIngredients: ['Soy Sauce'],
        priority: 70,
        confidence: 0.7,
      },
      {
        id: uuidv4(),
        name: 'Basic Scrambled Eggs',
        cuisine: 'International',
        cookTime: '10 minutes',
        difficulty: 'Easy',
        servings: 2,
        ingredients: [
          { name: 'Eggs', amount: '4 large', available: true },
          { name: 'Butter', amount: '1 tbsp', available: true },
          { name: 'Milk', amount: '2 tbsp', available: true },
          { name: 'Salt', amount: 'to taste', available: true },
        ],
        instructions: [
          'Beat eggs with milk and salt',
          'Heat butter in a non-stick pan',
          'Pour in egg mixture',
          'Cook slowly, stirring gently until set',
          'Serve hot with toast',
        ],
        matchingIngredients: ['Eggs', 'Butter', 'Milk'],
        missingIngredients: [],
        priority: 80,
        confidence: 0.9,
      },
      {
        id: uuidv4(),
        name: 'Simple Rice Bowl',
        cuisine: 'International',
        cookTime: '25 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: [
          { name: 'Rice', amount: '1 cup', available: true },
          { name: 'Water', amount: '2 cups', available: true },
          { name: 'Salt', amount: '1/2 tsp', available: true },
          { name: 'Any vegetables', amount: '1 cup', available: true },
        ],
        instructions: [
          'Rinse rice until water runs clear',
          'Combine rice, water, and salt in a pot',
          'Bring to boil, then simmer covered for 18 minutes',
          'Steam any vegetables separately',
          'Serve rice topped with vegetables',
        ],
        matchingIngredients: ['Rice', 'Any vegetables'],
        missingIngredients: [],
        priority: 65,
        confidence: 0.8,
      },
    ];

    // Return only the requested number of suggestions
    const maxSuggestions = request.maxSuggestions || 4;
    const result = fallbackSuggestions.slice(0, maxSuggestions);

    console.log(`🆘 Using ${result.length} fallback suggestions`);
    return result;
  }

  private generateCacheKey(userId: string, request: SuggestionRequest): string {
    const keyData = {
      userId,
      maxSuggestions: request.maxSuggestions,
      maxCookTime: request.maxCookTime,
      difficultyLevel: request.difficultyLevel,
      dietaryPreferences: request.dietaryPreferences?.sort(),
      // Add pantry signature for cache invalidation
      timestamp: Math.floor(Date.now() / this.CACHE_DURATION), // Changes every 24 hours
    };

    return `quick_suggestions_${JSON.stringify(keyData)}`;
  }

  // Clear cache when pantry changes significantly
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Quick suggestions cache cleared');
  }

  // Get cache statistics
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }

  // Track suggestion generation for analytics
  private trackSuggestionGeneration(userId: string, suggestions: QuickRecipeSuggestion[]): void {
    const existing = this.analytics.get(userId) || {
      userId,
      suggestionsGenerated: 0,
      suggestionsUsed: 0,
      mostPopularCuisines: [],
      averageMatchPercentage: 0,
      lastUsed: new Date(),
    };

    // Update analytics
    existing.suggestionsGenerated += suggestions.length;
    existing.lastUsed = new Date();

    // Calculate average match percentage
    const totalMatches = suggestions.reduce(
      (sum, s) => sum + Math.round((s.matchingIngredients.length / s.ingredients.length) * 100),
      0
    );
    existing.averageMatchPercentage = Math.round(totalMatches / suggestions.length);

    // Track popular cuisines
    const cuisines = suggestions.map(s => s.cuisine);
    cuisines.forEach(cuisine => {
      if (!existing.mostPopularCuisines.includes(cuisine)) {
        existing.mostPopularCuisines.push(cuisine);
      }
    });

    // Keep only top 5 cuisines
    existing.mostPopularCuisines = existing.mostPopularCuisines.slice(0, 5);

    this.analytics.set(userId, existing);
    console.log(`📊 Analytics updated for user ${userId}:`, {
      generated: existing.suggestionsGenerated,
      used: existing.suggestionsUsed,
      avgMatch: existing.averageMatchPercentage,
    });
  }

  // Track when user uses a suggestion (cooks or saves)
  trackSuggestionUsed(userId: string, suggestion: QuickRecipeSuggestion): void {
    const existing = this.analytics.get(userId);
    if (existing) {
      existing.suggestionsUsed += 1;
      this.analytics.set(userId, existing);
      console.log(`✅ Suggestion used - Total used: ${existing.suggestionsUsed}`);
    }
  }

  // Get user analytics
  getUserAnalytics(userId: string): SuggestionAnalytics | null {
    return this.analytics.get(userId) || null;
  }

  // Get success rate for user
  getSuccessRate(userId: string): number {
    const analytics = this.analytics.get(userId);
    if (!analytics || analytics.suggestionsGenerated === 0) return 0;
    return Math.round((analytics.suggestionsUsed / analytics.suggestionsGenerated) * 100);
  }
}

export const quickSuggestionsService = new QuickSuggestionsService();
