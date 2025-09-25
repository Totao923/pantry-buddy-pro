import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🧪 Testing database authentication and RLS...');

    const supabase = createSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        authError: authError?.message,
      });
    }

    console.log('✅ User authenticated:', {
      id: user.id,
      email: user.email,
    });

    // Test pantry items query (should work with RLS)
    const { data: pantryItems, error: pantryError } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', user.id);

    if (pantryError) {
      console.error('❌ Pantry query error:', pantryError);
    } else {
      console.log('✅ Pantry query successful:', pantryItems?.length, 'items');
    }

    // Test creating a pantry item (should work with authenticated user)
    const testItem = {
      user_id: user.id,
      name: 'Test Database Item',
      category: 'other',
      quantity: 1,
      unit: 'piece',
      price: 9.99,
    };

    const { data: newItem, error: createError } = await supabase
      .from('pantry_items')
      .insert([testItem])
      .select()
      .single();

    if (createError) {
      console.error('❌ Create item error:', createError);
    } else {
      console.log('✅ Item created successfully:', newItem);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      pantryItems: pantryItems?.length || 0,
      newItem: newItem || null,
      errors: {
        pantry: pantryError?.message,
        create: createError?.message,
      },
    });
  } catch (error) {
    console.error('❌ Database auth test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
