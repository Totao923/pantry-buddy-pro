# Pantry Buddy Pro 🍳🤖

AI-powered pantry-based recipe generator that creates personalized, creative recipes from ingredients you already have at home using Claude AI.

## 🚀 NEW: Real AI Recipe Generation

Pantry Buddy now features **real AI-powered recipe generation** using Anthropic's Claude API!

### AI Features
- **Claude AI Integration**: Uses Claude 3 Sonnet for intelligent recipe creation
- **Smart Prompting**: Context-aware prompts that consider your ingredients, preferences, and experience level
- **Experience Adaptation**: Recipes automatically adjust from beginner to expert level
- **Quality Assurance**: AI responses are validated for quality and feasibility
- **Fallback System**: Seamless fallback to mock engine if AI is unavailable
- **Cost Optimization**: Intelligent caching and rate limiting to minimize API costs

## Core Features

- **Smart Ingredient Management**: Add ingredients with expiry tracking and smart categorization
- **Pantry Inventory System**: Track up to 50 items (free) with location and quantity management
- **AI Recipe Generation**: Get creative, personalized recipes from Claude AI
- **Experience-Based Cooking**: Recipes adapt to your skill level (beginner to expert)
- **Cuisine Selection**: Choose from 15+ cuisines or let AI surprise you
- **Recipe Rating System**: Rate recipes and leave detailed reviews
- **Serving Size Adjustment**: Smart scaling for different group sizes
- **Freemium Model**: Basic features free, premium features for subscribers

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **AI Integration**: Anthropic Claude API (@anthropic-ai/sdk)
- **State Management**: React hooks, localStorage persistence
- **PWA**: Progressive Web App with offline capability
- **UI/UX**: Responsive design, mobile-optimized

## Quick Start

### 1. Basic Setup (Mock Engine)
```bash
git clone <repository>
cd pantry-buddy
npm install
npm run dev
```

### 2. AI-Powered Setup (Recommended)
```bash
# Install dependencies
npm install

# Get your Claude API key from https://console.anthropic.com
# Copy environment template
cp .env.example .env.local

# Add your API key to .env.local
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Start the app
npm run dev
```

📖 **See [AI_SETUP.md](./AI_SETUP.md) for detailed AI configuration guide**

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── components/         # React components
│   ├── SmartPantry.tsx
│   ├── PantryInventoryManager.tsx
│   ├── RecipeRatingSystem.tsx
│   └── EnhancedRecipeCard.tsx
├── lib/               # Core logic and AI integration
│   ├── ai/            # AI service layer
│   │   ├── aiService.ts
│   │   ├── providers/anthropic.ts
│   │   ├── promptEngineering.ts
│   │   └── types.ts
│   ├── config/        # Environment configuration
│   └── advancedRecipeEngine.ts
├── pages/             # Next.js pages
├── types/             # TypeScript type definitions
├── public/            # Static assets and PWA files
└── styles/            # CSS styles
```

## 🤖 AI Integration Details

The AI system is built with a modular architecture:

### Smart Prompting System
- **Context Analysis**: Analyzes available ingredients, dietary restrictions, and user preferences
- **Experience Adaptation**: Adjusts recipe complexity based on user skill level
- **Ingredient Prioritization**: Uses expiring ingredients first to reduce waste
- **Quality Validation**: Validates AI responses for feasibility and quality

### Fallback & Reliability
- **Graceful Degradation**: Falls back to sophisticated mock engine if AI fails
- **Rate Limiting**: Prevents API overuse with configurable limits
- **Caching**: Reduces costs by caching similar recipe requests
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Cost Management
- **Intelligent Caching**: Recipe responses cached for 1 hour
- **Token Optimization**: Efficient prompting to minimize token usage
- **Usage Analytics**: Track API costs and usage patterns
- **Model Selection**: Choose between Claude models based on needs

## Environment Configuration

Create `.env.local` with these settings:

```env
# Required for AI features
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Optional configuration
AI_PROVIDER=anthropic
AI_MODEL=claude-3-sonnet-20240229
AI_TEMPERATURE=0.7
ENABLE_AI_RECIPES=true
AI_FALLBACK_TO_MOCK=true
AI_CACHE_ENABLED=true
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.