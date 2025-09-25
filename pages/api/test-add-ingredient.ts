import { NextApiRequest, NextApiResponse } from 'next';
import { getIngredientService } from '../../lib/services/ingredientServiceFactory';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🧪 Testing ingredient addition via factory...');

    // Test adding an ingredient using the same flow as receipt scanning
    const ingredientService = await getIngredientService();

    const testIngredient = await ingredientService.createIngredient({
      name: 'Test Receipt Item',
      category: 'other',
      quantity: '1',
      unit: 'piece',
      price: 5.99,
      priceSource: 'receipt',
    });

    console.log('✅ Test ingredient created:', testIngredient);

    // Get all ingredients to verify it was saved
    const allIngredients = await ingredientService.getAllIngredients();
    console.log('📦 Total ingredients after test:', allIngredients.length);

    res.status(200).json({
      success: true,
      data: {
        testIngredient,
        totalIngredients: allIngredients.length,
        ingredientsWithPrice: allIngredients.filter(i => i.price).length,
        ingredientsWithReceiptSource: allIngredients.filter(i => i.priceSource === 'receipt')
          .length,
        recentIngredients: allIngredients.slice(-3).map(i => ({
          name: i.name,
          price: i.price,
          priceSource: i.priceSource,
          category: i.category,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Error testing ingredient addition:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
