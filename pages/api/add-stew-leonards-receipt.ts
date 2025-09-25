import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("🏪 Adding Stew Leonard's receipt...");

    const supabase = createServerSupabaseClient();
    const userId = '21fc3c81-a66a-4cf3-be35-c2b70a900864'; // hescoto@icloud.com

    // Create Stew Leonard's receipt
    const receiptId = uuidv4();
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        id: receiptId,
        user_id: userId,
        store_name: 'STEW LEONARDS',
        receipt_date: '2025-07-20', // 3 days before CTown receipt
        total_amount: 45.67,
        tax_amount: 3.65,
        raw_text: 'STEW LEONARDS\n123 Store St\nReceipt\nTotal: $45.67',
        confidence: 0.9,
      })
      .select()
      .single();

    if (receiptError) {
      console.error('❌ Receipt insert failed:', receiptError);
      throw new Error(`Receipt insert failed: ${receiptError.message}`);
    }

    console.log("✅ Stew Leonard's receipt created successfully");
    res.status(200).json({
      success: true,
      message: "Stew Leonard's receipt created successfully",
      receiptId: receiptId,
    });
  } catch (error) {
    console.error("❌ Error creating Stew Leonard's receipt:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create Stew Leonard's receipt",
    });
  }
}
