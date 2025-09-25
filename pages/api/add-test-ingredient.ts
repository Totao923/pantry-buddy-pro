import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Adding test ingredient to database (server-side)...');

    // Use service role client to bypass RLS for testing
    const supabase = createServerSupabaseClient();

    const testIngredient = {
      user_id: '21fc3c81-a66a-4cf3-be35-c2b70a900864', // hescoto@icloud.com user ID
      name: 'Test Receipt Item from Database',
      category: 'other',
      quantity: 1,
      unit: 'piece',
      price: 15.99,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pantry_items')
      .insert([testIngredient])
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log('✅ Test ingredient added successfully:', data);

    // Now test retrieval
    const { data: allItems, error: fetchError } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', '21fc3c81-a66a-4cf3-be35-c2b70a900864');

    if (fetchError) {
      console.error('❌ Database fetch error:', fetchError);
    } else {
      console.log('✅ All user items:', allItems?.length);
    }

    res.status(200).json({
      success: true,
      message: 'Test ingredient added to database',
      ingredient: data,
      totalUserItems: allItems?.length || 0,
    });
  } catch (error) {
    console.error('❌ Error adding test ingredient:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
