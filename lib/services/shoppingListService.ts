import { v4 as uuidv4 } from 'uuid';
import { IngredientCategory } from '../../types';

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

  static getAllShoppingLists(): ShoppingList[] {
    return this.getShoppingLists();
  }

  static getActiveShoppingList(): ShoppingList | null {
    const lists = this.getShoppingLists();
    return lists.find(list => list.isActive) || lists[0] || null;
  }

  static createShoppingList(name: string, userId: string): ShoppingList {
    const lists = this.getShoppingLists();

    const newList: ShoppingList = {
      id: uuidv4(),
      name: name.trim().slice(0, 50),
      userId,
      items: [],
      createdDate: new Date(),
      lastModified: new Date(),
      isActive: lists.length === 0, // First list becomes active
      totalEstimatedCost: 0,
      completedItems: 0,
    };

    const updatedLists = [...lists, newList];
    this.saveShoppingLists(updatedLists);
    return newList;
  }

  static addItemToList(
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

  static addItemToActiveList(
    item: Omit<ShoppingListItem, 'id' | 'addedDate' | 'purchased'>
  ): ShoppingListItem {
    let activeList = this.getActiveShoppingList();

    if (!activeList) {
      // Create a default list if none exists
      activeList = this.createShoppingList('My Shopping List', 'anonymous');
    }

    return this.addItemToList(activeList.id, item);
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
