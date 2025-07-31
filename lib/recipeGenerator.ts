import { Recipe, Ingredient } from '../types';

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

  private static scaleAmount(amount: string, scale: number): string {
    const match = amount.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (match) {
      const [, num, unit] = match;
      const scaledNum = (parseFloat(num) * scale).toFixed(1).replace('.0', '');
      return `${scaledNum} ${unit}`;
    }
    return amount;
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
      cuisine: cuisine === 'any' ? 'fusion' : cuisine,
      servings,
      prepTime: 15,
      cookTime: 25,
      difficulty: 'Medium',
      ingredients: ingredients.slice(0, 8).map(ing => ({
        name: ing.name,
        amount: '1',
        unit: 'portion',
      })),
      instructions: [
        'Prepare all ingredients by washing, chopping, or measuring as needed.',
        'Heat oil in a large pan or wok over medium-high heat.',
        'Add aromatics (onions, garlic) first and cook until fragrant.',
        'Add main ingredients and cook according to their requirements.',
        'Season with salt, pepper, and any available spices.',
        'Combine all ingredients and cook until everything is heated through.',
        'Taste and adjust seasoning as needed.',
        'Serve hot and enjoy your creative dish!',
      ],
      tags: ['creative', 'pantry-friendly', 'customizable'],
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
        difficulty: 'Easy',
        ingredients: [
          { name: 'pasta', amount: '400', unit: 'g' },
          { name: 'olive oil', amount: '3', unit: 'tbsp' },
          { name: 'garlic', amount: '3', unit: 'cloves' },
          { name: 'tomato', amount: '2', unit: 'large' },
          { name: 'cheese', amount: '100', unit: 'g' },
        ],
        instructions: [
          'Boil pasta according to package directions',
          'Heat olive oil and sauté garlic',
          'Add tomatoes and cook until soft',
          'Combine with pasta and top with cheese',
        ],
        tags: ['quick', 'vegetarian'],
      },
      {
        id: 'asian-stirfry',
        title: 'Quick Vegetable Stir-Fry',
        description: 'Colorful vegetables in savory sauce',
        cuisine: 'asian',
        servings: 4,
        prepTime: 10,
        cookTime: 15,
        difficulty: 'Easy',
        ingredients: [
          { name: 'rice', amount: '2', unit: 'cups' },
          { name: 'soy sauce', amount: '3', unit: 'tbsp' },
          { name: 'garlic', amount: '2', unit: 'cloves' },
          { name: 'onion', amount: '1', unit: 'medium' },
          { name: 'vegetables', amount: '3', unit: 'cups' },
        ],
        instructions: [
          'Cook rice according to package directions',
          'Heat oil in wok over high heat',
          'Stir-fry vegetables until crisp-tender',
          'Add sauce and serve over rice',
        ],
        tags: ['healthy', 'quick'],
      },
      {
        id: 'mexican-bowl',
        title: 'Loaded Burrito Bowl',
        description: 'Customizable Mexican-inspired bowl',
        cuisine: 'mexican',
        servings: 4,
        prepTime: 20,
        cookTime: 25,
        difficulty: 'Medium',
        ingredients: [
          { name: 'rice', amount: '2', unit: 'cups' },
          { name: 'beans', amount: '1', unit: 'can' },
          { name: 'chicken', amount: '500', unit: 'g' },
          { name: 'onion', amount: '1', unit: 'medium' },
          { name: 'cheese', amount: '150', unit: 'g' },
        ],
        instructions: [
          'Cook rice and warm beans',
          'Season and cook chicken until done',
          'Sauté onions until caramelized',
          'Assemble bowls with all ingredients',
        ],
        tags: ['protein-rich', 'filling'],
      },
    ];
  }
}
