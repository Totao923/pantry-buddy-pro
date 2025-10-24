import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract the JWT token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization header');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Please sign in',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerSupabaseClient();

    // Verify the token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Please sign in',
      });
    }

    const userId = user.id;

    // Get time range from query parameter (optional)
    const timeRange = req.query.timeRange as '7days' | '30days' | '90days' | '1year' | undefined;

    console.log(`🔍 Loading ingredients for ${user.email} from database...`, { timeRange });

    // Build query
    let query = supabase.from('pantry_items').select('*').eq('user_id', userId);

    // Apply time filter if specified
    if (timeRange) {
      const now = new Date();
      const daysBack = {
        '7days': 7,
        '30days': 30,
        '90days': 90,
        '1year': 365,
      }[timeRange];
      const fromDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', fromDate.toISOString());
      console.log(`📅 Filtering by date: ${fromDate.toISOString()} to ${now.toISOString()}`);
    }

    const { data: pantryItems, error } = await query.order('created_at', { ascending: false });

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
        email: user.email,
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
        categoryBreakdown: Object.entries(
          ingredients.reduce(
            (acc, item) => {
              const category = item.category;
              if (!acc[category]) {
                acc[category] = { count: 0, value: 0 };
              }
              acc[category].count += 1;
              if (item.price) {
                acc[category].value += item.price * parseFloat(item.quantity || '1');
              }
              return acc;
            },
            {} as Record<string, { count: number; value: number }>
          )
        ).map(([category, data]) => ({
          category,
          count: data.count,
          value: data.value,
        })),
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
