import { v4 as uuidv4 } from 'uuid';
import { IngredientCategory } from '../../types';
import { getSupabaseClient } from '../config/supabase';
import { databaseSettingsService } from './databaseSettingsService';

export interface ProductInfo {
  id: string;
  barcode: string;
  name: string;
  brand?: string;
  category: IngredientCategory;
  size?: string;
  unit?: string;
  description?: string;
  imageUrl?: string;
  nutritionInfo?: NutritionInfo;
  price?: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree?: boolean;
  allergens?: string[];
  confidence: number;
}

interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
  };
  quantity?: string;
  ingredients_text?: string;
  allergens?: string;
}

class BarcodeService {
  private readonly OPEN_FOOD_FACTS_URL = 'https://world.openfoodfacts.org/api/v0/product';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private productCache = new Map<string, { product: ProductInfo; timestamp: number }>();

  async lookupProduct(barcode: string): Promise<ProductInfo> {
    // Check cache first
    const cached = this.productCache.get(barcode);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.product;
    }

    try {
      // Try Open Food Facts API
      const product = await this.lookupFromOpenFoodFacts(barcode);

      // Cache the result
      this.productCache.set(barcode, {
        product,
        timestamp: Date.now(),
      });

      return product;
    } catch (error) {
      console.error('Product lookup failed:', error);

      // Fallback to mock data for demo
      const mockProduct = this.getMockProduct(barcode);
      if (mockProduct) {
        return mockProduct;
      }

      throw new Error('Product not found in database');
    }
  }

  private async lookupFromOpenFoodFacts(barcode: string): Promise<ProductInfo> {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Pantry Buddy Pro';
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
    const appContact = process.env.NEXT_PUBLIC_APP_CONTACT || 'pantry-buddy-app';

    const response = await fetch(`${this.OPEN_FOOD_FACTS_URL}/${barcode}.json`, {
      headers: {
        'User-Agent': `${appName}/${appVersion} (${appContact})`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product data');
    }

    const data = await response.json();

    if (!data.product || data.status !== 1) {
      throw new Error('Product not found');
    }

    return this.transformOpenFoodFactsData(barcode, data.product);
  }

  private transformOpenFoodFactsData(barcode: string, product: OpenFoodFactsProduct): ProductInfo {
    const name = product.product_name || 'Unknown Product';
    const brand = product.brands?.split(',')[0]?.trim();
    const category = this.categorizeProduct(product.categories || '', name);

    return {
      id: uuidv4(),
      barcode,
      name,
      brand,
      category,
      size: product.quantity,
      unit: this.extractUnit(product.quantity || ''),
      description: product.ingredients_text,
      imageUrl: product.image_url,
      nutritionInfo: this.extractNutritionInfo(product.nutriments),
      isVegetarian: this.determineVegetarian(
        product.ingredients_text || '',
        product.categories || ''
      ),
      isVegan: this.determineVegan(product.ingredients_text || '', product.categories || ''),
      isGlutenFree: this.determineGlutenFree(
        product.ingredients_text || '',
        product.allergens || ''
      ),
      allergens: this.extractAllergens(product.allergens || ''),
      confidence: 0.9,
    };
  }

  private categorizeProduct(categories: string, name: string): IngredientCategory {
    const categoryText = (categories + ' ' + name).toLowerCase();

    const categoryMap: Record<IngredientCategory, string[]> = {
      protein: [
        'meat',
        'fish',
        'chicken',
        'beef',
        'pork',
        'turkey',
        'seafood',
        'eggs',
        'tofu',
        'beans',
        'legumes',
      ],
      dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'dairy'],
      vegetables: [
        'vegetables',
        'tomato',
        'onion',
        'carrot',
        'broccoli',
        'spinach',
        'lettuce',
        'pepper',
      ],
      fruits: ['fruits', 'apple', 'banana', 'orange', 'berry', 'grape', 'citrus'],
      grains: ['bread', 'pasta', 'rice', 'cereal', 'flour', 'grain', 'wheat', 'oats'],
      oils: ['oil', 'olive oil', 'vegetable oil', 'cooking oil'],
      spices: ['spices', 'seasonings', 'salt', 'pepper', 'herbs'],
      herbs: ['herbs', 'basil', 'oregano', 'thyme', 'cilantro'],
      pantry: ['sugar', 'flour', 'baking', 'vanilla', 'honey', 'vinegar', 'sauce', 'condiment'],
      other: [],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => categoryText.includes(keyword))) {
        return category as IngredientCategory;
      }
    }

    return 'other';
  }

  private extractUnit(quantity: string): string {
    if (!quantity) return 'each';

    const unitMatches = quantity.match(/(ml|l|g|kg|oz|lb|fl oz|cups?|pints?|quarts?|gallons?)/i);
    return unitMatches ? unitMatches[1].toLowerCase() : 'each';
  }

  private extractNutritionInfo(
    nutriments?: OpenFoodFactsProduct['nutriments']
  ): NutritionInfo | undefined {
    if (!nutriments) return undefined;

    return {
      calories: nutriments['energy-kcal_100g'],
      protein: nutriments['proteins_100g'],
      carbs: nutriments['carbohydrates_100g'],
      fat: nutriments['fat_100g'],
      fiber: nutriments['fiber_100g'],
      sugar: nutriments['sugars_100g'],
      sodium: nutriments['sodium_100g'],
    };
  }

  private determineVegetarian(ingredients: string, categories: string): boolean {
    const text = (ingredients + ' ' + categories).toLowerCase();
    const nonVegetarian = [
      'meat',
      'fish',
      'chicken',
      'beef',
      'pork',
      'turkey',
      'seafood',
      'gelatin',
    ];
    return !nonVegetarian.some(item => text.includes(item));
  }

  private determineVegan(ingredients: string, categories: string): boolean {
    const text = (ingredients + ' ' + categories).toLowerCase();
    const nonVegan = [
      'meat',
      'fish',
      'chicken',
      'beef',
      'pork',
      'turkey',
      'seafood',
      'milk',
      'dairy',
      'cheese',
      'butter',
      'cream',
      'eggs',
      'honey',
      'gelatin',
    ];
    return !nonVegan.some(item => text.includes(item));
  }

  private determineGlutenFree(ingredients: string, allergens: string): boolean {
    const text = (ingredients + ' ' + allergens).toLowerCase();
    const glutenSources = ['wheat', 'barley', 'rye', 'gluten', 'flour'];
    return !glutenSources.some(item => text.includes(item));
  }

  private extractAllergens(allergens: string): string[] {
    if (!allergens) return [];

    return allergens
      .split(',')
      .map(allergen => allergen.trim())
      .filter(Boolean);
  }

  private getMockProduct(barcode: string): ProductInfo | null {
    // Mock product database for demo purposes
    const mockProducts: Record<string, Omit<ProductInfo, 'id'>> = {
      '0123456789012': {
        barcode: '0123456789012',
        name: 'Organic Bananas',
        brand: 'Fresh Farms',
        category: 'fruits',
        size: '2 lbs',
        unit: 'lbs',
        description: 'Fresh organic bananas',
        price: 2.99,
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: true,
        nutritionInfo: {
          calories: 89,
          carbs: 23,
          fiber: 2.6,
          sugar: 12,
        },
        confidence: 0.8,
      },
      '0987654321098': {
        barcode: '0987654321098',
        name: 'Whole Milk',
        brand: 'Dairy Fresh',
        category: 'dairy',
        size: '1 gallon',
        unit: 'gallon',
        description: 'Fresh whole milk',
        price: 4.49,
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: true,
        allergens: ['milk'],
        nutritionInfo: {
          calories: 150,
          protein: 8,
          carbs: 12,
          fat: 8,
        },
        confidence: 0.8,
      },
      '1234567890123': {
        barcode: '1234567890123',
        name: 'Sourdough Bread',
        brand: 'Artisan Bakery',
        category: 'grains',
        size: '1 loaf',
        unit: 'each',
        description: 'Fresh sourdough bread',
        price: 3.99,
        isVegetarian: true,
        isVegan: true,
        isGlutenFree: false,
        allergens: ['wheat', 'gluten'],
        nutritionInfo: {
          calories: 130,
          protein: 4,
          carbs: 24,
          fat: 1,
          fiber: 1,
        },
        confidence: 0.8,
      },
      '9876543210987': {
        barcode: '9876543210987',
        name: 'Large Eggs',
        brand: 'Farm Fresh',
        category: 'protein',
        size: '12 count',
        unit: 'dozen',
        description: 'Grade A large eggs',
        price: 3.49,
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: true,
        allergens: ['eggs'],
        nutritionInfo: {
          calories: 70,
          protein: 6,
          carbs: 0,
          fat: 5,
        },
        confidence: 0.8,
      },
    };

    const mockData = mockProducts[barcode];
    if (mockData) {
      return {
        ...mockData,
        id: uuidv4(),
      };
    }

    return null;
  }

  // Get product history for analytics
  async getScannedProducts(userId?: string): Promise<ProductInfo[]> {
    try {
      if (!userId) {
        // Fallback to localStorage for anonymous users
        const history = localStorage.getItem('scannedProducts');
        return history ? JSON.parse(history) : [];
      }

      const supabase = getSupabaseClient();
      const { data: products, error } = await supabase
        .from('scanned_products')
        .select('*')
        .eq('user_id', userId)
        .order('last_scanned_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching scanned products:', error);
        throw error;
      }

      return products.map((product: any) => ({
        id: product.id,
        barcode: product.barcode,
        name: product.product_name,
        brand: product.brand,
        category: product.category as IngredientCategory,
        price: product.price ? parseFloat(product.price) : undefined,
        nutritionInfo: product.nutrition_info,
        isVegetarian: true, // Default for now
        isVegan: true, // Default for now
        confidence: 0.9,
      }));
    } catch (error) {
      console.error('Failed to get scanned products from Supabase:', error);

      // Fallback to localStorage
      try {
        const history = localStorage.getItem('scannedProducts');
        return history ? JSON.parse(history) : [];
      } catch (localError) {
        console.error('Failed to get scanned products from localStorage:', localError);
        return [];
      }
    }
  }

  // Save scanned product to history
  async saveScannedProduct(product: ProductInfo, userId?: string): Promise<void> {
    try {
      if (!userId) {
        // Fallback to localStorage for anonymous users
        const history = await this.getScannedProducts();
        const updated = [product, ...history.filter(p => p.barcode !== product.barcode)].slice(
          0,
          50
        );
        localStorage.setItem('scannedProducts', JSON.stringify(updated));
        return;
      }

      // Try to save to new barcode_history table first
      if (await databaseSettingsService.isAvailable()) {
        console.log('Saving barcode to new barcode_history table');
        const success = await databaseSettingsService.saveBarcodeHistory(
          product.barcode,
          product.name,
          product,
          false // Not added to pantry by default
        );

        if (success) {
          console.log('Barcode saved to barcode_history successfully');
          return;
        }
      }

      const supabase = getSupabaseClient();

      // Check if product already exists for this user
      const { data: existing } = await supabase
        .from('scanned_products')
        .select('*')
        .eq('user_id', userId)
        .eq('barcode', product.barcode)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('scanned_products')
          .update({
            scan_count: existing.scan_count + 1,
            last_scanned_at: new Date().toISOString(),
            price: product.price || existing.price,
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating scanned product:', error);
          throw error;
        }
      } else {
        // Insert new record
        const { error } = await supabase.from('scanned_products').insert({
          user_id: userId,
          barcode: product.barcode,
          product_name: product.name,
          brand: product.brand,
          category: product.category,
          price: product.price,
          nutrition_info: product.nutritionInfo,
          scan_count: 1,
          last_scanned_at: new Date().toISOString(),
        });

        if (error) {
          console.error('Error saving scanned product:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to save scanned product to Supabase:', error);

      // Fallback to localStorage
      try {
        const history = await this.getScannedProducts();
        const updated = [product, ...history.filter(p => p.barcode !== product.barcode)].slice(
          0,
          50
        );
        localStorage.setItem('scannedProducts', JSON.stringify(updated));
      } catch (localError) {
        console.error('Failed to save scanned product:', localError);
      }
    }
  }

  // Get scanning statistics for a user
  async getScanningStats(userId: string): Promise<{
    totalScans: number;
    uniqueProducts: number;
    topCategories: Record<string, number>;
    recentScans: ProductInfo[];
  }> {
    try {
      const supabase = getSupabaseClient();

      const { data: products, error } = await supabase
        .from('scanned_products')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const totalScans = products.reduce((sum: number, p: any) => sum + p.scan_count, 0);
      const uniqueProducts = products.length;

      const topCategories: Record<string, number> = {};
      products.forEach((product: any) => {
        const category = product.category || 'other';
        topCategories[category] = (topCategories[category] || 0) + product.scan_count;
      });

      const recentScans = products
        .sort(
          (a: any, b: any) =>
            new Date(b.last_scanned_at).getTime() - new Date(a.last_scanned_at).getTime()
        )
        .slice(0, 10)
        .map((product: any) => ({
          id: product.id,
          barcode: product.barcode,
          name: product.product_name,
          brand: product.brand,
          category: product.category as IngredientCategory,
          price: product.price ? parseFloat(product.price) : undefined,
          nutritionInfo: product.nutrition_info,
          isVegetarian: true,
          isVegan: true,
          confidence: 0.9,
        }));

      return {
        totalScans,
        uniqueProducts,
        topCategories,
        recentScans,
      };
    } catch (error) {
      console.error('Failed to get scanning stats:', error);
      return {
        totalScans: 0,
        uniqueProducts: 0,
        topCategories: {},
        recentScans: [],
      };
    }
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.productCache.clear();
  }
}

export const barcodeService = new BarcodeService();
