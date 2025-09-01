import { RecipeGenerationParams, RecipeEnhancementParams } from './types';
import { Ingredient, CuisineType } from '../../types';

export class PromptEngine {
  /**
   * Generate a comprehensive prompt for recipe creation
   */
  static generateRecipePrompt(params: RecipeGenerationParams): string {
    const { ingredients, cuisine, servings, preferences = {}, userHistory = {} } = params;

    const sections = [
      this.buildIngredientSection(ingredients),
      this.buildPreferencesSection(preferences, cuisine, servings),
      this.buildExperienceSection(preferences.experienceLevel || 'intermediate'),
      this.buildHistorySection(userHistory),
      this.buildConstraintsSection(preferences),
      this.buildOutputFormatSection(),
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Generate a prompt for recipe enhancement
   */
  static generateEnhancementPrompt(params: RecipeEnhancementParams): string {
    const { originalRecipe, enhancement, userFeedback } = params;

    const basePrompt = `Please enhance the following recipe by ${enhancement.replace('-', ' ')}:

ORIGINAL RECIPE:
Title: ${originalRecipe.title}
Description: ${originalRecipe.description}
Difficulty: ${originalRecipe.difficulty}
Cuisine: ${originalRecipe.cuisine}

Ingredients:
${originalRecipe.ingredients.map(ing => `- ${ing.amount} ${ing.unit} ${ing.name}`).join('\n')}

Instructions:
${originalRecipe.instructions.map(inst => `${inst.step}. ${inst.instruction}`).join('\n')}`;

    let enhancementSpecific = '';

    switch (enhancement) {
      case 'add-tips':
        enhancementSpecific = `
ENHANCEMENT REQUEST: Add 3-5 professional cooking tips that will help users achieve better results. Focus on:
- Technique improvements
- Common mistakes to avoid  
- Ingredient handling tips
- Timing and temperature guidance
- Presentation suggestions

Return the enhanced recipe with a new "tips" array containing these professional insights.`;
        break;

      case 'create-variations':
        enhancementSpecific = `
ENHANCEMENT REQUEST: Create 2-3 creative variations of this recipe. Consider:
- Different protein options
- Seasonal ingredient swaps
- Dietary modifications (vegan, gluten-free, etc.)
- Regional/cultural adaptations
- Difficulty level adjustments

Return the enhanced recipe with a new "variations" array containing these alternatives.`;
        break;

      case 'improve-instructions':
        enhancementSpecific = `
ENHANCEMENT REQUEST: Improve the cooking instructions to be more detailed and beginner-friendly. Focus on:
- Adding timing details for each step
- Including temperature specifications
- Clarifying cooking techniques
- Adding visual cues for doneness
- Breaking down complex steps

Return the recipe with enhanced "instructions" array.`;
        break;

      case 'optimize-nutrition':
        enhancementSpecific = `
ENHANCEMENT REQUEST: Optimize this recipe for better nutritional balance. Consider:
- Increasing protein content
- Adding more vegetables/fiber
- Reducing sodium or sugar
- Improving healthy fat ratios
- Maintaining great taste

Return the recipe with optimized ingredients and updated nutritional information.`;
        break;
    }

    if (userFeedback) {
      enhancementSpecific += `

USER FEEDBACK:
Rating: ${userFeedback.rating}/5 stars
Comments: ${userFeedback.comments.join(', ')}
User Modifications: ${userFeedback.modifications.join(', ')}

Please consider this feedback when making enhancements.`;
    }

    return (
      basePrompt +
      enhancementSpecific +
      '\n\nRespond with the complete enhanced recipe in the same JSON format.'
    );
  }

  private static buildIngredientSection(ingredients: Ingredient[]): string {
    if (ingredients.length === 0) {
      return 'AVAILABLE INGREDIENTS: None specified - please create a simple recipe with common pantry ingredients.';
    }

    const categorized = this.categorizeIngredients(ingredients);

    let section = 'AVAILABLE INGREDIENTS:\n';

    Object.entries(categorized).forEach(([category, items]) => {
      if (items.length > 0) {
        section += `${category.toUpperCase()}:\n`;
        items.forEach(item => {
          const details = [];
          if (item.quantity) details.push(`Quantity: ${item.quantity}`);
          if (item.expiryDate) {
            const daysUntilExpiry = Math.ceil(
              (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntilExpiry <= 3) details.push('⚠️ Expires soon');
          }
          section += `- ${item.name}${details.length ? ` (${details.join(', ')})` : ''}\n`;
        });
      }
    });

    section +=
      '\nPRIORITY: Please prioritize using ingredients that are expiring soon. Try to use as many available ingredients as possible while creating a delicious, cohesive recipe.';

    return section;
  }

  private static buildPreferencesSection(
    preferences: any,
    cuisine: CuisineType,
    servings: number
  ): string {
    let section = `RECIPE REQUIREMENTS:
- Cuisine: ${cuisine === 'any' ? 'Any cuisine (be creative!)' : cuisine}
- Servings: ${servings}`;

    if (preferences.maxTime) {
      section += `\n- Maximum total time: ${preferences.maxTime} minutes`;
    }

    if (preferences.difficulty) {
      section += `\n- Difficulty level: ${preferences.difficulty}`;
    }

    if (preferences.spiceLevel) {
      section += `\n- Spice level: ${preferences.spiceLevel}`;
    }

    if (preferences.dietary && preferences.dietary.length > 0) {
      section += `\n- Dietary restrictions: ${preferences.dietary.join(', ')}`;
    }

    if (preferences.allergens && preferences.allergens.length > 0) {
      section += `\n- Allergens to avoid: ${preferences.allergens.join(', ')}`;
    }

    if (preferences.nutritionGoals) {
      section += `\n- Nutrition goal: ${preferences.nutritionGoals}`;
    }

    // Health goal integration
    if (preferences.healthGoal) {
      section += `\n- Health Goal: ${preferences.healthGoal}`;
    }

    if (preferences.targetCalories) {
      section += `\n- Target calories for this meal: ~${preferences.targetCalories} calories`;
    }

    if (preferences.proteinFocus) {
      section += `\n- IMPORTANT: High protein focus for muscle building/maintenance`;
    }

    if (preferences.lowSodium) {
      section += `\n- IMPORTANT: Low sodium for heart health (under 400mg sodium per serving)`;
    }

    if (preferences.heartHealthy) {
      section += `\n- IMPORTANT: Heart-healthy focus with omega-3 rich ingredients when possible`;
    }

    // Meal plan mode specific guidance
    if (preferences.familyFriendly) {
      section += `\n- FAMILY-FRIENDLY: Create meals that appeal to all ages, with moderate flavors`;
    }

    if (preferences.pantryFocused) {
      section += `\n- PANTRY-FOCUSED: Make the most of available ingredients, minimize waste`;
    }

    if (preferences.useWhatYouHave) {
      section += `\n- USE WHAT YOU HAVE: Focus on practical recipes that utilize pantry ingredients efficiently`;
    }

    if (preferences.practical) {
      section += `\n- PRACTICAL: Emphasize simple, achievable recipes with common techniques`;
    }

    return section;
  }

  private static buildExperienceSection(experienceLevel: string): string {
    const levelGuides = {
      beginner: `EXPERIENCE LEVEL: Beginner Cook
- Use simple, clear instructions with basic cooking terms
- Include helpful tips for common mistakes
- Suggest easy techniques and minimal equipment
- Provide visual cues for doneness (color, texture, etc.)
- Keep ingredient list manageable (5-8 main ingredients)
- Estimated skill required: Basic knife skills, can follow recipes`,

      intermediate: `EXPERIENCE LEVEL: Intermediate Cook  
- Can use standard cooking techniques and terminology
- Comfortable with multiple cooking methods
- Can manage timing for multiple components
- Understands basic flavor combinations
- Estimated skill required: Can multitask, knows basic techniques`,

      advanced: `EXPERIENCE LEVEL: Advanced Cook
- Appreciates complex flavors and techniques  
- Comfortable with professional cooking methods
- Can adapt recipes and make substitutions
- Enjoys challenging preparations
- Estimated skill required: Strong foundation, creative with ingredients`,

      expert: `EXPERIENCE LEVEL: Expert/Professional Cook
- Expects sophisticated techniques and flavor profiles
- Comfortable with advanced equipment and methods
- Appreciates nuanced instructions and professional tips
- Can handle complex multi-step preparations
- Estimated skill required: Professional level skills and creativity`,
    };

    return levelGuides[experienceLevel as keyof typeof levelGuides] || levelGuides.intermediate;
  }

  private static buildHistorySection(userHistory: any): string {
    if (!userHistory || Object.keys(userHistory).length === 0) {
      return '';
    }

    let section = 'USER PREFERENCES (based on history):\n';

    if (userHistory.favoriteRecipes && userHistory.favoriteRecipes.length > 0) {
      section += `- Enjoys: ${userHistory.favoriteRecipes.slice(0, 3).join(', ')}\n`;
    }

    if (userHistory.dislikedIngredients && userHistory.dislikedIngredients.length > 0) {
      section += `- Dislikes: ${userHistory.dislikedIngredients.join(', ')}\n`;
    }

    if (userHistory.cookingFrequency) {
      section += `- Cooks: ${userHistory.cookingFrequency}\n`;
    }

    if (userHistory.skillLevel) {
      section += `- Self-rated skill level: ${userHistory.skillLevel}/10\n`;
    }

    section += 'Please consider these preferences when creating the recipe.';

    return section;
  }

  private static buildConstraintsSection(preferences: any): string {
    const constraints = [];

    if (preferences.maxTime) {
      constraints.push(`Total cooking time must not exceed ${preferences.maxTime} minutes`);
    }

    if (preferences.spiceLevel === 'mild') {
      constraints.push('Keep spices mild and gentle - suitable for sensitive palates');
    } else if (preferences.spiceLevel === 'extra-hot') {
      constraints.push('Make it spicy! Use bold, hot flavors for heat lovers');
    }

    if (preferences.nutritionGoals === 'high-protein') {
      constraints.push('Aim for at least 25g protein per serving');
    } else if (preferences.nutritionGoals === 'low-carb') {
      constraints.push('Keep carbohydrates under 20g per serving');
    } else if (preferences.nutritionGoals === 'low-calorie') {
      constraints.push('Keep calories under 400 per serving while maintaining satisfaction');
    }

    if (constraints.length === 0) {
      return '';
    }

    return 'IMPORTANT CONSTRAINTS:\n' + constraints.map(c => `- ${c}`).join('\n');
  }

  private static buildOutputFormatSection(): string {
    return `OUTPUT FORMAT:
Please respond with ONLY a valid JSON object that matches the recipe schema. No additional text or explanation outside the JSON.

Ensure:
- All ingredients have realistic amounts and proper units
- Instructions are numbered and include estimated duration
- Nutritional information is accurate and realistic  
- Dietary info correctly reflects the ingredients used
- Tips are practical and helpful
- The recipe is delicious, balanced, and achievable

The recipe should be inspiring and make the user excited to cook!`;
  }

  private static categorizeIngredients(ingredients: Ingredient[]): Record<string, Ingredient[]> {
    const categories: Record<string, Ingredient[]> = {
      proteins: [],
      vegetables: [],
      fruits: [],
      grains: [],
      dairy: [],
      spices: [],
      herbs: [],
      oils: [],
      pantry: [],
      other: [],
    };

    ingredients.forEach(ingredient => {
      const category = ingredient.category || 'other';
      if (categories[category]) {
        categories[category].push(ingredient);
      } else {
        categories.other.push(ingredient);
      }
    });

    return categories;
  }

  /**
   * Generate a prompt for creative recipe suggestions
   */
  static generateSuggestionPrompt(cuisinePreference?: CuisineType, mood?: string): string {
    return `Generate 3 creative recipe suggestions${cuisinePreference && cuisinePreference !== 'any' ? ` for ${cuisinePreference} cuisine` : ''}.

${mood ? `MOOD/THEME: ${mood}` : 'THEME: Surprise me with something creative and delicious'}

For each suggestion, provide:
1. Recipe name
2. Brief description (1-2 sentences)  
3. Key ingredients (3-4 main ones)
4. Estimated time and difficulty
5. What makes it special

Format as a JSON array of suggestion objects.`;
  }

  /**
   * Generate a prompt for ingredient substitutions
   */
  static generateSubstitutionPrompt(
    missingIngredient: string,
    availableIngredients: string[]
  ): string {
    return `I need a substitution for "${missingIngredient}" in my recipe.

AVAILABLE ALTERNATIVES: ${availableIngredients.join(', ')}

Please suggest:
1. The best substitute from my available ingredients (if any)
2. How to adjust the recipe for this substitution
3. Any technique modifications needed
4. Expected impact on flavor/texture

If none of my available ingredients work, suggest common household alternatives.`;
  }
}
