import { v4 as uuidv4 } from 'uuid';
import { IngredientCategory } from '../../types';
import { createSupabaseClient, handleSupabaseError, withRetry } from '../supabase/client';

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  estimatedPrice?: number;
  purchased: boolean;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
  addedDate: Date;
}

export interface ShoppingList {
  id: string;
  name: string;
  userId: string;
  items: ShoppingListItem[];
  createdDate: Date;
  lastModified: Date;
  isActive: boolean;
  totalEstimatedCost: number;
  completedItems: number;
}

export class ShoppingListService {
  private static supabase: SupabaseClient = createSupabaseClient();

  private static async ensureAuthenticated(): Promise<string> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      throw new Error(`User not authenticated: ${error?.message || 'No user found'}`);
    }

    return user.id;
  }

  static async isAuthenticated(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  private static async getShoppingListsFromSupabase(): Promise<ShoppingList[]> {
    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase
          .from('shopping_lists')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      });

      if (error) {
        throw error;
      }

      return (data || []).map((list: any) => ({
        id: list.id,
        name: list.name,
        userId: list.user_id,
        items: list.items || [],
        createdDate: new Date(list.created_at),
        lastModified: new Date(list.updated_at),
        isActive: false, // We'll set active list separately
        totalEstimatedCost: parseFloat(list.total_estimated_cost) || 0,
        completedItems: (list.items || []).filter((item: any) => item.purchased).length,
      }));
    } catch (error) {
      console.error('Error loading shopping lists from Supabase:', error);
      throw error;
    }
  }

  private static async saveShoppingListToSupabase(list: ShoppingList): Promise<void> {
    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase.from('shopping_lists').upsert({
          id: list.id,
          user_id: userId,
          name: list.name,
          items: list.items,
          total_estimated_cost: list.totalEstimatedCost,
          is_shared: false,
          completed_at: list.items.every(item => item.purchased) ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        });
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving shopping list to Supabase:', error);
      throw error;
    }
  }

  private static getShoppingLists(): ShoppingList[] {
    try {
      const savedLists = localStorage.getItem('shoppingLists');
      if (savedLists) {
        const parsedData = JSON.parse(savedLists);
        if (Array.isArray(parsedData)) {
          return parsedData.map((list: any) => ({
            ...list,
            createdDate: new Date(list.createdDate),
            lastModified: new Date(list.lastModified),
            items: list.items.map((item: any) => ({
              ...item,
              addedDate: new Date(item.addedDate),
            })),
          }));
        }
      }
      return [];
    } catch (error) {
      console.error('Error loading shopping lists:', error);
      return [];
    }
  }

  private static saveShoppingLists(lists: ShoppingList[]): void {
    localStorage.setItem('shoppingLists', JSON.stringify(lists));
  }

  static async getAllShoppingLists(): Promise<ShoppingList[]> {
    try {
      const isAuthenticated = await this.isAuthenticated();
      if (isAuthenticated) {
        return await this.getShoppingListsFromSupabase();
      } else {
        // Fallback to localStorage for unauthenticated users
        return this.getShoppingLists();
      }
    } catch (error) {
      console.error(
        'Error getting shopping lists from Supabase, falling back to localStorage:',
        error
      );
      return this.getShoppingLists();
    }
  }

  static async getActiveShoppingList(): Promise<ShoppingList | null> {
    try {
      const lists = await this.getAllShoppingLists();
      return lists.find(list => list.isActive) || lists[0] || null;
    } catch (error) {
      console.error('Error getting active shopping list:', error);
      const lists = this.getShoppingLists();
      return lists.find(list => list.isActive) || lists[0] || null;
    }
  }

  static async createShoppingList(name: string, userId: string): Promise<ShoppingList> {
    const newList: ShoppingList = {
      id: uuidv4(),
      name: name.trim().slice(0, 50),
      userId,
      items: [],
      createdDate: new Date(),
      lastModified: new Date(),
      isActive: false,
      totalEstimatedCost: 0,
      completedItems: 0,
    };

    try {
      const isAuthenticated = await this.isAuthenticated();
      if (isAuthenticated) {
        const existingLists = await this.getShoppingListsFromSupabase();
        newList.isActive = existingLists.length === 0; // First list becomes active
        await this.saveShoppingListToSupabase(newList);
        return newList;
      } else {
        // Fallback to localStorage for unauthenticated users
        const lists = this.getShoppingLists();
        newList.isActive = lists.length === 0; // First list becomes active
        const updatedLists = [...lists, newList];
        this.saveShoppingLists(updatedLists);
        return newList;
      }
    } catch (error) {
      console.error(
        'Error creating shopping list in Supabase, falling back to localStorage:',
        error
      );
      const lists = this.getShoppingLists();
      newList.isActive = lists.length === 0; // First list becomes active
      const updatedLists = [...lists, newList];
      this.saveShoppingLists(updatedLists);
      return newList;
    }
  }

  static async addItemToList(
    listId: string,
    item: Omit<ShoppingListItem, 'id' | 'addedDate' | 'purchased'>
  ): Promise<ShoppingListItem> {
    try {
      const isAuthenticated = await this.isAuthenticated();
      if (isAuthenticated) {
        // Use Supabase for authenticated users
        const lists = await this.getShoppingListsFromSupabase();
        const targetList = lists.find(list => list.id === listId);

        if (!targetList) {
          throw new Error('Shopping list not found');
        }

        // Check if item already exists
        const existingItem = targetList.items.find(
          existing => existing.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existingItem) {
          // Update quantity if item exists
          existingItem.quantity += item.quantity;
          existingItem.priority = item.priority;
          existingItem.estimatedPrice = item.estimatedPrice;
          existingItem.notes = item.notes;

          const updatedList = {
            ...targetList,
            lastModified: new Date(),
            totalEstimatedCost: targetList.items.reduce(
              (sum, listItem) => sum + (listItem.estimatedPrice || 0),
              0
            ),
          };

          await this.saveShoppingListToSupabase(updatedList);
          return existingItem;
        } else {
          // Add new item
          const newItem: ShoppingListItem = {
            ...item,
            id: uuidv4(),
            addedDate: new Date(),
            purchased: false,
          };

          const updatedList = {
            ...targetList,
            items: [...targetList.items, newItem],
            lastModified: new Date(),
            totalEstimatedCost: targetList.totalEstimatedCost + (newItem.estimatedPrice || 0),
          };

          await this.saveShoppingListToSupabase(updatedList);
          return newItem;
        }
      } else {
        // Fallback to localStorage for unauthenticated users
        return this.addItemToListLocalStorage(listId, item);
      }
    } catch (error) {
      console.error('Error adding item to list in Supabase, falling back to localStorage:', error);
      return this.addItemToListLocalStorage(listId, item);
    }
  }

  private static addItemToListLocalStorage(
    listId: string,
    item: Omit<ShoppingListItem, 'id' | 'addedDate' | 'purchased'>
  ): ShoppingListItem {
    const lists = this.getShoppingLists();
    const targetList = lists.find(list => list.id === listId);

    if (!targetList) {
      throw new Error('Shopping list not found');
    }

    // Check if item already exists
    const existingItem = targetList.items.find(
      existing => existing.name.toLowerCase() === item.name.toLowerCase()
    );

    if (existingItem) {
      // Update quantity if item exists
      existingItem.quantity += item.quantity;
      existingItem.priority = item.priority;
      existingItem.estimatedPrice = item.estimatedPrice;
      existingItem.notes = item.notes;

      const updatedList = {
        ...targetList,
        lastModified: new Date(),
        totalEstimatedCost: targetList.items.reduce(
          (sum, listItem) => sum + (listItem.estimatedPrice || 0),
          0
        ),
      };

      const updatedLists = lists.map(list => (list.id === listId ? updatedList : list));

      this.saveShoppingLists(updatedLists);
      return existingItem;
    } else {
      // Add new item
      const newItem: ShoppingListItem = {
        ...item,
        id: uuidv4(),
        addedDate: new Date(),
        purchased: false,
      };

      const updatedList = {
        ...targetList,
        items: [...targetList.items, newItem],
        lastModified: new Date(),
        totalEstimatedCost: targetList.totalEstimatedCost + (newItem.estimatedPrice || 0),
      };

      const updatedLists = lists.map(list => (list.id === listId ? updatedList : list));

      this.saveShoppingLists(updatedLists);
      return newItem;
    }
  }

  static async addItemToActiveList(
    item: Omit<ShoppingListItem, 'id' | 'addedDate' | 'purchased'>
  ): Promise<ShoppingListItem> {
    let activeList = await this.getActiveShoppingList();

    if (!activeList) {
      // Create a default list if none exists
      activeList = await this.createShoppingList('My Shopping List', 'anonymous');
    }

    return await this.addItemToList(activeList.id, item);
  }

  // Helper method to detect category from ingredient name
  static detectIngredientCategory(name: string): IngredientCategory {
    const nameLower = name.toLowerCase();

    const categoryMap: { [key: string]: IngredientCategory } = {
      // Proteins
      'chicken|beef|pork|fish|salmon|tuna|eggs|tofu|beans|lentils': 'protein',
      // Vegetables
      'onion|tomato|carrot|broccoli|spinach|lettuce|pepper|celery|mushroom': 'vegetables',
      // Fruits
      'apple|banana|orange|lemon|lime|berry|grape|avocado': 'fruits',
      // Grains
      'rice|pasta|bread|flour|oats|quinoa|barley': 'grains',
      // Dairy
      'milk|cheese|yogurt|butter|cream': 'dairy',
      // Spices
      'salt|pepper|paprika|cumin|chili|garlic powder': 'spices',
      // Herbs
      'basil|oregano|thyme|cilantro|parsley|rosemary': 'herbs',
      // Oils
      'oil|olive oil|coconut oil|sesame oil': 'oils',
      // Pantry
      'sugar|vinegar|honey|vanilla|baking powder': 'pantry',
    };

    for (const [keywords, category] of Object.entries(categoryMap)) {
      if (keywords.split('|').some(keyword => nameLower.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }
}
