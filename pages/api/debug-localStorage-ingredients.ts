import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Directly check localStorage data (simulating browser context)
    const mockIngredients = [
      {
        id: 'test-receipt-1',
        name: 'Mock Receipt Item',
        category: 'other',
        quantity: '1',
        unit: 'piece',
        price: 12.99,
        priceSource: 'receipt',
        isProtein: false,
        isVegetarian: true,
        isVegan: true,
      },
    ];

    // This simulates what the localStorage service should have
    res.status(200).json({
      success: true,
      source: 'simulated localStorage',
      data: {
        totalIngredients: mockIngredients.length,
        ingredientsWithPrice: mockIngredients.filter(i => i.price).length,
        ingredientsWithReceiptSource: mockIngredients.filter(i => i.priceSource === 'receipt')
          .length,
        ingredients: mockIngredients,
      },
    });
  } catch (error) {
    console.error('❌ Error checking localStorage ingredients:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
