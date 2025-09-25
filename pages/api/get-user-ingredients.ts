import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Loading ingredients for hescoto@icloud.com from database...');

    // Use service role client to bypass RLS for testing
    const supabase = createServerSupabaseClient();
    const userId = '21fc3c81-a66a-4cf3-be35-c2b70a900864'; // hescoto@icloud.com

    const { data: pantryItems, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    console.log('✅ Found ingredients:', pantryItems?.length);

    // Convert to the format expected by analytics
    const ingredients =
      pantryItems?.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity?.toString(),
        unit: item.unit,
        price: item.price,
        priceSource: item.price ? 'receipt' : undefined,
        isProtein: item.category === 'protein',
        isVegetarian: item.category !== 'protein',
        isVegan: !['dairy', 'protein'].includes(item.category),
        expiryDate: item.expiry_date ? new Date(item.expiry_date) : undefined,
        nutritionalValue: item.nutritional_value,
      })) || [];

    const ingredientsWithPrice = ingredients.filter(i => i.price && i.price > 0);
    const receiptIngredients = ingredients.filter(i => i.priceSource === 'receipt');

    console.log('📊 Analytics data:', {
      totalIngredients: ingredients.length,
      ingredientsWithPrice: ingredientsWithPrice.length,
      receiptIngredients: receiptIngredients.length,
      totalValue: receiptIngredients.reduce(
        (sum, item) => sum + (item.price || 0) * parseFloat(item.quantity || '1'),
        0
      ),
    });

    res.status(200).json({
      success: true,
      user: {
        email: 'hescoto@icloud.com',
        id: userId,
      },
      ingredients,
      analytics: {
        totalIngredients: ingredients.length,
        ingredientsWithPrice: ingredientsWithPrice.length,
        receiptIngredients: receiptIngredients.length,
        totalValue: receiptIngredients.reduce(
          (sum, item) => sum + (item.price || 0) * parseFloat(item.quantity || '1'),
          0
        ),
        categoryBreakdown: ingredients.reduce(
          (acc, item) => {
            if (item.price) {
              acc[item.category] =
                (acc[item.category] || 0) + item.price * parseFloat(item.quantity || '1');
            }
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error('❌ Error loading user ingredients:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
