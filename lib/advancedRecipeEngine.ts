import {
  Recipe,
  Ingredient,
  CuisineType,
  DifficultyLevel,
  InstructionStep,
  RecipeIngredient,
  DietaryInfo,
  NutritionInfo,
} from '../types';

export class AdvancedRecipeEngine {
  private static recipeDatabase: Recipe[] = [];
  private static nutritionDatabase: Record<string, NutritionInfo> = {};

  static async generateAdvancedRecipe(
    ingredients: Ingredient[],
    cuisine: CuisineType,
    servings: number = 4,
    preferences?: {
      maxTime?: number;
      difficulty?: DifficultyLevel;
      dietary?: string[];
      spiceLevel?: 'mild' | 'medium' | 'hot' | 'extra-hot';
      experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    }
  ): Promise<Recipe> {
    // Advanced ingredient analysis
    const ingredientAnalysis = this.analyzeIngredients(ingredients);

    // Recipe template selection based on AI-like logic
    const recipeTemplate = this.selectOptimalRecipeTemplate(
      ingredientAnalysis,
      cuisine,
      preferences
    );

    // Generate dynamic recipe with advanced features
    const recipe = await this.buildDynamicRecipe(
      recipeTemplate,
      ingredients,
      servings,
      ingredientAnalysis,
      preferences
    );

    return recipe;
  }

  private static analyzeIngredients(ingredients: Ingredient[]) {
    const analysis = {
      proteins: ingredients.filter(ing => ing.category === 'protein'),
      vegetables: ingredients.filter(ing => ing.category === 'vegetables'),
      grains: ingredients.filter(ing => ing.category === 'grains'),
      dairy: ingredients.filter(ing => ing.category === 'dairy'),
      spices: ingredients.filter(ing => ing.category === 'spices'),
      herbs: ingredients.filter(ing => ing.category === 'herbs'),
      oils: ingredients.filter(ing => ing.category === 'oils'),
      totalIngredients: ingredients.length,
      isVegetarian: ingredients.every(ing => ing.isVegetarian !== false),
      isVegan: ingredients.every(ing => ing.isVegan !== false),
      hasProtein: ingredients.some(ing => ing.isProtein),
      complexity: this.calculateComplexity(ingredients),
      flavorProfile: this.analyzeFlavorProfile(ingredients),
    };

    return analysis;
  }

  private static calculateComplexity(ingredients: Ingredient[]): DifficultyLevel {
    const complexityScore = ingredients.reduce((score, ing) => {
      // More complex ingredients increase difficulty
      if (ing.category === 'protein' && ing.name.toLowerCase().includes('fish')) score += 3;
      if (ing.category === 'protein' && ing.name.toLowerCase().includes('meat')) score += 2;
      if (ing.category === 'spices') score += 1;
      if (ing.category === 'herbs') score += 0.5;
      return score;
    }, 0);

    if (complexityScore <= 3) return 'Beginner';
    if (complexityScore <= 6) return 'Easy';
    if (complexityScore <= 10) return 'Medium';
    if (complexityScore <= 15) return 'Hard';
    return 'Expert';
  }

  private static analyzeFlavorProfile(ingredients: Ingredient[]) {
    const profiles = {
      spicy: ingredients.some(ing =>
        ['chili', 'pepper', 'paprika', 'cayenne', 'jalapeño'].some(spice =>
          ing.name.toLowerCase().includes(spice)
        )
      ),
      aromatic: ingredients.some(ing =>
        ['garlic', 'onion', 'ginger', 'herbs'].some(
          aroma => ing.name.toLowerCase().includes(aroma) || ing.category === 'herbs'
        )
      ),
      rich: ingredients.some(
        ing =>
          ing.category === 'dairy' ||
          ['cream', 'butter', 'cheese'].some(rich => ing.name.toLowerCase().includes(rich))
      ),
      fresh: ingredients.some(ing => ing.category === 'vegetables' || ing.category === 'fruits'),
    };

    return profiles;
  }

