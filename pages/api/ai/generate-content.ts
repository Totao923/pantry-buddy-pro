import { NextApiRequest, NextApiResponse } from 'next';
import { getAIConfig, isAIEnabled } from '../../../lib/config/environment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Check if AI is enabled
    if (!isAIEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI services are currently disabled',
      });
    }

    const config = getAIConfig();

    // Initialize provider based on configuration
    let provider;
    if (config.provider === 'anthropic') {
      const { AnthropicProvider } = await import('../../../lib/ai/providers/anthropic');
      provider = new AnthropicProvider(config.apiKey);
    } else {
      return res.status(500).json({
        success: false,
        error: `Unsupported AI provider: ${config.provider}`,
      });
    }

    // Generate content
    const content = await provider.generateContent(prompt);

    return res.status(200).json({
      success: true,
      content,
      metadata: {
        provider: config.provider,
        model: config.model,
      },
    });
  } catch (error) {
    console.error('AI content generation API error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'AI generation failed',
    });
  }
}
