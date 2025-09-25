import { NextApiRequest, NextApiResponse } from 'next';
import { databaseIngredientService } from '../../lib/services/databaseIngredientService';
import { createSupabaseClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Debug: Testing direct database service...');

    // Check authentication first
    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('🔍 Direct auth check:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      authError: authError?.message,
    });

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        debug: {
          authError: authError?.message,
          hasUser: !!user,
        },
      });
    }

    // Test database service availability
    const isAvailable = await databaseIngredientService.isAvailable();
    console.log('🔍 Database service availability:', isAvailable);

    // Try to get ingredients directly from database
    const ingredients = await databaseIngredientService.getAllIngredients();
    console.log('🔍 Database ingredients count:', ingredients.length);

    // Test creating a sample ingredient with receipt data
    console.log('🔍 Creating test receipt ingredient...');
    const testIngredient = await databaseIngredientService.createIngredient({
      name: 'Test Receipt Item',
      category: 'other',
      quantity: '1',
      unit: 'piece',
      price: 5.99,
      priceSource: 'receipt',
    });

    console.log('✅ Created test ingredient:', testIngredient);

    res.status(200).json({
      success: true,
      data: {
        authentication: {
          hasUser: !!user,
          userId: user.id,
          email: user.email,
        },
        databaseService: {
          isAvailable,
          ingredientsCount: ingredients.length,
          testIngredient: {
            id: testIngredient.id,
            name: testIngredient.name,
            price: testIngredient.price,
            priceSource: (testIngredient as any).priceSource,
          },
        },
      },
    });
  } catch (error) {
    console.error('❌ Error testing direct database:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
