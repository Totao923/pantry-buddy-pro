import { MealPlan, PlannedMeal } from '../../types';

export class MealPlanService {
  private static baseUrl = '/api/meal-plans';

  // Get all meal plans for a user
  static async getMealPlans(userId: string): Promise<MealPlan[]> {
    try {
      const response = await fetch(`${this.baseUrl}?user_id=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch meal plans');
      }

      const data = await response.json();
      return data.mealPlans || [];
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      throw error;
    }
  }

  // Get a specific meal plan by ID
  static async getMealPlan(id: string): Promise<MealPlan> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch meal plan');
      }

      const data = await response.json();
      return data.mealPlan;
    } catch (error) {
      console.error('Error fetching meal plan:', error);
      throw error;
    }
  }

  // Create a new meal plan
  static async createMealPlan(
    mealPlan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MealPlan> {
    try {
      console.log('🔗 MealPlanService: Sending CREATE request to API:', {
        url: this.baseUrl,
        method: 'POST',
        bodyPreview: {
          name: mealPlan.name,
          userId: mealPlan.userId,
          mealsCount: mealPlan.meals.length,
          startDate: mealPlan.startDate,
          endDate: mealPlan.endDate,
          startDateType: typeof mealPlan.startDate,
          endDateType: typeof mealPlan.endDate,
        },
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mealPlan),
      });

      console.log('📡 MealPlanService: API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ MealPlanService: API error response:', errorData);
        throw new Error(
          `Failed to create meal plan: ${response.status} ${response.statusText} - ${errorData?.error || 'Unknown error'}`
        );
      }

      const data = await response.json();
      console.log('✅ MealPlanService: Meal plan created successfully');
      return data.mealPlan;
    } catch (error) {
      console.error('❌ MealPlanService: Error creating meal plan:', error);
      throw error;
    }
  }

  // Update an existing meal plan
  static async updateMealPlan(id: string, updates: Partial<MealPlan>): Promise<MealPlan> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update meal plan');
      }

      const data = await response.json();
      return data.mealPlan;
    } catch (error) {
      console.error('Error updating meal plan:', error);
      throw error;
    }
  }

  // Delete a meal plan
  static async deleteMealPlan(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meal plan');
      }
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      throw error;
    }
  }

  // Add a meal to a meal plan
  static async addMealToPlan(
    mealPlanId: string,
    meal: Omit<PlannedMeal, 'id'>
  ): Promise<PlannedMeal> {
    try {
      console.log('🍽️ MealPlanService: Adding meal to plan:', {
        mealPlanId,
        meal: {
          recipeId: meal.recipeId,
          date: meal.date,
          mealType: meal.mealType,
          servings: meal.servings,
          prepStatus: meal.prepStatus,
          recipeIdType: typeof meal.recipeId,
          dateType: typeof meal.date,
        },
      });

      const response = await fetch(`${this.baseUrl}/${mealPlanId}/meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meal),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ MealPlanService: API error response:', errorData);
        throw new Error(`Failed to add meal to plan: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ MealPlanService: API success response:', data);
      console.log('🍽️ MealPlanService: Returning meal data:', data.meal);
      return data.meal;
    } catch (error) {
      console.error('Error adding meal to plan:', error);
      throw error;
    }
  }

  // Update a meal in a meal plan
  static async updateMeal(
    mealPlanId: string,
    mealId: string,
    updates: Partial<PlannedMeal>
  ): Promise<PlannedMeal> {
    try {
      const response = await fetch(`${this.baseUrl}/${mealPlanId}/meals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mealId, updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update meal');
      }

      const data = await response.json();
      return data.meal;
    } catch (error) {
      console.error('Error updating meal:', error);
      throw error;
    }
  }

  // Remove a meal from a meal plan
  static async removeMealFromPlan(mealPlanId: string, mealId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${mealPlanId}/meals`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mealId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove meal from plan');
      }
    } catch (error) {
      console.error('Error removing meal from plan:', error);
      throw error;
    }
  }

  // Generate a shopping list from a meal plan
  static async generateShoppingList(mealPlanId: string): Promise<any> {
    try {
      const mealPlan = await this.getMealPlan(mealPlanId);

      // Collect all ingredients from planned meals
      const allIngredients: {
        [key: string]: {
          name: string;
          quantity: number;
          unit: string;
          category: string;
        };
      } = {};

      mealPlan.meals.forEach(meal => {
        if (meal.ingredients) {
          meal.ingredients.forEach(ingredient => {
            const key = ingredient.name.toLowerCase();
            const servingMultiplier = meal.servings / 2; // Assuming recipes are for 2 servings by default

            if (allIngredients[key]) {
              allIngredients[key].quantity += ingredient.amount * servingMultiplier;
            } else {
              allIngredients[key] = {
                name: ingredient.name,
                quantity: ingredient.amount * servingMultiplier,
                unit: ingredient.unit,
                category: 'other', // Default category since RecipeIngredient doesn't have category
              };
            }
          });
        }
      });

      return Object.values(allIngredients);
    } catch (error) {
      console.error('Error generating shopping list:', error);
      throw error;
    }
  }

  // Calculate nutrition summary for a meal plan
  static calculateNutritionSummary(
    mealPlan: MealPlan,
    recipes: any[]
  ): {
    totalCalories: number;
    averageCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    dailyBreakdown: any[];
  } {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Group meals by date
    const mealsByDate: { [date: string]: PlannedMeal[] } = {};

    mealPlan.meals.forEach(meal => {
      const dateKey = meal.date.toDateString();
      if (!mealsByDate[dateKey]) {
        mealsByDate[dateKey] = [];
      }
      mealsByDate[dateKey].push(meal);
    });

    const dailyBreakdown = Object.entries(mealsByDate).map(([date, meals]) => {
      let dayCalories = 0;
      let dayProtein = 0;
      let dayCarbs = 0;
      let dayFat = 0;

      meals.forEach(meal => {
        const recipe = recipes.find(r => r.id === meal.recipeId);
        if (recipe?.nutritionInfo) {
          const servingMultiplier = meal.servings / recipe.servings;
          const nutrition = recipe.nutritionInfo;

          dayCalories += nutrition.calories * servingMultiplier;
          dayProtein += nutrition.protein * servingMultiplier;
          dayCarbs += nutrition.carbs * servingMultiplier;
          dayFat += nutrition.fat * servingMultiplier;
        }
      });

      totalCalories += dayCalories;
      totalProtein += dayProtein;
      totalCarbs += dayCarbs;
      totalFat += dayFat;

      return {
        date,
        calories: Math.round(dayCalories),
        protein: Math.round(dayProtein),
        carbs: Math.round(dayCarbs),
        fat: Math.round(dayFat),
        mealCount: meals.length,
      };
    });

    const dayCount = dailyBreakdown.length || 1;

    return {
      totalCalories: Math.round(totalCalories),
      averageCalories: Math.round(totalCalories / dayCount),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      dailyBreakdown,
    };
  }
}
