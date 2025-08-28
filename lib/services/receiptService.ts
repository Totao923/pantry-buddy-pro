import { v4 as uuidv4 } from 'uuid';
import { IngredientCategory } from '../../types';
import { getSupabaseClient } from '../config/supabase';
import { databaseSettingsService } from './databaseSettingsService';

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

    // Strategy 1: Look for items with more flexible parsing
    let inItemSection = false;
    let pendingItemName = '';
    const sectionHeaders = ['GROCERY', 'PRODUCE', 'DAIRY', 'MEAT', 'FROZEN', 'BAKERY', 'DELI'];
    let startedItemProcessing = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 2) continue;

      // Start collecting items after explicit section headers OR after reasonable number of header lines
      if (sectionHeaders.some(header => line === header || line.includes(header))) {
        inItemSection = true;
        startedItemProcessing = true;
        console.log(`📦 Entering section: ${line}`);
        continue;
      }

      // Skip obvious store header lines (first few lines with store info)
      if (!startedItemProcessing && this.isStoreHeaderLine(line, i)) {
        console.log(`⏭️ Skipping store header line: "${line}"`);
        continue;
      }

      // Start processing items after store header section
      if (!startedItemProcessing && i >= 0) {
        inItemSection = true;
        startedItemProcessing = true;
        console.log('📦 Starting item processing after store headers');
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

      // Skip tare items and handle coupons
      if (this.isTareOrSpecialItem(line)) {
        console.log(`⏭️ Skipping tare/special item: "${line}"`);
        continue;
      }

      // Handle coupons as deductions (don't add as items but log for totals)
      if (this.isCoupon(line)) {
        console.log(`💰 Coupon detected: "${line}"`);
        // Don't add coupons as items, they're deductions
        continue;
      }

      // Pattern 1: Price line following item name
      const priceOnlyMatch = line.match(/^(?:\$)?(\d+\.\d{2})\s*([A-Z]*)?$/);
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
        /^(.+?)\s+(\d+\.\d{2})\s*([A-Z]*)?$/, // "Item Name X.XX F"
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
    ];

    // Only treat 'total' as end if it has a dollar amount or comes after items
    const hasTotalWithAmount = line.match(/total.*\$\d+\.\d{2}/i);
    const isSimpleTotal = line.toLowerCase().trim() === 'total' && line.includes('$');

    const lowerLine = line.toLowerCase();
    return (
      endMarkers.some(marker => lowerLine.includes(marker)) ||
      hasTotalWithAmount ||
      isSimpleTotal ||
      !!line.match(/tax.*\$\d+\.\d{2}/i)
    );
  }

  private couldBeItemName(line: string): boolean {
    // More lenient check for potential item names
    if (line.length < 3 || line.length > 100) return false;

    // Skip obvious non-items
    if (this.isSkippableLine(line.toLowerCase())) return false;

    // Skip store information lines anywhere in the receipt
    if (this.isStoreInfoLine(line)) return false;

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
    const sectionHeaders = ['GROCERY', 'PRODUCE', 'DAIRY', 'MEAT', 'FROZEN', 'BAKERY', 'DELI'];

    let foundSectionHeader = false;
    let inItemSection = false;

    // Look for any line that could be an item (but respect section boundaries)
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Skip very short or long lines
      if (trimmed.length < 4 || trimmed.length > 80) continue;

      // Check if we hit a section header
      if (sectionHeaders.some(header => trimmed === header || trimmed.includes(header))) {
        foundSectionHeader = true;
        inItemSection = true;
        console.log(`🔄 Fallback found section: ${trimmed}`);
        continue;
      }

      // If no section header found, start processing items immediately
      if (!foundSectionHeader && i >= 0) {
        inItemSection = true;
      }

      // Only process items after we've found a section header OR started processing
      if (!inItemSection) {
        continue;
      }

      // Stop at totals/end section
      if (this.isEndOfItems(trimmed)) {
        console.log(`🔄 Fallback reached end: ${trimmed}`);
        break;
      }

      // Skip if it's obviously not an item
      if (this.isSkippableLine(trimmed.toLowerCase())) continue;

      // Skip store information lines anywhere in the receipt
      if (this.isStoreInfoLine(trimmed)) continue;

      // Skip obvious header patterns (store names, addresses, etc.)
      if (this.isHeaderLine(trimmed, i)) continue;

      // Skip tare items and coupons in fallback too
      if (this.isTareOrSpecialItem(trimmed)) {
        console.log(`🔄 Fallback skipping tare: "${trimmed}"`);
        continue;
      }

      if (this.isCoupon(trimmed)) {
        console.log(`🔄 Fallback skipping coupon: "${trimmed}"`);
        continue;
      }

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
    return fallbackItems.slice(0, 15); // Reduced limit to avoid false positives
  }

  private isStoreHeaderLine(line: string, lineIndex: number): boolean {
    // Only check first 4 lines for store headers
    if (lineIndex > 3) return false;

    return this.isStoreInfoLine(line);
  }

  private isStoreInfoLine(line: string): boolean {
    // Phone number patterns (most specific first)
    if (line.match(/^\(\d{3}\)-?\d{3}-?\d{4}$/)) {
      return true; // "(201)-649-0888"
    }

    // City, state, zip patterns
    if (line.match(/^[A-Z\s]+,\s+[A-Z]{2}\s+\d{5}$/)) {
      return true; // "PARAMUS, NJ 07652"
    }

    // Address patterns (number followed by street name)
    if (line.match(/^\d+\s+[A-Za-z\s]+$/) && !line.match(/\d+\.\d{2}/)) {
      return true; // "700 Paramus Park"
    }

    // Store names - be more specific to avoid grocery items
    // Look for patterns that are likely store names vs grocery items
    if (line.match(/^[A-Za-z\s&'-]+$/) && !line.match(/\d+\.\d{2}/)) {
      // Common store name patterns
      if (
        line.match(/'s$/) || // "Leonard's", "McDonald's"
        line.match(
          /\b(store|market|shop|mart|foods|grocery|company|inc|corp|llc|supermarket)\b/i
        ) ||
        line.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/)
      ) {
        // "Stew Leonard"
        return true;
      }

      // Specific CTown patterns
      if (line.match(/^(CTOWN|TOWN)$/i)) {
        return true; // Store name components
      }

      // Transaction/receipt info patterns
      if (line.match(/^(SE|DUPLICATE|\*+\s*DUPLICATE\s*\*+)$/i)) {
        return true;
      }

      // If it looks like a grocery abbreviation, don't filter it
      if (
        line.match(
          /\b(CRM|MLK|CHZ|BRD|YGT|LTT|TOM|APP|ORG|GRFK|VAN|ICE|OAT|PLNT|CHIA|SEED|SODA|CRACKERS|BLEACH|COLA|CHERRY|COCONUT|JUICE)\b/i
        )
      ) {
        return false; // Keep grocery abbreviations and food words
      }
    }

    return false;
  }

  private isHeaderLine(line: string, lineIndex: number): boolean {
    // Skip lines that look like store headers (first 15 lines of receipt)
    if (lineIndex < 15) {
      // Store names are usually all caps and don't contain prices
      if (line.match(/^[A-Z\s&'-]+$/) && !line.match(/\$\d+\.\d{2}/)) {
        return true;
      }

      // Skip lines with common header patterns
      const headerPatterns = [
        /supermarket/i,
        /market/i,
        /store/i,
        /phone/i,
        /address/i,
        /hours/i,
        /welcome/i,
        /thank you/i,
        /cashier/i,
        /register/i,
      ];

      if (headerPatterns.some(pattern => pattern.test(line))) {
        return true;
      }
    }

    return false;
  }

  private isTareOrSpecialItem(line: string): boolean {
    const lowerLine = line.toLowerCase();

    // Tare patterns
    const tarePatterns = [/^tare\b/i, /\btare\b/i, /^bag\s*tare/i, /container\s*tare/i];

    // Other non-product items to skip
    const skipPatterns = [
      /^bottle\s*deposit/i,
      /^bottle\s*sale/i,
      /bottle\s*dep/i,
      /^bag\s*fee/i,
      /^env\s*fee/i,
      /environmental\s*fee/i,
      /^deposit\b/i,
      /^refund\b/i,
      /^return\b/i,
      /^markdown/i,
      /\bmarkdown\b/i,
    ];

    return (
      tarePatterns.some(pattern => pattern.test(lowerLine)) ||
      skipPatterns.some(pattern => pattern.test(lowerLine))
    );
  }

  private isCoupon(line: string): boolean {
    const lowerLine = line.toLowerCase();

    const couponPatterns = [
      /coupon/i,
      /\bcpn\b/i,
      /discount/i,
      /savings/i,
      /promo/i,
      /sale/i,
      /off\s*\$/i,
      /\$\s*off/i,
      /manufacturer/i,
      /store\s*coupon/i,
      /digital\s*coupon/i,
      /loyalty/i,
      /member\s*price/i,
      /special\s*offer/i,
    ];

    // Also check if the line contains a negative price (deduction)
    const hasNegativePrice = line.match(/-\$\d+\.\d{2}/) || line.match(/\$-\d+\.\d{2}/);

    return couponPatterns.some(pattern => pattern.test(lowerLine)) || !!hasNegativePrice;
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

      // Non-product items
      'tare',
      'bag fee',
      'bottle deposit',
      'environmental fee',
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
    // First expand abbreviated names
    let expanded = this.expandAbbreviations(name);

    // Remove common store prefixes/suffixes and clean up
    return expanded
      .replace(/^(ORGANIC|ORG)\s+/i, '')
      .replace(/\s+(ORGANIC|ORG)$/i, '')
      .replace(/\s+\d+\s*(LB|OZ|CT|GAL)S?$/i, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private expandAbbreviations(name: string): string {
    // Common grocery item abbreviation mappings
    const abbreviations: Record<string, string> = {
      // Ice cream variations
      'HP VAN ICE CRM': 'Half Vanilla Ice Cream',
      'VAN ICE CRM': 'Vanilla Ice Cream',
      'CHOC ICE CRM': 'Chocolate Ice Cream',
      'STRAW ICE CRM': 'Strawberry Ice Cream',
      'ICE CRM': 'Ice Cream',

      // Milk variations
      'GARELCK 2% MILK': 'Garelick 2% Milk',
      GARELCK: 'Garelick Milk',
      '2% MILK': '2% Milk',
      'WHOLE MILK': 'Whole Milk',
      'SKIM MILK': 'Skim Milk',

      // Fruit variations
      'PLUM GRFK ORG': 'Plum Greek Organic',
      GRFK: 'Greek',

      // Pie and desserts
      'HALF APPLE PIE': 'Half Apple Pie',
      'APPLE PIE': 'Apple Pie',

      // Common abbreviations
      CHKN: 'Chicken',
      CHK: 'Chicken',
      BRD: 'Bread',
      MLK: 'Milk',
      CHZ: 'Cheese',
      BTR: 'Butter',
      YGT: 'Yogurt',
      CRM: 'Cream',
      LTT: 'Lettuce',
      TOM: 'Tomato',
      POT: 'Potato',
      BAN: 'Banana',
      APP: 'Apple',
      ORG: 'Orange',
      LMN: 'Lemon',
      LIM: 'Lime',
      AVK: 'Avocado',
      CUC: 'Cucumber',
      CAR: 'Carrot',
      ONI: 'Onion',
      GAR: 'Garlic',
      CEL: 'Celery',
      PEP: 'Pepper',
      BRC: 'Broccoli',
      SPN: 'Spinach',
      RIC: 'Rice',
      PAS: 'Pasta',
      CER: 'Cereal',
      EGG: 'Eggs',
      BAC: 'Bacon',
      HAM: 'Ham',
      BGF: 'Beef',
      PRK: 'Pork',
      FSH: 'Fish',
      SAL: 'Salmon',
      TUN: 'Tuna',
    };

    // Check for exact matches first
    const upperName = name.toUpperCase();
    if (abbreviations[upperName]) {
      return abbreviations[upperName];
    }

    // Check for partial matches and word-by-word expansion
    let expanded = name;
    Object.entries(abbreviations).forEach(([abbrev, full]) => {
      const regex = new RegExp(`\\b${abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      expanded = expanded.replace(regex, full);
    });

    return expanded;
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
  async saveReceiptData(
    receiptData: ExtractedReceiptData,
    userId: string,
    supabaseClient?: any
  ): Promise<void> {
    try {
      // Try to save to new receipt_history table first
      if (await databaseSettingsService.isAvailable()) {
        console.log('Saving receipt to new receipt_history table');
        const success = await databaseSettingsService.saveReceiptHistory(
          receiptData,
          receiptData.items.length,
          receiptData.totalAmount,
          receiptData.storeName
        );

        if (success) {
          console.log('Receipt saved to receipt_history successfully');
          return;
        }
      }

      // Fallback to legacy receipts table - use authenticated client if provided
      const supabase = supabaseClient || getSupabaseClient();

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

        // Enhanced error logging for debugging
        console.error('Receipt error details:');
        console.error('Error toString:', receiptError.toString());
        console.error('Error constructor:', receiptError.constructor.name);

        // Log each property individually
        const errorKeys = Object.keys(receiptError);
        console.error('Receipt error has', errorKeys.length, 'keys:', errorKeys);

        errorKeys.forEach(key => {
          console.error(`Receipt error.${key}:`, (receiptError as any)[key]);
        });

        // Also try to access common Supabase error properties
        console.error('Error properties summary:', {
          message: (receiptError as any).message || 'No message',
          code: (receiptError as any).code || 'No code',
          details: (receiptError as any).details || 'No details',
          hint: (receiptError as any).hint || 'No hint',
          status: (receiptError as any).status || 'No status',
          statusCode: (receiptError as any).statusCode || 'No statusCode',
          name: (receiptError as any).name || 'No name',
        });

        // Handle authentication errors and other Supabase errors gracefully
        if (
          receiptError.code === 'PGRST301' ||
          receiptError.code === '401' ||
          (receiptError as any).status === 401 ||
          receiptError.message?.includes('401') ||
          receiptError.message?.includes('JWT') ||
          receiptError.message?.includes('authorization') ||
          receiptError.message?.includes('unauthorized')
        ) {
          console.log('Authentication error detected, falling back to localStorage');
          // Force fallback to localStorage by throwing a specific error
          throw new Error('Authentication failed - using offline storage');
        }

        // For any other Supabase errors, also fall back gracefully
        console.log('Database error detected, falling back to localStorage');
        throw new Error('Database unavailable - using offline storage');
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
  async getUserReceipts(userId: string, supabaseClient?: any): Promise<ExtractedReceiptData[]> {
    try {
      const supabase = supabaseClient || getSupabaseClient();

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
