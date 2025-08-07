import { v4 as uuidv4 } from 'uuid';
import { IngredientCategory } from '../../types';
import { getSupabaseClient } from '../config/supabase';

export interface ExtractedReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category?: IngredientCategory;
  confidence: number;
}

export interface ExtractedReceiptData {
  id: string;
  storeName: string;
  receiptDate: Date;
  totalAmount: number;
  taxAmount: number;
  items: ExtractedReceiptItem[];
  rawText: string;
  confidence: number;
}

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  error?: string;
}

class ReceiptService {
  private readonly FALLBACK_OCR_ENABLED = true;

  constructor() {
    console.log('🔑 Receipt OCR Service initialized - using server-side API route');
  }

  async processReceiptImage(imageFile: File): Promise<ExtractedReceiptData> {
    try {
      // Convert image to base64
      const imageBase64 = await this.fileToBase64(imageFile);

      // Extract text using OCR
      const ocrResult = await this.extractTextFromImage(imageBase64);

      if (!ocrResult.success || !ocrResult.text) {
        throw new Error(ocrResult.error || 'Failed to extract text from receipt');
      }

      // Parse the extracted text
      const receiptData = this.parseReceiptText(ocrResult.text);

      return {
        ...receiptData,
        id: uuidv4(),
        rawText: ocrResult.text,
        confidence: ocrResult.confidence || 0.7,
      };
    } catch (error) {
      console.error('Receipt processing failed:', error);
      throw new Error('Failed to process receipt. Please try again with a clearer image.');
    }
  }