  private static selectOptimalRecipeTemplate(
    analysis: any,
    cuisine: CuisineType,
    preferences?: any
  ) {
    const templates = this.getRecipeTemplates();

    // Filter templates based on available ingredients and preferences
    let suitable = templates.filter(template => {
      const cuisineMatch = cuisine === 'any' || template.cuisine === cuisine;
      const ingredientMatch = this.canMakeRecipe(template, analysis);
      const difficultyMatch =
        !preferences?.difficulty || template.difficulty === preferences.difficulty;
      const timeMatch =
        !preferences?.maxTime || template.prepTime + template.cookTime <= preferences.maxTime;

      return cuisineMatch && ingredientMatch && difficultyMatch && timeMatch;
    });

    if (suitable.length === 0) {
      return this.generateFallbackTemplate(analysis, cuisine, preferences);
    }

    // Select best match using scoring algorithm
    return this.scoreBestTemplate(suitable, analysis, preferences);
  }

  private static canMakeRecipe(template: Recipe, analysis: any): boolean {
    const requiredCategories = template.ingredients.map(ing => this.categorizeIngredient(ing.name));

    const availableCategories = [
      ...analysis.proteins.map(() => 'protein'),
      ...analysis.vegetables.map(() => 'vegetables'),
      ...analysis.grains.map(() => 'grains'),
      ...analysis.dairy.map(() => 'dairy'),
    ];

    return requiredCategories.every(
      required => availableCategories.includes(required) || required === 'pantry'
    );
  }

  private static categorizeIngredient(name: string): string {
    const nameLower = name.toLowerCase();
    if (['chicken', 'beef', 'fish', 'tofu', 'eggs'].some(p => nameLower.includes(p)))
      return 'protein';
    if (['rice', 'pasta', 'bread', 'quinoa'].some(g => nameLower.includes(g))) return 'grains';
    if (['tomato', 'onion', 'pepper', 'carrot'].some(v => nameLower.includes(v)))
      return 'vegetables';
    if (['milk', 'cheese', 'yogurt', 'butter'].some(d => nameLower.includes(d))) return 'dairy';
    return 'pantry';
  }

  private static scoreBestTemplate(templates: Recipe[], analysis: any, preferences?: any): Recipe {
    return templates.reduce((best, current) => {
      const currentScore = this.calculateTemplateScore(current, analysis, preferences);
      const bestScore = this.calculateTemplateScore(best, analysis, preferences);
      return currentScore > bestScore ? current : best;
    });
  }

  private static calculateTemplateScore(
    template: Recipe,
    analysis: any,
    preferences?: any
  ): number {
    let score = 0;

    // Ingredient utilization score
    score += Math.min(template.ingredients.length, analysis.totalIngredients) * 10;

    // Flavor profile matching
    if (analysis.flavorProfile.spicy && template.tags.includes('spicy')) score += 15;
    if (analysis.flavorProfile.aromatic && template.tags.includes('aromatic')) score += 10;
    if (analysis.flavorProfile.rich && template.tags.includes('rich')) score += 10;
    if (analysis.flavorProfile.fresh && template.tags.includes('fresh')) score += 10;

    // Dietary preferences
    if (analysis.isVegetarian && template.dietaryInfo.isVegetarian) score += 20;
    if (analysis.isVegan && template.dietaryInfo.isVegan) score += 25;

    // User preferences
    if (preferences?.spiceLevel === 'mild' && !template.tags.includes('spicy')) score += 5;
    if (preferences?.spiceLevel === 'hot' && template.tags.includes('spicy')) score += 15;

    return score;
  }

  private static async buildDynamicRecipe(
    template: Recipe,
    ingredients: Ingredient[],
    servings: number,
    analysis: any,
    preferences?: any
  ): Promise<Recipe> {
    const scaledIngredients = this.scaleAndAdaptIngredients(
      template.ingredients,
      servings,
      ingredients
    );
    const dynamicInstructions = this.generateDynamicInstructions(template, analysis, preferences);
    const nutritionInfo = this.calculateNutrition(scaledIngredients);
    const tips = this.generateCookingTips(template, analysis);
    const variations = this.generateVariations(template, ingredients);

    return {
      ...template,
      id: Date.now().toString(),
      servings,
      ingredients: scaledIngredients,
      instructions: dynamicInstructions,
      nutritionInfo,
      tips,
      variations,
      totalTime: template.prepTime + template.cookTime,
      rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
      reviews: Math.floor(Math.random() * 500) + 50,
    };
  }

