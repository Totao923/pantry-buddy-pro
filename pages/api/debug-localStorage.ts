import { NextApiRequest, NextApiResponse } from 'next';
import { ingredientService } from '../../lib/services/ingredientService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Debug: Checking localStorage ingredients data...');

    // Call the localStorage service directly
    const allIngredients = await ingredientService.getAllIngredients();

    const debugInfo = {
      source: 'localStorage',
      totalIngredients: allIngredients.length,
      ingredientsWithPrice: allIngredients.filter(i => i.price).length,
      ingredientsWithPriceSource: allIngredients.filter(i => i.priceSource).length,
      ingredientsWithReceiptSource: allIngredients.filter(i => i.priceSource === 'receipt').length,
      sampleIngredients: allIngredients.slice(0, 10).map(i => ({
        name: i.name,
        price: i.price,
        priceSource: i.priceSource,
        category: i.category,
        quantity: i.quantity,
      })),
      receiptIngredients: allIngredients
        .filter(i => i.priceSource === 'receipt' && i.price)
        .map(i => ({
          name: i.name,
          price: i.price,
          category: i.category,
        })),
    };

    console.log('🔍 LocalStorage ingredients debug info:', debugInfo);

    res.status(200).json({
      success: true,
      data: debugInfo,
    });
  } catch (error) {
    console.error('❌ Error debugging localStorage ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to debug localStorage ingredients',
    });
  }
}