  private async extractTextFromImage(imageBase64: string): Promise<OCRResult> {
    try {
      console.log('🔍 Sending OCR request to server-side API...');
      
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
        }),
      });

      const result = await response.json();
      
      if (result.source) {
        console.log(`📡 OCR Result from: ${result.source}`);
      }

      return {
        success: result.success,
        text: result.text,
        confidence: result.confidence,
        error: result.error,
      };
    } catch (error) {
      console.error('OCR API call failed:', error);
      return {
        success: false,
        error: 'Failed to process image',
      };
    }
  }


  private parseReceiptText(
    text: string
  ): Omit<ExtractedReceiptData, 'id' | 'rawText' | 'confidence'> {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Extract store information
    const storeName = this.extractStoreName(lines);
    const receiptDate = this.extractDate(lines);
    const { totalAmount, taxAmount } = this.extractTotals(lines);

    // Extract items
    const items = this.extractItems(lines);

    return {
      storeName,
      receiptDate,
      totalAmount,
      taxAmount,
      items,
    };
  }

  private extractStoreName(lines: string[]): string {
    // Look for common store patterns in first few lines
    const storePatterns = [
      /^(WHOLE FOODS|TRADER JOE|SAFEWAY|KROGER|WALMART|TARGET|COSTCO)/i,
      /MARKET$/i,
      /GROCERY$/i,
    ];

    for (const line of lines.slice(0, 5)) {
      for (const pattern of storePatterns) {
        if (pattern.test(line)) {
          return line;
        }
      }
    }

    return lines[0] || 'Unknown Store';
  }

  private extractDate(lines: string[]): Date {
    const datePatterns = [
      /Date:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(\d{2}-\d{2}-\d{4})/,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          const dateStr = match[1];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }
      }
    }

    return new Date(); // Default to today
  }

  private extractTotals(lines: string[]): { totalAmount: number; taxAmount: number } {
    let totalAmount = 0;
    let taxAmount = 0;

    const totalPattern = /(?:Total|TOTAL).*?\$?(\d+\.\d{2})/i;
    const taxPattern = /(?:Tax|TAX).*?\$?(\d+\.\d{2})/i;

    for (const line of lines.slice(-10)) {
      // Look in last 10 lines
      const totalMatch = line.match(totalPattern);
      const taxMatch = line.match(taxPattern);

      if (totalMatch && !totalAmount) {
        totalAmount = parseFloat(totalMatch[1]);
      }
      if (taxMatch && !taxAmount) {
        taxAmount = parseFloat(taxMatch[1]);
      }
    }

    return { totalAmount, taxAmount };
  }

  private extractItems(lines: string[]): ExtractedReceiptItem[] {
    const items: ExtractedReceiptItem[] = [];

    // Pattern to match item lines: Name [quantity] [unit] $price
    const itemPattern =
      /^(.+?)\s*(?:(\d+(?:\.\d+)?)\s*(lbs?|oz|ct|gal|each|pk))?\s*\$(\d+\.\d{2})$/i;

    for (const line of lines) {
      const match = line.match(itemPattern);
      if (match) {
        const [, name, quantityStr, unit, priceStr] = match;

        // Skip lines that look like totals or headers
        if (this.isSkippableLine(name.toLowerCase())) {
          continue;
        }

        const quantity = quantityStr ? parseFloat(quantityStr) : 1;
        const price = parseFloat(priceStr);
        const cleanName = this.cleanItemName(name);
        const category = this.categorizeItem(cleanName);

        items.push({
          id: uuidv4(),
          name: cleanName,
          quantity,
          unit: unit || 'each',
          price,
          category,
          confidence: 0.8,
        });
      }
    }

    return items;
  }

  private isSkippableLine(line: string): boolean {
    const skipPatterns = [
      'subtotal',
      'total',
      'tax',
      'payment',
      'thank',
      'visa',
      'mastercard',
      'cash',
      'change',
      'receipt',
      'store',
      'address',
      'phone',
      'date',
      'time',
    ];

    return skipPatterns.some(pattern => line.includes(pattern));
  }

  private cleanItemName(name: string): string {
    // Remove common store prefixes/suffixes and clean up
    return name
      .replace(/^(ORGANIC|ORG)\s+/i, '')
      .replace(/\s+(ORGANIC|ORG)$/i, '')
      .replace(/\s+\d+\s*(LB|OZ|CT|GAL)S?$/i, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private categorizeItem(itemName: string): IngredientCategory {
    const name = itemName.toLowerCase();

    const categories: Record<IngredientCategory, string[]> = {
      protein: [
        'chicken',
        'beef',
        'pork',
        'fish',
        'salmon',
        'tuna',
        'turkey',
        'eggs',
        'tofu',
        'beans',
      ],
      vegetables: [
        'tomato',
        'onion',
        'carrot',
        'broccoli',
        'spinach',
        'lettuce',
        'pepper',
        'celery',
        'cucumber',
      ],
      fruits: ['banana', 'apple', 'orange', 'grape', 'berry', 'avocado', 'lemon', 'lime', 'peach'],
      dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream'],
      grains: ['bread', 'rice', 'pasta', 'oats', 'flour', 'quinoa', 'cereal'],
      oils: ['oil', 'olive oil', 'vegetable oil', 'coconut oil'],
      spices: ['salt', 'pepper', 'garlic powder', 'onion powder', 'paprika'],
      herbs: ['basil', 'oregano', 'thyme', 'cilantro', 'parsley'],
      pantry: ['sugar', 'flour', 'baking powder', 'vanilla', 'honey', 'vinegar'],
      other: [],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category as IngredientCategory;
      }
    }

    return 'other';
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Save receipt data to database
  async saveReceiptData(receiptData: ExtractedReceiptData, userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();

      // Insert receipt record
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          id: receiptData.id,
          user_id: userId,
          store_name: receiptData.storeName,
          receipt_date: receiptData.receiptDate.toISOString().split('T')[0],
          total_amount: receiptData.totalAmount,
          tax_amount: receiptData.taxAmount,
          raw_text: receiptData.rawText,
          confidence: receiptData.confidence,
        })
        .select()
        .single();

      if (receiptError) {
        console.error('Error saving receipt:', receiptError);
        throw new Error('Failed to save receipt data');
      }

      // Insert receipt items
      if (receiptData.items.length > 0) {
        const { error: itemsError } = await supabase.from('receipt_items').insert(
          receiptData.items.map(item => ({
            id: item.id,
            receipt_id: receiptData.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            category: item.category || 'other',
            confidence: item.confidence,
          }))
        );

        if (itemsError) {
          console.error('Error saving receipt items:', itemsError);
          throw new Error('Failed to save receipt items');
        }
      }

      console.log('Receipt saved successfully:', receiptData.id);
    } catch (error) {
      console.error('Failed to save receipt:', error);

      // Fallback to localStorage for offline support
      try {
        const existingReceipts = JSON.parse(localStorage.getItem('userReceipts') || '[]');
        const receiptWithUser = { ...receiptData, userId, createdAt: new Date().toISOString() };
        existingReceipts.push(receiptWithUser);
        localStorage.setItem('userReceipts', JSON.stringify(existingReceipts));
        console.log('Receipt saved to localStorage as fallback');
      } catch (localError) {
        throw new Error('Failed to save receipt data');
      }
    }
  }

  // Get user's receipt history
  async getUserReceipts(userId: string): Promise<ExtractedReceiptData[]> {
    try {
      const supabase = getSupabaseClient();

      // Get receipts with their items
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select(
          `
          *,
          receipt_items (*)
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching receipts:', error);
        throw error;
      }

      // Transform data to match our interface
      return receipts.map((receipt: any) => ({
        id: receipt.id,
        storeName: receipt.store_name,
        receiptDate: new Date(receipt.receipt_date),
        totalAmount: parseFloat(receipt.total_amount),
        taxAmount: parseFloat(receipt.tax_amount || 0),
        rawText: receipt.raw_text || '',
        confidence: parseFloat(receipt.confidence || 0.7),
        items: receipt.receipt_items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          price: parseFloat(item.price),
          category: item.category as IngredientCategory,
          confidence: parseFloat(item.confidence),
        })),
      }));
    } catch (error) {
      console.error('Failed to get receipts from Supabase:', error);

      // Fallback to localStorage
      try {
        const receipts = JSON.parse(localStorage.getItem('userReceipts') || '[]');
        return receipts
          .filter((receipt: any) => receipt.userId === userId)
          .sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      } catch (localError) {
        console.error('Failed to get receipts from localStorage:', localError);
        return [];
      }
    }
  }

  // Get spending analytics for a user
  async getSpendingAnalytics(
    userId: string,
    timeRange: '7days' | '30days' | '90days' | '1year' = '30days'
  ): Promise<{
    totalSpent: number;
    totalReceipts: number;
    avgTicket: number;
    categoryTotals: Record<string, number>;
    storeTotals: Record<string, number>;
  }> {
    try {
      const supabase = getSupabaseClient();

      // Calculate date range
      const now = new Date();
      const daysBack = {
        '7days': 7,
        '30days': 30,
        '90days': 90,
        '1year': 365,
      }[timeRange];
      const fromDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

      // Get receipts in date range
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select(
          `
          *,
          receipt_items (
            category,
            price
          )
        `
        )
        .eq('user_id', userId)
        .gte('receipt_date', fromDate.toISOString().split('T')[0])
        .order('receipt_date', { ascending: false });

      if (error) throw error;

      // Calculate analytics
      let totalSpent = 0;
      const categoryTotals: Record<string, number> = {};
      const storeTotals: Record<string, number> = {};

      receipts.forEach((receipt: any) => {
        const amount = parseFloat(receipt.total_amount);
        totalSpent += amount;

        // Store totals
        storeTotals[receipt.store_name] = (storeTotals[receipt.store_name] || 0) + amount;

        // Category totals
        receipt.receipt_items.forEach((item: any) => {
          const category = item.category || 'other';
          const price = parseFloat(item.price);
          categoryTotals[category] = (categoryTotals[category] || 0) + price;
        });
      });

      return {
        totalSpent,
        totalReceipts: receipts.length,
        avgTicket: receipts.length > 0 ? totalSpent / receipts.length : 0,
        categoryTotals,
        storeTotals,
      };
    } catch (error) {
      console.error('Failed to get spending analytics:', error);
      return {
        totalSpent: 0,
        totalReceipts: 0,
        avgTicket: 0,
        categoryTotals: {},
        storeTotals: {},
      };
    }
  }
}

export const receiptService = new ReceiptService();
