import { v4 as uuidv4 } from 'uuid';
import { IngredientCategory } from '../../types';

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
  private readonly VISION_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_VISION_API_KEY;
  private readonly FALLBACK_OCR_ENABLED = true;

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
    // For demo/development, we'll use a mock OCR service
    // In production, this would integrate with Google Vision API or similar
    if (this.VISION_API_KEY) {
      return this.googleVisionOCR(imageBase64);
    } else {
      return this.mockOCRService(imageBase64);
    }
  }

  private async googleVisionOCR(imageBase64: string): Promise<OCRResult> {
    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.VISION_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageBase64.split(',')[1], // Remove data:image/jpeg;base64, prefix
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 1,
                  },
                ],
              },
            ],
          }),
        }
      );

      const result = await response.json();

      if (result.responses?.[0]?.textAnnotations?.[0]) {
        return {
          success: true,
          text: result.responses[0].textAnnotations[0].description,
          confidence: result.responses[0].textAnnotations[0].confidence || 0.8,
        };
      } else {
        return {
          success: false,
          error: 'No text detected in image',
        };
      }
    } catch (error) {
      console.error('Google Vision API error:', error);
      return {
        success: false,
        error: 'OCR service unavailable',
      };
    }
  }

  private async mockOCRService(imageBase64: string): Promise<OCRResult> {
    // Mock OCR service for development/demo
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

    const mockReceiptText = `
      WHOLE FOODS MARKET
      123 Main Street
      New York, NY 10001
      (212) 555-0123
      
      Date: ${new Date().toLocaleDateString()}
      Time: ${new Date().toLocaleTimeString()}
      
      Organic Bananas 2.5 lbs        $3.98
      Avocados Large 4 ct            $5.96
      Chicken Breast 1.2 lbs         $8.40
      Whole Milk 1 gal               $4.49
      Sourdough Bread                $3.99
      Olive Oil Extra Virgin         $12.99
      Spinach Organic 5 oz          $2.99
      Roma Tomatoes 1.5 lbs         $2.85
      Greek Yogurt Plain 32 oz      $5.99
      Brown Rice 2 lbs              $3.49
      
      Subtotal:                     $54.13
      Tax:                          $4.33
      Total:                        $58.46
      
      Payment: VISA ****1234
      Thank you for shopping!
    `;

    return {
      success: true,
      text: mockReceiptText,
      confidence: 0.85,
    };
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
      // This would integrate with Supabase to save receipt data
      // For now, we'll save to localStorage for development
      const existingReceipts = JSON.parse(localStorage.getItem('userReceipts') || '[]');
      const receiptWithUser = { ...receiptData, userId, createdAt: new Date().toISOString() };

      existingReceipts.push(receiptWithUser);
      localStorage.setItem('userReceipts', JSON.stringify(existingReceipts));

      console.log('Receipt saved successfully:', receiptData.id);
    } catch (error) {
      console.error('Failed to save receipt:', error);
      throw new Error('Failed to save receipt data');
    }
  }

  // Get user's receipt history
  async getUserReceipts(userId: string): Promise<ExtractedReceiptData[]> {
    try {
      const receipts = JSON.parse(localStorage.getItem('userReceipts') || '[]');
      return receipts
        .filter((receipt: any) => receipt.userId === userId)
        .sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    } catch (error) {
      console.error('Failed to get receipts:', error);
      return [];
    }
  }
}

export const receiptService = new ReceiptService();
