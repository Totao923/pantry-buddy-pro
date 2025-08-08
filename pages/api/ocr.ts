import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set timeout for mobile requests
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.log('⏰ OCR API timeout');
      res.status(408).json({
        success: false,
        error: 'Request timeout. Please try again with a smaller image.',
        source: 'timeout',
      });
    }
  }, 30000); // 30 second timeout

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    console.log(`🔍 OCR API called from ${isMobile ? 'mobile' : 'desktop'}`);
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      console.log('❌ No image data provided');
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: 'Image data is required',
      });
    }

    // Validate base64 format
    if (!imageBase64.startsWith('data:image/')) {
      console.log('❌ Invalid image format');
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: 'Invalid image format',
      });
    }

    console.log(`📷 Image data received, length: ${imageBase64.length}, mobile: ${isMobile}`);

    // Check image size limits
    const maxSize = isMobile ? 8 * 1024 * 1024 : 10 * 1024 * 1024; // 8MB mobile, 10MB desktop
    if (imageBase64.length > maxSize) {
      console.log(`❌ Image too large: ${imageBase64.length} bytes`);
      clearTimeout(timeout);
      return res.status(413).json({
        success: false,
        error: 'Image too large. Please use a smaller image.',
      });
    }

    const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

    console.log('🔑 API Key check:', {
      hasKey: !!VISION_API_KEY,
      keyLength: VISION_API_KEY?.length || 0,
      startsCorrect: VISION_API_KEY?.startsWith('AIzaSy') || false,
    });

    if (!VISION_API_KEY || VISION_API_KEY.includes('YOUR_')) {
      console.log('🧪 Using mock OCR service - API key not configured');
      clearTimeout(timeout);

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
        source: 'mock',
      });
    }

    console.log('🚀 Using Google Vision API for real OCR processing');

    // Call Google Vision API with mobile-friendly timeout
    const fetchTimeout = isMobile ? 20000 : 15000; // 20s mobile, 15s desktop
    const controller = new AbortController();
    const fetchTimeoutId = setTimeout(() => controller.abort(), fetchTimeout);

    try {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageBase64.split(',')[1], // Remove data:image/jpeg;base64, prefix
                },
                features: [
                  {
                    type: 'DOCUMENT_TEXT_DETECTION',
                    maxResults: 1,
                  },
                ],
                imageContext: {
                  languageHints: ['en'],
                },
              },
            ],
          }),
        }
      );

      clearTimeout(fetchTimeoutId);
      console.log('📡 Google Vision API response status:', response.status);

      if (!response.ok) {
        throw new Error(`Google Vision API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📋 Google Vision API result structure:', {
        hasResponses: !!result.responses,
        responseCount: result.responses?.length || 0,
        hasTextAnnotations: !!result.responses?.[0]?.textAnnotations,
        textAnnotationCount: result.responses?.[0]?.textAnnotations?.length || 0,
        error: result.error,
      });

      if (result.error) {
        console.error('❌ Google Vision API error:', result.error);
        clearTimeout(timeout);
        return res.status(400).json({
          success: false,
          error: `Vision API error: ${result.error.message}`,
          source: 'google-vision-error',
        });
      }

      const response0 = result.responses?.[0];
      let extractedText = '';
      let confidence = 0.8;

      // Try DOCUMENT_TEXT_DETECTION result first (more complete)
      if (response0?.fullTextAnnotation?.text) {
        extractedText = response0.fullTextAnnotation.text;
        confidence = 0.9;
        console.log('✅ Document text extracted (full), length:', extractedText.length);
      }
      // Fallback to TEXT_DETECTION result
      else if (response0?.textAnnotations?.[0]) {
        extractedText = response0.textAnnotations[0].description;
        confidence = response0.textAnnotations[0].confidence || 0.8;
        console.log('✅ Text extracted (basic), length:', extractedText.length);
      }

      clearTimeout(timeout);

      if (extractedText && extractedText.trim().length > 5) {
        console.log('📄 Sample extracted text (first 200 chars):', extractedText.substring(0, 200));
        return res.status(200).json({
          success: true,
          text: extractedText,
          confidence,
          source: 'google-vision',
        });
      } else {
        console.log('⚠️  No meaningful text detected in image');
        return res.status(200).json({
          success: false,
          error: 'No readable text found. Please ensure receipt is clear and well-lit.',
          source: 'google-vision',
        });
      }
    } catch (fetchError: any) {
      clearTimeout(fetchTimeoutId);
      console.error('Google Vision API fetch error:', fetchError);

      if (fetchError.name === 'AbortError') {
        console.log('⏰ Google Vision API timeout');
        clearTimeout(timeout);
        return res.status(408).json({
          success: false,
          error: 'Processing timed out. Please try again with a clearer or smaller image.',
          source: 'google-vision-timeout',
        });
      }

      throw fetchError;
    }
  } catch (error: any) {
    console.error('OCR API error:', error);
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      return res.status(408).json({
        success: false,
        error: 'Request timed out. Please try again.',
        source: 'timeout',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'OCR service temporarily unavailable. Please try again.',
      source: 'api-error',
    });
  }
}
