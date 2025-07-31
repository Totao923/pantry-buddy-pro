# AI Recipe Generation Setup Guide

This guide will help you set up AI-powered recipe generation using Claude API.

## Prerequisites

1. Node.js 18+ installed
2. A Claude API key from Anthropic

## Getting Your Claude API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in to your account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-ant-`)

## Setup Instructions

### 1. Environment Configuration

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Claude API key:

   ```env
   # Required: Your Claude API key
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here

   # Optional: AI Configuration
   AI_PROVIDER=anthropic
   AI_MODEL=claude-3-sonnet-20240229
   AI_TEMPERATURE=0.7
   MAX_TOKENS=2000

   # Optional: Feature Flags
   ENABLE_AI_RECIPES=true
   AI_FALLBACK_TO_MOCK=true
   AI_CACHE_ENABLED=true
   ```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

## Available Models

You can configure different Claude models by setting `AI_MODEL` in your `.env.local`:

- `claude-3-opus-20240229` - Most capable, highest cost
- `claude-3-sonnet-20240229` - Balanced performance and cost (recommended)
- `claude-3-haiku-20240307` - Fastest, lowest cost

## Configuration Options

### AI Provider Settings

- `AI_PROVIDER`: Set to "anthropic" for Claude
- `AI_MODEL`: Claude model to use
- `AI_TEMPERATURE`: Creativity level (0.0-2.0, default: 0.7)
- `MAX_TOKENS`: Maximum response length (default: 2000)

### Feature Flags

- `ENABLE_AI_RECIPES`: Enable/disable AI recipe generation
- `AI_FALLBACK_TO_MOCK`: Fall back to mock engine if AI fails
- `AI_CACHE_ENABLED`: Cache AI responses to reduce API calls

### Rate Limiting

- `AI_REQUESTS_PER_MINUTE`: Max requests per minute (default: 10)
- `AI_REQUESTS_PER_HOUR`: Max requests per hour (default: 100)

## How It Works

1. **Smart Prompting**: The app analyzes your ingredients, preferences, and cooking experience to create optimized prompts
2. **AI Generation**: Claude generates personalized recipes based on your specific needs
3. **Quality Assessment**: Generated recipes are evaluated for quality and feasibility
4. **Fallback System**: If AI generation fails, the app falls back to the built-in recipe engine
5. **Caching**: Responses are cached to reduce API costs and improve performance

## Cost Management

- Typical recipe generation costs $0.01-0.03 per request
- Caching reduces repeat requests
- Rate limiting prevents excessive usage
- Choose `claude-3-haiku` for lower costs
- Monitor usage in Anthropic console

## Troubleshooting

### "AI features disabled"

- Check that `ENABLE_AI_RECIPES=true` in `.env.local`
- Verify your API key is correct
- Ensure you have API credits in your Anthropic account

### "Rate limit exceeded"

- Wait for the rate limit to reset
- Adjust rate limits in environment variables
- Consider upgrading your Anthropic plan

### "Failed to generate recipe"

- Check your internet connection
- Verify API key is valid and has credits
- The app will fallback to mock engine automatically

### "Recipe quality below threshold"

- This is normal - the app will retry with different prompts
- You can adjust quality thresholds in the code
- Fallback engine will be used if quality remains low

## Features

### AI-Powered Recipe Generation

- Personalized recipes based on available ingredients
- Experience level adaptation (beginner to expert)
- Cuisine preferences and dietary restrictions
- Nutritional optimization
- Creative ingredient combinations

### Smart Prompting

- Context-aware prompt engineering
- Historical preference learning
- Ingredient prioritization (uses expiring items first)
- Dietary restriction enforcement

### Quality Assurance

- Recipe quality scoring
- Ingredient utilization assessment
- Instruction clarity validation
- Nutritional balance evaluation

### Cost Optimization

- Intelligent caching system
- Rate limiting to prevent overuse
- Fallback to mock engine
- Usage analytics and monitoring

## Advanced Configuration

For production deployments, consider:

1. Using environment-specific configurations
2. Setting up monitoring and alerting
3. Implementing user-specific rate limits
4. Adding recipe quality metrics
5. Configuring database storage for caching

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify environment configuration
3. Test your API key with a simple request
4. Review the Anthropic console for usage and errors

For development questions, refer to:

- [Anthropic API Documentation](https://docs.anthropic.com)
- [Next.js Documentation](https://nextjs.org/docs)
- Project README.md
