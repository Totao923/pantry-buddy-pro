import { NextApiRequest, NextApiResponse } from 'next';
import { receiptService } from '../../lib/services/receiptService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Debugging user receipts with receiptService...');

    const userId = '21fc3c81-a66a-4cf3-be35-c2b70a900864'; // hescoto@icloud.com

    // Get receipts using the same method as analytics
    const userReceipts = await receiptService.getUserReceipts(userId).catch(e => {
      console.error('❌ Error from receiptService:', e);
      return [];
    });

    console.log('✅ receiptService returned:', userReceipts.length, 'receipts');

    res.status(200).json({
      success: true,
      receiptCount: userReceipts.length,
      receipts: userReceipts.map(r => ({
        id: r.id,
        storeName: r.storeName,
        receiptDate: r.receiptDate,
        totalAmount: r.totalAmount,
        itemCount: r.items?.length || 0,
      })),
      storeNames: [...new Set(userReceipts.map(r => r.storeName))],
    });
  } catch (error) {
    console.error('❌ Error debugging receipts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
