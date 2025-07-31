import { Recipe, Ingredient, CuisineType } from '../types';

export class RecipeGenerator {
  static generateRecipe(ingredients: Ingredient[], cuisine: string, servings: number = 4): Recipe {
    const recipes = this.getRecipeTemplates();
    const filteredRecipes = recipes.filter(
      recipe => cuisine === 'any' || recipe.cuisine === cuisine
    );

    const availableRecipes = filteredRecipes.filter(recipe =>
      this.canMakeRecipe(recipe, ingredients)
    );

    if (availableRecipes.length === 0) {
      return this.generateFallbackRecipe(ingredients, cuisine, servings);
    }

    const selectedRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
    return this.scaleRecipe(selectedRecipe, servings);
  }

  private static canMakeRecipe(recipe: Recipe, availableIngredients: Ingredient[]): boolean {
    const essentialIngredients = recipe.ingredients.slice(0, 3);
    return essentialIngredients.some(recipeIng =>
      availableIngredients.some(
        available =>
          available.name.toLowerCase().includes(recipeIng.name.toLowerCase()) ||
          recipeIng.name.toLowerCase().includes(available.name.toLowerCase())
      )
    );
  }

  private static scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
    const scale = targetServings / recipe.servings;

    return {
      ...recipe,
      id: Date.now().toString(),
      servings: targetServings,
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        amount: this.scaleAmount(ing.amount, scale),
      })),
    };
  }

  private static scaleAmount(amount: number, scale: number): number {
    return Math.round(amount * scale * 100) / 100;
  }

  private static generateFallbackRecipe(
    ingredients: Ingredient[],
    cuisine: string,
    servings: number
  ): Recipe {
    const mainIngredient = ingredients[0]?.name || 'Mixed ingredients';

    return {
      id: Date.now().toString(),
      title: `Creative ${mainIngredient} ${cuisine === 'any' ? 'Fusion' : cuisine.charAt(0).toUpperCase() + cuisine.slice(1)} Bowl`,
      description: `A delicious and creative dish made with your available ingredients.`,
      cuisine: cuisine === 'any' ? 'fusion' : (cuisine as CuisineType),
      servings,
      prepTime: 15,
      cookTime: 25,
      totalTime: 40,
      difficulty: 'Medium',
      ingredients: ingredients.slice(0, 8).map(ing => ({
        name: ing.name,
        amount: 1,
        unit: 'portion',
      })),
      instructions: [
        {
          step: 1,
          instruction: 'Prepare all ingredients by washing, chopping, or measuring as needed.',
        },
        { step: 2, instruction: 'Heat oil in a large pan or wok over medium-high heat.' },
        { step: 3, instruction: 'Add aromatics (onions, garlic) first and cook until fragrant.' },
        { step: 4, instruction: 'Add main ingredients and cook according to their requirements.' },
        { step: 5, instruction: 'Season with salt, pepper, and any available spices.' },
        {
          step: 6,
          instruction: 'Combine all ingredients and cook until everything is heated through.',
        },
        { step: 7, instruction: 'Taste and adjust seasoning as needed.' },
        { step: 8, instruction: 'Serve hot and enjoy your creative dish!' },
      ],
      tags: ['creative', 'pantry-friendly', 'customizable'],
      dietaryInfo: {
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isKeto: false,
        isPaleo: false,
        allergens: [],
      },
    };
  }

  private static getRecipeTemplates(): Recipe[] {
    return [
      {
        id: 'italian-pasta',
        title: 'Classic Pasta Primavera',
        description: 'Fresh pasta with seasonal vegetables',
        cuisine: 'italian',
        servings: 4,
        prepTime: 15,
        cookTime: 20,
        totalTime: 35,
        difficulty: 'Easy',
        ingredients: [
          { name: 'pasta', amount: 400, unit: 'g' },
          { name: 'olive oil', amount: 3, unit: 'tbsp' },
          { name: 'garlic', amount: 3, unit: 'cloves' },
          { name: 'tomato', amount: 2, unit: 'large' },
          { name: 'cheese', amount: 100, unit: 'g' },
        ],
        instructions: [
          { step: 1, instruction: 'Boil pasta according to package directions' },
          { step: 2, instruction: 'Heat olive oil and sauté garlic' },
          { step: 3, instruction: 'Add tomatoes and cook until soft' },
          { step: 4, instruction: 'Combine with pasta and top with cheese' },
        ],
        tags: ['quick', 'vegetarian'],
        dietaryInfo: {
          isVegetarian: true,
          isVegan: false,
          isGlutenFree: false,
          isDairyFree: false,
          isKeto: false,
          isPaleo: false,
          allergens: ['gluten', 'dairy'],
        },
      },
      {
        id: 'asian-stirfry',
        title: 'Quick Vegetable Stir-Fry',
        description: 'Colorful vegetables in savory sauce',
        cuisine: 'asian',
        servings: 4,
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        difficulty: 'Easy',
        ingredients: [
          { name: 'rice', amount: 2, unit: 'cups' },
          { name: 'soy sauce', amount: 3, unit: 'tbsp' },
          { name: 'garlic', amount: 2, unit: 'cloves' },
          { name: 'onion', amount: 1, unit: 'medium' },
          { name: 'vegetables', amount: 3, unit: 'cups' },
        ],
        instructions: [
          { step: 1, instruction: 'Cook rice according to package directions' },
          { step: 2, instruction: 'Heat oil in wok over high heat' },
          { step: 3, instruction: 'Stir-fry vegetables until crisp-tender' },
          { step: 4, instruction: 'Add sauce and serve over rice' },
        ],
        tags: ['healthy', 'quick'],
        dietaryInfo: {
          isVegetarian: true,
          isVegan: true,
          isGlutenFree: true,
          isDairyFree: true,
          isKeto: false,
          isPaleo: false,
          allergens: ['soy'],
        },
      },
      {
        id: 'mexican-bowl',
        title: 'Loaded Burrito Bowl',
        description: 'Customizable Mexican-inspired bowl',
        cuisine: 'mexican',
        servings: 4,
        prepTime: 20,
        cookTime: 25,
        totalTime: 45,
        difficulty: 'Medium',
        ingredients: [
          { name: 'rice', amount: 2, unit: 'cups' },
          { name: 'beans', amount: 1, unit: 'can' },
          { name: 'chicken', amount: 500, unit: 'g' },
          { name: 'onion', amount: 1, unit: 'medium' },
          { name: 'cheese', amount: 150, unit: 'g' },
        ],
        instructions: [
          { step: 1, instruction: 'Cook rice and warm beans' },
          { step: 2, instruction: 'Season and cook chicken until done' },
          { step: 3, instruction: 'Sauté onions until caramelized' },
          { step: 4, instruction: 'Assemble bowls with all ingredients' },
        ],
        tags: ['protein-rich', 'filling'],
        dietaryInfo: {
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: true,
          isDairyFree: false,
          isKeto: false,
          isPaleo: false,
          allergens: ['dairy'],
        },
      },
    ];
  }
}