  private static scaleAndAdaptIngredients(
    templateIngredients: RecipeIngredient[],
    servings: number,
    availableIngredients: Ingredient[]
  ): RecipeIngredient[] {
    const scale = servings / 4; // Base template is for 4 servings

    return templateIngredients.map(ingredient => {
      const available = availableIngredients.find(
        avail =>
          avail.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
          ingredient.name.toLowerCase().includes(avail.name.toLowerCase())
      );

      return {
        ...ingredient,
        amount: parseFloat((ingredient.amount * scale).toFixed(2)),
        substitutes: available ? [] : this.findSubstitutes(ingredient.name),
      };
    });
  }

  private static findSubstitutes(ingredientName: string): string[] {
    const substitutes: Record<string, string[]> = {
      butter: ['olive oil', 'coconut oil', 'margarine'],
      milk: ['almond milk', 'soy milk', 'oat milk'],
      eggs: ['flax eggs', 'chia eggs', 'applesauce'],
      cheese: ['nutritional yeast', 'cashew cheese', 'tofu'],
      chicken: ['tofu', 'tempeh', 'mushrooms', 'cauliflower'],
      beef: ['lentils', 'mushrooms', 'jackfruit', 'beans'],
    };

    const key = Object.keys(substitutes).find(key => ingredientName.toLowerCase().includes(key));

    return key ? substitutes[key] : [];
  }

  private static generateDynamicInstructions(
    template: Recipe,
    analysis: any,
    preferences?: any
  ): InstructionStep[] {
    let instructions = [...template.instructions];

    // Adapt instructions based on experience level
    const experienceLevel = preferences?.experienceLevel || 'intermediate';

    if (experienceLevel === 'beginner') {
      instructions = this.simplifyInstructionsForBeginner(instructions);
    } else if (experienceLevel === 'expert') {
      instructions = this.enhanceInstructionsForExpert(instructions, analysis);
    }

    // Add protein-specific instructions
    if (analysis.hasProtein && experienceLevel !== 'beginner') {
      instructions.splice(1, 0, {
        step: 2,
        instruction:
          experienceLevel === 'beginner'
            ? 'Let your protein sit at room temperature for 10 minutes before cooking.'
            : 'Season your protein generously and let it come to room temperature for even cooking.',
        duration: 10,
      });
    }

    // Add spice level adjustments
    if (preferences?.spiceLevel === 'mild') {
      instructions = instructions.map(inst => ({
        ...inst,
        instruction: inst.instruction.replace(/generous/gi, 'light').replace(/plenty/gi, 'a pinch'),
      }));
    }

    // Reorder step numbers
    return instructions.map((inst, index) => ({
      ...inst,
      step: index + 1,
    }));
  }

  private static simplifyInstructionsForBeginner(
    instructions: InstructionStep[]
  ): InstructionStep[] {
    return [
      {
        step: 1,
        instruction:
          "Get all your ingredients ready and set them on the counter. This is called 'mise en place' - it makes cooking much easier!",
        duration: 5,
      },
      {
        step: 2,
        instruction:
          'Heat a large pan on medium heat. Add a little oil when the pan feels warm to your hand (hold it 3 inches above).',
        duration: 3,
      },
      {
        step: 3,
        instruction:
          'Add your ingredients starting with the ones that take longest to cook (usually onions, then garlic, then other vegetables).',
        duration: 5,
      },
      {
        step: 4,
        instruction:
          "Cook each ingredient until it looks and smells good. Don't worry about exact timing - use your senses!",
        duration: 10,
      },
      {
        step: 5,
        instruction:
          'Add salt and pepper to taste. Start with a pinch of each, taste, and add more if needed.',
        duration: 2,
      },
      {
        step: 6,
        instruction:
          'Mix everything together gently and cook for a few more minutes until everything is heated through.',
        duration: 3,
      },
      {
        step: 7,
        instruction:
          'Turn off the heat and serve your delicious creation! Great job on your first recipe!',
        duration: 1,
      },
    ];
  }

