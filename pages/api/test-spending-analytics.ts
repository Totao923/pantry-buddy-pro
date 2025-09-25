import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient } from '../../lib/supabase/client';
import { databaseIngredientService } from '../../lib/services/databaseIngredientService';
import { receiptService } from '../../lib/services/receiptService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Testing spending analytics data...');

    // Check authentication first
    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('🔍 Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      authError: authError?.message,
    });

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get ingredients from database
    const ingredients = await databaseIngredientService.getAllIngredients();
    console.log('🔍 Database ingredients:', {
      total: ingredients.length,
      withPrice: ingredients.filter(i => i.price).length,
      withReceiptSource: ingredients.filter(i => i.priceSource === 'receipt').length,
      receiptIngredients: ingredients
        .filter(i => i.priceSource === 'receipt' && i.price)
        .map(i => ({ name: i.name, price: i.price, category: i.category })),
    });

    // Test receipt service
    const receiptAnalytics = await receiptService.getSpendingAnalytics(user.id, '7days');
    const userReceipts = await receiptService.getUserReceipts(user.id);

    console.log('🔍 Receipt service data:', {
      receiptAnalytics,
      userReceiptsCount: userReceipts.length,
    });

    // Create synthetic receipts from ingredients (like analytics page does)
    const receiptIngredients = ingredients.filter(
      item => item.priceSource === 'receipt' && item.price && item.price > 0
    );

    const syntheticReceipts =
      receiptIngredients.length > 0
        ? [
            {
              id: 'synthetic-1',
              user_id: user.id,
              store_name: 'Various Stores',
              receipt_date: new Date().toISOString().split('T')[0],
              total_amount: receiptIngredients.reduce((sum, item) => sum + item.price!, 0),
              items: receiptIngredients.map(item => ({
                name: item.name,
                category: item.category,
                price: item.price!,
                quantity: parseFloat(item.quantity || '1'),
              })),
            },
          ]
        : [];

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        ingredients: {
          total: ingredients.length,
          withPrice: ingredients.filter(i => i.price).length,
          withReceiptSource: ingredients.filter(i => i.priceSource === 'receipt').length,
          receiptItems: receiptIngredients.map(i => ({
            name: i.name,
            price: i.price,
            category: i.category,
            quantity: i.quantity,
          })),
        },
        receiptService: {
          analytics: receiptAnalytics,
          receiptsCount: userReceipts.length,
        },
        syntheticReceipts: syntheticReceipts,
        totalSpending: receiptIngredients.reduce((sum, item) => sum + item.price!, 0),
      },
    });
  } catch (error) {
    console.error('❌ Error testing spending analytics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
