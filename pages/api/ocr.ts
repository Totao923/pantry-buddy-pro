import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

    if (!VISION_API_KEY || VISION_API_KEY.includes('YOUR_')) {
      console.log('🧪 Using mock OCR service - API key not configured');
      // Return mock data
      const mockReceiptText = `
        🧪 MOCK DATA - WHOLE FOODS MARKET
        123 Main Street
        New York, NY 10001
        (212) 555-0123
        
        Date: ${new Date().toLocaleDateString()}
        Time: ${new Date().toLocaleTimeString()}
        
        Organic Bananas 2.5 lbs        $3.98
        Avocados Large 4 ct            $5.96
        Chicken Breast 1.2 lbs         $8.40
        Whole Milk 1 gal               $4.49
        Sourdough Bread                $3.99
        Olive Oil Extra Virgin         $12.99
        Spinach Organic 5 oz          $2.99
        Roma Tomatoes 1.5 lbs         $2.85
        Greek Yogurt Plain 32 oz      $5.99
        Brown Rice 2 lbs              $3.49
        
        Subtotal:                     $54.13
        Tax:                          $4.33
        Total:                        $58.46
        
        Payment: VISA ****1234
        Thank you for shopping!
      `;

      return res.status(200).json({
        success: true,
        text: mockReceiptText,
        confidence: 0.85,
        source: 'mock'
      });
    }

    console.log('🚀 Using Google Vision API for real OCR processing');

    // Call Google Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64.split(',')[1], // Remove data:image/jpeg;base64, prefix
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await response.json();

    if (result.responses?.[0]?.textAnnotations?.[0]) {
      return res.status(200).json({
        success: true,
        text: result.responses[0].textAnnotations[0].description,
        confidence: result.responses[0].textAnnotations[0].confidence || 0.8,
        source: 'google-vision'
      });
    } else {
      return res.status(200).json({
        success: false,
        error: 'No text detected in image',
        source: 'google-vision'
      });
    }
  } catch (error) {
    console.error('OCR API error:', error);
    return res.status(500).json({
      success: false,
      error: 'OCR service unavailable',
      source: 'api-error'
    });
  }
}