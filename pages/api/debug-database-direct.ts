import { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Debug: Checking database directly...');

    const supabase = createSupabaseClient();

    // Check all pantry items regardless of user
    const { data: allPantryItems, error: pantryError } = await supabase
      .from('pantry_items')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🔍 All pantry items:', {
      count: allPantryItems?.length || 0,
      error: pantryError?.message,
      items: allPantryItems?.slice(0, 5).map((item: any) => ({
        id: item.id,
        name: item.name,
        user_id: item.user_id,
        price: item.price,
        price_source: item.price_source,
        created_at: item.created_at,
      })),
    });

    // Check all receipts
    const { data: allReceipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🔍 All receipts:', {
      count: allReceipts?.length || 0,
      error: receiptsError?.message,
      receipts: allReceipts?.slice(0, 5).map((receipt: any) => ({
        id: receipt.id,
        user_id: receipt.user_id,
        store_name: receipt.store_name,
        total_amount: receipt.total_amount,
        created_at: receipt.created_at,
      })),
    });

    // Check user profiles to see what users exist
    const { data: allUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    console.log('🔍 All users:', {
      count: allUsers?.length || 0,
      error: usersError?.message,
      users: allUsers?.map((user: any) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      })),
    });

    // Filter pantry items by specific users we know about
    const targetUserId = '21fc3c81-a66a-4cf3-be35-c2b70a900864';
    const targetUserItems = allPantryItems?.filter(item => item.user_id === targetUserId) || [];

    console.log('🔍 Target user items:', {
      userId: targetUserId,
      count: targetUserItems.length,
      withPrice: targetUserItems.filter(item => item.price).length,
      withReceiptSource: targetUserItems.filter(item => item.price_source === 'receipt').length,
      items: targetUserItems.map(item => ({
        name: item.name,
        price: item.price,
        price_source: item.price_source,
        category: item.category,
      })),
    });

    res.status(200).json({
      success: true,
      data: {
        pantryItems: {
          total: allPantryItems?.length || 0,
          targetUser: targetUserItems.length,
          withPrice: targetUserItems.filter(item => item.price).length,
          withReceiptSource: targetUserItems.filter(item => item.price_source === 'receipt').length,
          items: targetUserItems.map(item => ({
            name: item.name,
            price: item.price,
            price_source: item.price_source,
            category: item.category,
            created_at: item.created_at,
          })),
        },
        receipts: {
          total: allReceipts?.length || 0,
          items:
            allReceipts?.map(receipt => ({
              id: receipt.id,
              user_id: receipt.user_id,
              store_name: receipt.store_name,
              total_amount: receipt.total_amount,
              created_at: receipt.created_at,
            })) || [],
        },
        users: {
          total: allUsers?.length || 0,
          list:
            allUsers?.map(user => ({
              id: user.id,
              email: user.email,
              created_at: user.created_at,
            })) || [],
        },
      },
    });
  } catch (error) {
    console.error('❌ Error debugging database directly:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
