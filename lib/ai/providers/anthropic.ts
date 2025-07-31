import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIGenerationOptions, AIRecipeResponse } from '../types';

export class AnthropicProvider implements AIProvider {
  public readonly name = 'anthropic';
  private client: Anthropic;
  private defaultModel = 'claude-3-sonnet-20240229';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateRecipe(
    prompt: string,
    options: AIGenerationOptions = {}
  ): Promise<AIRecipeResponse> {
    const startTime = Date.now();

    try {
      const message = await this.client.messages.create({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        system: options.systemPrompt || this.getDefaultSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseTime = Date.now() - startTime;
      const responseText = message.content[0]?.type === 'text' ? message.content[0].text : '';
      const recipe = this.parseRecipeFromResponse(responseText);

      if (!recipe) {
        throw new Error('Failed to parse recipe from AI response');
      }

      return {
        success: true,
        recipe,
        usage: {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
          cost: this.calculateCost(message.usage.input_tokens, message.usage.output_tokens),
        },
        metadata: {
          model: message.model,
          provider: this.name,
          responseTime,
          cacheHit: false,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          model: options.model || this.defaultModel,
          provider: this.name,
          responseTime: Date.now() - startTime,
          cacheHit: false,
        },
      };
    }
  }

  private getDefaultSystemPrompt(): string {
    return `You are a professional chef and culinary expert specializing in creating personalized recipes. Your task is to generate detailed, practical recipes based on available ingredients and user preferences.

IMPORTANT: You must respond with a valid JSON object that matches this exact schema:

{
  "title": "Recipe Name",
  "description": "Brief description of the dish",
  "cuisine": "cuisine_type",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 25,
  "totalTime": 40,
  "difficulty": "Easy|Medium|Hard",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": 1,
      "unit": "cup|tbsp|tsp|piece|etc",
      "optional": false
    }
  ],
  "instructions": [
    {
      "step": 1,
      "instruction": "Detailed cooking instruction",
      "duration": 5,
      "temperature": 350
    }
  ],
  "nutritionInfo": {
    "calories": 450,
    "protein": 25,
    "carbs": 35,
    "fat": 18,
    "fiber": 5,
    "sugar": 8,
    "sodium": 650,
    "cholesterol": 75
  },
  "dietaryInfo": {
    "isVegetarian": false,
    "isVegan": false,
    "isGlutenFree": false,
    "isDairyFree": false,
    "isKeto": false,
    "isPaleo": false,
    "allergens": ["gluten", "dairy"]
  },
  "tips": [
    "Helpful cooking tip",
    "Another useful tip"
  ],
  "tags": ["quick", "healthy", "family-friendly"]
}

Guidelines:
- Create recipes that are practical and achievable
- Use ingredients efficiently and suggest substitutions when appropriate
- Adapt complexity based on experience level (beginner = simpler steps)
- Include accurate nutritional estimates
- Provide helpful cooking tips
- Ensure instructions are clear and detailed
- Consider dietary restrictions and preferences
- Make recipes that taste great and are satisfying`;
  }

  private parseRecipeFromResponse(responseText: string): any {
    try {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonString = jsonMatch[0];
      const parsed = JSON.parse(jsonString);

      // Add required fields that might be missing
      const recipe = {
        id: Date.now().toString(),
        rating: 4.5,
        reviews: Math.floor(Math.random() * 100) + 10,
        variations: [],
        ...parsed,
      };

      // Validate required fields
      if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
        throw new Error('Recipe missing required fields');
      }

      return recipe;
    } catch (error) {
      console.error('Failed to parse recipe from AI response:', error);
      console.error('Response text:', responseText);
      return null;
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude 3 Sonnet pricing (as of 2024)
    // Input: $3 per million tokens
    // Output: $15 per million tokens
    const inputCost = (inputTokens / 1000000) * 300; // $3 = 300 cents
    const outputCost = (outputTokens / 1000000) * 1500; // $15 = 1500 cents
    return inputCost + outputCost;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Test' }],
      });
      return true;
    } catch (error) {
      console.error('Anthropic health check failed:', error);
      return false;
    }
  }

  getCostEstimate(prompt: string): number {
    // Rough estimate: ~1 token per 4 characters for input
    // Expect ~500-800 tokens for typical recipe output
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = 700;
    return this.calculateCost(estimatedInputTokens, estimatedOutputTokens);
  }

  // Helper method to get model information
  public getAvailableModels(): string[] {
    return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  }

  // Method to get pricing information
  public getPricingInfo() {
    return {
      'claude-3-opus-20240229': { input: 15, output: 75 }, // per million tokens in cents
      'claude-3-sonnet-20240229': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    };
  }
}
