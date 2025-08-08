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
      console.log(
        `🔍 Processing receipt: ${imageFile.name}, size: ${imageFile.size} bytes, type: ${imageFile.type}`
      );

      // Validate file type
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('Please upload a valid image file (JPG, PNG, etc.)');
      }

      // Check file size limits - be more generous for mobile
      const maxSize = 15 * 1024 * 1024; // 15MB limit
      if (imageFile.size > maxSize) {
        throw new Error('Image file is too large. Please use a smaller image (max 15MB)');
      }

      if (imageFile.size === 0) {
        throw new Error('Invalid image file. Please try selecting the image again.');
      }

      // Compress image to reduce payload size
      console.log(`📱 Starting image compression...`);
      const imageBase64 = await this.compressImage(imageFile);

      if (!imageBase64 || imageBase64.length < 100) {
        throw new Error('Failed to process image. Please try a different image.');
      }

      // Extract text using OCR
      console.log(`🔍 Sending image to OCR service...`);
      const ocrResult = await this.extractTextFromImage(imageBase64);

      if (!ocrResult.success) {
        // Provide more specific error messages
        if (ocrResult.error?.includes('timeout')) {
          throw new Error(
            'Processing timed out. Please try again with a smaller or clearer image.'
          );
        } else if (ocrResult.error?.includes('quota') || ocrResult.error?.includes('limit')) {
          throw new Error('Service temporarily unavailable. Please try again in a few minutes.');
        } else if (ocrResult.error?.includes('invalid') || ocrResult.error?.includes('format')) {
          throw new Error('Invalid image format. Please try a different image.');
        } else {
          throw new Error(
            ocrResult.error ||
              'Failed to read text from receipt. Please ensure the image is clear and well-lit.'
          );
        }
      }

      if (!ocrResult.text || ocrResult.text.trim().length < 10) {
        throw new Error(
          'No text found in the image. Please ensure your receipt is clearly visible and try again.'
        );
      }

      // Parse the extracted text
      console.log(`📝 Parsing extracted text (${ocrResult.text.length} characters)...`);
      const receiptData = this.parseReceiptText(ocrResult.text);

      if (receiptData.items.length === 0) {
        console.warn('⚠️ No items found in receipt');
        // Don't throw error, let user review the empty result
      }

      const result = {
        ...receiptData,
        id: uuidv4(),
        rawText: ocrResult.text,
        confidence: ocrResult.confidence || 0.7,
      };

      console.log(`✅ Receipt processed successfully: ${result.items.length} items found`);
      return result;
    } catch (error) {
      console.error('Receipt processing failed:', error);

      // Provide user-friendly error messages based on error type
      if (error instanceof Error) {
        // Pass through custom error messages
        if (error.message.includes('Please') || error.message.includes('try')) {
          throw error;
        }

        // Handle specific error types
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }

        if (error.message.includes('quota') || error.message.includes('rate limit')) {
          throw new Error('Service temporarily busy. Please wait a minute and try again.');
        }

        // Generic fallback
        throw new Error(
          'Failed to process receipt. Please ensure the image is clear and try again.'
        );
      }

      throw new Error('An unexpected error occurred. Please try again.');
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

    console.log('🔍 Parsing receipt lines for items:', lines.length, 'total lines');
    console.log('📄 Raw receipt lines:', lines.slice(0, 20).join(' | '));

    // Enhanced parsing - try multiple strategies

    // Strategy 1: Look for items after section headers (more lenient)
    let inItemSection = false;
    let pendingItemName = '';
    const sectionHeaders = ['GROCERY', 'PRODUCE', 'DAIRY', 'MEAT', 'FROZEN', 'BAKERY', 'DELI'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 2) continue;

      // Start collecting items after ANY section header or first store line
      if (
        sectionHeaders.some(header => line.includes(header)) ||
        (i < 10 && line.match(/^[A-Z\s-]+$/) && line.length > 10)
      ) {
        inItemSection = true;
        console.log(`📦 Entering section: ${line}`);
        continue;
      }

      // Stop at obvious end markers
      if (this.isEndOfItems(line)) {
        console.log('🛑 Reached end of items:', line);
        break;
      }

      // Skip obvious non-items but be less aggressive
      if (this.isSkippableLine(line.toLowerCase())) {
        continue;
      }

      // Pattern 1: Price line following item name
      const priceOnlyMatch = line.match(/^\$(\d+\.\d{2})\s*([A-Z]*)?$/);
      if (priceOnlyMatch && pendingItemName) {
        const price = parseFloat(priceOnlyMatch[1]);
        const cleanName = this.cleanItemName(pendingItemName);

        if (this.isValidItem(cleanName, price)) {
          console.log(`✅ Pattern 1 - Name + Price: "${cleanName}" → $${price}`);
          items.push(this.createReceiptItem(cleanName, price, 0.9));
        }
        pendingItemName = '';
        continue;
      }

      // Pattern 2: Item name and price on same line
      const combinedPatterns = [
        /^(.+?)\s+\$(\d+\.\d{2})\s*([A-Z]*)?$/, // "Item Name $X.XX"
        /^(.+?)\s+(\d+\.\d{2})\s*$/, // "Item Name X.XX"
        /^(.+?)\$(\d+\.\d{2})/, // "Item Name$X.XX"
      ];

      let matched = false;
      for (const pattern of combinedPatterns) {
        const match = line.match(pattern);
        if (match) {
          const [, name, priceStr] = match;
          const price = parseFloat(priceStr);
          const cleanName = this.cleanItemName(name);

          if (this.isValidItem(cleanName, price)) {
            console.log(`✅ Pattern 2 - Combined: "${cleanName}" → $${price}`);
            items.push(this.createReceiptItem(cleanName, price, 0.85));
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        pendingItemName = '';
        continue;
      }

      // Pattern 3: Lines that could be item names
      if (this.couldBeItemName(line)) {
        // If we already have a pending item, process it with estimated price
        if (pendingItemName && !pendingItemName.includes('$')) {
          const cleanName = this.cleanItemName(pendingItemName);
          if (cleanName.length >= 3) {
            console.log(`✅ Pattern 3 - Name only: "${cleanName}" → estimated price`);
            items.push(this.createReceiptItem(cleanName, this.estimatePrice(cleanName), 0.7));
          }
        }
        pendingItemName = line;
        console.log(`🏷️ Potential item: "${line}"`);
      }
    }

    // Process any remaining pending item
    if (pendingItemName && !pendingItemName.includes('$')) {
      const cleanName = this.cleanItemName(pendingItemName);
      if (cleanName.length >= 3) {
        console.log(`✅ Final item: "${cleanName}" → estimated price`);
        items.push(this.createReceiptItem(cleanName, this.estimatePrice(cleanName), 0.6));
      }
    }

    // Strategy 2: Fallback parsing for missed items
    if (items.length < 10) {
      console.log('🔍 Low item count, trying fallback parsing...');
      const fallbackItems = this.fallbackItemExtraction(lines);
      items.push(...fallbackItems);
    }

    console.log(`🛒 Total items extracted: ${items.length}`);
    return this.deduplicateItems(items);
  }

  private isEndOfItems(line: string): boolean {
    const endMarkers = [
      'subtotal',
      'sub total',
      'total',
      'tax',
      'balance',
      'payment',
      'cash',
      'change',
      'visa',
      'mastercard',
      'credit',
      'debit',
      'thank you',
      'thanks',
      'receipt',
      'duplicate',
    ];

    const lowerLine = line.toLowerCase();
    return (
      endMarkers.some(marker => lowerLine.includes(marker)) ||
      !!line.match(/total.*\$\d+\.\d{2}/i) ||
      !!line.match(/tax.*\$\d+\.\d{2}/i)
    );
  }

  private couldBeItemName(line: string): boolean {
    // More lenient check for potential item names
    if (line.length < 3 || line.length > 100) return false;

    // Skip obvious non-items
    if (this.isSkippableLine(line.toLowerCase())) return false;

    // Skip lines that are just numbers, dates, or addresses
    if (line.match(/^\d+$/)) return false;
    if (line.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) return false;
    if (line.match(/^\d{3}[-\s]?\d{3}[-\s]?\d{4}/)) return false;

    // Skip if it's clearly a price or total
    if (line.match(/^\$?\d+\.\d{2}\s*[A-Z]*$/)) return false;

    // Must have at least one letter
    if (!line.match(/[A-Za-z]/)) return false;

    return true;
  }

  private isValidItem(name: string, price: number): boolean {
    return (
      name.length >= 2 &&
      price > 0 &&
      price < 500 && // More reasonable max price
      !!name.match(/[A-Za-z]/)
    );
  }

  private createReceiptItem(name: string, price: number, confidence: number): ExtractedReceiptItem {
    return {
      id: uuidv4(),
      name: name,
      quantity: 1,
      unit: 'each',
      price: price,
      category: this.categorizeItem(name),
      confidence: confidence,
    };
  }

  private estimatePrice(itemName: string): number {
    // Simple price estimation based on item type
    const name = itemName.toLowerCase();

    if (name.includes('organic') || name.includes('premium')) return 8.99;
    if (name.includes('bread') || name.includes('milk')) return 3.49;
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) return 12.99;
    if (name.includes('fruit') || name.includes('vegetable') || name.includes('produce'))
      return 4.99;
    if (name.includes('snack') || name.includes('chip') || name.includes('cookie')) return 2.99;
    if (name.includes('cereal') || name.includes('pasta') || name.includes('rice')) return 5.49;

    return 4.99; // Default estimate
  }

  private fallbackItemExtraction(lines: string[]): ExtractedReceiptItem[] {
    console.log('🔄 Running fallback item extraction...');
    const fallbackItems: ExtractedReceiptItem[] = [];

    // Look for any line that could be an item (very permissive)
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip very short or long lines
      if (trimmed.length < 4 || trimmed.length > 80) continue;

      // Skip if it's obviously not an item
      if (this.isSkippableLine(trimmed.toLowerCase()) || this.isEndOfItems(trimmed)) continue;

      // Skip dates, phone numbers, addresses
      if (
        trimmed.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/) ||
        trimmed.match(/^\d{3}[-\s]?\d{3}[-\s]?\d{4}/) ||
        trimmed.match(/^\d+\s+[A-Za-z]+\s+(street|st|ave|avenue|road|rd)/i)
      )
        continue;

      // Must contain letters
      if (!trimmed.match(/[A-Za-z]/)) continue;

      // Extract price if present, otherwise estimate
      let price = this.estimatePrice(trimmed);
      const priceMatch = trimmed.match(/\$?(\d+\.\d{2})/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
      }

      const cleanName = this.cleanItemName(trimmed.replace(/\$?\d+\.\d{2}.*/, '').trim());

      if (cleanName.length >= 3 && this.isValidItem(cleanName, price)) {
        console.log(`🔄 Fallback item: "${cleanName}" → $${price}`);
        fallbackItems.push(this.createReceiptItem(cleanName, price, 0.5));
      }
    }

    console.log(`🔄 Fallback found ${fallbackItems.length} additional items`);
    return fallbackItems.slice(0, 20); // Limit to avoid too many false positives
  }

  private deduplicateItems(items: ExtractedReceiptItem[]): ExtractedReceiptItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = item.name.toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private isSkippableLine(line: string): boolean {
    // Be much more conservative - only skip obvious non-items
    const skipPatterns = [
      // Exact matches for store headers
      'c-town supermarket',
      'supermarket',

      // Transaction totals (exact matches)
      'subtotal',
      'total',
      'tax',
      'balance due',

      // Payment info
      'payment',
      'cash',
      'change',
      'visa',
      'credit',
      'debit',

      // Receipt metadata
      'thank you',
      'receipt',
      'duplicate',
    ];

    const lowerLine = line.toLowerCase();

    // Only skip if it's an exact match or very specific pattern
    if (skipPatterns.some(pattern => lowerLine === pattern || lowerLine.includes(pattern))) {
      return true;
    }

    // Skip lines that are clearly addresses or phone numbers
    if (
      lowerLine.match(/^\d{3}[-\s]?\d{3}[-\s]?\d{4}/) || // phone numbers
      lowerLine.match(/^\d+\s+[a-z]+\s+(street|st|avenue|ave|road|rd)/i)
    ) {
      // addresses
      return true;
    }

    return false;
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

  private async compressImage(
    file: File,
    maxWidth: number = 1200,
    quality: number = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`📱 Processing image: ${file.size} bytes, type: ${file.type}`);

      // For very large files on mobile, be more aggressive with compression
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const adjustedMaxWidth = isMobile ? Math.min(maxWidth, 800) : maxWidth;
      const adjustedQuality = isMobile && file.size > 2000000 ? 0.6 : quality;

      // Check if we need to compress at all - be more conservative on mobile
      const sizeLimit = isMobile ? 300000 : 500000;
      if (file.size < sizeLimit) {
        console.log('📸 File size acceptable, using original');
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => {
          console.error('FileReader error:', error);
          reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(file);
        return;
      }

      console.log('🔄 Compressing image for mobile optimization');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: false });

      if (!ctx) {
        console.warn('Canvas not supported, using original image');
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => {
          console.error('FileReader error:', error);
          reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();

      // Set crossOrigin to handle CORS issues on some mobile browsers
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          console.log(`🖼️ Original dimensions: ${img.width}x${img.height}`);

          // Calculate new dimensions with mobile optimization
          let { width, height } = img;

          // For mobile, ensure we don't exceed reasonable dimensions
          if (width > adjustedMaxWidth || height > adjustedMaxWidth) {
            const ratio = Math.min(adjustedMaxWidth / width, adjustedMaxWidth / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          console.log(`📐 Target dimensions: ${width}x${height}`);

          // Set canvas size
          canvas.width = width;
          canvas.height = height;

          // Clear canvas and set better rendering options for mobile
          ctx.clearRect(0, 0, width, height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw image with better mobile compatibility
          try {
            ctx.drawImage(img, 0, 0, width, height);
          } catch (drawError) {
            console.error('Canvas draw error:', drawError);
            throw drawError;
          }

          // Try to create compressed image with error handling
          try {
            const compressedBase64 = canvas.toDataURL('image/jpeg', adjustedQuality);
            const estimatedSize = Math.round(compressedBase64.length * 0.75);

            console.log(`✅ Image compressed: ${file.size} bytes -> ${estimatedSize} bytes`);

            // Validate the base64 string
            if (!compressedBase64 || compressedBase64.length < 100) {
              throw new Error('Invalid compressed image data');
            }

            resolve(compressedBase64);
          } catch (canvasError) {
            console.error('Canvas compression failed:', canvasError);
            // Fallback to original image
            console.log('📷 Falling back to original image');
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => {
              console.error('FileReader fallback error:', error);
              reject(new Error('Failed to process image'));
            };
            reader.readAsDataURL(file);
          }
        } catch (error) {
          console.error('Image processing error:', error);
          // Final fallback to original image
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to process image'));
          reader.readAsDataURL(file);
        }
      };

      img.onerror = error => {
        console.error('Image load error:', error);
        console.log('📷 Image load failed, using original file');
        // Fallback to original image
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = readerError => {
          console.error('FileReader fallback error:', readerError);
          reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(file);
      };

      // Convert file to base64 to load into image with timeout
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const result = e.target?.result as string;
          if (!result) {
            reject(new Error('Failed to read image data'));
            return;
          }
          img.src = result;
        } catch (error) {
          console.error('Error setting image src:', error);
          reject(new Error('Failed to load image'));
        }
      };
      reader.onerror = error => {
        console.error('FileReader error:', error);
        reject(new Error('Failed to read image file'));
      };
      reader.readAsDataURL(file);

      // Add timeout for mobile devices
      setTimeout(() => {
        if (img.complete === false) {
          console.warn('Image loading timeout, trying fallback');
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Image processing timeout'));
          reader.readAsDataURL(file);
        }
      }, 10000);
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
