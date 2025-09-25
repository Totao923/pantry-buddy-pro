import { NextApiRequest, NextApiResponse } from 'next';
import { ingredientServiceFactory } from '../../lib/services/ingredientServiceFactory';
import { databaseIngredientService } from '../../lib/services/databaseIngredientService';
import { createSupabaseClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Debug: Checking service factory state...');

    // Check Supabase authentication directly
    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('🔍 Direct Supabase auth check:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      authError: authError?.message,
    });

    // Check database service availability
    const isDatabaseAvailable = await databaseIngredientService.isAvailable();
    console.log('🔍 Database service availability:', isDatabaseAvailable);

    // Check factory initialization
    const currentServiceType = ingredientServiceFactory.getCurrentServiceType();
    console.log('🔍 Current service type:', currentServiceType);

    // Force factory re-initialization
    console.log('🔍 Forcing factory re-initialization...');
    await ingredientServiceFactory.reinitialize();
    const newServiceType = ingredientServiceFactory.getCurrentServiceType();
    console.log('🔍 New service type after reinit:', newServiceType);

    // Test database query if user is authenticated
    let pantryQueryResult = null;
    if (user) {
      try {
        const { data, error } = await supabase
          .from('pantry_items')
          .select('id, name, price, user_id')
          .eq('user_id', user.id)
          .limit(5);

        pantryQueryResult = {
          success: !error,
          count: data?.length || 0,
          items: data || [],
          error: error?.message,
        };
        console.log('🔍 Direct pantry query result:', pantryQueryResult);
      } catch (err) {
        pantryQueryResult = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    }

    const debugInfo = {
      supabaseAuth: {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        authError: authError?.message,
      },
      databaseService: {
        isAvailable: isDatabaseAvailable,
      },
      serviceFactory: {
        originalType: currentServiceType,
        newTypeAfterReinit: newServiceType,
      },
      directPantryQuery: pantryQueryResult,
    };

    console.log('🔍 Complete debug info:', debugInfo);

    res.status(200).json({
      success: true,
      data: debugInfo,
    });
  } catch (error) {
    console.error('❌ Error debugging service factory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to debug service factory',
    });
  }
}
