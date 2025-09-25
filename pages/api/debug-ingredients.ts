import { NextApiRequest, NextApiResponse } from 'next';
import { getIngredientService } from '../../lib/services/ingredientServiceFactory';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Debug: Checking ingredients data...');

    const ingredientService = await getIngredientService();
    const allIngredients = await ingredientService.getAllIngredients();

    const debugInfo = {
      totalIngredients: allIngredients.length,
      ingredientsWithPrice: allIngredients.filter(i => i.price).length,
      ingredientsWithPriceSource: allIngredients.filter(i => i.priceSource).length,
      ingredientsWithReceiptSource: allIngredients.filter(i => i.priceSource === 'receipt').length,
      sampleIngredients: allIngredients.slice(0, 5).map(i => ({
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

    console.log('🔍 Ingredients debug info:', debugInfo);

    res.status(200).json({
      success: true,
      data: debugInfo,
    });
  } catch (error) {
    console.error('❌ Error debugging ingredients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to debug ingredients',
    });
  }
}
