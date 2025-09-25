import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🗑️ Deleting all receipts...');

    // Get authenticated user
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated - please sign in first',
      });
    }

    console.log(`✅ Authenticated user: ${user.email} (${user.id})`);
    const userId = user.id;

    // Delete all receipts for the user
    const { data: deletedReceipts, error: deleteError } = await supabase
      .from('receipts')
      .delete()
      .eq('user_id', userId)
      .select();

    if (deleteError) {
      console.error('❌ Receipt deletion failed:', deleteError);
      throw new Error(`Receipt deletion failed: ${deleteError.message}`);
    }

    console.log('✅ Receipts deleted successfully:', deletedReceipts?.length || 0);

    // Verify deletion by fetching remaining receipts
    const { data: remainingReceipts, error: fetchError } = await supabase
      .from('receipts')
      .select('id, store_name, receipt_date, total_amount, user_id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('❌ Receipts verification failed:', fetchError);
      throw new Error(`Receipts verification failed: ${fetchError.message}`);
    }

    console.log('✅ Remaining receipts after deletion:', remainingReceipts?.length || 0);

    res.status(200).json({
      success: true,
      message: 'All receipts deleted successfully',
      deletedCount: deletedReceipts?.length || 0,
      remainingCount: remainingReceipts?.length || 0,
      deletedReceipts: deletedReceipts || [],
      remainingReceipts: remainingReceipts || [],
    });
  } catch (error) {
    console.error('❌ Error deleting receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete receipts',
    });
  }
}
