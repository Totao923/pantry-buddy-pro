import { NextApiRequest, NextApiResponse } from 'next';
import { receiptService } from '../../lib/services/receiptService';
import { createSupabaseClient } from '../../lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Debugging receipts...');

    // Use the authenticated user directly from the request
    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'User not authenticated - please sign in first' });
    }

    console.log(`✅ Authenticated user: ${user.email} (${user.id})`);

    // Get receipts using the same method as analytics
    const userReceipts = await receiptService.getUserReceipts(user.id).catch(() => []);

    res.status(200).json({
      success: true,
      userReceipts: userReceipts.map(r => ({
        id: r.id,
        storeName: r.storeName,
        receiptDate: r.receiptDate,
        totalAmount: r.totalAmount,
        itemCount: r.items.length,
      })),
      receiptCount: userReceipts.length,
    });
  } catch (error) {
    console.error('❌ Error debugging receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to debug receipts',
    });
  }
}
