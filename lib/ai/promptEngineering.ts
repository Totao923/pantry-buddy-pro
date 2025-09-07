import { RecipeGenerationParams, RecipeEnhancementParams } from './types';
import { Ingredient, CuisineType } from '../../types';

export class PromptEngine {
  /**
   * Generate a comprehensive prompt for recipe creation
   */
  static generateRecipePrompt(params: RecipeGenerationParams): string {
    const {
      ingredients,
      cuisine,
      servings,
      preferences = {},
      userHistory = {},
      aiSuggestedContext,
    } = params;

    const sections = [
      // If this is an AI nutritionist suggested recipe, add context at the top
      aiSuggestedContext?.isAISuggested
        ? this.buildAINutritionistSection(aiSuggestedContext)
        : null,
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
   * Build AI nutritionist context section to ensure recipe matches recommendation
   */
  private static buildAINutritionistSection(context: {
    recommendationTitle?: string;
    isAISuggested: boolean;
  }): string {
    return `🤖 AI NUTRITIONIST RECIPE REQUEST:
You are generating a recipe based on a specific nutritionist recommendation. This is NOT a generic recipe request.

RECOMMENDED RECIPE: "${context.recommendationTitle || 'AI Suggested Recipe'}"

CRITICAL INSTRUCTIONS:
- Create the EXACT recipe described in the recommendation title
- Follow the specific dish concept mentioned in the recommendation
- If the recommendation mentions specific cooking methods or ingredients, include them
- The recipe title should closely match or be inspired by the recommendation title
- This recipe is specifically designed to meet the user's nutritional goals
- Focus on making this recommended recipe, not a generic recipe with the available ingredients

The user specifically requested THIS recipe based on AI nutritionist guidance.`;
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

          // Mark AI suggested ingredients
          const isAISuggested = item.notes && item.notes.includes('AI Nutritionist');
          const marker = isAISuggested ? '🤖 ' : '- ';

          section += `${marker}${item.name}${details.length ? ` (${details.join(', ')})` : ''}\n`;
        });
      }
    });

    if (hasAISuggestedIngredients) {
      section +=
        '\n🎯 AI RECIPE PRIORITY: Create a recipe that prominently features the main AI-suggested ingredient. The main ingredient should be the primary focus of the dish, not just a minor component. Make it the hero of the recipe!';
      section +=
        '\n⚠️ IMPORTANT: Do NOT create generic recipes like "olive oil dressing" or "basic sauce". The recipe must be built around and showcase the main AI-suggested ingredient.';
    } else {
      section +=
        '\nPRIORITY: Please prioritize using ingredients that are expiring soon. Try to use as many available ingredients as possible while creating a delicious, cohesive recipe.';
    }

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

    // Enhanced Health Goal Integration
    if (preferences.healthGoal) {
      section += `\n- Health Goal: ${preferences.healthGoal}`;
      section += this.buildHealthGoalGuidance(preferences.healthGoal, preferences);
    }

    if (preferences.targetCalories) {
      section += `\n- Target calories for this meal: ~${preferences.targetCalories} calories`;
    }

    if (preferences.proteinFocus) {
      section += `\n- IMPORTANT: High protein focus for muscle building/maintenance (aim for 25-30g protein per serving)`;
    }

    if (preferences.lowSodium) {
      section += `\n- IMPORTANT: Low sodium for heart health (under 400mg sodium per serving, use herbs/spices for flavor)`;
    }

    if (preferences.heartHealthy) {
      section += `\n- IMPORTANT: Heart-healthy focus with omega-3 rich ingredients (salmon, walnuts, olive oil, avocado)`;
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

  private static buildHealthGoalGuidance(healthGoal: string, preferences: any): string {
    const healthGoalGuidance: Record<string, string> = {
      'General Wellness': `
- BALANCED APPROACH: Create a well-rounded meal with lean protein, complex carbs, healthy fats, and vegetables
- AIM FOR: 400-500 calories, 20-25g protein, 5-8g fiber, moderate sodium
- FOCUS ON: Fresh ingredients, minimal processing, colorful vegetables
- COOKING METHODS: Grilling, baking, steaming, or sautéing with minimal oil`,

      'Weight Loss': `
- LOW CALORIE, HIGH SATISFACTION: Create filling meals with fewer calories
- AIM FOR: 350-450 calories, 25-30g protein, 8-12g fiber, under 400mg sodium
- FOCUS ON: Lean proteins, fiber-rich vegetables, minimal added fats/sugars
- COOKING METHODS: Grilling, baking, steaming - avoid frying or heavy sauces
- KEY INGREDIENTS: Chicken breast, fish, leafy greens, cruciferous vegetables, beans`,

      'Muscle Gain': `
- HIGH PROTEIN, NUTRIENT DENSE: Support muscle building with quality protein
- AIM FOR: 500-650 calories, 30-40g protein, moderate carbs for energy
- FOCUS ON: Lean meats, eggs, dairy, quinoa, sweet potatoes, nuts
- COOKING METHODS: Any method that preserves protein quality
- KEY INGREDIENTS: Chicken, salmon, eggs, Greek yogurt, beans, quinoa, nuts`,

      'Health Maintenance': `
- NUTRITIONALLY BALANCED: Maintain current health with well-rounded nutrition
- AIM FOR: 400-550 calories, 20-25g protein, 5-8g fiber
- FOCUS ON: Variety, moderation, seasonal ingredients
- COOKING METHODS: Mix of grilling, baking, sautéing for variety`,

      'Heart Health': `
- HEART-PROTECTIVE NUTRIENTS: Emphasize omega-3s, fiber, antioxidants
- AIM FOR: 400-500 calories, under 300mg sodium, 8-10g fiber
- FOCUS ON: Fatty fish, olive oil, avocado, nuts, whole grains, berries
- COOKING METHODS: Baking, grilling, steaming - minimal added sodium
- KEY INGREDIENTS: Salmon, olive oil, avocado, walnuts, oats, berries, leafy greens
- AVOID: Processed foods, excessive sodium, trans fats`,
    };

    return healthGoalGuidance[healthGoal] || '';
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
- Nutritional information is accurate and realistic AND matches health goal requirements
- Dietary info correctly reflects the ingredients used
- Tips are practical and helpful
- The recipe is delicious, balanced, and achievable
- Health goal requirements are met (calories, protein, sodium, fiber as specified)
- Recipe title reflects the health focus when applicable

VALIDATION REQUIREMENTS:
- If health goal specified, recipe MUST meet the nutritional targets outlined above
- Nutritional information should be calculated accurately based on ingredients
- Recipe should clearly support the user's health objectives

The recipe should be inspiring and make the user excited to cook while meeting their health goals!`;
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
