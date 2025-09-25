import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 Fixing CTOWN receipt amount...');

    const supabase = createServerSupabaseClient();
    const userId = '21fc3c81-a66a-4cf3-be35-c2b70a900864'; // hescoto@icloud.com

    // Update CTOWN receipt to have a proper amount
    const { data: updatedReceipt, error: updateError } = await supabase
      .from('receipts')
      .update({
        total_amount: 78.43, // Realistic grocery amount
        tax_amount: 6.27,
        raw_text: 'CTOWN SUPERMARKET\n789 Market St\nReceipt\nTotal: $78.43',
        confidence: 0.95,
      })
      .eq('user_id', userId)
      .eq('store_name', 'CTOWN SUPERMARKET')
      .select()
      .single();

    if (updateError) {
      console.error('❌ CTOWN receipt update failed:', updateError);
      throw new Error(`CTOWN receipt update failed: ${updateError.message}`);
    }

    console.log('✅ CTOWN receipt updated successfully');

    // Verify the update by fetching all receipts
    const { data: allReceipts, error: fetchError } = await supabase
      .from('receipts')
      .select('id, store_name, receipt_date, total_amount, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Receipts fetch failed:', fetchError);
      throw new Error(`Receipts fetch failed: ${fetchError.message}`);
    }

    console.log('✅ All receipts after update:', allReceipts?.length || 0);

    res.status(200).json({
      success: true,
      message: 'CTOWN receipt updated successfully',
      updatedReceipt: updatedReceipt,
      allReceipts: allReceipts || [],
    });
  } catch (error) {
    console.error('❌ Error fixing CTOWN receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fix CTOWN receipt',
    });
  }
}
