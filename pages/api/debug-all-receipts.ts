import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Checking all receipts in database...');

    // Use service role client to bypass RLS
    const supabase = createServerSupabaseClient();

    // Filter for the specific user
    const targetUserId = '21fc3c81-a66a-4cf3-be35-c2b70a900864'; // hescoto@icloud.com

    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('id, store_name, receipt_date, total_amount, user_id')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    console.log('✅ Found receipts:', receipts?.length || 0);

    // Get unique store names
    const storeNames = [...new Set(receipts?.map(r => r.store_name) || [])];

    res.status(200).json({
      success: true,
      totalReceipts: receipts?.length || 0,
      receipts: receipts || [],
      uniqueStoreNames: storeNames,
      storeCount: storeNames.length,
    });
  } catch (error) {
    console.error('❌ Error checking receipts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