  private static enhanceInstructionsForExpert(
    instructions: InstructionStep[],
    analysis: any
  ): InstructionStep[] {
    const enhancedInstructions = [...instructions];

    // Add advanced techniques
    if (analysis.hasProtein) {
      enhancedInstructions.splice(2, 0, {
        step: 3,
        instruction:
          'Create a proper sear by ensuring protein is dry, pan is properly heated, and avoid moving the protein until it releases naturally.',
        duration: 4,
      });
    }

    enhancedInstructions.push({
      step: enhancedInstructions.length + 1,
      instruction:
        'Finish with a classic French technique: mount with cold butter off heat for glossy, rich finish.',
      duration: 1,
    });

    return enhancedInstructions;
  }

  private static calculateNutrition(ingredients: RecipeIngredient[]): NutritionInfo {
    // Simplified nutrition calculation
    const baseNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    };

    return ingredients.reduce((nutrition, ingredient) => {
      const amount = ingredient.amount;

      // Estimate nutrition based on ingredient type and amount
      if (
        ingredient.name.toLowerCase().includes('protein') ||
        ['chicken', 'beef', 'fish', 'tofu'].some(p => ingredient.name.toLowerCase().includes(p))
      ) {
        nutrition.calories += amount * 50;
        nutrition.protein += amount * 8;
        nutrition.fat += amount * 3;
      }

      if (['rice', 'pasta', 'bread'].some(c => ingredient.name.toLowerCase().includes(c))) {
        nutrition.calories += amount * 80;
        nutrition.carbs += amount * 15;
        nutrition.fiber += amount * 1;
      }

      return nutrition;
    }, baseNutrition);
  }

  private static generateCookingTips(template: Recipe, analysis: any): string[] {
    const tips: string[] = [];

    if (analysis.hasProtein) {
      tips.push('Let meat rest for 5-10 minutes after cooking for juicier results');
    }

    if (analysis.vegetables.length > 3) {
      tips.push('Cut vegetables uniformly for even cooking');
    }

    if (template.difficulty === 'Hard' || template.difficulty === 'Expert') {
      tips.push('Read through all instructions before starting to cook');
      tips.push('Prep all ingredients before you start cooking (mise en place)');
    }

    if (analysis.flavorProfile.spicy) {
      tips.push('Taste as you go and adjust spice levels to your preference');
    }

    return tips;
  }

  private static generateVariations(template: Recipe, ingredients: Ingredient[]): any[] {
    const variations = [];

    if (template.dietaryInfo.isVegetarian && !template.dietaryInfo.isVegan) {
      variations.push({
        name: 'Vegan Version',
        description: 'Plant-based alternative using your available ingredients',
        modifications: [
          'Replace dairy with plant-based alternatives',
          'Use nutritional yeast for cheesy flavor',
        ],
      });
    }

    if (ingredients.some(ing => ing.category === 'spices')) {
      variations.push({
        name: 'Spiced Up',
        description: 'Enhanced with your available spices',
        modifications: [
          'Add extra spices during cooking',
          'Create a spice blend for deeper flavor',
        ],
      });
    }

    return variations;
  }

  private static generateFallbackTemplate(
    analysis: any,
    cuisine: CuisineType,
    preferences?: any
  ): Recipe {
    const mainIngredient =
      analysis.proteins[0]?.name || analysis.vegetables[0]?.name || 'mixed ingredients';
    const experienceLevel = preferences?.experienceLevel || 'intermediate';

    if (experienceLevel === 'beginner') {
      return this.generateBeginnerFriendlyRecipe(analysis, cuisine, mainIngredient);
    }

    return {
      id: 'fallback-' + Date.now(),
      title: `Creative ${mainIngredient.charAt(0).toUpperCase() + mainIngredient.slice(1)} ${cuisine === 'any' ? 'Fusion' : cuisine.charAt(0).toUpperCase() + cuisine.slice(1)} Bowl`,
      description: `A personalized dish crafted from your unique ingredient combination`,
      cuisine,
      servings: 4,
      prepTime: 15,
      cookTime: 25,
      totalTime: 40,
      difficulty: analysis.complexity,
      ingredients: analysis.proteins
        .concat(analysis.vegetables, analysis.grains)
        .slice(0, 8)
        .map((ing: any, index: number) => ({
          name: ing.name,
          amount: 1,
          unit: 'portion',
          optional: index > 4,
        })) as RecipeIngredient[],
      instructions: [
        {
          step: 1,
          instruction: 'Prepare all ingredients by washing, chopping, and measuring as needed.',
          duration: 10,
        },
        {
          step: 2,
          instruction: 'Heat oil in a large pan or wok over medium-high heat.',
          duration: 2,
        },
        {
          step: 3,
          instruction: 'Add aromatics (onions, garlic) first and cook until fragrant.',
          duration: 3,
        },
        {
          step: 4,
          instruction: 'Add main ingredients in order of cooking time required.',
          duration: 8,
        },
        { step: 5, instruction: 'Season with available spices and herbs to taste.', duration: 2 },
        {
          step: 6,
          instruction: 'Combine all ingredients and cook until heated through and flavors meld.',
          duration: 5,
        },
        {
          step: 7,
          instruction: 'Taste and adjust seasoning as needed before serving.',
          duration: 1,
        },
        {
          step: 8,
          instruction: 'Serve hot and enjoy your creative culinary masterpiece!',
          duration: 0,
        },
      ],
      tags: ['creative', 'pantry-friendly', 'customizable', 'quick'],
      dietaryInfo: {
        isVegetarian: analysis.isVegetarian,
        isVegan: analysis.isVegan,
        isGlutenFree: !analysis.grains.some((g: Ingredient) =>
          g.name.toLowerCase().includes('wheat')
        ),
        isDairyFree: analysis.dairy.length === 0,
        isKeto: analysis.grains.length === 0 && analysis.proteins.length > 0,
        isPaleo: analysis.grains.length === 0 && analysis.dairy.length === 0,
        allergens: [],
      },
      tips: [],
      variations: [],
    };
  }

  private static generateBeginnerFriendlyRecipe(
    analysis: any,
    cuisine: CuisineType,
    mainIngredient: string
  ): Recipe {
    return {
      id: 'beginner-' + Date.now(),
      title: `Simple ${mainIngredient} One-Pan Meal`,
      description: `An easy, foolproof recipe perfect for beginners - just one pan and simple steps!`,
      cuisine: cuisine === 'any' ? 'fusion' : cuisine,
      servings: 4,
      prepTime: 10,
      cookTime: 20,
      totalTime: 30,
      difficulty: 'Beginner',
      ingredients: analysis.proteins
        .concat(analysis.vegetables, analysis.grains)
        .slice(0, 6)
        .map((ing: any, index: number) => ({
          name: ing.name,
          amount: index === 0 ? 2 : 1,
          unit: index === 0 ? 'cups' : 'handful',
          optional: false,
        })) as RecipeIngredient[],
      instructions: [
        {
          step: 1,
          instruction:
            "Don't worry - this is going to be great! First, wash your hands and gather all ingredients on your counter.",
          duration: 3,
        },
        {
          step: 2,
          instruction:
            "Cut your ingredients into bite-sized pieces. Take your time - there's no rush!",
          duration: 8,
        },
        {
          step: 3,
          instruction:
            'Heat a large pan on medium heat (about halfway on your stove dial). Add a splash of oil.',
          duration: 2,
        },
        {
          step: 4,
          instruction:
            "Add your ingredients to the pan. Listen for a gentle sizzling sound - that's perfect!",
          duration: 1,
        },
        {
          step: 5,
          instruction:
            'Stir everything around every few minutes. Cook until everything looks done and smells amazing!',
          duration: 15,
        },
        {
          step: 6,
          instruction:
            "Taste a small piece (blow on it first - it's hot!). Add a pinch of salt if it needs it.",
          duration: 1,
        },
        {
          step: 7,
          instruction: 'Turn off the heat and serve. You did it! This is your first homemade meal!',
          duration: 1,
        },
      ],
      tags: ['beginner-friendly', 'one-pan', 'foolproof', 'confidence-building'],
      dietaryInfo: {
        isVegetarian: analysis.isVegetarian,
        isVegan: analysis.isVegan,
        isGlutenFree: true,
        isDairyFree: analysis.dairy.length === 0,
        isKeto: false,
        isPaleo: false,
        allergens: [],
      },
      tips: [
        "Don't worry about making it perfect - cooking is about experimenting and having fun!",
        "If something doesn't look right, just keep cooking a little longer. Most things get better with more time.",
        'Save this recipe! Once you master this, you can try adding different ingredients next time.',
        "The most important ingredient is confidence - you've got this!",
      ],
      variations: [
        {
          name: 'Next Level',
          description: "Once you're comfortable with this recipe, try these simple additions",
          modifications: [
            'Add a splash of soy sauce for Asian flavors',
            'Try different vegetables from your fridge',
            'Add some cheese at the end for extra richness',
          ],
        },
      ],
    };
  }

  private static getRecipeTemplates(): Recipe[] {
    return [
      // Italian
      {
        id: 'advanced-pasta',
        title: 'Gourmet Pasta Primavera',
        description: 'Restaurant-quality pasta with seasonal vegetables and herbs',
        cuisine: 'italian',
        servings: 4,
        prepTime: 20,
        cookTime: 25,
        totalTime: 45,
        difficulty: 'Medium',
        ingredients: [
          { name: 'pasta', amount: 400, unit: 'g' },
          { name: 'olive oil', amount: 3, unit: 'tbsp' },
          { name: 'garlic', amount: 4, unit: 'cloves' },
          { name: 'vegetables', amount: 3, unit: 'cups' },
          { name: 'cheese', amount: 100, unit: 'g' },
          { name: 'herbs', amount: 2, unit: 'tbsp' },
        ],
        instructions: [
          { step: 1, instruction: 'Bring a large pot of salted water to boil for pasta', duration: 5 },
          { step: 2, instruction: 'Prepare vegetables by cutting into uniform pieces', duration: 10 },
          { step: 3, instruction: 'Cook pasta according to package directions until al dente', duration: 12 },
          { step: 4, instruction: 'Heat olive oil in large skillet and sauté garlic until fragrant', duration: 2 },
          { step: 5, instruction: 'Add vegetables and cook until crisp-tender', duration: 8 },
          { step: 6, instruction: 'Toss pasta with vegetables, herbs, and cheese', duration: 3 },
          { step: 7, instruction: 'Season with salt, pepper and serve immediately', duration: 1 },
        ],
        tags: ['quick', 'vegetarian', 'fresh', 'aromatic'],
        dietaryInfo: {
          isVegetarian: true, isVegan: false, isGlutenFree: false, isDairyFree: false,
          isKeto: false, isPaleo: false, allergens: ['gluten', 'dairy'],
        },
        tips: [], variations: [],
      },
      // Asian
      {
        id: 'advanced-stirfry',
        title: 'Master Chef Stir-Fry',
        description: 'Professional technique stir-fry with perfect wok hei',
        cuisine: 'asian',
        servings: 4,
        prepTime: 15,
        cookTime: 12,
        totalTime: 27,
        difficulty: 'Medium',
        ingredients: [
          { name: 'protein', amount: 300, unit: 'g' },
          { name: 'vegetables', amount: 4, unit: 'cups' },
          { name: 'garlic', amount: 3, unit: 'cloves' },
          { name: 'ginger', amount: 1, unit: 'tbsp' },
          { name: 'soy sauce', amount: 3, unit: 'tbsp' },
          { name: 'oil', amount: 2, unit: 'tbsp' },
        ],
        instructions: [
          { step: 1, instruction: 'Cut all ingredients into uniform sizes for even cooking', duration: 10 },
          { step: 2, instruction: 'Heat wok or large skillet over high heat until smoking', duration: 2 },
          { step: 3, instruction: 'Add oil and immediately add protein, stir-fry until nearly cooked', duration: 4 },
          { step: 4, instruction: 'Push protein to one side, add aromatics to empty space', duration: 1 },
          { step: 5, instruction: 'Add vegetables in order of cooking time needed', duration: 3 },
          { step: 6, instruction: 'Add sauce and toss everything together rapidly', duration: 2 },
          { step: 7, instruction: 'Remove from heat immediately and serve over rice', duration: 0 },
        ],
        tags: ['quick', 'healthy', 'spicy', 'aromatic'],
        dietaryInfo: {
          isVegetarian: false, isVegan: false, isGlutenFree: false, isDairyFree: true,
          isKeto: true, isPaleo: true, allergens: ['soy'],
        },
        tips: [], variations: [],
      },
      // Mexican
      {
        id: 'mexican-bowl',
        title: 'Authentic Mexican Bowl',
        description: 'Vibrant bowl with traditional Mexican flavors and spices',
        cuisine: 'mexican',
        servings: 4,
        prepTime: 15,
        cookTime: 20,
        totalTime: 35,
        difficulty: 'Easy',
        ingredients: [
          { name: 'protein', amount: 300, unit: 'g' },
          { name: 'rice', amount: 200, unit: 'g' },
          { name: 'beans', amount: 200, unit: 'g' },
          { name: 'vegetables', amount: 2, unit: 'cups' },
          { name: 'lime', amount: 2, unit: 'pieces' },
          { name: 'cilantro', amount: 1, unit: 'bunch' },
        ],
        instructions: [
          { step: 1, instruction: 'Season protein with cumin, paprika, and chili powder', duration: 5 },
          { step: 2, instruction: 'Cook rice with a bay leaf and salt until tender', duration: 18 },
          { step: 3, instruction: 'Heat skillet and cook protein until golden and cooked through', duration: 8 },
          { step: 4, instruction: 'Warm beans with garlic and a splash of lime juice', duration: 5 },
          { step: 5, instruction: 'Quickly sauté vegetables until crisp-tender', duration: 6 },
          { step: 6, instruction: 'Assemble bowl with rice, beans, protein, and vegetables', duration: 2 },
          { step: 7, instruction: 'Top with fresh cilantro, lime wedges, and serve', duration: 1 },
        ],
        tags: ['healthy', 'spicy', 'colorful', 'protein-rich'],
        dietaryInfo: {
          isVegetarian: false, isVegan: false, isGlutenFree: true, isDairyFree: true,
          isKeto: false, isPaleo: false, allergens: [],
        },
        tips: [], variations: [],
      },
      // Indian
      {
        id: 'indian-curry',
        title: 'Aromatic Indian Curry',
        description: 'Fragrant curry with traditional spices and rich flavors',
        cuisine: 'indian',
        servings: 4,
        prepTime: 15,
        cookTime: 30,
        totalTime: 45,
        difficulty: 'Medium',
        ingredients: [
          { name: 'protein', amount: 400, unit: 'g' },
          { name: 'onions', amount: 2, unit: 'large' },
          { name: 'garlic', amount: 4, unit: 'cloves' },
          { name: 'ginger', amount: 2, unit: 'tbsp' },
          { name: 'tomatoes', amount: 400, unit: 'g' },
          { name: 'spices', amount: 2, unit: 'tbsp' },
        ],
        instructions: [
          { step: 1, instruction: 'Heat oil and fry whole spices until aromatic', duration: 2 },
          { step: 2, instruction: 'Add sliced onions and cook until golden brown', duration: 8 },
          { step: 3, instruction: 'Add ginger-garlic paste and cook until fragrant', duration: 2 },
          { step: 4, instruction: 'Add ground spices and cook for 30 seconds', duration: 1 },
          { step: 5, instruction: 'Add tomatoes and cook until oil separates', duration: 10 },
          { step: 6, instruction: 'Add protein and simmer until cooked through', duration: 15 },
          { step: 7, instruction: 'Garnish with fresh herbs and serve with rice', duration: 2 },
        ],
        tags: ['aromatic', 'spicy', 'rich', 'traditional'],
        dietaryInfo: {
          isVegetarian: false, isVegan: false, isGlutenFree: true, isDairyFree: true,
          isKeto: false, isPaleo: true, allergens: [],
        },
        tips: [], variations: [],
      },
      // American
      {
        id: 'american-skillet',
        title: 'Hearty American Skillet',
        description: 'Comfort food skillet with classic American flavors',
        cuisine: 'american',
        servings: 4,
        prepTime: 10,
        cookTime: 25,
        totalTime: 35,
        difficulty: 'Easy',
        ingredients: [
          { name: 'protein', amount: 400, unit: 'g' },
          { name: 'potatoes', amount: 3, unit: 'medium' },
          { name: 'vegetables', amount: 2, unit: 'cups' },
          { name: 'cheese', amount: 150, unit: 'g' },
          { name: 'herbs', amount: 1, unit: 'tbsp' },
          { name: 'butter', amount: 2, unit: 'tbsp' },
        ],
        instructions: [
          { step: 1, instruction: 'Dice potatoes and parboil for 8 minutes', duration: 10 },
          { step: 2, instruction: 'Heat large skillet with butter over medium heat', duration: 2 },
          { step: 3, instruction: 'Add potatoes and cook until golden and crispy', duration: 8 },
          { step: 4, instruction: 'Push potatoes aside and add protein to skillet', duration: 1 },
          { step: 5, instruction: 'Cook protein until browned and cooked through', duration: 10 },
          { step: 6, instruction: 'Add vegetables and herbs, cook until tender', duration: 6 },
          { step: 7, instruction: 'Top with cheese and let melt before serving', duration: 2 },
        ],
        tags: ['hearty', 'comfort', 'cheesy', 'satisfying'],
        dietaryInfo: {
          isVegetarian: false, isVegan: false, isGlutenFree: true, isDairyFree: false,
          isKeto: false, isPaleo: false, allergens: ['dairy'],
        },
        tips: [], variations: [],
      },
      // Mediterranean
      {
        id: 'mediterranean-bowl',
        title: 'Fresh Mediterranean Bowl',
        description: 'Light and healthy Mediterranean-style bowl with olive oil and herbs',
        cuisine: 'mediterranean',
        servings: 4,
        prepTime: 15,
        cookTime: 15,
        totalTime: 30,
        difficulty: 'Easy',
        ingredients: [
          { name: 'protein', amount: 300, unit: 'g' },
          { name: 'vegetables', amount: 3, unit: 'cups' },
          { name: 'olive oil', amount: 4, unit: 'tbsp' },
          { name: 'lemon', amount: 2, unit: 'pieces' },
          { name: 'herbs', amount: 2, unit: 'tbsp' },
          { name: 'olives', amount: 100, unit: 'g' },
        ],
        instructions: [
          { step: 1, instruction: 'Marinate protein with olive oil, lemon, and herbs', duration: 10 },
          { step: 2, instruction: 'Heat skillet and cook protein until golden', duration: 8 },
          { step: 3, instruction: 'Quickly sauté vegetables with garlic', duration: 5 },
          { step: 4, instruction: 'Arrange protein and vegetables in serving bowl', duration: 2 },
          { step: 5, instruction: 'Drizzle with extra olive oil and lemon juice', duration: 1 },
          { step: 6, instruction: 'Top with fresh herbs and olives', duration: 1 },
          { step: 7, instruction: 'Serve warm with crusty bread if desired', duration: 1 },
        ],
        tags: ['healthy', 'fresh', 'light', 'aromatic'],
        dietaryInfo: {
          isVegetarian: false, isVegan: false, isGlutenFree: true, isDairyFree: true,
          isKeto: true, isPaleo: true, allergens: [],
        },
        tips: [], variations: [],
      },
    ];
  }
}
