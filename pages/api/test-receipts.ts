import { NextApiRequest, NextApiResponse } from 'next';
import { receiptService } from '../../lib/services/receiptService';
import { createSupabaseClient } from '../../lib/supabase/client';
import { getSupabaseClient } from '../../lib/config/supabase';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Creating test receipt data...');

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

    // Create test receipt data with proper UUIDs
    const receiptId = uuidv4();
    const testReceiptData = {
      id: receiptId,
      storeName: 'Whole Foods Market',
      receiptDate: new Date(),
      totalAmount: 87.43,
      taxAmount: 7.85,
      items: [
        {
          id: uuidv4(),
          name: 'Organic Chicken Breast',
          quantity: 2,
          unit: 'lbs',
          price: 24.98,
          category: 'protein' as const,
          confidence: 0.95,
        },
        {
          id: uuidv4(),
          name: 'Fresh Spinach',
          quantity: 1,
          unit: 'bag',
          price: 3.49,
          category: 'vegetables' as const,
          confidence: 0.92,
        },
        {
          id: uuidv4(),
          name: 'Whole Milk',
          quantity: 1,
          unit: 'gallon',
          price: 4.99,
          category: 'dairy' as const,
          confidence: 0.98,
        },
        {
          id: uuidv4(),
          name: 'Sourdough Bread',
          quantity: 1,
          unit: 'loaf',
          price: 5.99,
          category: 'grains' as const,
          confidence: 0.89,
        },
        {
          id: uuidv4(),
          name: 'Bananas',
          quantity: 3,
          unit: 'lbs',
          price: 2.97,
          category: 'fruits' as const,
          confidence: 0.94,
        },
      ],
      rawText: 'WHOLE FOODS MARKET\n123 Main St\nTest Receipt\nTotal: $87.43',
      confidence: 0.93,
    };

    // Direct database insert to test table creation and bypass complex receiptService
    const supabaseServiceClient = getSupabaseClient();

    // Insert receipt record directly
    const { data: receipt, error: receiptError } = await supabaseServiceClient
      .from('receipts')
      .insert({
        id: testReceiptData.id,
        user_id: user.id,
        store_name: testReceiptData.storeName,
        receipt_date: testReceiptData.receiptDate.toISOString().split('T')[0],
        total_amount: testReceiptData.totalAmount,
        tax_amount: testReceiptData.taxAmount,
        raw_text: testReceiptData.rawText,
        confidence: testReceiptData.confidence,
      })
      .select()
      .single();

    if (receiptError) {
      console.error('❌ Direct insert failed:', receiptError);
      throw new Error(`Receipt insert failed: ${receiptError.message}`);
    }

    // Insert receipt items directly
    if (testReceiptData.items.length > 0) {
      const { error: itemsError } = await supabaseServiceClient.from('receipt_items').insert(
        testReceiptData.items.map(item => ({
          id: item.id,
          receipt_id: testReceiptData.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          category: item.category || 'other',
          confidence: item.confidence,
        }))
      );

      if (itemsError) {
        console.error('❌ Items insert failed:', itemsError);
        throw new Error(`Receipt items insert failed: ${itemsError.message}`);
      }
    }

    // If we reach here, the save was successful
    console.log('✅ Test receipt saved successfully');
    res.status(200).json({
      success: true,
      message: 'Test receipt created successfully',
      receiptId: testReceiptData.id,
    });
  } catch (error) {
    console.error('❌ Error creating test receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test receipt',
    });
  }
}
