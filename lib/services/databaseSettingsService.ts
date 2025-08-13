import { createSupabaseClient, handleSupabaseError, withRetry } from '../supabase/client';
import type { Database } from '../supabase/types';

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

export interface UserSetting {
  key: string;
  value: any;
  updatedAt?: string;
}

export interface RecentItem {
  id: string;
  type: 'recipe' | 'ingredient' | 'meal_plan' | 'shopping_list';
  itemId: string;
  data: any;
  accessedAt: string;
}

class DatabaseSettingsService {
  private supabase: SupabaseClient | null = null;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.supabase = createSupabaseClient();
  }

  private async ensureAuthenticated(): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase client not available');
    }

    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      throw new Error('User not authenticated');
    }

    return user.id;
  }

  // User Settings Methods
  async getUserSetting(key: string, defaultValue: any = null): Promise<any> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();
      const cacheKey = `${userId}_${key}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.rpc('get_user_setting', {
          user_uuid: userId,
          setting_key: key,
          default_value: defaultValue,
        });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting user setting');
        throw new Error(handled.message);
      }

      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Error getting user setting:', error);
      return defaultValue;
    }
  }

  async setUserSetting(key: string, value: any): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.rpc('set_user_setting', {
          user_uuid: userId,
          setting_key: key,
          setting_value: value,
        });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'setting user setting');
        throw new Error(handled.message);
      }

      // Invalidate cache
      const cacheKey = `${userId}_${key}`;
      this.cache.delete(cacheKey);

      return data === true;
    } catch (error) {
      console.error('Error setting user setting:', error);
      return false;
    }
  }

  async getAllUserSettings(): Promise<Record<string, any>> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('user_settings')
          .select('setting_key, setting_value')
          .eq('user_id', userId);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting all user settings');
        throw new Error(handled.message);
      }

      // Convert to key-value object
      const settings: Record<string, any> = {};
      (data || []).forEach((item: any) => {
        settings[item.setting_key] = item.setting_value;
      });

      return settings;
    } catch (error) {
      console.error('Error getting all user settings:', error);
      return {};
    }
  }

  // Recent Items Methods
  async addRecentItem(type: RecentItem['type'], itemId: string, data: any): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase!.from('recent_items').insert({
          user_id: userId,
          item_type: type,
          item_id: itemId,
          item_data: data,
          accessed_at: new Date().toISOString(),
        });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'adding recent item');
        throw new Error(handled.message);
      }

      return true;
    } catch (error) {
      console.error('Error adding recent item:', error);
      return false;
    }
  }

  async getRecentItems(type?: RecentItem['type'], limit: number = 10): Promise<RecentItem[]> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      let query = this.supabase.from('recent_items').select('*').eq('user_id', userId);

      if (type) {
        query = query.eq('item_type', type);
      }

      const { data, error } = await withRetry(async () => {
        return await query.order('accessed_at', { ascending: false }).limit(limit);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting recent items');
        throw new Error(handled.message);
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        type: item.item_type as RecentItem['type'],
        itemId: item.item_id,
        data: item.item_data,
        accessedAt: item.accessed_at,
      }));
    } catch (error) {
      console.error('Error getting recent items:', error);
      return [];
    }
  }

  // Receipt History Methods
  async saveReceiptHistory(
    receiptData: any,
    itemsExtracted: number = 0,
    totalAmount?: number,
    storeName?: string
  ): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase!.from('receipt_history').insert({
          user_id: userId,
          receipt_data: receiptData,
          items_extracted: itemsExtracted,
          total_amount: totalAmount,
          store_name: storeName,
          scanned_at: new Date().toISOString(),
        });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'saving receipt history');
        throw new Error(handled.message);
      }

      return true;
    } catch (error) {
      console.error('Error saving receipt history:', error);
      return false;
    }
  }

  async getReceiptHistory(limit: number = 20): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('receipt_history')
          .select('*')
          .eq('user_id', userId)
          .order('scanned_at', { ascending: false })
          .limit(limit);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting receipt history');
        throw new Error(handled.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting receipt history:', error);
      return [];
    }
  }

  // Barcode History Methods
  async saveBarcodeHistory(
    barcode: string,
    productName: string,
    productData: any,
    addedToPantry: boolean = false
  ): Promise<boolean> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { error } = await withRetry(async () => {
        return await this.supabase!.from('barcode_history').insert({
          user_id: userId,
          barcode,
          product_name: productName,
          product_data: productData,
          added_to_pantry: addedToPantry,
          scanned_at: new Date().toISOString(),
        });
      });

      if (error) {
        const handled = handleSupabaseError(error, 'saving barcode history');
        throw new Error(handled.message);
      }

      return true;
    } catch (error) {
      console.error('Error saving barcode history:', error);
      return false;
    }
  }

  async getBarcodeHistory(limit: number = 20): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    try {
      const userId = await this.ensureAuthenticated();

      const { data, error } = await withRetry(async () => {
        return await this.supabase!.from('barcode_history')
          .select('*')
          .eq('user_id', userId)
          .order('scanned_at', { ascending: false })
          .limit(limit);
      });

      if (error) {
        const handled = handleSupabaseError(error, 'getting barcode history');
        throw new Error(handled.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting barcode history:', error);
      return [];
    }
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Health check
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.supabase) {
        console.log('Database unavailable: Supabase client not initialized');
        return false;
      }

      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user) {
        console.log('Database unavailable: User not authenticated', authError?.message);
        return false;
      }

      // Test basic query with timeout
      const { error } = await this.supabase
        .from('user_settings')
        .select('id')
        .limit(1)
        .timeout(5000); // 5 second timeout

      if (error) {
        console.log('Database unavailable: Query failed', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.log(
        'Database unavailable: Exception thrown',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }
}

export const databaseSettingsService = new DatabaseSettingsService();
