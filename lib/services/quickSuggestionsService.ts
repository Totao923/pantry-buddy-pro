import { v4 as uuidv4 } from 'uuid';
import { Ingredient, IngredientCategory } from '../../types';
import { ingredientService } from './ingredientService';
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
}

export interface SuggestionRequest {
  userId?: string;
  maxSuggestions?: number;
  maxCookTime?: number; // minutes
  difficultyLevel?: 'Easy' | 'Medium' | 'Both';
  prioritizeExpiring?: boolean;
  dietaryPreferences?: string[];
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
    } = request;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(userId, request);
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('🚀 Returning cached quick suggestions');
        return cached.suggestions;
      }

      // Get current pantry inventory
      console.log('📦 Loading pantry inventory...');
      const pantryItems = await ingredientService.getAllIngredients();

      if (pantryItems.length < 3) {
        throw new Error('Need at least 3 pantry items to generate suggestions');
      }

      // Analyze and prioritize pantry items
      const prioritizedItems = this.analyzePantryItems(pantryItems, prioritizeExpiring);

      // Generate AI suggestions
      console.log('🤖 Generating AI recipe suggestions...');
      const suggestions = await this.generateAISuggestions(
        prioritizedItems,
        maxSuggestions,
        maxCookTime,
        difficultyLevel,
        dietaryPreferences
      );

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
      return fallbackSuggestions;
    }
  }

  private analyzePantryItems(
    pantryItems: Ingredient[],
    prioritizeExpiring: boolean
  ): PrioritizedIngredient[] {
    const now = new Date();

    return pantryItems
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
  "confidence": 0.9
}]

Focus on practical, delicious recipes that maximize use of available ingredients.`;

    try {
      // Use generateContent for multiple recipe suggestions since generateRecipe only returns one recipe
      const response = await aiService.generateContent(prompt);

      // Parse AI response - if it fails, create fallback recipes
      let recipes;
      try {
        recipes = this.parseAIResponse(response);
        console.log(`✅ Successfully parsed ${recipes.length} recipe suggestions from AI`);
      } catch (parseError) {
        console.warn('Failed to parse AI response, creating fallback recipes:', parseError);
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
      // Handle different response formats
      let recipesData;

      if (typeof response === 'string') {
        // Try to extract JSON from string response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          recipesData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } else if (Array.isArray(response)) {
        recipesData = response;
      } else if (response.recipes && Array.isArray(response.recipes)) {
        recipesData = response.recipes;
      } else {
        throw new Error('Invalid response format');
      }

      return recipesData;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Failed to parse AI response');
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
    const recipes = [];
    const mainIngredients = ingredients.slice(0, Math.min(6, ingredients.length));

    // Create simple recipe templates based on available ingredients
    const recipeTemplates = [
      {
        name: `${mainIngredients[0]?.name || 'Ingredient'} Stir Fry`,
        cuisine: 'Asian',
        cookTime: '15 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: mainIngredients.map(ing => ({ name: ing.name, amount: '1 portion' })),
        instructions: [
          'Heat oil in a pan',
          'Add ingredients and stir fry',
          'Season to taste',
          'Serve hot',
        ],
        confidence: 0.7,
      },
      {
        name: `Simple ${mainIngredients[1]?.name || 'Ingredient'} Bowl`,
        cuisine: 'International',
        cookTime: '20 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: mainIngredients.map(ing => ({ name: ing.name, amount: '1 serving' })),
        instructions: ['Prepare ingredients', 'Combine in a bowl', 'Add seasoning', 'Enjoy'],
        confidence: 0.6,
      },
    ];

    return recipeTemplates.slice(0, maxRecipes);
  }

  private async getFallbackSuggestions(
    request: SuggestionRequest
  ): Promise<QuickRecipeSuggestion[]> {
    // Return some basic fallback suggestions when AI fails
    const fallbackSuggestions: QuickRecipeSuggestion[] = [
      {
        id: uuidv4(),
        name: 'Simple Pasta with Available Ingredients',
        cuisine: 'Italian',
        cookTime: '20 minutes',
        difficulty: 'Easy',
        servings: 4,
        ingredients: [
          { name: 'Pasta', amount: '8 oz', available: true },
          { name: 'Olive Oil', amount: '2 tbsp', available: true },
          { name: 'Garlic', amount: '2 cloves', available: true },
        ],
        instructions: [
          'Boil pasta according to package directions',
          'Heat olive oil and sauté garlic',
          'Combine pasta with oil and garlic',
          'Season with salt and pepper',
        ],
        matchingIngredients: ['Pasta', 'Olive Oil', 'Garlic'],
        missingIngredients: [],
        priority: 70,
        confidence: 0.7,
      },
    ];

    console.log('🆘 Using fallback suggestions');
    return fallbackSuggestions;
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
